import logging
from datetime import datetime, timedelta
import numpy as np
from collections import Counter
from app.config import settings
from app.utils.image_preprocessing import calculate_sharpness
from app.utils.plate_normalizer import (
    normalize_plate,
    get_plate_validity_score,
    string_similarity,
    are_plates_similar,
)

logger = logging.getLogger("trinethra.tracking")

# Maximum normalized sharpness value used to normalize raw sharpness scores
_SHARPNESS_NORM_MAX = 2000.0


def _normalize_sharpness(sharpness: float) -> float:
    """Normalize Laplacian variance sharpness to [0, 1]."""
    return min(sharpness / _SHARPNESS_NORM_MAX, 1.0)


def _compute_candidate_score(
    detection_confidence: float,
    ocr_confidence: float,
    sharpness: float,
    validity_score: float,
    repetition_ratio: float,
) -> float:
    """
    Combined quality score for a plate OCR candidate.
    Uses configurable weights from settings.

    combined_score =
        DETECTION_WEIGHT * detection_confidence
        + OCR_WEIGHT * ocr_confidence
        + SHARPNESS_WEIGHT * normalized_sharpness
        + VALIDITY_WEIGHT * format_validity_score
        + TEMPORAL_CONSISTENCY_WEIGHT * repetition_score
    """
    norm_sharp = _normalize_sharpness(sharpness)
    score = (
        settings.DETECTION_WEIGHT * detection_confidence
        + settings.OCR_WEIGHT * ocr_confidence
        + settings.SHARPNESS_WEIGHT * norm_sharp
        + settings.VALIDITY_WEIGHT * validity_score
        + settings.TEMPORAL_CONSISTENCY_WEIGHT * repetition_ratio
    )
    return round(score, 4)


def associate_plates_to_vehicles(
    vehicle_detections: list[dict],
    plate_detections: list[dict],
    containment_threshold: float = 0.6,
) -> dict[int, list[dict]]:
    """
    Associates each plate detection to the best matching vehicle track
    using containment ratio. The containment ratio measures what fraction
    of the plate bounding box lies inside the vehicle bounding box.

    Returns:
        dict mapping vehicle track_id -> list of plate detections assigned to it.
        Unassigned plates are keyed under track_id = -1 (fallback).
    """
    assignment: dict[int, list[dict]] = {}
    unassigned: list[dict] = []

    for plate in plate_detections:
        px1, py1, px2, py2 = plate["bbox"]
        plate_area = max(1, (px2 - px1) * (py2 - py1))

        best_track_id = None
        best_containment = 0.0

        for vehicle in vehicle_detections:
            track_id = vehicle.get("track_id")
            if track_id is None:
                continue

            vx1, vy1, vx2, vy2 = vehicle["bbox"]

            # Intersection area
            ix1 = max(px1, vx1)
            iy1 = max(py1, vy1)
            ix2 = min(px2, vx2)
            iy2 = min(py2, vy2)

            if ix2 <= ix1 or iy2 <= iy1:
                containment = 0.0
            else:
                inter_area = (ix2 - ix1) * (iy2 - iy1)
                containment = inter_area / plate_area

            if containment > best_containment:
                best_containment = containment
                best_track_id = track_id

        if best_track_id is not None and best_containment >= containment_threshold:
            assignment.setdefault(best_track_id, []).append(plate)
        else:
            unassigned.append(plate)

    if unassigned:
        assignment[-1] = unassigned

    return assignment


