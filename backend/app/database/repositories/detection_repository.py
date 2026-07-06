from typing import Optional, List, Tuple
from datetime import datetime, timedelta
import uuid
from app.database.mongodb import get_database
from app.models.detection import DetectionCreate, DetectionResponse

class DetectionRepository:
    def __init__(self):
        pass

    def _map_doc_to_response(self, doc: dict) -> DetectionResponse:
        return DetectionResponse(
            id=str(doc.get("_id", doc.get("id"))),
            plate_number=doc["plate_number"],
            raw_ocr_text=doc["raw_ocr_text"],
            detection_confidence=doc["detection_confidence"],
            ocr_confidence=doc["ocr_confidence"],
            track_id=doc.get("track_id"),
            source=doc["source"],
            bounding_box=doc["bounding_box"],
            media=doc.get("media"),
            first_seen=doc["first_seen"],
            last_seen=doc["last_seen"],
            occurrence_count=doc["occurrence_count"],
            status=doc["status"],
            created_at=doc["created_at"]
        )

    async def insert_detection(self, detection: DetectionCreate) -> str:
        db = get_database()
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Decide initial status
        status = "verified"
        if detection.ocr_confidence < 0.6:
            status = "low_confidence"
        
        doc = detection.dict()
        doc["_id"] = doc_id
        doc["first_seen"] = now
        doc["last_seen"] = now
        doc["occurrence_count"] = 1
        doc["status"] = status
        doc["created_at"] = now
        
        await db.detections.insert_one(doc)
        return doc_id

    async def find_duplicate(self, plate_number: str, source_id: str, window_seconds: int) -> Optional[dict]:
        db = get_database()
        threshold_time = datetime.utcnow() - timedelta(seconds=window_seconds)
        
        doc = await db.detections.find_one({
            "plate_number": plate_number,
            "source.source_id": source_id,
            "last_seen": {"$gte": threshold_time}
        })
        return doc

    async def update_detection_duplicate(self, detection_id: str, new_detection_confidence: float, new_ocr_confidence: float, last_seen: datetime) -> bool:
        db = get_database()
        
        # We only update confidence if the new detection is more confident
        res = await db.detections.update_one(
            {"_id": detection_id},
            {
                "$set": {
                    "last_seen": last_seen,
                },
                "$max": {
                    "detection_confidence": new_detection_confidence,
                    "ocr_confidence": new_ocr_confidence
                },
                "$inc": {
                    "occurrence_count": 1
                }
            }
        )
        return res.modified_count > 0

    async def get_detection(self, detection_id: str) -> Optional[DetectionResponse]:
        db = get_database()
        doc = await db.detections.find_one({"_id": detection_id})
        if doc:
            return self._map_doc_to_response(doc)
        return None

    async def list_detections(self, page: int = 1, page_size: int = 20, source_id: Optional[str] = None, plate_number: Optional[str] = None) -> Tuple[List[DetectionResponse], int]:
        db = get_database()
        query = {}
        if source_id:
            query["source.source_id"] = source_id
        if plate_number:
            query["plate_number"] = {"$regex": plate_number, "$options": "i"}

        total = await db.detections.count_documents(query)
        
        cursor = db.detections.find(query).sort("last_seen", -1).skip((page - 1) * page_size).limit(page_size)
        docs = await cursor.to_list(length=page_size)
        
        detections = [self._map_doc_to_response(doc) for doc in docs]
        return detections, total

    async def get_recent_detections(self, limit: int = 20) -> List[DetectionResponse]:
        db = get_database()
        cursor = db.detections.find({}).sort("last_seen", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._map_doc_to_response(doc) for doc in docs]

detection_repo = DetectionRepository()
