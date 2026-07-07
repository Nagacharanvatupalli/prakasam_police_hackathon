import os
from pathlib import Path
from dotenv import load_dotenv

# Load environmental variables from .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    # ─── Core ────────────────────────────────────────────────────────────────
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

    # ─── Detection Thresholds ─────────────────────────────────────────────────
    OCR_CONFIDENCE_THRESHOLD: float = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.4"))
    DETECTION_CONFIDENCE_THRESHOLD: float = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.25"))
    DUPLICATE_WINDOW_SECONDS: int = int(os.getenv("DUPLICATE_WINDOW_SECONDS", "30"))

    # ─── Multi-Camera Pipeline ────────────────────────────────────────────────
    MAX_CAMERAS: int = int(os.getenv("MAX_CAMERAS", "8"))
    FRAME_QUEUE_SIZE: int = int(os.getenv("FRAME_QUEUE_SIZE", "5"))
    FRAME_SKIP: int = int(os.getenv("FRAME_SKIP", "3"))
    TRACK_LOST_TIMEOUT: int = int(os.getenv("TRACK_LOST_TIMEOUT", "10"))

    # ─── OCR Triggering ───────────────────────────────────────────────────────
    OCR_INTERVAL: int = int(os.getenv("OCR_INTERVAL", "10"))  # frames between OCR runs per track
    MAX_OCR_ATTEMPTS: int = int(os.getenv("MAX_OCR_ATTEMPTS", "5"))
    MIN_PLATE_WIDTH: int = int(os.getenv("MIN_PLATE_WIDTH", "30"))
    MIN_PLATE_HEIGHT: int = int(os.getenv("MIN_PLATE_HEIGHT", "15"))
    MIN_SHARPNESS: float = float(os.getenv("MIN_SHARPNESS", "50.0"))

    # ─── Similarity & Scoring Weights (sum to 1.0) ────────────────────────────
    PLATE_SIMILARITY_THRESHOLD: float = float(os.getenv("PLATE_SIMILARITY_THRESHOLD", "0.8"))
    DETECTION_WEIGHT: float = float(os.getenv("DETECTION_WEIGHT", "0.15"))
    OCR_WEIGHT: float = float(os.getenv("OCR_WEIGHT", "0.35"))
    SHARPNESS_WEIGHT: float = float(os.getenv("SHARPNESS_WEIGHT", "0.15"))
    VALIDITY_WEIGHT: float = float(os.getenv("VALIDITY_WEIGHT", "0.25"))
    TEMPORAL_CONSISTENCY_WEIGHT: float = float(os.getenv("TEMPORAL_CONSISTENCY_WEIGHT", "0.10"))

    # ─── Storage ──────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    CROPS_DIR: str = os.getenv("CROPS_DIR", "crops")
    STOLEN_IMAGES_DIR: str = os.getenv("STOLEN_IMAGES_DIR", "stolen_images")

    # ─── Stolen Vehicle Matching ──────────────────────────────────────────────
    # Similarity >= this => confirmed exact stolen match
    STOLEN_MATCH_EXACT_THRESHOLD: float = float(os.getenv("STOLEN_MATCH_EXACT_THRESHOLD", "0.95"))
    # Similarity >= this but < exact => probable match (human review required)
    STOLEN_MATCH_FUZZY_THRESHOLD: float = float(os.getenv("STOLEN_MATCH_FUZZY_THRESHOLD", "0.80"))
    # Cooldown seconds before a new alert fires for same plate+camera combo
    STOLEN_ALERT_COOLDOWN_SECONDS: int = int(os.getenv("STOLEN_ALERT_COOLDOWN_SECONDS", "300"))

    # ─── Clone Analysis Scoring Weights ───────────────────────────────────────
    # These five weights should sum to 1.0
    CLONE_WEIGHT_PLATE_MATCH: float = float(os.getenv("CLONE_WEIGHT_PLATE_MATCH", "0.25"))
    CLONE_WEIGHT_APPEARANCE_DIFF: float = float(os.getenv("CLONE_WEIGHT_APPEARANCE_DIFF", "0.20"))
    CLONE_WEIGHT_COLOR_DIFF: float = float(os.getenv("CLONE_WEIGHT_COLOR_DIFF", "0.15"))
    CLONE_WEIGHT_CLASS_DIFF: float = float(os.getenv("CLONE_WEIGHT_CLASS_DIFF", "0.15"))
    CLONE_WEIGHT_SPATIAL_TEMPORAL: float = float(os.getenv("CLONE_WEIGHT_SPATIAL_TEMPORAL", "0.25"))
    # Minimum weighted score to open a clone suspicion case
    CLONE_SUSPICION_THRESHOLD: float = float(os.getenv("CLONE_SUSPICION_THRESHOLD", "0.55"))
    # Max physically plausible speed (km/h) between any two cameras
    CLONE_IMPOSSIBLE_TRAVEL_SPEED_KMH: float = float(os.getenv("CLONE_IMPOSSIBLE_TRAVEL_SPEED_KMH", "200.0"))
    # How far back (seconds) to look when comparing detections for clone analysis
    CLONE_ANALYSIS_WINDOW_SECONDS: int = int(os.getenv("CLONE_ANALYSIS_WINDOW_SECONDS", "3600"))

    # ─── Security ─────────────────────────────────────────────────────────────
    # API key required in X-API-Key header for write/status-change operations.
    # Set to empty string "" to disable key enforcement.
    API_KEY: str = os.getenv("API_KEY", "trinethra-dev-key-change-in-production")

    # ─── Path Properties ──────────────────────────────────────────────────────
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

    @property
    def stolen_images_path(self) -> Path:
        p = Path(self.STOLEN_IMAGES_DIR)
        if not p.is_absolute():
            p = Path(__file__).resolve().parent.parent / p
        return p

    def create_directories(self):
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.crops_path.mkdir(parents=True, exist_ok=True)
        self.stolen_images_path.mkdir(parents=True, exist_ok=True)
        # Also create models dir if it doesn't exist
        models_path = Path(__file__).resolve().parent.parent / "models"
        models_path.mkdir(parents=True, exist_ok=True)


settings = Settings()
