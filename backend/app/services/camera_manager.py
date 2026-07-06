"""
camera_manager.py
-----------------
Multi-camera pipeline manager for the TRINETHRA ANPR system.

Architecture per camera:
  CameraReader (Thread) -> bounded frame_queue -> FrameProcessor (Thread)
    -> per-camera YOLO vehicle tracker + plate detector
    -> vehicle-to-plate spatial association
    -> OCR task queue -> OCRWorker (Thread)
    -> TrackBuffer aggregation -> event finalization & DB persistence

Each CameraPipeline is fully isolated:
  - Its own YOLO model instances (no shared .track() state)
  - Its own TrackingService instance (no cross-camera track_id contamination)
  - Its own reader/processor/ocr threads
  - Bounded queues to drop stale frames instead of growing memory

One pipeline failing does NOT affect others.
"""

import asyncio
import logging
import queue
import threading
import time
from collections import deque
from datetime import datetime
from typing import Optional

import cv2
import numpy as np

from app.config import settings
from app.models.detection import BoundingBox, DetectionCreate, MediaInfo, SourceInfo
from app.services.ocr_service import ocr_service
from app.services.tracking_service import TrackingService, associate_plates_to_vehicles
from app.services.yolo_service import yolo_service
from app.utils.image_preprocessing import calculate_sharpness
from app.utils.plate_normalizer import are_plates_similar, normalize_plate

logger = logging.getLogger("trinethra.camera_manager")

# ─── Constants ────────────────────────────────────────────────────────────────

# How many seconds between finalization checks inside the processor thread
_CLEANUP_INTERVAL_S = 5.0

# Minimum crop dimensions to submit to OCR
_MIN_WIDTH = settings.MIN_PLATE_WIDTH
_MIN_HEIGHT = settings.MIN_PLATE_HEIGHT
_MIN_SHARPNESS = settings.MIN_SHARPNESS


# ─── CameraPipeline ───────────────────────────────────────────────────────────

