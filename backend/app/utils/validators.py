import re
import uuid
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

def validate_image_file(filename: str, content_type: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in IMAGE_EXTENSIONS or "image" in content_type.lower()

def validate_video_file(filename: str, content_type: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in VIDEO_EXTENSIONS or "video" in content_type.lower()

def sanitize_filename(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if not ext:
        ext = ".jpg"
    return f"{uuid.uuid4()}{ext}"

def validate_rtsp_url(url: str) -> bool:
    if not url:
        return False
    # Must start with rtsp:// or rtsps://
    return url.lower().startswith("rtsp://") or url.lower().startswith("rtsps://")

def validate_file_size(size_bytes: int, max_mb: int) -> bool:
    max_bytes = max_mb * 1024 * 1024
    return size_bytes <= max_bytes
