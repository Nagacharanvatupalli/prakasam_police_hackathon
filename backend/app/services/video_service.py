import logging
import cv2
import asyncio
import time
from pathlib import Path
from datetime import datetime
from app.config import settings
from app.services.yolo_service import yolo_service
from app.services.ocr_service import ocr_service
from app.services.tracking_service import tracking_service
from app.services.deduplication_service import dedup_service
from app.services.websocket_service import ws_manager
from app.database.repositories.session_repository import session_repo
from app.database.repositories.detection_repository import detection_repo
from app.models.detection import DetectionCreate, BoundingBox, SourceInfo, MediaInfo

logger = logging.getLogger("trinethra.video")

class VideoProcessor:
    def __init__(self):
        # Maps session_id -> bool stop flag
        self.stop_flags = {}

    def stop_session(self, session_id: str):
        self.stop_flags[session_id] = True
        logger.info(f"Stop signal received for session: {session_id}")

    async def process_video(self, file_path: str, session_id: str, source_id: str, filename: str):
        """
        Background task to process an uploaded video frame-by-frame.
        Applies YOLO Detection, BoT-SORT Tracking, Preprocessing, EasyOCR,
        Deduplication, MongoDB storage, and live WebSockets.
        """
        logger.info(f"Starting video processing task for session: {session_id}, file: {file_path}")
        self.stop_flags[session_id] = False
        
        # 1. Open Video Capture
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            err_msg = f"Failed to open video file: {file_path}"
            logger.error(err_msg)
            await session_repo.update_session(session_id, status="error", error_message=err_msg)
            await ws_manager.broadcast(session_id, "session_error", {"message": err_msg})
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Video Info: {total_frames} frames, {fps:.2f} FPS, Duration: {duration:.2f}s")
        await session_repo.update_session(session_id, status="processing", total_frames=total_frames)
        await ws_manager.broadcast(session_id, "session_started", {
            "session_id": session_id,
            "total_frames": total_frames,
            "fps": fps
        })
        
        # Frame processing parameters
        frame_skip = 3  # Process every 3rd frame (roughly 10 FPS)
        frame_idx = 0
        processed_count = 0
        unique_plates_set = set()
        total_detections = 0
        
        # Setup source details
        source_info = SourceInfo(
            type="video",
            source_id=source_id,
            name=filename
        )
        
        tracking_service.reset()
        
        start_proc_time = time.time()
        
        try:
            while cap.isOpened():
                # Allow other async tasks to run
                await asyncio.sleep(0.001)
                
                # Check for stop flag
                if self.stop_flags.get(session_id, False):
                    logger.info(f"Stopping session {session_id} based on stop flag.")
                    await session_repo.update_session(session_id, status="stopped")
                    await ws_manager.broadcast(session_id, "source_status", {"status": "stopped"})
                    break

                ret, frame = cap.read()
                if not ret:
                    break

                current_frame_idx = frame_idx
                frame_idx += 1
                
                # Skip frames to speed up processing
                if current_frame_idx % frame_skip != 0:
                    continue

                processed_count += 1
                
                # Resizing frame slightly for faster processing if too large
                h, w = frame.shape[:2]
                process_w, process_h = w, h
                if w > 1280:
                    process_w = 1280
                    process_h = int(h * (1280 / w))
                    small_frame = cv2.resize(frame, (process_w, process_h))
                else:
                    small_frame = frame.copy()
                
                # Scale factors to map coordinates back to original frame
                scale_x = w / process_w
                scale_y = h / process_h

                inference_start = time.time()
                # Run YOLO tracking (BoT-SORT)
                # This uses Ultralytics' tracker persistence
                detections = yolo_service.detect_and_track(small_frame, confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD)
                inference_latency_ms = int((time.time() - inference_start) * 1000)

                for det in detections:
                    bbox = det["bbox"]
                    track_id = det.get("track_id")
                    yolo_conf = det["confidence"]
                    
                    if track_id is None:
                        continue # Skip un-tracked detections for video

                    # Map bounding box back to original resolution
                    orig_bbox = [
                        int(bbox[0] * scale_x),
                        int(bbox[1] * scale_y),
                        int(bbox[2] * scale_x),
                        int(bbox[3] * scale_y)
                    ]

                    # Crop plate from original frame
                    crop = yolo_service.crop_detection(frame, orig_bbox)
                    if crop.size == 0:
                        continue
                        
                    # Update tracking history
                    track = tracking_service.update_track(track_id, crop, orig_bbox, yolo_conf)
                    
                    # Decide if we should run OCR
                    if tracking_service.should_run_ocr(track_id, current_frame_idx):
                        ocr_res = ocr_service.recognize(crop)
                        ocr_text = ocr_res["text"]
                        ocr_conf = ocr_res["confidence"]
                        
                        if ocr_text:
                            tracking_service.add_ocr_result(track_id, ocr_text, ocr_conf, current_frame_idx)
                            
                    # Get temporal voted plate result
                    final_plate, final_ocr_conf = tracking_service.get_final_plate(track_id)
                    
                    if final_plate and final_ocr_conf >= settings.OCR_CONFIDENCE_THRESHOLD:
                        # Plate is recognized and confident. Run deduplication.
                        is_duplicate, existing_id = await dedup_service.check_and_deduplicate(
                            plate_number=final_plate,
                            source_id=source_id,
                            detection_confidence=yolo_conf,
                            ocr_confidence=final_ocr_conf,
                            window_seconds=settings.DUPLICATE_WINDOW_SECONDS
                        )
                        
                        # Generate saving filenames
                        unique_id = f"{session_id}_{track_id}_{final_plate}"
                        frame_filename = f"frame_{unique_id}.jpg"
                        crop_filename = f"crop_{unique_id}.jpg"
                        
                        frame_path_abs = settings.upload_path / frame_filename
                        crop_path_abs = settings.crops_path / crop_filename
                        
                        # Relative URL paths for frontend
                        frame_url = f"/uploads/{frame_filename}"
                        crop_url = f"/crops/{crop_filename}"

                        if not is_duplicate:
                            # Save media files on disk
                            # Draw bbox overlay on the saved frame
                            annotated_frame = frame.copy()
                            cv2.rectangle(
                                annotated_frame, 
                                (orig_bbox[0], orig_bbox[1]), 
                                (orig_bbox[2], orig_bbox[3]), 
                                (247, 142, 43), # Electric blue (BGR: 247, 142, 43 is actually orange/blue depending on ordering, let's use BGR electric blue: (247, 142, 43))
                                2
                            )
                            # Add text label
                            cv2.putText(
                                annotated_frame, 
                                f"{final_plate} (DET:{int(yolo_conf*100)}% OCR:{int(final_ocr_conf*100)}%)", 
                                (orig_bbox[0], orig_bbox[1] - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 
                                0.6, 
                                (247, 142, 43), 
                                2
                            )
                            
                            # Perform disk writes asynchronously
                            cv2.imwrite(str(frame_path_abs), annotated_frame)
                            cv2.imwrite(str(crop_path_abs), crop)
                            
                            # Insert into database
                            media = MediaInfo(frame_path=frame_url, plate_crop_path=crop_url)
                            bbox_model = BoundingBox(x1=orig_bbox[0], y1=orig_bbox[1], x2=orig_bbox[2], y2=orig_bbox[3])
                            
                            det_create = DetectionCreate(
                                plate_number=final_plate,
                                raw_ocr_text=final_plate,  # Normalized & raw same here or adjust
                                detection_confidence=yolo_conf,
                                ocr_confidence=final_ocr_conf,
                                track_id=track_id,
                                source=source_info,
                                bounding_box=bbox_model,
                                media=media
                            )
                            
                            det_id = await detection_repo.insert_detection(det_create)
                            unique_plates_set.add(final_plate)
                            total_detections += 1
                            
                            # Fetch full record
                            full_det = await detection_repo.get_detection(det_id)
                            if full_det:
                                # Broadcast event via WebSockets
                                await ws_manager.broadcast(session_id, "detection_created", full_det.dict())
                        else:
                            # Update existing frame crop if it's better
                            # Let's save a new crop or update
                            if track["best_crop"] is crop:
                                cv2.imwrite(str(crop_path_abs), crop)
                                
                            # Retrieve the full detection to broadcast updated status
                            full_det = await detection_repo.get_detection(existing_id)
                            if full_det:
                                await ws_manager.broadcast(session_id, "detection_updated", full_det.dict())

                # Clean up old tracks periodically (every 100 frames)
                if frame_idx % 100 == 0:
                    tracking_service.cleanup_stale_tracks(timeout_seconds=10)

                # Broadcast progress every 15 processed frames
                if processed_count % 5 == 0:
                    progress_pct = int((frame_idx / total_frames) * 100) if total_frames > 0 else 0
                    
                    progress_data = {
                        "session_id": session_id,
                        "progress": progress_pct,
                        "processed_frames": frame_idx,
                        "total_frames": total_frames,
                        "detections_count": total_detections,
                        "unique_plates": len(unique_plates_set),
                        "fps": int(fps) if fps > 0 else 10,
                        "inference_latency": inference_latency_ms
                    }
                    
                    # Update session in DB
                    await session_repo.update_session(
                        session_id, 
                        processed_frames=frame_idx,
                        detections_count=total_detections,
                        unique_plates=len(unique_plates_set)
                    )
                    
                    await ws_manager.broadcast(session_id, "processing_progress", progress_data)

            # Cap loop finished, close capture
            cap.release()
            
            # Final database session update
            if not self.stop_flags.get(session_id, False):
                logger.info(f"Video processing completed for session: {session_id}")
                await session_repo.update_session(
                    session_id, 
                    status="completed", 
                    processed_frames=total_frames,
                    detections_count=total_detections,
                    unique_plates=len(unique_plates_set)
                )
                
                await ws_manager.broadcast(session_id, "session_completed", {
                    "session_id": session_id,
                    "total_detections": total_detections,
                    "unique_plates": len(unique_plates_set)
                })

        except Exception as e:
            cap.release()
            logger.error(f"Error processing video session {session_id}: {e}", exc_info=True)
            await session_repo.update_session(session_id, status="error", error_message=str(e))
            await ws_manager.broadcast(session_id, "session_error", {"message": str(e)})
            
        finally:
            # Clean up flags
            self.stop_flags.pop(session_id, None)

video_processor = VideoProcessor()
