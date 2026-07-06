import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
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
    # Detections indexes
    await db.db.detections.create_index([("plate_number", ASCENDING)])
    await db.db.detections.create_index([("source.source_id", ASCENDING)])
    await db.db.detections.create_index([("created_at", DESCENDING)])
    await db.db.detections.create_index([("first_seen", DESCENDING)])
    await db.db.detections.create_index([("last_seen", DESCENDING)])
    # Compound index for fast duplicate detection querying
    await db.db.detections.create_index([("plate_number", ASCENDING), ("source.source_id", ASCENDING), ("last_seen", DESCENDING)])
    
    # Sessions indexes
    await db.db.sessions.create_index([("status", ASCENDING)])
    await db.db.sessions.create_index([("created_at", DESCENDING)])
    
    logger.info("Database indexes created successfully.")

def get_database():
    return db.db
