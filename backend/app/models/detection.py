from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class SourceInfo(BaseModel):
    type: str  # image, video, webcam, rtsp
    source_id: str
    name: str

class MediaInfo(BaseModel):
    frame_path: Optional[str] = None
    plate_crop_path: Optional[str] = None

class DetectionCreate(BaseModel):
    plate_number: str
    raw_ocr_text: str
    detection_confidence: float
    ocr_confidence: float
    track_id: Optional[int] = None
    source: SourceInfo
    bounding_box: BoundingBox
    media: Optional[MediaInfo] = None
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None

class DetectionDocument(DetectionCreate):
    id: str = Field(alias="_id")
    first_seen: datetime
    last_seen: datetime
    occurrence_count: int
    status: str = "verified"  # verified, detected, low_confidence, suspicious, watchlist
    created_at: datetime

class DetectionResponse(BaseModel):
    id: str
    plate_number: str
    raw_ocr_text: str
    detection_confidence: float
    ocr_confidence: float
    track_id: Optional[int] = None
    source: SourceInfo
    bounding_box: BoundingBox
    media: Optional[MediaInfo] = None
    first_seen: datetime
    last_seen: datetime
    occurrence_count: int
    status: str
    created_at: datetime
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None

    class Config:
        populate_by_name = True

class DetectionListResponse(BaseModel):
    detections: List[DetectionResponse]
    total: int
    page: int
    page_size: int
