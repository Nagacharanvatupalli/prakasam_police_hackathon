"""
video_service.py
----------------
Processes uploaded video files frame-by-frame using the upgraded pipeline:
  - Dual YOLO models: vehicle tracker (yolov8n COCO) + plate detector (best.pt)
  - Vehicle-to-plate spatial containment association
  - Per-track OCR candidate aggregation with multi-factor scoring
  - Temporal consensus plate selection (not every-frame DB writes)
  - Deduplication with fuzzy edit-distance similarity
  - WebSocket progress broadcasting
"""

import logging
import time
import asyncio
from pathlib import Path
from datetime import datetime

import cv2

from app.config import settings
from app.services.camera_manager import camera_manager
from app.services.websocket_service import ws_manager
from app.services.yolo_service import yolo_service
from app.services.ocr_service import ocr_service
from app.services.deduplication_service import dedup_service
from app.services.tracking_service import TrackingService, associate_plates_to_vehicles
from app.database.repositories.session_repository import session_repo
from app.database.repositories.detection_repository import detection_repo
from app.models.detection import SourceInfo, BoundingBox, MediaInfo, DetectionCreate
from app.utils.image_preprocessing import calculate_sharpness
from app.utils.plate_normalizer import normalize_plate

logger = logging.getLogger("trinethra.video")


