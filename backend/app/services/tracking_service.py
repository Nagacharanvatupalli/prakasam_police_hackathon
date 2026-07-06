import logging
from datetime import datetime, timedelta
import numpy as np
from collections import Counter
from app.utils.image_preprocessing import calculate_sharpness

logger = logging.getLogger("trinethra.tracking")

class TrackingService:
    def __init__(self):
        # track_id -> dict of track properties
        self.active_tracks = {}

    def update_track(self, track_id: int, crop: np.ndarray, bbox: list[int], detection_confidence: float) -> dict:
        """
        Updates the track state with a new frame detection.
        Keeps track of the best crop (based on sharpness and size).
        """
        now = datetime.utcnow()
        sharpness = calculate_sharpness(crop)
        
        # Calculate size (width * height)
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        height = y2 - y1
        size = width * height
        
        if track_id not in self.active_tracks:
            # New track initialization
            self.active_tracks[track_id] = {
                "track_id": track_id,
                "best_crop": crop,
                "best_sharpness": sharpness,
                "best_size": size,
                "ocr_candidates": [],
                "last_seen": now,
                "first_seen": now,
                "final_plate": None,
                "best_detection_confidence": detection_confidence,
                "ocr_run_count": 0,
                "frame_count": 1,
                "last_ocr_frame": 0
            }
            logger.info(f"Initialized new track ID: {track_id} (Sharpness: {sharpness:.1f}, Size: {width}x{height})")
        else:
            track = self.active_tracks[track_id]
            track["last_seen"] = now
            track["frame_count"] += 1
            
            # Update best crop if:
            # 1. This crop is significantly sharper AND size is comparable or larger
            # 2. Or if size is significantly larger (closer camera, higher readability)
            is_sharper = sharpness > track["best_sharpness"] * 1.1
            is_larger = size > track["best_size"] * 1.2
            
            if (is_sharper and size >= track["best_size"] * 0.8) or is_larger:
                track["best_crop"] = crop
                track["best_sharpness"] = max(sharpness, track["best_sharpness"])
                track["best_size"] = max(size, track["best_size"])
                
            track["best_detection_confidence"] = max(detection_confidence, track["best_detection_confidence"])
            
        return self.active_tracks[track_id]

    def should_run_ocr(self, track_id: int, current_frame_idx: int) -> bool:
        """
        Throttling logic to avoid running OCR on every frame for the same track.
        Runs OCR on:
        - First frame (frame 1)
        - Every 10 frames after that
        - Or if we have run OCR fewer than 5 times total
        """
        if track_id not in self.active_tracks:
            return False
            
        track = self.active_tracks[track_id]
        
        # Max 5 OCR inferences per track to prevent infinite loops on slow streams
        if track["ocr_run_count"] >= 5:
            return False
            
        # First frame
        if track["ocr_run_count"] == 0:
            return True
            
        # Throttle by frame intervals (e.g., every 10 processed frames)
        frames_since_last_ocr = current_frame_idx - track["last_ocr_frame"]
        if frames_since_last_ocr >= 10:
            return True
            
        return False

    def add_ocr_result(self, track_id: int, text: str, confidence: float, current_frame_idx: int):
        """Adds an OCR candidate to the temporal voting history of the track."""
        if track_id not in self.active_tracks or not text:
            return
            
        track = self.active_tracks[track_id]
        track["ocr_candidates"].append({
            "text": text,
            "confidence": confidence
        })
        track["ocr_run_count"] += 1
        track["last_ocr_frame"] = current_frame_idx
        
        # Run temporal voting to update the final plate representation
        self._perform_voting(track_id)

    def _perform_voting(self, track_id: int):
        """Choose the most stable plate text through temporal voting."""
        track = self.active_tracks[track_id]
        candidates = track["ocr_candidates"]
        
        if not candidates:
            return
            
        # Extract texts
        texts = [c["text"] for c in candidates]
        
        # Count frequency of each text
        counts = Counter(texts)
        # Get most common
        most_common_text, frequency = counts.most_common(1)[0]
        
        # Calculate average confidence for the most common text
        matching_confs = [c["confidence"] for c in candidates if c["text"] == most_common_text]
        avg_conf = sum(matching_confs) / len(matching_confs) if matching_confs else 0.0
        
        # If we have at least 2 votes, or if this is the only text we have seen
        if frequency >= 2 or len(texts) == 1:
            track["final_plate"] = most_common_text
            track["best_ocr_confidence"] = avg_conf

    def get_final_plate(self, track_id: int) -> tuple[str | None, float]:
        """Returns the voted final plate text and average OCR confidence."""
        if track_id not in self.active_tracks:
            return None, 0.0
        track = self.active_tracks[track_id]
        return track.get("final_plate"), track.get("best_ocr_confidence", 0.0)

    def cleanup_stale_tracks(self, timeout_seconds: int = 10):
        """Removes tracks that have not been seen for longer than timeout_seconds."""
        now = datetime.utcnow()
        to_delete = []
        for track_id, track in self.active_tracks.items():
            if now - track["last_seen"] > timedelta(seconds=timeout_seconds):
                to_delete.append(track_id)
                
        for track_id in to_delete:
            logger.info(f"Cleaning up stale track ID: {track_id}")
            del self.active_tracks[track_id]

    def get_track(self, track_id: int) -> dict | None:
        return self.active_tracks.get(track_id)

    def reset(self):
        self.active_tracks.clear()
        logger.info("Tracking service tracks reset.")

# Singleton Instance
tracking_service = TrackingService()
