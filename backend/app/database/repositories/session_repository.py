from typing import Optional, List
from datetime import datetime
import uuid
from app.database.mongodb import get_database
from app.models.session import SessionCreate, SessionResponse

class SessionRepository:
    def __init__(self):
        pass

    def _map_doc_to_response(self, doc: dict) -> SessionResponse:
        return SessionResponse(
            id=str(doc.get("_id", doc.get("id"))),
            source_type=doc["source_type"],
            source_name=doc["source_name"],
            source_config=doc.get("source_config"),
            status=doc["status"],
            total_frames=doc.get("total_frames"),
            processed_frames=doc.get("processed_frames", 0),
            detections_count=doc.get("detections_count", 0),
            unique_plates=doc.get("unique_plates", 0),
            error_message=doc.get("error_message"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )

    async def create_session(self, session: SessionCreate) -> str:
        db = get_database()
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        if isinstance(session, dict):
            doc = session.copy()
        elif hasattr(session, "model_dump"):
            doc = session.model_dump()
        elif hasattr(session, "dict"):
            doc = session.dict()
        else:
            doc = dict(session)
        doc["_id"] = session_id
        doc["status"] = "created"
        doc["total_frames"] = None
        doc["processed_frames"] = 0
        doc["detections_count"] = 0
        doc["unique_plates"] = 0
        doc["error_message"] = None
        doc["created_at"] = now
        doc["updated_at"] = now
        
        await db.sessions.insert_one(doc)
        return session_id

    async def update_session(self, session_id: str, **updates) -> bool:
        db = get_database()
        updates["updated_at"] = datetime.utcnow()
        
        res = await db.sessions.update_one(
            {"_id": session_id},
            {"$set": updates}
        )
        return res.modified_count > 0

    async def get_session(self, session_id: str) -> Optional[SessionResponse]:
        db = get_database()
        doc = await db.sessions.find_one({"_id": session_id})
        if doc:
            return self._map_doc_to_response(doc)
        return None

    async def list_sessions(self, status: Optional[str] = None) -> List[SessionResponse]:
        db = get_database()
        query = {}
        if status:
            query["status"] = status
            
        cursor = db.sessions.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [self._map_doc_to_response(doc) for doc in docs]

    async def delete_session(self, session_id: str) -> bool:
        db = get_database()
        res = await db.sessions.delete_one({"_id": session_id})
        return res.deleted_count > 0

session_repo = SessionRepository()
