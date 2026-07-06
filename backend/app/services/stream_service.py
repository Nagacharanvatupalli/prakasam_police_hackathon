import logging
import cv2
import asyncio
import numpy as np
import base64
import time
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

logger = logging.getLogger("trinethra.stream")

class StreamService:
    def __init__(self):
        # Maps session_id -> bool stop flag
        self.stop_flags = {}
        # Maps session_id -> frame_counter
        self.webcam_counters = {}

    def stop_session(self, session_id: str):
        self.stop_flags[session_id] = True
        logger.info(f"Stop stream signal received for session: {session_id}")

    async def process_webcam_frame(self, base64_frame: str, session_id: str, source_id: str):
        """
        Processes a single base64-encoded frame received from browser webcam WebSocket.
        """
        if session_id not in self.webcam_counters:
            self.webcam_counters[session_id] = 0
            tracking_service.reset()
            
        frame_idx = self.webcam_counters[session_id]
        self.webcam_counters[session_id] += 1

        # Decode base64 frame
        try:
            header, encoded = base64_frame.split(",", 1) if "," in base64_frame else ("", base64_frame)
            frame_data = base64.b64decode(encoded)
            np_arr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.error("Webcam frame decoding failed.")
                return
        except Exception as e:
            logger.error(f"Error decoding webcam frame base64: {e}")
            return

        # Setup source
        source_info = SourceInfo(
            type="webcam",
            source_id=source_id,
            name="Live Webcam Feed"
        )
        
        # Run detection and tracking
        h, w = frame.shape[:2]
        inference_start = time.time()
        detections = yolo_service.detect_and_track(frame, confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD)
        inference_latency_ms = int((time.time() - inference_start) * 1000)

        # Broadcast diagnostic FPS stats (simulate frame rate)
        fps = 15 # default average webcam capture rate
        await ws_manager.broadcast(session_id, "frame_processed", {
            "fps": fps,
            "latency": inference_latency_ms
        })

        for det in detections:
            bbox = det["bbox"]
            track_id = det.get("track_id")
            yolo_conf = det["confidence"]
            
            if track_id is None:
                continue

            crop = yolo_service.crop_detection(frame, bbox)
            if crop.size == 0:
                continue
                
            # Update tracking
            track = tracking_service.update_track(track_id, crop, bbox, yolo_conf)
            
            # Check throttle for OCR
            if tracking_service.should_run_ocr(track_id, frame_idx):
                ocr_res = ocr_service.recognize(crop)
                ocr_text = ocr_res["text"]
                ocr_conf = ocr_res["confidence"]
                
                if ocr_text:
                    tracking_service.add_ocr_result(track_id, ocr_text, ocr_conf, frame_idx)
                    
            final_plate, final_ocr_conf = tracking_service.get_final_plate(track_id)
            
            if final_plate and final_ocr_conf >= settings.OCR_CONFIDENCE_THRESHOLD:
                is_duplicate, existing_id = await dedup_service.check_and_deduplicate(
                    plate_number=final_plate,
                    source_id=source_id,
                    detection_confidence=yolo_conf,
                    ocr_confidence=final_ocr_conf,
                    window_seconds=settings.DUPLICATE_WINDOW_SECONDS
                )
                
                unique_id = f"{session_id}_{track_id}_{final_plate}"
                frame_filename = f"frame_{unique_id}.jpg"
                crop_filename = f"crop_{unique_id}.jpg"
                
                frame_path_abs = settings.upload_path / frame_filename
                crop_path_abs = settings.crops_path / crop_filename
                
                frame_url = f"/uploads/{frame_filename}"
                crop_url = f"/crops/{crop_filename}"

                if not is_duplicate:
                    # Save images
                    annotated_frame = frame.copy()
                    cv2.rectangle(annotated_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (247, 142, 43), 2)
                    cv2.putText(annotated_frame, f"{final_plate} (DET:{int(yolo_conf*100)}% OCR:{int(final_ocr_conf*100)}%)", (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (247, 142, 43), 2)
                    
                    cv2.imwrite(str(frame_path_abs), annotated_frame)
                    cv2.imwrite(str(crop_path_abs), crop)
                    
                    # Store DB
                    media = MediaInfo(frame_path=frame_url, plate_crop_path=crop_url)
                    bbox_model = BoundingBox(x1=bbox[0], y1=bbox[1], x2=bbox[2], y2=bbox[3])
                    
                    det_create = DetectionCreate(
                        plate_number=final_plate,
                        raw_ocr_text=final_plate,
                        detection_confidence=yolo_conf,
                        ocr_confidence=final_ocr_conf,
                        track_id=track_id,
                        source=source_info,
                        bounding_box=bbox_model,
                        media=media
                    )
                    
                    det_id = await detection_repo.insert_detection(det_create)
                    
                    # Update Session Stats in background
                    session = await session_repo.get_session(session_id)
                    if session:
                        await session_repo.update_session(
                            session_id, 
                            detections_count=session.detections_count + 1,
                            unique_plates=session.unique_plates + 1,
                            processed_frames=frame_idx + 1
                        )
                    
                    # Broadcast
                    full_det = await detection_repo.get_detection(det_id)
                    if full_det:
                        await ws_manager.broadcast(session_id, "detection_created", full_det.dict())
                else:
                    # Save crop update
                    if track["best_crop"] is crop:
                        cv2.imwrite(str(crop_path_abs), crop)
                        
                    # Update session counts
                    session = await session_repo.get_session(session_id)
                    if session:
                        await session_repo.update_session(
                            session_id,
                            processed_frames=frame_idx + 1
                        )
                        
                    # Broadcast update
                    full_det = await detection_repo.get_detection(existing_id)
                    if full_det:
                        await ws_manager.broadcast(session_id, "detection_updated", full_det.dict())

    async def start_rtsp_stream(self, rtsp_url: str, session_id: str, source_id: str, camera_name: str):
        """
        Background worker task to fetch, decode, and process frames from an RTSP stream.
        Includes reconnect logic with controlled retry backoffs.
        """
        logger.info(f"Starting RTSP stream task for session {session_id}, URL: {rtsp_url}")
        self.stop_flags[session_id] = False
        
        source_info = SourceInfo(
            type="rtsp",
            source_id=source_id,
            name=camera_name
        )
        
        max_retries = 5
        retry_delay = 1.0
        
        frame_idx = 0
        frame_skip = 5 # Process roughly 5 FPS
        
        tracking_service.reset()
        
        try:
            for retry in range(max_retries):
                if self.stop_flags.get(session_id, False):
                    break
                    
                # Broadcast reconnecting/connecting state
                status_str = "connecting" if retry == 0 else "reconnecting"
                await session_repo.update_session(session_id, status=status_str)
                await ws_manager.broadcast(session_id, "source_status", {"status": status_str})
                
                logger.info(f"RTSP Connecting attempt {retry+1}/{max_retries}...")
                cap = cv2.VideoCapture(rtsp_url)
                
                if cap.isOpened():
                    logger.info("RTSP Stream connected successfully.")
                    await session_repo.update_session(session_id, status="live")
                    await ws_manager.broadcast(session_id, "source_status", {"status": "live"})
                    
                    # Loop reading frames
                    try:
                        while cap.isOpened():
                            await asyncio.sleep(0.001)
                            
                            # Check stop flag
                            if self.stop_flags.get(session_id, False):
                                break
                                
                            ret, frame = cap.read()
                            if not ret:
                                logger.warning("RTSP read frame failed. Disconnected.")
                                await ws_manager.broadcast(session_id, "source_status", {"status": "disconnected"})
                                break
                                
                            current_frame_idx = frame_idx
                            frame_idx += 1
                            
                            if current_frame_idx % frame_skip != 0:
                                continue
                                
                            # Resizing for speed
                            h, w = frame.shape[:2]
                            process_w = 1280
                            process_h = int(h * (1280 / w)) if w > 1280 else h
                            if w > 1280:
                                small_frame = cv2.resize(frame, (process_w, process_h))
                            else:
                                small_frame = frame.copy()
                                
                            scale_x = w / process_w
                            scale_y = h / process_h
                            
                            # Process frame
                            inference_start = time.time()
                            detections = yolo_service.detect_and_track(small_frame, confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD)
                            inference_latency = int((time.time() - inference_start) * 1000)
                            
                            # Broadcast framerate diagnostic
                            await ws_manager.broadcast(session_id, "frame_processed", {
                                "fps": int(cap.get(cv2.CAP_PROP_FPS)) or 25,
                                "latency": inference_latency
                            })
                            
                            for det in detections:
                                bbox = det["bbox"]
                                track_id = det.get("track_id")
                                yolo_conf = det["confidence"]
                                
                                if track_id is None:
                                    continue
                                    
                                orig_bbox = [
                                    int(bbox[0] * scale_x),
                                    int(bbox[1] * scale_y),
                                    int(bbox[2] * scale_x),
                                    int(bbox[3] * scale_y)
                                ]
                                
                                crop = yolo_service.crop_detection(frame, orig_bbox)
                                if crop.size == 0:
                                    continue
                                    
                                track = tracking_service.update_track(track_id, crop, orig_bbox, yolo_conf)
                                
                                if tracking_service.should_run_ocr(track_id, current_frame_idx):
                                    ocr_res = ocr_service.recognize(crop)
                                    ocr_text = ocr_res["text"]
                                    ocr_conf = ocr_res["confidence"]
                                    
                                    if ocr_text:
                                        tracking_service.add_ocr_result(track_id, ocr_text, ocr_conf, current_frame_idx)
                                        
                                final_plate, final_ocr_conf = tracking_service.get_final_plate(track_id)
                                
                                if final_plate and final_ocr_conf >= settings.OCR_CONFIDENCE_THRESHOLD:
                                    is_duplicate, existing_id = await dedup_service.check_and_deduplicate(
                                        plate_number=final_plate,
                                        source_id=source_id,
                                        detection_confidence=yolo_conf,
                                        ocr_confidence=final_ocr_conf,
                                        window_seconds=settings.DUPLICATE_WINDOW_SECONDS
                                    )
                                    
                                    unique_id = f"{session_id}_{track_id}_{final_plate}"
                                    frame_filename = f"frame_{unique_id}.jpg"
                                    crop_filename = f"crop_{unique_id}.jpg"
                                    
                                    frame_path_abs = settings.upload_path / frame_filename
                                    crop_path_abs = settings.crops_path / crop_filename
                                    
                                    frame_url = f"/uploads/{frame_filename}"
                                    crop_url = f"/crops/{crop_filename}"
                                    
                                    if not is_duplicate:
                                        # Save BBox frame overlay
                                        annotated_frame = frame.copy()
                                        cv2.rectangle(annotated_frame, (orig_bbox[0], orig_bbox[1]), (orig_bbox[2], orig_bbox[3]), (247, 142, 43), 2)
                                        cv2.putText(annotated_frame, f"{final_plate} (DET:{int(yolo_conf*100)}% OCR:{int(final_ocr_conf*100)}%)", (orig_bbox[0], orig_bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (247, 142, 43), 2)
                                        
                                        cv2.imwrite(str(frame_path_abs), annotated_frame)
                                        cv2.imwrite(str(crop_path_abs), crop)
                                        
                                        media = MediaInfo(frame_path=frame_url, plate_crop_path=crop_url)
                                        bbox_model = BoundingBox(x1=orig_bbox[0], y1=orig_bbox[1], x2=orig_bbox[2], y2=orig_bbox[3])
                                        
                                        det_create = DetectionCreate(
                                            plate_number=final_plate,
                                            raw_ocr_text=final_plate,
                                            detection_confidence=yolo_conf,
                                            ocr_confidence=final_ocr_conf,
                                            track_id=track_id,
                                            source=source_info,
                                            bounding_box=bbox_model,
                                            media=media
                                        )
                                        
                                        det_id = await detection_repo.insert_detection(det_create)
                                        
                                        # Update stats
                                        session = await session_repo.get_session(session_id)
                                        if session:
                                            await session_repo.update_session(
                                                session_id,
                                                detections_count=session.detections_count + 1,
                                                unique_plates=session.unique_plates + 1,
                                                processed_frames=frame_idx
                                            )
                                            
                                        full_det = await detection_repo.get_detection(det_id)
                                        if full_det:
                                            await ws_manager.broadcast(session_id, "detection_created", full_det.dict())
                                    else:
                                        if track["best_crop"] is crop:
                                            cv2.imwrite(str(crop_path_abs), crop)
                                            
                                        session = await session_repo.get_session(session_id)
                                        if session:
                                            await session_repo.update_session(
                                                session_id,
                                                processed_frames=frame_idx
                                            )
                                            
                                        full_det = await detection_repo.get_detection(existing_id)
                                        if full_det:
                                            await ws_manager.broadcast(session_id, "detection_updated", full_det.dict())

                            # Periodic cleanup
                            if frame_idx % 100 == 0:
                                tracking_service.cleanup_stale_tracks(timeout_seconds=10)

                    except Exception as loop_err:
                        logger.error(f"Error inside RTSP processing loop: {loop_err}", exc_info=True)
                    finally:
                        cap.release()
                else:
                    cap.release()
                    
                # Break retry loop if stop flag was activated
                if self.stop_flags.get(session_id, False):
                    break
                    
                # Exponential backoff retry
                logger.warning(f"Connection failed. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(30.0, retry_delay * 2)
            
            # Ended retries or stopped
            status = "stopped" if self.stop_flags.get(session_id, False) else "error"
            await session_repo.update_session(session_id, status=status)
            await ws_manager.broadcast(session_id, "source_status", {"status": status})
            logger.info(f"RTSP stream processing finished for session: {session_id} with status: {status}")
            
        except Exception as e:
            logger.error(f"Severe error in RTSP Stream worker: {e}", exc_info=True)
            await session_repo.update_session(session_id, status="error", error_message=str(e))
            await ws_manager.broadcast(session_id, "session_error", {"message": str(e)})
        finally:
            self.stop_flags.pop(session_id, None)

stream_service = StreamService()
