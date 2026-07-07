"""
api/clone_routes.py
-------------------
REST API endpoints for Clone Vehicle Analysis module.
Allows listing clone cases, updating investigative status,
querying multi-evidence lists, and reading score weights configuration.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Header

from app.config import settings
from app.database.repositories.clone_repository import clone_repo
from app.models.clone import (
    CloneCaseResponse,
    CloneCaseStatus,
    CloneCaseStatusUpdate,
    CloneCaseListResponse,
    CloneScoreConfigResponse,
)

logger = logging.getLogger("trinethra.api.clone")
router = APIRouter(prefix="/api/clone", tags=["clone-analysis"])


# ─── Auth Dependency ─────────────────────────────────────────────────────────

async def verify_write_access(x_api_key: Optional[str] = Header(None)):
    """Verifies access using simple API key in request headers."""
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing X-API-Key header."
        )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/cases", response_model=CloneCaseListResponse)
async def list_clone_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None)
):
    """Lists suspected clone cases with status filters."""
    cases, total = await clone_repo.list_cases(page=page, page_size=page_size, status=status)
    return {
        "cases": cases,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/cases/{case_id}", response_model=CloneCaseResponse)
async def get_clone_case(case_id: str):
    """Retrieves single clone case status details."""
    case = await clone_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Clone case record not found.")
    return case


@router.patch("/cases/{case_id}/status", response_model=dict, dependencies=[Depends(verify_write_access)])
async def update_clone_case_status(case_id: str, payload: CloneCaseStatusUpdate):
    """
    Updates the investigative status of a clone case
    (pending, confirmed, false_positive, resolved).
    """
    success = await clone_repo.update_status(
        case_id=case_id,
        new_status=payload.status,
        note=payload.note,
        updated_by=payload.updated_by
    )
    if not success:
        raise HTTPException(status_code=404, detail="Clone case record not found.")
        
    return {
        "success": True, 
        "message": f"Clone case status updated to {payload.status.value}."
    }


@router.get("/cases/{case_id}/evidence", response_model=dict)
async def get_case_evidence(
    case_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Retrieves all append-only evidence sightings collected for a clone case."""
    evidence, total = await clone_repo.list_evidence(case_id, page, page_size)
    return {
        "evidence": evidence,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/score-config", response_model=CloneScoreConfigResponse)
async def get_score_config():
    """Returns configured clone suspicion weights and thresholds."""
    return {
        "weight_plate_match": settings.CLONE_WEIGHT_PLATE_MATCH,
        "weight_appearance_diff": settings.CLONE_WEIGHT_APPEARANCE_DIFF,
        "weight_color_diff": settings.CLONE_WEIGHT_COLOR_DIFF,
        "weight_class_diff": settings.CLONE_WEIGHT_CLASS_DIFF,
        "weight_spatial_temporal": settings.CLONE_WEIGHT_SPATIAL_TEMPORAL,
        "suspicion_threshold": settings.CLONE_SUSPICION_THRESHOLD,
        "impossible_travel_speed_kmh": settings.CLONE_IMPOSSIBLE_TRAVEL_SPEED_KMH,
        "analysis_window_seconds": settings.CLONE_ANALYSIS_WINDOW_SECONDS
    }