class CameraPipeline:
    """
    Encapsulates a fully isolated camera processing pipeline.

    Parameters
    ----------
    camera_id   : str   Unique camera identifier (e.g. "RTS-ABCD1234")
    session_id  : str   Associated session identifier
    source_info : SourceInfo  Metadata (type, name, etc.)
    source_type : str   "rtsp" | "webcam" | "video"
    """

    def __init__(
        self,
        camera_id: str,
        session_id: str,
        source_info: SourceInfo,
        source_type: str,
    ):
        self.camera_id = camera_id
        self.session_id = session_id
        self.source_info = source_info
        self.source_type = source_type
        self.started_at = datetime.utcnow()

        # ── Queues ──────────────────────────────────────────────
        # Bounded frame queue: reader -> processor
        self._frame_queue: queue.Queue = queue.Queue(maxsize=settings.FRAME_QUEUE_SIZE)
        # Bounded OCR task queue: processor -> ocr worker
        # Each item: (track_id, crop, detection_conf, sharpness, frame_idx)
        self._ocr_queue: queue.Queue = queue.Queue(maxsize=settings.FRAME_QUEUE_SIZE * 4)

        # ── Stop events ─────────────────────────────────────────
        self._stop_event = threading.Event()

        # ── Per-camera model instances (isolated tracker state) ─
        self._vehicle_model = None   # yolov8n COCO
        self._plate_model = None     # best.pt custom

        # ── Per-camera isolated tracking state ──────────────────
        self._tracking = TrackingService(
            camera_id=camera_id,
            session_id=session_id,
        )

        # ── Metrics ─────────────────────────────────────────────
        self._metrics = {
            "capture_fps": 0.0,
            "processing_fps": 0.0,
            "inference_latency_ms": 0,
            "ocr_latency_ms": 0,
            "queue_size": 0,
            "dropped_frames": 0,
            "active_tracks": 0,
            "finalized_events": 0,
        }

        # ── Callback for persisting finalized events ─────────────
        # Set by CameraManager after construction
        self.on_event_finalized = None   # async callback(camera_id, track_buf)

        # ── Threads ─────────────────────────────────────────────
        self._processor_thread: Optional[threading.Thread] = None
        self._ocr_thread: Optional[threading.Thread] = None

        # ── FPS counters ─────────────────────────────────────────
        self._capture_frame_times: deque = deque(maxlen=30)
        self._process_frame_times: deque = deque(maxlen=30)

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    def start(self) -> None:
        """Initialise per-camera YOLO model instances and start worker threads."""
        logger.info(f"[{self.camera_id}] Starting camera pipeline...")

        # Create isolated YOLO instances
        try:
            self._plate_model = yolo_service.create_plate_tracker_model()
            self._vehicle_model = yolo_service.create_vehicle_tracker_model()
        except Exception as exc:
            logger.error(f"[{self.camera_id}] Failed to create YOLO models: {exc}")

        self._processor_thread = threading.Thread(
            target=self._processor_loop,
            name=f"proc-{self.camera_id}",
            daemon=True,
        )
        self._ocr_thread = threading.Thread(
            target=self._ocr_worker_loop,
            name=f"ocr-{self.camera_id}",
            daemon=True,
        )

        self._processor_thread.start()
        self._ocr_thread.start()
        logger.info(f"[{self.camera_id}] Pipeline threads started.")

    def stop(self) -> None:
        """Signal all threads to stop and wait for them to finish."""
        logger.info(f"[{self.camera_id}] Stopping camera pipeline...")
        self._stop_event.set()

        if self._processor_thread and self._processor_thread.is_alive():
            self._processor_thread.join(timeout=5.0)
        if self._ocr_thread and self._ocr_thread.is_alive():
            self._ocr_thread.join(timeout=5.0)

        logger.info(f"[{self.camera_id}] Pipeline stopped.")

    @property
    def is_running(self) -> bool:
        return not self._stop_event.is_set()

    # ── Frame Submission (used by RTSP/webcam readers) ────────────────────────

    def submit_frame(self, frame: np.ndarray, frame_idx: int) -> bool:
        """
        Submit a frame to the processor queue.
        If the queue is full, drops the OLDEST frame (to prevent stale lag).
        Returns True if the frame was queued, False if dropped.
        """
        self._capture_frame_times.append(time.time())
        self._update_capture_fps()

        if self._stop_event.is_set():
            return False

        item = (frame, frame_idx)

        try:
            self._frame_queue.put_nowait(item)
            return True
        except queue.Full:
            # Drop oldest frame, insert new one
            try:
                self._frame_queue.get_nowait()
            except queue.Empty:
                pass
            try:
                self._frame_queue.put_nowait(item)
            except queue.Full:
                pass
            self._metrics["dropped_frames"] += 1
            logger.debug(f"[{self.camera_id}] Frame dropped (queue full).")
            return False

    # ── Internal: Processor Thread ────────────────────────────────────────────

    def _processor_loop(self) -> None:
        """Main inference loop. Consumes frames from queue, runs YOLO, associates plates."""
        logger.info(f"[{self.camera_id}] Processor loop started.")
        last_cleanup = time.time()

        while not self._stop_event.is_set():
            try:
                frame, frame_idx = self._frame_queue.get(timeout=1.0)
            except queue.Empty:
                # Periodic cleanup even when no frames
                if time.time() - last_cleanup >= _CLEANUP_INTERVAL_S:
                    self._finalize_stale_tracks()
                    last_cleanup = time.time()
                continue

            self._metrics["queue_size"] = self._frame_queue.qsize()

            try:
                self._process_frame(frame, frame_idx)
            except Exception as exc:
                logger.error(
                    f"[{self.camera_id}] Error processing frame {frame_idx}: {exc}",
                    exc_info=True,
                )

            # Update processing FPS
            self._process_frame_times.append(time.time())
            self._update_processing_fps()

            # Periodic cleanup
            if time.time() - last_cleanup >= _CLEANUP_INTERVAL_S:
                self._finalize_stale_tracks()
                last_cleanup = time.time()

        # Final cleanup on shutdown
        self._finalize_stale_tracks(force_all=True)
        logger.info(f"[{self.camera_id}] Processor loop stopped.")

    def _process_frame(self, frame: np.ndarray, frame_idx: int) -> None:
        """Run inference on a single frame: detect vehicles, detect plates, associate, OCR-gate."""
        h, w = frame.shape[:2]

        # Resize for faster inference if needed
        if w > 1280:
            scale = 1280.0 / w
            small = cv2.resize(frame, (1280, int(h * scale)))
            sx, sy = w / 1280, h / (h * scale)
        else:
            small = frame
            sx, sy = 1.0, 1.0

        t_start = time.time()

        # ── 1. Vehicle tracking ──────────────────────────────────
        vehicle_dets = []
        if self._vehicle_model is not None:
            try:
                vehicle_dets = yolo_service.detect_vehicles(
                    small,
                    self._vehicle_model,
                    confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
                )
                # Scale back to original resolution
                for v in vehicle_dets:
                    v["bbox"] = self._scale_bbox(v["bbox"], sx, sy)
            except Exception as exc:
                logger.warning(f"[{self.camera_id}] Vehicle detection error: {exc}")

        # ── 2. Plate detection ───────────────────────────────────
        plate_dets = []
        if self._plate_model is not None:
            try:
                plate_dets = yolo_service.detect_plates(
                    small,
                    self._plate_model,
                    confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
                )
                for p in plate_dets:
                    p["bbox"] = self._scale_bbox(p["bbox"], sx, sy)
            except Exception as exc:
                logger.warning(f"[{self.camera_id}] Plate detection error: {exc}")

        self._metrics["inference_latency_ms"] = int((time.time() - t_start) * 1000)

        # ── 3. Associate plates to vehicle tracks ────────────────
        # If no vehicles detected, treat each plate as its own "track" (fallback)
        if vehicle_dets:
            assignments = associate_plates_to_vehicles(vehicle_dets, plate_dets)
        else:
            # No vehicle tracking: use plate as direct track (for plate-only models)
            assignments = {}
            for i, p in enumerate(plate_dets):
                assignments[-(i + 1)] = [p]

        # ── 4. Update tracks and gate OCR ────────────────────────
        # For vehicle-associated plates, use the vehicle's track_id
        for vehicle in vehicle_dets:
            vid = vehicle.get("track_id")
            if vid is None:
                continue
            # Update track with vehicle bbox even if no plate detected
            vehicle_crop = yolo_service.crop_detection(frame, vehicle["bbox"])
            self._tracking.update_track(
                track_id=vid,
                crop=vehicle_crop,
                bbox=vehicle["bbox"],
                detection_confidence=vehicle["confidence"],
            )

        for vehicle_track_id, plates in assignments.items():
            for plate in plates:
                pbbox = plate["bbox"]
                pconf = plate["confidence"]

                # Validate plate crop dimensions
                pw = pbbox[2] - pbbox[0]
                ph = pbbox[3] - pbbox[1]
                if pw < _MIN_WIDTH or ph < _MIN_HEIGHT:
                    continue

                crop = yolo_service.crop_detection(frame, pbbox)
                if crop.size == 0:
                    continue

                sharpness = calculate_sharpness(crop)
                if sharpness < _MIN_SHARPNESS and vehicle_track_id > 0:
                    # Only skip blurry crops for vehicle-associated plates
                    # (fallback plates always attempt OCR)
                    continue

                # Use positive track_id for vehicle association or negative for fallback
                track_id = vehicle_track_id if vehicle_track_id > 0 else abs(vehicle_track_id) + 10000

                # Update track buffer with plate crop as quality reference
                self._tracking.update_track(
                    track_id=track_id,
                    crop=crop,
                    bbox=pbbox,
                    detection_confidence=pconf,
                )

                # Gate OCR
                if self._tracking.should_run_ocr(track_id, frame_idx):
                    try:
                        self._ocr_queue.put_nowait(
                            (track_id, crop.copy(), pconf, sharpness, frame_idx)
                        )
                    except queue.Full:
                        logger.debug(f"[{self.camera_id}] OCR queue full, skipping track {track_id}")

        self._metrics["active_tracks"] = len(self._tracking.active_tracks)

    # ── Internal: OCR Worker Thread ───────────────────────────────────────────

    def _ocr_worker_loop(self) -> None:
        """Consumes OCR tasks and updates track buffers with recognition results."""
        logger.info(f"[{self.camera_id}] OCR worker loop started.")

        while not self._stop_event.is_set():
            try:
                task = self._ocr_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            track_id, crop, detection_conf, sharpness, frame_idx = task

            if not ocr_service.is_initialized:
                continue

            t_ocr = time.time()
            try:
                result = ocr_service.recognize(crop)
            except Exception as exc:
                logger.warning(
                    f"[{self.camera_id}] OCR exception on track {track_id}: {exc}"
                )
                continue

            self._metrics["ocr_latency_ms"] = int((time.time() - t_ocr) * 1000)

            ocr_text = result.get("text", "")
            ocr_conf = result.get("confidence", 0.0)
            validity_score = result.get("validity_score", 0.0)

            if not ocr_text or ocr_conf < settings.OCR_CONFIDENCE_THRESHOLD:
                continue

            self._tracking.add_ocr_result(
                track_id=track_id,
                text=ocr_text,
                ocr_confidence=ocr_conf,
                validity_score=validity_score,
                sharpness=sharpness,
                detection_confidence=detection_conf,
                current_frame_idx=frame_idx,
            )

            logger.debug(
                f"[{self.camera_id}] Track {track_id}: OCR='{ocr_text}' "
                f"conf={ocr_conf:.2f} valid={validity_score:.2f}"
            )

        logger.info(f"[{self.camera_id}] OCR worker loop stopped.")

    # ── Internal: Track Finalization ──────────────────────────────────────────

    def _finalize_stale_tracks(self, force_all: bool = False) -> None:
        """Finalize tracks that haven't been seen recently and trigger DB persistence."""
        timeout = 1 if force_all else settings.TRACK_LOST_TIMEOUT
        finalized_buffers = self._tracking.cleanup_stale_tracks(timeout_seconds=timeout)

        for buf in finalized_buffers:
            self._metrics["finalized_events"] += 1

            if not buf.best_plate_text:
                logger.debug(f"[{self.camera_id}] Track {buf.track_id} finalized with no plate text — skipping DB write.")
                continue

            # Schedule async DB persistence via the callback
            if self.on_event_finalized:
                try:
                    asyncio.run_coroutine_threadsafe(
                        self.on_event_finalized(self.camera_id, buf),
                        asyncio.get_event_loop(),
                    )
                except RuntimeError:
                    # No running event loop in this thread — persistence will be
                    # handled by the main event loop when available
                    logger.warning(
                        f"[{self.camera_id}] Cannot schedule finalization for track "
                        f"{buf.track_id} — no running event loop."
                    )

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _scale_bbox(bbox: list[int], sx: float, sy: float) -> list[int]:
        x1, y1, x2, y2 = bbox
        return [int(x1 * sx), int(y1 * sy), int(x2 * sx), int(y2 * sy)]

    def _update_capture_fps(self) -> None:
        times = list(self._capture_frame_times)
        if len(times) >= 2:
            elapsed = times[-1] - times[0]
            if elapsed > 0:
                self._metrics["capture_fps"] = round(len(times) / elapsed, 1)

    def _update_processing_fps(self) -> None:
        times = list(self._process_frame_times)
        if len(times) >= 2:
            elapsed = times[-1] - times[0]
            if elapsed > 0:
                self._metrics["processing_fps"] = round(len(times) / elapsed, 1)

    def get_metrics(self) -> dict:
        return {
            **self._metrics,
            "camera_id": self.camera_id,
            "session_id": self.session_id,
            "source_type": self.source_type,
            "is_running": self.is_running,
            "active_tracks": len(self._tracking.active_tracks),
            "uptime_seconds": int(
                (datetime.utcnow() - self.started_at).total_seconds()
            ),
        }

    def get_active_track_ids(self) -> list[int]:
        return list(self._tracking.active_tracks.keys())


