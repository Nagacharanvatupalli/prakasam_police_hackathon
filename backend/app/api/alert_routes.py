"""
api/alert_routes.py
-------------------
REST API endpoints for Stolen and Clone Vehicle Alerts.
Provides active feeds, historical logs, acknowledgment workflow,
and real-time tracking status modification.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException, Header, Depends

from app.config import settings
from app.database.repositories.alert_repository import alert_repo
from app.models.alert import (
    AlertListResponse,
    AlertResponse,
    AlertTrackingUpdate,
    AlertAcknowledgeUpdate,
    TrackingStatus,
)

logger = logging.getLogger("trinethra.api.alerts")
router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ─── Auth Dependency ─────────────────────────────────────────────────────────

async def verify_write_access(x_api_key: Optional[str] = Header(None)):
    """Verifies write access using API Key in header."""
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing X-API-Key header."
        )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=AlertListResponse)
async def list_active_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    tracking_status: Optional[str] = Query(None)
):
    """Retrieves all active (unacknowledged) alert records."""
    alerts, total = await alert_repo.list_alerts(
        page=page,
        page_size=page_size,
        alert_type=alert_type,
        severity=severity,
        acknowledge_status="active",
        tracking_status=tracking_status
    )
    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/history", response_model=AlertListResponse)
async def list_alert_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledge_status: Optional[str] = Query(None),
    tracking_status: Optional[str] = Query(None)
):
    """Retrieves full historical list of alerts including acknowledged/resolved ones."""
    alerts, total = await alert_repo.list_alerts(
        page=page,
        page_size=page_size,
        alert_type=alert_type,
        severity=severity,
        acknowledge_status=acknowledge_status,
        tracking_status=tracking_status
    )
    return {
        "alerts": alerts,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.patch("/{alert_id}/acknowledge", response_model=dict, dependencies=[Depends(verify_write_access)])
async def acknowledge_alert(alert_id: str, payload: AlertAcknowledgeUpdate):
    """Marks an active alert as acknowledged with optional operator note."""
    success = await alert_repo.acknowledge_alert(
        alert_id=alert_id,
        operator_name=payload.acknowledged_by,
        note=payload.note
    )
    if not success:
        raise HTTPException(status_code=404, detail="Alert record not found or already acknowledged.")
    return {"success": True, "message": "Alert status set to acknowledged."}


@router.patch("/{alert_id}/tracking", response_model=dict, dependencies=[Depends(verify_write_access)])
async def update_tracking_status(alert_id: str, payload: AlertTrackingUpdate):
    """Updates tracking/catching status of an alert with historical audit note."""
    success = await alert_repo.update_tracking_status(
        alert_id=alert_id,
        tracking_status=payload.tracking_status,
        note=payload.note
    )
    if not success:
        raise HTTPException(status_code=404, detail="Alert record not found.")
    return {"success": True, "message": f"Tracking status updated to {payload.tracking_status.value}."}
