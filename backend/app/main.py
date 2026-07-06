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
    version="1.0.0"
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
    logger.info("Initializing TRINETHRA Intelligence Pipeline...")
    
    # 1. Create storage directories on disk
    settings.create_directories()
    
    # 2. Connect to MongoDB
    await connect_to_mongo()
    
    # 3. Load YOLO Bbox Model (Loads once at start)
    try:
        yolo_service.load_model(
            model_path=settings.YOLO_MODEL_PATH,
            device=settings.INFERENCE_DEVICE
        )
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        # We don't crash, let it run so health status can report the error
        
    # 4. Initialize OCR Model (Loads once at start)
    try:
        ocr_service.initialize(languages=["en"])
    except Exception as e:
        logger.error(f"Failed to initialize EasyOCR service: {e}")

    # Mount static folders for frame uploads and plate crop images
    app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")
    app.mount("/crops", StaticFiles(directory=str(settings.crops_path)), name="crops")
    
    logger.info("TRINETHRA API Server ready.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down TRINETHRA Intelligence Pipeline...")
    await close_mongo_connection()

# Include routers
app.include_router(live_routes.router)
app.include_router(websocket_routes.router)

@app.get("/api/health")
async def health_check():
    """
    Diagnostic status endpoint for deployment and verification.
    """
    db_status = "disconnected"
    try:
        db = get_database()
        if db is not None:
            # Simple ping
            await db.command("ping")
            db_status = "connected"
    except Exception as e:
        logger.error(f"Health check MongoDB ping failed: {e}")
        
    return {
        "status": "healthy",
        "yolo_model_loaded": yolo_service.is_loaded,
        "ocr_model_initialized": ocr_service.is_initialized,
        "mongodb_status": db_status,
        "device": yolo_service._device
    }
