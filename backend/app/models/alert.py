"""
models/alert.py
---------------
Pydantic v2 models for the real-time alert system.

Collection used:
  - alerts : Persisted before WebSocket broadcast to survive network failures
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class AlertType(str, Enum):
    STOLEN_VEHICLE = "stolen_vehicle"
    STOLEN_PROBABLE = "stolen_probable"  # High-confidence fuzzy match
    STOLEN_REVIEW = "stolen_review"      # Low-confidence candidate
    CLONE_SUSPICION = "clone_suspicion"
    CLONE_CONFIRMED = "clone_confirmed"
    SYSTEM = "system"


class AlertSeverity(str, Enum):
    CRITICAL = "critical"   # Exact stolen match or confirmed clone
    HIGH = "high"           # Probable match
    MEDIUM = "medium"       # Review candidate / pending clone
    LOW = "low"             # Informational


class TrackingStatus(str, Enum):
    DETECTED = "detected"
    TRACKING = "tracking"
    POLICE_NOTIFIED = "police_notified"
    INTERCEPTION_IN_PROGRESS = "interception_in_progress"
    CAUGHT = "caught"
    RECOVERED = "recovered"
    LOST_TRACK = "lost_track"


class AlertAcknowledgeStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


# ─── Request Bodies ───────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    """Internal — created by alert_service, never directly by end user."""
    alert_type: AlertType
    severity: AlertSeverity
    plate_number: str
    normalized_plate: str
    camera_id: str
    camera_name: str
    camera_location: str
    detection_id: str
    frame_image_path: Optional[str] = None
    plate_crop_path: Optional[str] = None
    ocr_confidence: float
    detection_confidence: float
    match_confidence: float = 0.0       # Similarity score for stolen match
    # Stolen vehicle specific
    case_id: Optional[str] = None       # FK to stolen_vehicle_cases._id or clone_cases._id
    case_fir_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    owner_name: Optional[str] = None
    # Dedup key stored in DB to prevent re-creating duplicate alerts
    dedup_key: str = ""


class AlertTrackingUpdate(BaseModel):
    tracking_status: TrackingStatus
    note: Optional[str] = None
    updated_by: str = "operator"


class AlertAcknowledgeUpdate(BaseModel):
    acknowledged_by: str = "operator"
    note: Optional[str] = None


# ─── Response Models ──────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    alert_type: AlertType
    severity: AlertSeverity
    plate_number: str
    normalized_plate: str
    camera_id: str
    camera_name: str
    camera_location: str
    detection_id: str
    frame_image_path: Optional[str] = None
    plate_crop_path: Optional[str] = None
    ocr_confidence: float
    detection_confidence: float
    match_confidence: float
    case_id: Optional[str] = None
    case_fir_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    owner_name: Optional[str] = None
    tracking_status: TrackingStatus
    acknowledge_status: AlertAcknowledgeStatus
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    detected_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
    page: int
    page_size: int
