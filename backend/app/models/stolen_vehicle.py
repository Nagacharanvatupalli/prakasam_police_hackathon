"""
models/stolen_vehicle.py
------------------------
Pydantic v2 models for stolen vehicle case management.

Collections used:
  - stolen_vehicle_cases     : One document per stolen vehicle FIR case
  - stolen_vehicle_sightings : Immutable append-only sighting events
  - case_status_history      : Embedded list inside each case document
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class StolenVehicleStatus(str, Enum):
    STOLEN = "stolen"
    UNDER_INVESTIGATION = "under_investigation"
    IDENTIFIED = "identified"
    TRACKING = "tracking"
    CAUGHT = "caught"
    RECOVERED = "recovered"
    CLOSED = "closed"


class SightingMatchType(str, Enum):
    EXACT = "exact"          # similarity >= STOLEN_MATCH_EXACT_THRESHOLD
    PROBABLE = "probable"    # similarity >= STOLEN_MATCH_FUZZY_THRESHOLD
    REVIEW = "review"        # similarity below fuzzy threshold, flagged for manual review


# ─── Sub-models ───────────────────────────────────────────────────────────────

class CaseStatusHistoryEntry(BaseModel):
    """Immutable entry appended every time the case status changes."""
    status: StolenVehicleStatus
    changed_at: datetime
    changed_by: str = "system"
    note: Optional[str] = None


# ─── Request Bodies ───────────────────────────────────────────────────────────

class StolenVehicleCreate(BaseModel):
    vehicle_number: str                          # Raw plate as entered by user
    vehicle_type: Optional[str] = None           # Car, Motorcycle, Truck, etc.
    vehicle_model: Optional[str] = None          # e.g. Hyundai Creta
    vehicle_color: Optional[str] = None
    owner_name: Optional[str] = None
    contact_number: Optional[str] = None
    fir_number: Optional[str] = None             # FIR / case number
    police_station: Optional[str] = None
    reported_date: Optional[datetime] = None
    description: Optional[str] = None
    status: StolenVehicleStatus = StolenVehicleStatus.STOLEN


class StolenVehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    owner_name: Optional[str] = None
    contact_number: Optional[str] = None
    fir_number: Optional[str] = None
    police_station: Optional[str] = None
    reported_date: Optional[datetime] = None
    description: Optional[str] = None
    reference_image: Optional[str] = None


class StolenVehicleStatusUpdate(BaseModel):
    status: StolenVehicleStatus
    note: Optional[str] = None
    changed_by: str = "operator"


# ─── Response Models ──────────────────────────────────────────────────────────

class StolenVehicleResponse(BaseModel):
    id: str
    vehicle_number: str
    normalized_plate_number: str
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    owner_name: Optional[str] = None
    contact_number: Optional[str] = None
    fir_number: Optional[str] = None
    police_station: Optional[str] = None
    reported_date: Optional[datetime] = None
    description: Optional[str] = None
    reference_image: Optional[str] = None        # Path/URL to stored reference image
    status: StolenVehicleStatus
    status_history: List[CaseStatusHistoryEntry] = []
    sighting_count: int = 0
    last_sighted_at: Optional[datetime] = None
    last_sighted_camera: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class StolenVehicleListResponse(BaseModel):
    cases: List[StolenVehicleResponse]
    total: int
    page: int
    page_size: int


# ─── Sighting Models ──────────────────────────────────────────────────────────

class StolenVehicleSightingCreate(BaseModel):
    """Internal — created by stolen_vehicle_service, never by end user."""
    case_id: str                         # FK to stolen_vehicle_cases._id
    normalized_plate: str
    ocr_plate_text: str                  # Raw OCR output
    camera_id: str
    camera_name: str
    camera_location: str
    detection_id: str                    # FK to detections._id
    frame_image_path: Optional[str] = None
    plate_crop_path: Optional[str] = None
    ocr_confidence: float
    detection_confidence: float
    match_type: SightingMatchType
    match_score: float                   # 0.0 – 1.0
    tracking_status: str = "detected"    # detected | tracking | notified | caught | lost


class StolenVehicleSightingResponse(BaseModel):
    id: str
    case_id: str
    normalized_plate: str
    ocr_plate_text: str
    camera_id: str
    camera_name: str
    camera_location: str
    detection_id: str
    frame_image_path: Optional[str] = None
    plate_crop_path: Optional[str] = None
    ocr_confidence: float
    detection_confidence: float
    match_type: SightingMatchType
    match_score: float
    tracking_status: str
    detected_at: datetime
    created_at: datetime

    class Config:
        populate_by_name = True


class StolenVehicleSightingListResponse(BaseModel):
    sightings: List[StolenVehicleSightingResponse]
    total: int
