import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, TEXT
from app.config import settings

logger = logging.getLogger("trinethra.database")


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db.db = db.client[settings.MONGODB_DATABASE]
    logger.info("Connected to MongoDB successfully.")
    await create_indexes()


async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed.")


async def create_indexes():
    if db.db is None:
        return

    logger.info("Creating database indexes...")

    # ── Detections ────────────────────────────────────────────────────────────
    await db.db.detections.create_index([("plate_number", ASCENDING)])
    await db.db.detections.create_index([("source.source_id", ASCENDING)])
    await db.db.detections.create_index([("created_at", DESCENDING)])
    await db.db.detections.create_index([("first_seen", DESCENDING)])
    await db.db.detections.create_index([("last_seen", DESCENDING)])
    # Compound index for fast duplicate detection querying
    await db.db.detections.create_index(
        [("plate_number", ASCENDING), ("source.source_id", ASCENDING), ("last_seen", DESCENDING)]
    )

    # ── Sessions ──────────────────────────────────────────────────────────────
    await db.db.sessions.create_index([("status", ASCENDING)])
    await db.db.sessions.create_index([("created_at", DESCENDING)])

    # ── Stolen Vehicle Cases ───────────────────────────────────────────────────
    await db.db.stolen_vehicle_cases.create_index([("normalized_plate_number", ASCENDING)])
    await db.db.stolen_vehicle_cases.create_index([("status", ASCENDING)])
    await db.db.stolen_vehicle_cases.create_index([("fir_number", ASCENDING)])
    await db.db.stolen_vehicle_cases.create_index([("created_at", DESCENDING)])
    await db.db.stolen_vehicle_cases.create_index([("updated_at", DESCENDING)])
    # Compound: fast lookup for active cases by normalized plate (used in matching hot path)
    await db.db.stolen_vehicle_cases.create_index(
        [("normalized_plate_number", ASCENDING), ("status", ASCENDING)]
    )

    # ── Stolen Vehicle Sightings ───────────────────────────────────────────────
    await db.db.stolen_vehicle_sightings.create_index([("case_id", ASCENDING)])
    await db.db.stolen_vehicle_sightings.create_index([("normalized_plate", ASCENDING)])
    await db.db.stolen_vehicle_sightings.create_index([("camera_id", ASCENDING)])
    await db.db.stolen_vehicle_sightings.create_index([("detected_at", DESCENDING)])
    await db.db.stolen_vehicle_sightings.create_index([("match_type", ASCENDING)])
    # Compound: find recent sightings per camera for alert dedup
    await db.db.stolen_vehicle_sightings.create_index(
        [("case_id", ASCENDING), ("camera_id", ASCENDING), ("detected_at", DESCENDING)]
    )

    # ── Clone Cases ────────────────────────────────────────────────────────────
    await db.db.clone_cases.create_index([("normalized_plate", ASCENDING)])
    await db.db.clone_cases.create_index([("status", ASCENDING)])
    await db.db.clone_cases.create_index([("max_clone_score", DESCENDING)])
    await db.db.clone_cases.create_index([("last_detected_at", DESCENDING)])
    await db.db.clone_cases.create_index([("created_at", DESCENDING)])

    # ── Clone Evidence ─────────────────────────────────────────────────────────
    await db.db.clone_evidence.create_index([("case_id", ASCENDING)])
    await db.db.clone_evidence.create_index([("plate_number", ASCENDING)])
    await db.db.clone_evidence.create_index([("camera_a_id", ASCENDING)])
    await db.db.clone_evidence.create_index([("camera_b_id", ASCENDING)])
    await db.db.clone_evidence.create_index([("recorded_at", DESCENDING)])

    # ── Alerts ────────────────────────────────────────────────────────────────
    await db.db.alerts.create_index([("normalized_plate", ASCENDING)])
    await db.db.alerts.create_index([("camera_id", ASCENDING)])
    await db.db.alerts.create_index([("alert_type", ASCENDING)])
    await db.db.alerts.create_index([("severity", ASCENDING)])
    await db.db.alerts.create_index([("acknowledge_status", ASCENDING)])
    await db.db.alerts.create_index([("tracking_status", ASCENDING)])
    await db.db.alerts.create_index([("detected_at", DESCENDING)])
    await db.db.alerts.create_index([("created_at", DESCENDING)])
    # Compound: fast dedup lookup
    await db.db.alerts.create_index(
        [("dedup_key", ASCENDING), ("detected_at", DESCENDING)]
    )

    logger.info("Database indexes created successfully.")


def get_database():
    return db.db