class TrackBuffer:
    """
    Aggregates all observations for a single vehicle track across frames.
    Maintains OCR candidate history and selects the highest-scoring plate
    result using a configurable multi-factor scoring function.
    """

    def __init__(self, track_id: int, camera_id: str, session_id: str):
        self.track_id = track_id
        self.camera_id = camera_id
        self.session_id = session_id
        # Globally unique identifier to avoid cross-camera track ID collisions
        self.global_key = f"{camera_id}_{track_id}"

        now = datetime.utcnow()
        self.first_seen: datetime = now
        self.last_seen: datetime = now
        self.frame_count: int = 0
        self.ocr_run_count: int = 0
        self.last_ocr_frame: int = 0

        # Best candidate state
        self.best_plate_text: str | None = None
        self.best_detection_confidence: float = 0.0
        self.best_ocr_confidence: float = 0.0
        self.best_combined_score: float = 0.0
        self.best_sharpness: float = 0.0
        self.best_size: int = 0
        self.best_plate_crop: np.ndarray | None = None
        self.best_bbox: list[int] = []
        self.best_validity_score: float = 0.0

        # Full OCR history for this track
        self.ocr_candidates: list[dict] = []

        self.finalized: bool = False

    def update(self, crop: np.ndarray, bbox: list[int], detection_confidence: float) -> None:
        """Update track state from a new frame detection."""
        self.last_seen = datetime.utcnow()
        self.frame_count += 1
        self.best_detection_confidence = max(detection_confidence, self.best_detection_confidence)

        sharpness = calculate_sharpness(crop)
        x1, y1, x2, y2 = bbox
        size = (x2 - x1) * (y2 - y1)

        is_sharper = sharpness > self.best_sharpness * 1.1
        is_larger = size > self.best_size * 1.2

        if (is_sharper and size >= self.best_size * 0.8) or is_larger or self.best_plate_crop is None:
            self.best_plate_crop = crop.copy()
            self.best_sharpness = max(sharpness, self.best_sharpness)
            self.best_size = max(size, self.best_size)
            self.best_bbox = bbox

    def should_run_ocr(self, current_frame_idx: int) -> bool:
        """OCR throttle gate: limits OCR attempts per track to reduce latency."""
        if self.ocr_run_count >= settings.MAX_OCR_ATTEMPTS:
            return False
        if self.ocr_run_count == 0:
            return True
        frames_since_last = current_frame_idx - self.last_ocr_frame
        return frames_since_last >= settings.OCR_INTERVAL

    def add_ocr_result(
        self,
        text: str,
        ocr_confidence: float,
        validity_score: float,
        sharpness: float,
        detection_confidence: float,
        current_frame_idx: int,
    ) -> None:
        """Store an OCR result and update the best plate selection."""
        if not text:
            return

        self.ocr_run_count += 1
        self.last_ocr_frame = current_frame_idx

        # Count how often similar texts have been seen (for temporal consistency)
        similar_count = sum(
            1 for c in self.ocr_candidates
            if are_plates_similar(c["text"], text, settings.PLATE_SIMILARITY_THRESHOLD)
        )
        total = len(self.ocr_candidates) + 1
        repetition_ratio = (similar_count + 1) / total  # +1 includes current

        combined_score = _compute_candidate_score(
            detection_confidence=detection_confidence,
            ocr_confidence=ocr_confidence,
            sharpness=sharpness,
            validity_score=validity_score,
            repetition_ratio=repetition_ratio,
        )

        candidate = {
            "text": text,
            "ocr_confidence": ocr_confidence,
            "detection_confidence": detection_confidence,
            "validity_score": validity_score,
            "sharpness": sharpness,
            "combined_score": combined_score,
            "frame_idx": current_frame_idx,
        }
        self.ocr_candidates.append(candidate)

        # Update best if this candidate beats the current best
        if combined_score > self.best_combined_score:
            self.best_plate_text = text
            self.best_ocr_confidence = ocr_confidence
            self.best_combined_score = combined_score
            self.best_validity_score = validity_score

        logger.debug(
            f"[{self.global_key}] OCR candidate '{text}' score={combined_score:.4f} "
            f"(det={detection_confidence:.2f} ocr={ocr_confidence:.2f} "
            f"sharp={sharpness:.1f} valid={validity_score:.2f} rep={repetition_ratio:.2f})"
        )

    def get_final_plate(self) -> tuple[str | None, float]:
        """Returns the voted best plate text and its OCR confidence."""
        return self.best_plate_text, self.best_ocr_confidence

    def get_consensus_plate(self) -> tuple[str | None, float, float]:
        """
        Returns (best_text, ocr_confidence, combined_score) using temporal consensus.
        Prefers candidates with valid format. Applies frequency-weighted re-ranking
        to confirm the text is consistent across multiple observations.
        """
        if not self.ocr_candidates:
            return None, 0.0, 0.0

        # Group candidates by similarity clusters
        clusters: list[list[dict]] = []
        for cand in self.ocr_candidates:
            placed = False
            for cluster in clusters:
                if are_plates_similar(
                    cluster[0]["text"], cand["text"],
                    settings.PLATE_SIMILARITY_THRESHOLD
                ):
                    cluster.append(cand)
                    placed = True
                    break
            if not placed:
                clusters.append([cand])

        best_text = None
        best_score = -1.0
        best_ocr_conf = 0.0

        for cluster in clusters:
            # Cluster-level frequency bonus
            freq_ratio = len(cluster) / len(self.ocr_candidates)
            # Pick highest individual score within cluster
            top = max(cluster, key=lambda c: c["combined_score"])
            # Add frequency bonus on top of individual score
            cluster_score = top["combined_score"] * (1.0 + 0.1 * freq_ratio)

            if cluster_score > best_score:
                best_score = cluster_score
                best_text = top["text"]
                best_ocr_conf = top["ocr_confidence"]

        return best_text, best_ocr_conf, best_score


