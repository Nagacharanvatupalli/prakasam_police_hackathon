"""
api/stolen_vehicle_routes.py
----------------------------
REST API endpoints for Stolen Vehicle Management module.
Includes full CRUD, status update log, reference image upload,
and sighting history queries.
"""

import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Header

from app.config import settings
from app.database.repositories.stolen_vehicle_repository import stolen_vehicle_repo
from app.models.stolen_vehicle import (
    StolenVehicleCreate,
    StolenVehicleUpdate,
    StolenVehicleStatusUpdate,
    StolenVehicleResponse,
    StolenVehicleSightingResponse,
    StolenVehicleListResponse,
)
from app.utils.validators import validate_image_file, sanitize_filename

logger = logging.getLogger("trinethra.api.stolen")
router = APIRouter(prefix="/api/stolen", tags=["stolen-vehicles"])


# ─── Auth Dependency ─────────────────────────────────────────────────────────

async def verify_write_access(x_api_key: Optional[str] = Header(None)):
    """Verifies access using simple API key in request headers."""
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing X-API-Key header."
        )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/cases", response_model=dict, dependencies=[Depends(verify_write_access)])
async def create_stolen_case(payload: StolenVehicleCreate):
    """Creates a new stolen vehicle hotlist record."""
    try:
        case_id = await stolen_vehicle_repo.create_case(payload)
        return {"success": True, "case_id": case_id, "message": "Stolen vehicle hotlist record created."}
    except Exception as e:
        logger.error(f"Failed to create stolen case: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cases", response_model=StolenVehicleListResponse)
async def list_stolen_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Lists stolen vehicle hotlist records with pagination and filters."""
    cases, total = await stolen_vehicle_repo.list_cases(
        page=page, page_size=page_size, status=status, search=search
    )
    return {
        "cases": cases,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/cases/{case_id}", response_model=StolenVehicleResponse)
async def get_stolen_case(case_id: str):
    """Retrieves detailed information of a single stolen vehicle case."""
    case = await stolen_vehicle_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Stolen vehicle record not found.")
    return case


@router.put("/cases/{case_id}", response_model=dict, dependencies=[Depends(verify_write_access)])
async def update_stolen_case(case_id: str, payload: StolenVehicleUpdate):
    """Updates stolen vehicle details."""
    success = await stolen_vehicle_repo.update_case(case_id, payload)
    if not success:
        raise HTTPException(status_code=404, detail="Stolen vehicle case not found or no change made.")
    return {"success": True, "message": "Stolen vehicle details updated."}


@router.patch("/cases/{case_id}/status", response_model=dict, dependencies=[Depends(verify_write_access)])
async def update_stolen_case_status(case_id: str, payload: StolenVehicleStatusUpdate):
    """Updates case status (stolen, identified, recovered, tracking, caught, closed) with operator note."""
    success = await stolen_vehicle_repo.update_status(
        case_id=case_id,
        new_status=payload.status,
        note=payload.note,
        changed_by=payload.changed_by
    )
    if not success:
        raise HTTPException(status_code=404, detail="Stolen vehicle case not found.")
    return {"success": True, "message": f"Case status updated to {payload.status.value}."}


@router.post("/cases/{case_id}/upload-image", response_model=dict, dependencies=[Depends(verify_write_access)])
async def upload_reference_image(case_id: str, file: UploadFile = File(...)):
    """Uploads reference image for stolen vehicle identification."""
    if not validate_image_file(file.filename, file.content_type):
        raise HTTPException(status_code=400, detail="Invalid image file format. Supported: JPG, PNG, WEBP.")

    settings.create_directories()
    ext = Path(file.filename).suffix
    safe_name = f"{case_id}_{uuid.uuid4().hex}{ext}"
    output_path = settings.stolen_images_path / safe_name

    try:
        with output_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save stolen vehicle image: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    image_url = f"/stolen_images/{safe_name}"
    await stolen_vehicle_repo.update_reference_image(case_id, image_url)
    return {"success": True, "reference_image_url": image_url}


@router.get("/cases/{case_id}/sightings", response_model=dict)
async def get_case_sightings(
    case_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Returns sighting history for a stolen vehicle case."""
    sightings, total = await stolen_vehicle_repo.list_sightings(case_id, page, page_size)
    return {
        "sightings": sightings,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/identified", response_model=dict)
async def get_identified_vehicles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Returns all identified vehicle sighting events joined with case information."""
    docs, total = await stolen_vehicle_repo.get_identified_vehicles(page, page_size)
    
    # Map raw mongo docs to response format for consistent structure
    results = []
    for doc in docs:
        results.append({
            "sighting_id": str(doc["_id"]),
            "plate_number": doc["ocr_plate_text"],
            "camera_id": doc["camera_id"],
            "camera_name": doc.get("camera_name", doc["camera_id"]),
            "camera_location": doc.get("camera_location", ""),
            "detected_at": doc["detected_at"],
            "ocr_confidence": doc.get("ocr_confidence", 0.0),
            "detection_confidence": doc.get("detection_confidence", 0.0),
            "match_type": doc.get("match_type", "exact"),
            "match_score": doc.get("match_score", 1.0),
            "tracking_status": doc.get("tracking_status", "detected"),
            "plate_crop_path": doc.get("plate_crop_path"),
            "frame_image_path": doc.get("frame_image_path"),
            # Embedded case data
            "case": {
                "case_id": doc["case"]["_id"],
                "vehicle_number": doc["case"]["vehicle_number"],
                "fir_number": doc["case"].get("fir_number"),
                "police_station": doc["case"].get("police_station"),
                "owner_name": doc["case"].get("owner_name"),
                "contact_number": doc["case"].get("contact_number"),
                "status": doc["case"]["status"]
            }
        })
        
    return {
        "identified_vehicles": results,
        "total": total,
        "page": page,
        "page_size": page_size
    }
