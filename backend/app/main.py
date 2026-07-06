import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.api import live_routes, websocket_routes
from app.services.yolo_service import yolo_service
from app.services.ocr_service import ocr_service

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("trinethra.main")

app = FastAPI(
    title="TRINETHRA — ANPR / ALPR Inference Server",
    description="Backend processing system for AI Vehicle Intelligence Surveillance Platform.",
    version="2.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing TRINETHRA Intelligence Pipeline v2.0...")

    # 1. Create storage directories on disk
    settings.create_directories()

    # 2. Connect to MongoDB
    await connect_to_mongo()

    # 3. Load YOLO Plate Detection Model (loads once at start)
    try:
        yolo_service.load_model(
            model_path=settings.YOLO_MODEL_PATH,
            device=settings.INFERENCE_DEVICE
        )
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        # Don't crash — health endpoint will report the error

    # 4. Initialize OCR Model (loads once at start)
    try:
        ocr_service.initialize(languages=["en"])
    except Exception as e:
        logger.error(f"Failed to initialize PaddleOCR service: {e}")

    # 5. Mount static folders for frame uploads and plate crop images
    app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")
    app.mount("/crops", StaticFiles(directory=str(settings.crops_path)), name="crops")

    logger.info(
        f"TRINETHRA API Server ready. "
        f"MAX_CAMERAS={settings.MAX_CAMERAS}, "
        f"FRAME_SKIP={settings.FRAME_SKIP}, "
        f"OCR_INTERVAL={settings.OCR_INTERVAL}"
    )

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down TRINETHRA Intelligence Pipeline...")

    # Stop all active camera pipelines gracefully
    try:
        from app.services.camera_manager import camera_manager
        active = camera_manager.list_camera_ids()
        for cid in active:
            camera_manager.stop_camera(cid)
        logger.info(f"Stopped {len(active)} active camera pipeline(s).")
    except Exception as e:
        logger.error(f"Error stopping camera pipelines on shutdown: {e}")

    await close_mongo_connection()

# Include routers
app.include_router(live_routes.router)
app.include_router(websocket_routes.router)

@app.get("/api/health")
async def health_check():
    """
    Diagnostic status endpoint for deployment and verification.
    Reports YOLO, OCR, MongoDB, and active camera pipeline status.
    """
    from app.services.camera_manager import camera_manager

    db_status = "disconnected"
    try:
        db = get_database()
        if db is not None:
            await db.command("ping")
            db_status = "connected"
    except Exception as e:
        logger.error(f"Health check MongoDB ping failed: {e}")

    cameras = camera_manager.get_all_statuses()

    return {
        "status": "healthy",
        "version": "2.0.0",
        "yolo_model_loaded": yolo_service.is_loaded,
        "ocr_model_initialized": ocr_service.is_initialized,
        "mongodb_status": db_status,
        "device": yolo_service._device,
        "active_cameras": len(cameras),
        "max_cameras": settings.MAX_CAMERAS,
        "cameras": cameras,
    }