# ─── CameraManager ────────────────────────────────────────────────────────────

class CameraManager:
    """
    Central registry of all active CameraPipeline instances.

    Responsibilities:
      - Start / stop individual camera pipelines
      - Route frame submissions to the correct pipeline
      - Expose status and metrics for all cameras
      - Enforce MAX_CAMERAS limit
    """

    def __init__(self):
        self._pipelines: dict[str, CameraPipeline] = {}
        self._lock = threading.Lock()

    # ── Pipeline management ────────────────────────────────────────────────────

    def start_camera(
        self,
        camera_id: str,
        session_id: str,
        source_info: SourceInfo,
        source_type: str,
    ) -> CameraPipeline:
        """
        Returns the existing pipeline for camera_id, or creates and starts a new one.
        Enforces MAX_CAMERAS; raises RuntimeError if the limit is reached.
        """
        with self._lock:
            if camera_id in self._pipelines:
                return self._pipelines[camera_id]

            if len(self._pipelines) >= settings.MAX_CAMERAS:
                raise RuntimeError(
                    f"MAX_CAMERAS ({settings.MAX_CAMERAS}) limit reached. "
                    f"Stop an existing camera before starting a new one."
                )

            pipeline = CameraPipeline(
                camera_id=camera_id,
                session_id=session_id,
                source_info=source_info,
                source_type=source_type,
            )

            # Wire up the async finalization callback
            pipeline.on_event_finalized = self._handle_track_finalized

            pipeline.start()
            self._pipelines[camera_id] = pipeline
            logger.info(
                f"[CameraManager] Started pipeline for camera_id={camera_id} "
                f"session={session_id} type={source_type}. "
                f"Active cameras: {len(self._pipelines)}/{settings.MAX_CAMERAS}"
            )
            return pipeline

    def stop_camera(self, camera_id: str) -> bool:
        """Stops and removes a camera pipeline. Returns True if found."""
        with self._lock:
            pipeline = self._pipelines.pop(camera_id, None)

        if pipeline:
            pipeline.stop()
            logger.info(f"[CameraManager] Stopped pipeline for camera_id={camera_id}.")
            return True
        return False

    def stop_cameras_by_session(self, session_id: str) -> None:
        """Stops all pipelines belonging to a session."""
        to_stop = []
        with self._lock:
            for cid, p in list(self._pipelines.items()):
                if p.session_id == session_id:
                    to_stop.append(cid)

        for cid in to_stop:
            self.stop_camera(cid)

    def submit_frame(self, camera_id: str, frame: np.ndarray, frame_idx: int) -> bool:
        """Submit a frame to the pipeline for camera_id. Returns False if not found."""
        pipeline = self._pipelines.get(camera_id)
        if pipeline:
            return pipeline.submit_frame(frame, frame_idx)
        return False

    # ── Status & Metrics ────────────────────────────────────────────────────────

    def get_status(self, camera_id: str) -> dict | None:
        pipeline = self._pipelines.get(camera_id)
        if pipeline:
            return pipeline.get_metrics()
        return None

    def get_all_statuses(self) -> list[dict]:
        return [p.get_metrics() for p in self._pipelines.values()]

    def list_camera_ids(self) -> list[str]:
        return list(self._pipelines.keys())

    def get_pipeline(self, camera_id: str) -> CameraPipeline | None:
        return self._pipelines.get(camera_id)

    # ── Async Finalization Callback ───────────────────────────────────────────

    async def _handle_track_finalized(self, camera_id: str, buf) -> None:
        """
        Called when a vehicle track is finalized (lost-timeout triggered).
        Performs deduplication and persists the best plate record to MongoDB.
        Imports are deferred to avoid circular dependencies at module load.
        """
        from app.services.deduplication_service import dedup_service
        from app.database.repositories.detection_repository import detection_repo
        from app.services.websocket_service import ws_manager

        pipeline = self._pipelines.get(camera_id)
        if not pipeline:
            return

        # Get the consensus plate (frequency + score weighted)
        plate_text, ocr_conf, combined_score = buf.get_consensus_plate()

        if not plate_text:
            return
        if ocr_conf < settings.OCR_CONFIDENCE_THRESHOLD:
            logger.debug(
                f"[{camera_id}] Track {buf.track_id}: plate '{plate_text}' "
                f"below OCR confidence threshold ({ocr_conf:.2f}). Skipping."
            )
            return

        session_id = pipeline.session_id

        try:
            is_dup, existing_id = await dedup_service.check_and_deduplicate(
                plate_number=plate_text,
                source_id=camera_id,
                detection_confidence=buf.best_detection_confidence,
                ocr_confidence=ocr_conf,
                window_seconds=settings.DUPLICATE_WINDOW_SECONDS,
            )

            bbox_list = buf.best_bbox if buf.best_bbox else [0, 0, 0, 0]
            bbox_model = BoundingBox(
                x1=bbox_list[0], y1=bbox_list[1],
                x2=bbox_list[2], y2=bbox_list[3],
            )

            # Save best plate crop if available
            crop_url = None
            if buf.best_plate_crop is not None:
                import cv2 as _cv2
                from app.config import settings as _s
                crop_fname = f"crop_{camera_id}_{buf.track_id}_{plate_text}.jpg"
                crop_abs = _s.crops_path / crop_fname
                try:
                    _cv2.imwrite(str(crop_abs), buf.best_plate_crop)
                    crop_url = f"/crops/{crop_fname}"
                except Exception as we:
                    logger.warning(f"[{camera_id}] Failed to save crop: {we}")

            media = MediaInfo(plate_crop_path=crop_url)

            if not is_dup:
                det = DetectionCreate(
                    plate_number=plate_text,
                    raw_ocr_text=plate_text,
                    detection_confidence=buf.best_detection_confidence,
                    ocr_confidence=ocr_conf,
                    track_id=buf.track_id,
                    source=pipeline.source_info,
                    bounding_box=bbox_model,
                    media=media,
                )
                det_id = await detection_repo.insert_detection(det)
                full_det = await detection_repo.get_detection(det_id)
                if full_det:
                    await ws_manager.broadcast(
                        session_id, "detection_created", full_det.dict()
                    )
                    logger.info(
                        f"[{camera_id}] Track {buf.track_id}: NEW detection saved "
                        f"plate='{plate_text}' score={combined_score:.4f}"
                    )
            else:
                full_det = await detection_repo.get_detection(existing_id)
                if full_det:
                    await ws_manager.broadcast(
                        session_id, "detection_updated", full_det.dict()
                    )
                logger.info(
                    f"[{camera_id}] Track {buf.track_id}: DUPLICATE plate='{plate_text}', "
                    f"updated existing record {existing_id}"
                )

        except Exception as exc:
            logger.error(
                f"[{camera_id}] Track {buf.track_id} finalization error: {exc}",
                exc_info=True,
            )


# Singleton global instance
camera_manager = CameraManager()
