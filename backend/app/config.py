import os
from pathlib import Path
from dotenv import load_dotenv

# Load environmental variables from .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "trinethra")
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "models/best.pt")
    
    # CORS Origins (comma separated list)
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    INFERENCE_DEVICE: str = os.getenv("INFERENCE_DEVICE", "auto")
    
    OCR_CONFIDENCE_THRESHOLD: float = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.4"))
    DETECTION_CONFIDENCE_THRESHOLD: float = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.25"))
    DUPLICATE_WINDOW_SECONDS: int = int(os.getenv("DUPLICATE_WINDOW_SECONDS", "30"))
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    CROPS_DIR: str = os.getenv("CROPS_DIR", "crops")

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        if not p.is_absolute():
            p = Path(__file__).resolve().parent.parent / p
        return p

    @property
    def crops_path(self) -> Path:
        p = Path(self.CROPS_DIR)
        if not p.is_absolute():
            p = Path(__file__).resolve().parent.parent / p
        return p

    def create_directories(self):
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.crops_path.mkdir(parents=True, exist_ok=True)
        # Also create models dir if it doesn't exist
        models_path = Path(__file__).resolve().parent.parent / "models"
        models_path.mkdir(parents=True, exist_ok=True)

settings = Settings()