class TrackingService:
    """
    Manages per-camera track buffers. Each camera has its own isolated
    TrackingService instance (created by CameraManager), so track IDs
    do not bleed across cameras.

    For backward compatibility, a global singleton is also exported
    for use by image/video file processing routes.
    """

    def __init__(self, camera_id: str = "default", session_id: str = "default"):
        self.camera_id = camera_id
        self.session_id = session_id
        # track_id (local int) -> TrackBuffer
        self.active_tracks: dict[int, TrackBuffer] = {}

    # ── Core track lifecycle ──────────────────────────────────

    def update_track(
        self,
        track_id: int,
        crop: np.ndarray,
        bbox: list[int],
        detection_confidence: float,
    ) -> TrackBuffer:
        """Create or update the track buffer for a given track_id."""
        if track_id not in self.active_tracks:
            self.active_tracks[track_id] = TrackBuffer(
                track_id=track_id,
                camera_id=self.camera_id,
                session_id=self.session_id,
            )
            logger.info(
                f"[cam={self.camera_id}] New track ID: {track_id} "
                f"(bbox={bbox})"
            )

        buf = self.active_tracks[track_id]
        buf.update(crop, bbox, detection_confidence)
        return buf

    def should_run_ocr(self, track_id: int, current_frame_idx: int) -> bool:
        if track_id not in self.active_tracks:
            return False
        return self.active_tracks[track_id].should_run_ocr(current_frame_idx)

    def add_ocr_result(
        self,
        track_id: int,
        text: str,
        ocr_confidence: float,
        validity_score: float,
        sharpness: float,
        detection_confidence: float,
        current_frame_idx: int,
    ) -> None:
        if track_id not in self.active_tracks or not text:
            return
        self.active_tracks[track_id].add_ocr_result(
            text=text,
            ocr_confidence=ocr_confidence,
            validity_score=validity_score,
            sharpness=sharpness,
            detection_confidence=detection_confidence,
            current_frame_idx=current_frame_idx,
        )

    def get_final_plate(self, track_id: int) -> tuple[str | None, float]:
        """Returns (best_plate_text, ocr_confidence) for a track."""
        if track_id not in self.active_tracks:
            return None, 0.0
        return self.active_tracks[track_id].get_final_plate()

    def get_consensus_plate(self, track_id: int) -> tuple[str | None, float, float]:
        """Returns (text, ocr_conf, combined_score) via temporal consensus."""
        if track_id not in self.active_tracks:
            return None, 0.0, 0.0
        return self.active_tracks[track_id].get_consensus_plate()

    def get_track(self, track_id: int) -> TrackBuffer | None:
        return self.active_tracks.get(track_id)

    def cleanup_stale_tracks(
        self,
        timeout_seconds: int | None = None,
    ) -> list[TrackBuffer]:
        """
        Removes tracks that have not been updated within timeout_seconds.
        Returns the list of finalized (removed) TrackBuffers for event persistence.
        """
        if timeout_seconds is None:
            timeout_seconds = settings.TRACK_LOST_TIMEOUT

        now = datetime.utcnow()
        to_finalize: list[int] = []

        for track_id, buf in self.active_tracks.items():
            if now - buf.last_seen > timedelta(seconds=timeout_seconds):
                to_finalize.append(track_id)

        finalized = []
        for track_id in to_finalize:
            buf = self.active_tracks.pop(track_id)
            buf.finalized = True
            logger.info(
                f"[cam={self.camera_id}] Track {track_id} finalized "
                f"(frames={buf.frame_count}, ocr_runs={buf.ocr_run_count}, "
                f"best_plate={buf.best_plate_text})"
            )
            finalized.append(buf)

        return finalized

    def reset(self) -> None:
        self.active_tracks.clear()
        logger.info(f"[cam={self.camera_id}] Tracking service tracks reset.")


# Global singleton — used for image uploads and video file processing
# where multi-camera isolation is not needed
tracking_service = TrackingService(camera_id="global", session_id="global")
