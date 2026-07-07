"""
models/clone.py
---------------
Pydantic v2 models for clone vehicle analysis.

Collections used:
  - clone_cases    : One document per unique plate suspected of cloning
  - clone_evidence : Append-only evidence records per case
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class CloneCaseStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"
    RESOLVED = "resolved"


class ClonePattern(str, Enum):
    SPATIAL_TEMPORAL = "spatial_temporal"       # Impossible travel time between cameras
    VEHICLE_CLASS_MISMATCH = "vehicle_class_mismatch"  # Same plate, different vehicle class
    COLOR_MISMATCH = "color_mismatch"           # Same plate, significantly different color
    ALTERNATING_OCR = "alternating_ocr"         # OCR alternates between two plates repeatedly
    PLATE_FORMAT_ANOMALY = "plate_format_anomaly"  # Plate doesn't match expected format
    HISTORICAL_BEHAVIOR_CHANGE = "historical_behavior_change"  # Sudden pattern change
    MULTI_CAMERA_FREQUENCY = "multi_camera_frequency"  # Unusual cross-camera frequency
    OCR_CONFUSION = "ocr_confusion"             # Confusable characters (0/O, 1/I, etc.)
    SEQUENTIAL_ORDER_VIOLATION = "sequential_order_violation"  # Appeared at wrong camera sequence
    APPEARANCE_EMBEDDING = "appearance_embedding"  # Visual embedding mismatch


# ─── Score Breakdown Model ─────────────────────────────────────────────────────

class CloneScoreBreakdown(BaseModel):
    """
    Detailed breakdown of how the final clone suspicion score was computed.
    Each sub-score is 0.0–1.0. The final_clone_score is the weighted sum.
    """
    plate_match_score: float = 0.0        # How well plates match (1.0 = identical OCR)
    appearance_diff_score: float = 0.0    # Visual embedding difference (0=same, 1=very different)
    color_diff_score: float = 0.0         # Color difference score (0=same, 1=very different)
    vehicle_class_diff_score: float = 0.0 # Class mismatch (0=same class, 1=different class)
    spatial_temporal_score: float = 0.0   # Impossibility score (0=plausible, 1=impossible)
    ocr_confidence_a: float = 0.0         # OCR confidence for detection A
    ocr_confidence_b: float = 0.0         # OCR confidence for detection B
    detection_confidence_a: float = 0.0   # YOLO confidence for detection A
    detection_confidence_b: float = 0.0   # YOLO confidence for detection B
    final_clone_score: float = 0.0        # Weighted composite score (0.0–1.0)
    patterns_triggered: List[ClonePattern] = []
    reason_text: str = ""                  # Human-readable explanation
    travel_time_minutes: Optional[float] = None
    estimated_distance_km: Optional[float] = None


# ─── Evidence Model ────────────────────────────────────────────────────────────

class CloneEvidenceCreate(BaseModel):
    """Internal — created by clone_analysis_service."""
    case_id: str                           # FK to clone_cases._id
    plate_number: str
    # Detection A (earlier sighting)
    detection_a_id: str
    camera_a_id: str
    camera_a_name: str
    camera_a_location: str
    timestamp_a: datetime
    frame_image_a: Optional[str] = None
    plate_crop_a: Optional[str] = None
    vehicle_class_a: Optional[str] = None
    vehicle_color_a: Optional[str] = None
    # Detection B (later sighting that triggered suspicion)
    detection_b_id: str
    camera_b_id: str
    camera_b_name: str
    camera_b_location: str
    timestamp_b: datetime
    frame_image_b: Optional[str] = None
    plate_crop_b: Optional[str] = None
    vehicle_class_b: Optional[str] = None
    vehicle_color_b: Optional[str] = None
    # Score breakdown
    score_breakdown: CloneScoreBreakdown


class CloneEvidenceResponse(BaseModel):
    id: str
    case_id: str
    plate_number: str
    detection_a_id: str
    camera_a_id: str
    camera_a_name: str
    camera_a_location: str
    timestamp_a: datetime
    frame_image_a: Optional[str] = None
    plate_crop_a: Optional[str] = None
    vehicle_class_a: Optional[str] = None
    vehicle_color_a: Optional[str] = None
    detection_b_id: str
    camera_b_id: str
    camera_b_name: str
    camera_b_location: str
    timestamp_b: datetime
    frame_image_b: Optional[str] = None
    plate_crop_b: Optional[str] = None
    vehicle_class_b: Optional[str] = None
    vehicle_color_b: Optional[str] = None
    score_breakdown: CloneScoreBreakdown
    recorded_at: datetime

    class Config:
        populate_by_name = True


# ─── Case Models ───────────────────────────────────────────────────────────────

class CloneCaseStatusUpdate(BaseModel):
    status: CloneCaseStatus
    note: Optional[str] = None
    updated_by: str = "operator"


class CloneCaseResponse(BaseModel):
    id: str
    plate_number: str
    normalized_plate: str
    status: CloneCaseStatus
    max_clone_score: float              # Highest score ever recorded for this case
    occurrence_count: int               # How many evidence records exist
    patterns_seen: List[ClonePattern] = []
    first_detected_at: datetime
    last_detected_at: datetime
    latest_reason: str = ""
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class CloneCaseListResponse(BaseModel):
    cases: List[CloneCaseResponse]
    total: int
    page: int
    page_size: int


class CloneScoreConfigResponse(BaseModel):
    """Returns the current scoring weights so the UI can display them."""
    weight_plate_match: float
    weight_appearance_diff: float
    weight_color_diff: float
    weight_class_diff: float
    weight_spatial_temporal: float
    suspicion_threshold: float
    impossible_travel_speed_kmh: float
    analysis_window_seconds: int