class VideoProcessor:
    def __init__(self):
        # Maps session_id -> bool stop flag
        self.stop_flags: dict[str, bool] = {}

    def stop_session(self, session_id: str) -> None:
        self.stop_flags[session_id] = True
        logger.info(f"Stop signal received for session: {session_id}")

    async def process_video(
        self,
        file_path: str,
        session_id: str,
        source_id: str,
        filename: str,
    ) -> None:
        """
        Background task to process an uploaded video file frame-by-frame.

        Uses dual YOLO models (vehicle tracking + plate detection), spatial
        containment association, per-track temporal OCR aggregation, and
        fuzzy deduplication before MongoDB persistence.
        """
        logger.info(f"Starting video processing: session={session_id} file={file_path}")
        self.stop_flags[session_id] = False

        # ── Open video capture ──────────────────────────────────────────────
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            err = f"Failed to open video file: {file_path}"
            logger.error(err)
            await session_repo.update_session(session_id, status="error", error_message=err)
            await ws_manager.broadcast(session_id, "session_error", {"message": err})
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        duration = total_frames / fps if fps > 0 else 0

        logger.info(f"Video: {total_frames} frames @ {fps:.2f} FPS ({duration:.1f}s)")
        await session_repo.update_session(
            session_id, status="processing", total_frames=total_frames
        )
        await ws_manager.broadcast(
            session_id,
            "session_started",
            {"session_id": session_id, "total_frames": total_frames, "fps": fps},
        )

        source_info = SourceInfo(type="video", source_id=source_id, name=filename)

        # ── Per-session isolated tracker (not shared with live cameras) ──────
        tracker = TrackingService(camera_id=source_id, session_id=session_id)

        # Create per-session YOLO model instances (isolated tracker state)
        plate_model = yolo_service.create_plate_tracker_model()
        vehicle_model = yolo_service.create_vehicle_tracker_model()

        frame_idx = 0
        processed_count = 0
        total_detections = 0
        unique_plates_set: set[str] = set()
        frame_skip = settings.FRAME_SKIP

        start_time = time.time()

        try:
            while cap.isOpened():
                await asyncio.sleep(0)  # yield to event loop

                if self.stop_flags.get(session_id, False):
                    logger.info(f"Stopping session {session_id} on stop flag.")
                    await session_repo.update_session(session_id, status="stopped")
                    await ws_manager.broadcast(session_id, "source_status", {"status": "stopped"})
                    break

                ret, frame = cap.read()
                if not ret:
                    break

                current_frame_idx = frame_idx
                frame_idx += 1

                if current_frame_idx % frame_skip != 0:
                    continue

                processed_count += 1

                # ── Resize for inference ────────────────────────────────────
                h, w = frame.shape[:2]
                if w > 1280:
                    small = cv2.resize(frame, (1280, int(h * 1280 / w)))
                    sx = w / 1280
                    sy = h / (h * 1280 / w)
                else:
                    small = frame.copy()
                    sx = sy = 1.0

                t_inf = time.time()

                # ── Dual YOLO inference ──────────────────────────────────────
                vehicle_dets = []
                if vehicle_model is not None:
                    try:
                        vehicle_dets = yolo_service.detect_vehicles(
                            small,
                            vehicle_model,
                            confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
                        )
                        for v in vehicle_dets:
                            x1, y1, x2, y2 = v["bbox"]
                            v["bbox"] = [
                                int(x1 * sx), int(y1 * sy),
                                int(x2 * sx), int(y2 * sy),
                            ]
                    except Exception as exc:
                        logger.warning(f"[{session_id}] Vehicle detection error: {exc}")

                plate_dets = []
                if plate_model is not None:
                    try:
                        plate_dets = yolo_service.detect_plates(
                            small,
                            plate_model,
                            confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
                        )
                        for p in plate_dets:
                            x1, y1, x2, y2 = p["bbox"]
                            p["bbox"] = [
                                int(x1 * sx), int(y1 * sy),
                                int(x2 * sx), int(y2 * sy),
                            ]
                    except Exception as exc:
                        logger.warning(f"[{session_id}] Plate detection error: {exc}")

                inference_ms = int((time.time() - t_inf) * 1000)

                # ── Associate plates to vehicles ────────────────────────────
                if vehicle_dets:
                    assignments = associate_plates_to_vehicles(vehicle_dets, plate_dets)
                else:
                    assignments = {-(i + 1): [p] for i, p in enumerate(plate_dets)}

                # Update vehicle track buffers even when no plate detected
                for vdet in vehicle_dets:
                    vid = vdet.get("track_id")
                    if vid is None:
                        continue
                    vcrop = yolo_service.crop_detection(frame, vdet["bbox"])
                    tracker.update_track(
                        track_id=vid,
                        crop=vcrop,
                        bbox=vdet["bbox"],
                        detection_confidence=vdet["confidence"],
                    )

                # ── OCR per plate-to-vehicle assignment ─────────────────────
                for vehicle_tid, plates in assignments.items():
                    for plate in plates:
                        pbbox = plate["bbox"]
                        pconf = plate["confidence"]

                        pw = pbbox[2] - pbbox[0]
                        ph = pbbox[3] - pbbox[1]
                        if pw < settings.MIN_PLATE_WIDTH or ph < settings.MIN_PLATE_HEIGHT:
                            continue

                        crop = yolo_service.crop_detection(frame, pbbox)
                        if crop.size == 0:
                            continue

                        sharpness = calculate_sharpness(crop)
                        track_id = vehicle_tid if vehicle_tid > 0 else abs(vehicle_tid) + 10000

                        tracker.update_track(
                            track_id=track_id,
                            crop=crop,
                            bbox=pbbox,
                            detection_confidence=pconf,
                        )

                        if tracker.should_run_ocr(track_id, current_frame_idx):
                            if not ocr_service.is_initialized:
                                continue
                            try:
                                ocr_res = ocr_service.recognize(crop)
                            except Exception as ocr_err:
                                logger.warning(
                                    f"[{session_id}] OCR error on track {track_id}: {ocr_err}"
                                )
                                continue

                            text = ocr_res.get("text", "")
                            ocr_conf = ocr_res.get("confidence", 0.0)
                            validity_score = ocr_res.get("validity_score", 0.0)

                            if text and ocr_conf >= settings.OCR_CONFIDENCE_THRESHOLD:
                                tracker.add_ocr_result(
                                    track_id=track_id,
                                    text=text,
                                    ocr_confidence=ocr_conf,
                                    validity_score=validity_score,
                                    sharpness=sharpness,
                                    detection_confidence=pconf,
                                    current_frame_idx=current_frame_idx,
                                )

                # ── Periodic track finalization ──────────────────────────────
                if current_frame_idx % (frame_skip * 30) == 0:
                    finalized = tracker.cleanup_stale_tracks(
                        timeout_seconds=settings.TRACK_LOST_TIMEOUT
                    )
                    for buf in finalized:
                        saved = await self._persist_track(
                            buf, source_info, source_id, session_id, frame, frame_skip
                        )
                        if saved:
                            total_detections += 1
                            unique_plates_set.add(buf.best_plate_text or "")

                # ── Progress broadcast ───────────────────────────────────────
                if processed_count % 5 == 0:
                    pct = int(frame_idx / total_frames * 100) if total_frames > 0 else 0
                    await session_repo.update_session(
                        session_id, processed_frames=frame_idx
                    )
                    await ws_manager.broadcast(
                        session_id,
                        "processing_progress",
                        {
                            "session_id": session_id,
                            "progress": pct,
                            "processed_frames": frame_idx,
                            "total_frames": total_frames,
                            "detections_count": total_detections,
                            "unique_plates": len(unique_plates_set),
                            "fps": int(fps),
                            "inference_latency": inference_ms,
                        },
                    )

        except Exception as exc:
            logger.error(f"Error processing video session {session_id}: {exc}", exc_info=True)
            await session_repo.update_session(session_id, status="error", error_message=str(exc))
            await ws_manager.broadcast(session_id, "session_error", {"message": str(exc)})
        finally:
            cap.release()

            # Finalize all remaining active tracks
            finalized = tracker.cleanup_stale_tracks(timeout_seconds=0)
            for buf in finalized:
                saved = await self._persist_track(
                    buf, source_info, source_id, session_id, None, frame_skip
                )
                if saved:
                    total_detections += 1
                    unique_plates_set.add(buf.best_plate_text or "")

            if not self.stop_flags.get(session_id, False):
                logger.info(f"Video processing completed: session={session_id}")
                await session_repo.update_session(
                    session_id,
                    status="completed",
                    processed_frames=total_frames,
                    detections_count=total_detections,
                    unique_plates=len(unique_plates_set),
                )
                await ws_manager.broadcast(
                    session_id,
                    "session_completed",
                    {
                        "session_id": session_id,
                        "total_detections": total_detections,
                        "unique_plates": len(unique_plates_set),
                    },
                )

            camera_manager.stop_cameras_by_session(session_id)
            self.stop_flags.pop(session_id, None)

    async def _persist_track(
        self,
        buf,
        source_info: SourceInfo,
        source_id: str,
        session_id: str,
        last_frame,
        frame_skip: int,
    ) -> bool:
        """
        Persists a finalized track's best plate result to MongoDB.
        Uses temporal consensus selection and fuzzy deduplication.
        Returns True if a new record was inserted.
        """
        plate_text, ocr_conf, combined_score = buf.get_consensus_plate()

        if not plate_text:
            return False
        if ocr_conf < settings.OCR_CONFIDENCE_THRESHOLD:
            return False

        try:
            is_dup, existing_id = await dedup_service.check_and_deduplicate(
                plate_number=plate_text,
                source_id=source_id,
                detection_confidence=buf.best_detection_confidence,
                ocr_confidence=ocr_conf,
                window_seconds=settings.DUPLICATE_WINDOW_SECONDS,
            )

            bbox_list = buf.best_bbox if buf.best_bbox else [0, 0, 0, 0]
            bbox_model = BoundingBox(
                x1=bbox_list[0], y1=bbox_list[1],
                x2=bbox_list[2], y2=bbox_list[3],
            )

            # Save best crop
            crop_url = None
            frame_url = None
            if buf.best_plate_crop is not None:
                crop_fname = f"crop_{session_id}_{buf.track_id}_{plate_text}.jpg"
                crop_abs = settings.crops_path / crop_fname
                try:
                    cv2.imwrite(str(crop_abs), buf.best_plate_crop)
                    crop_url = f"/crops/{crop_fname}"
                except Exception as we:
                    logger.warning(f"Failed to save crop: {we}")

            # Save annotated frame snapshot if available
            if last_frame is not None and buf.best_bbox:
                annotated = last_frame.copy()
                x1, y1, x2, y2 = bbox_list
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (247, 142, 43), 2)
                cv2.putText(
                    annotated,
                    f"{plate_text} ({int(ocr_conf*100)}%)",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (247, 142, 43),
                    2,
                )
                frame_fname = f"frame_{session_id}_{buf.track_id}_{plate_text}.jpg"
                frame_abs = settings.upload_path / frame_fname
                try:
                    cv2.imwrite(str(frame_abs), annotated)
                    frame_url = f"/uploads/{frame_fname}"
                except Exception as we:
                    logger.warning(f"Failed to save frame: {we}")

            media = MediaInfo(frame_path=frame_url, plate_crop_path=crop_url)

            if not is_dup:
                det = DetectionCreate(
                    plate_number=plate_text,
                    raw_ocr_text=plate_text,
                    detection_confidence=buf.best_detection_confidence,
                    ocr_confidence=ocr_conf,
                    track_id=buf.track_id,
                    source=source_info,
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
                    f"[video:{session_id}] NEW plate='{plate_text}' "
                    f"track={buf.track_id} score={combined_score:.4f}"
                )
                return True
            else:
                full_det = await detection_repo.get_detection(existing_id)
                if full_det:
                    await ws_manager.broadcast(
                        session_id, "detection_updated", full_det.dict()
                    )
                return False

        except Exception as exc:
            logger.error(
                f"[video:{session_id}] Track {buf.track_id} persist error: {exc}",
                exc_info=True,
            )
            return False


video_processor = VideoProcessor()
