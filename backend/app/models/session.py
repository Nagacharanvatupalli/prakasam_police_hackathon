from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class SessionCreate(BaseModel):
    source_type: str  # image, video, webcam, rtsp
    source_name: str
    source_config: Optional[Dict[str, Any]] = None

class SessionDocument(SessionCreate):
    id: str = Field(alias="_id")
    status: str  # created, processing, paused, completed, error, stopped
    total_frames: Optional[int] = None
    processed_frames: int = 0
    detections_count: int = 0
    unique_plates: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class SessionResponse(BaseModel):
    id: str
    source_type: str
    source_name: str
    source_config: Optional[Dict[str, Any]] = None
    status: str
    total_frames: Optional[int] = None
    processed_frames: int
    detections_count: int
    unique_plates: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
