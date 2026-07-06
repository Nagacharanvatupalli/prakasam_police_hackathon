import logging
import uuid
import cv2
import shutil
import numpy as np
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from app.config import settings
from app.utils.validators import (
    validate_image_file, validate_video_file, sanitize_filename, 
    validate_rtsp_url, validate_file_size
)
from app.utils.plate_normalizer import normalize_plate
from app.database.repositories.session_repository import session_repo
from app.database.repositories.detection_repository import detection_repo
from app.services.yolo_service import yolo_service
from app.services.ocr_service import ocr_service
from app.services.deduplication_service import dedup_service
from app.services.video_service import video_processor
from app.services.stream_service import stream_service
from app.services.websocket_service import ws_manager
from app.models.detection import DetectionCreate, BoundingBox, SourceInfo, MediaInfo

logger = logging.getLogger("trinethra.api.live")
router = APIRouter(prefix="/api/live", tags=["live"])

@router.post("/image")
async def process_image_upload(file: UploadFile = File(...)):
    """
    Upload and process a single image.
    Performs YOLO detection, crops plates, runs EasyOCR, persists to DB, and returns annotated image.
    Gracefully handles missing services (YOLO, OCR, MongoDB) without crashing.
    """
    if not validate_image_file(file.filename, file.content_type):
        raise HTTPException(status_code=400, detail="Unsupported image format. Allowed: JPG, JPEG, PNG, WEBP.")

    # Create directories if needed
    settings.create_directories()
    
    # Save uploaded file
    sanitized_name = sanitize_filename(file.filename)
    upload_path = settings.upload_path / sanitized_name
    
    try:
        with upload_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Read image with OpenCV
    try:
        img = cv2.imread(str(upload_path))
        if img is None:
            upload_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Uploaded image file is corrupt or invalid.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading image with OpenCV: {e}")
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not read the image file: {str(e)}")

    # Create session identifiers for this image
    session_id = str(uuid.uuid4())
    source_id = f"IMG-{str(uuid.uuid4())[:8].upper()}"
    source_info = SourceInfo(
        type="image",
        source_id=source_id,
        name=file.filename
    )
    
    annotated_img = img.copy()
    annotated_url = f"/uploads/{sanitized_name}"
    results = []

    # ── YOLO Detection Phase ──────────────────────────────────
    if not yolo_service.is_loaded:
        logger.warning("YOLO model not loaded — skipping detection, returning uploaded image as-is.")
        cv2.imwrite(str(upload_path), annotated_img)
        return {
            "detections": [],
            "annotated_image_url": annotated_url,
            "session_id": session_id,
            "source_id": source_id
        }

    try:
        detections = yolo_service.detect(img, confidence_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD)
    except Exception as e:
        logger.error(f"YOLO inference failed: {e}")
        cv2.imwrite(str(upload_path), annotated_img)
        return {
            "detections": [],
            "annotated_image_url": annotated_url,
            "session_id": session_id,
            "source_id": source_id
        }

    # ── OCR + DB Persistence Phase ────────────────────────────
    for i, det in enumerate(detections):
        try:
            bbox = det["bbox"]
            yolo_conf = det["confidence"]
            
            crop = yolo_service.crop_detection(img, bbox)
            if crop.size == 0:
                continue
                
            # Run OCR (skip if not initialized — still draw bounding box)
            plate_text = ""
            ocr_conf = 0.0
            if ocr_service.is_initialized:
                try:
                    ocr_res = ocr_service.recognize(crop)
                    plate_text = ocr_res["text"]
                    ocr_conf = ocr_res["confidence"]
                except Exception as ocr_err:
                    logger.warning(f"OCR failed on detection {i}: {ocr_err}")
            else:
                logger.warning("OCR service not initialized — skipping text recognition.")

            # Draw bounding box on annotated image regardless of OCR result
            label = f"{plate_text} ({int(ocr_conf*100)}%)" if plate_text else f"Object ({int(yolo_conf*100)}%)"
            cv2.rectangle(annotated_img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (247, 142, 43), 2)
            cv2.putText(
                annotated_img, 
                label, 
                (bbox[0], bbox[1] - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.6, 
                (247, 142, 43), 
                2
            )

            if not plate_text:
                continue

            # Save crop image
            crop_filename = f"crop_{session_id}_{i}_{plate_text}.jpg"
            crop_path = settings.crops_path / crop_filename
            try:
                cv2.imwrite(str(crop_path), crop)
            except Exception as write_err:
                logger.warning(f"Failed to save crop image: {write_err}")
            
            crop_url = f"/crops/{crop_filename}"
            frame_url = f"/uploads/{sanitized_name}"
            
            bbox_model = BoundingBox(x1=bbox[0], y1=bbox[1], x2=bbox[2], y2=bbox[3])
            media = MediaInfo(frame_path=frame_url, plate_crop_path=crop_url)

            # ── Database persistence (gracefully skip if MongoDB is down) ──
            try:
                is_duplicate, existing_id = await dedup_service.check_and_deduplicate(
                    plate_number=plate_text,
                    source_id=source_id,
                    detection_confidence=yolo_conf,
                    ocr_confidence=ocr_conf,
                    window_seconds=settings.DUPLICATE_WINDOW_SECONDS
                )

                if not is_duplicate:
                    det_create = DetectionCreate(
                        plate_number=plate_text,
                        raw_ocr_text=plate_text,
                        detection_confidence=yolo_conf,
                        ocr_confidence=ocr_conf,
                        track_id=None,
                        source=source_info,
                        bounding_box=bbox_model,
                        media=media
                    )
                    det_id = await detection_repo.insert_detection(det_create)
                    db_det = await detection_repo.get_detection(det_id)
                    if db_det:
                        results.append(db_det)
                        try:
                            await ws_manager.broadcast_all("detection_created", db_det.dict())
                        except Exception:
                            pass
                else:
                    db_det = await detection_repo.get_detection(existing_id)
                    if db_det:
                        results.append(db_det)
                        try:
                            await ws_manager.broadcast_all("detection_updated", db_det.dict())
                        except Exception:
                            pass
            except Exception as db_err:
                logger.warning(f"Database persistence failed for plate {plate_text}: {db_err}")
                # Build a local result dict so the frontend still gets data even without DB
                from datetime import datetime as dt
                local_result = {
                    "id": f"local-{session_id}-{i}",
                    "plate_number": plate_text,
                    "raw_ocr_text": plate_text,
                    "detection_confidence": yolo_conf,
                    "ocr_confidence": ocr_conf,
                    "track_id": None,
                    "source": source_info.dict(),
                    "bounding_box": bbox_model.dict(),
                    "media": media.dict(),
                    "first_seen": dt.utcnow().isoformat(),
                    "last_seen": dt.utcnow().isoformat(),
                    "occurrence_count": 1,
                    "status": "verified" if ocr_conf >= 0.6 else "low_confidence",
                    "created_at": dt.utcnow().isoformat()
                }
                results.append(local_result)

        except Exception as det_err:
            logger.error(f"Error processing detection {i}: {det_err}")
            continue

    # Write annotated image
    try:
        cv2.imwrite(str(upload_path), annotated_img)
    except Exception as e:
        logger.error(f"Failed to write annotated image: {e}")

    return {
        "detections": results,
        "annotated_image_url": annotated_url,
        "session_id": session_id,
        "source_id": source_id
    }

@router.post("/video")
async def process_video_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a video file and spawn a background task to process it.
    Returns session_id immediately.
    """
    if not validate_video_file(file.filename, file.content_type):
        raise HTTPException(status_code=400, detail="Unsupported video format. Allowed: MP4, AVI, MOV, MKV, WEBM.")

    settings.create_directories()
    
    sanitized_name = sanitize_filename(file.filename)
    upload_path = settings.upload_path / sanitized_name
    
    try:
        with upload_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded video file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded video file.")

    # Create session entry in DB
    session_id = await session_repo.create_session({
        "source_type": "video",
        "source_name": file.filename,
        "source_config": {"file_path": str(upload_path)}
    })
    
    source_id = f"VID-{session_id[:8].upper()}"
    
    # Spawn background task
    background_tasks.add_task(
        video_processor.process_video,
        file_path=str(upload_path),
        session_id=session_id,
        source_id=source_id,
        filename=file.filename
    )
    
    return {
        "session_id": session_id,
        "source_id": source_id,
        "message": "Video upload successful. Background analysis started."
    }

@router.post("/webcam/session")
async def create_webcam_session():
    """
    Registers a new live webcam streaming session.
    """
    session_id = await session_repo.create_session({
        "source_type": "webcam",
        "source_name": "Live Webcam Feed",
        "source_config": {}
    })
    source_id = f"WBC-{session_id[:8].upper()}"
    
    # Instantly make status 'live'
    await session_repo.update_session(session_id, status="live")
    
    return {
        "session_id": session_id,
        "source_id": source_id
    }

@router.post("/rtsp")
async def connect_rtsp_stream(
    background_tasks: BackgroundTasks,
    camera_name: str = Form(...),
    location: str = Form(...),
    rtsp_url: str = Form(...)
):
    """
    Registers a new RTSP camera connection and spawns a background stream listener.
    """
    if not validate_rtsp_url(rtsp_url):
        raise HTTPException(status_code=400, detail="Invalid RTSP URL. Must start with rtsp:// or rtsps://")
        
    session_id = await session_repo.create_session({
        "source_type": "rtsp",
        "source_name": camera_name,
        "source_config": {
            "location": location,
            "rtsp_url": rtsp_url
        }
    })
    source_id = f"RTS-{session_id[:8].upper()}"
    
    # Start RTSP feed background thread
    background_tasks.add_task(
        stream_service.start_rtsp_stream,
        rtsp_url=rtsp_url,
        session_id=session_id,
        source_id=source_id,
        camera_name=camera_name
    )
    
    return {
        "session_id": session_id,
        "source_id": source_id
    }

@router.post("/stop/{session_id}")
async def stop_session(session_id: str):
    """
    Stops an active processing session (video or RTSP stream).
    """
    session = await session_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if session.status in ["processing", "live", "connecting", "reconnecting"]:
        video_processor.stop_session(session_id)
        stream_service.stop_session(session_id)
        await session_repo.update_session(session_id, status="stopped")
        await ws_manager.broadcast(session_id, "source_status", {"status": "stopped"})
        
    return {"status": "stopped", "session_id": session_id}

@router.get("/sessions")
async def get_sessions(status: str = Query(None)):
    """
    Lists active/recent processing sessions.
    """
    sessions = await session_repo.list_sessions(status=status)
    return sessions

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """
    Terminates and deletes a session record.
    """
    session = await session_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # Stop background tasks
    video_processor.stop_session(session_id)
    stream_service.stop_session(session_id)
    
    # Delete from DB
    await session_repo.delete_session(session_id)
    return {"success": True, "message": f"Session {session_id} deleted."}

@router.get("/detections")
async def get_detections(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_id: str = Query(None),
    plate_number: str = Query(None)
):
    """
    Returns list of detections with pagination and search filters.
    """
    detections, total = await detection_repo.list_detections(
        page=page, page_size=page_size, source_id=source_id, plate_number=plate_number
    )
    return {
        "detections": detections,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/detections/{detection_id}")
async def get_detection(detection_id: str):
    """
    Returns detailed configuration for a single detection card.
    """
    detection = await detection_repo.get_detection(detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found.")
    return detection
