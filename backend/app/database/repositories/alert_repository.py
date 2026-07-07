"""
repositories/alert_repository.py
--------------------------------
MongoDB repository for alerts management.
Includes deduplication helper to check for existing alerts
within a specific cooldown window.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Tuple

from app.database.mongodb import get_database
from app.models.alert import (
    AlertCreate,
    AlertResponse,
    AlertType,
    AlertSeverity,
    TrackingStatus,
    AlertAcknowledgeStatus,
)

logger = logging.getLogger("trinethra.repo.alert")


class AlertRepository:

    def _map_alert(self, doc: dict) -> AlertResponse:
        return AlertResponse(
            id=str(doc.get("_id", doc.get("id", ""))),
            alert_type=AlertType(doc["alert_type"]),
            severity=AlertSeverity(doc["severity"]),
            plate_number=doc["plate_number"],
            normalized_plate=doc["normalized_plate"],
            camera_id=doc["camera_id"],
            camera_name=doc.get("camera_name", doc["camera_id"]),
            camera_location=doc.get("camera_location", ""),
            detection_id=doc["detection_id"],
            frame_image_path=doc.get("frame_image_path"),
            plate_crop_path=doc.get("plate_crop_path"),
            ocr_confidence=doc.get("ocr_confidence", 0.0),
            detection_confidence=doc.get("detection_confidence", 0.0),
            match_confidence=doc.get("match_confidence", 0.0),
            case_id=doc.get("case_id"),
            case_fir_number=doc.get("case_fir_number"),
            vehicle_model=doc.get("vehicle_model"),
            vehicle_color=doc.get("vehicle_color"),
            owner_name=doc.get("owner_name"),
            tracking_status=TrackingStatus(doc.get("tracking_status", "detected")),
            acknowledge_status=AlertAcknowledgeStatus(doc.get("acknowledge_status", "active")),
            acknowledged_by=doc.get("acknowledged_by"),
            acknowledged_at=doc.get("acknowledged_at"),
            detected_at=doc.get("detected_at", doc.get("created_at", datetime.utcnow())),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

    async def create_alert(self, payload: AlertCreate) -> str:
        db = get_database()
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = payload.dict()
        doc["_id"] = doc_id
        doc["tracking_status"] = TrackingStatus.DETECTED.value
        doc["acknowledge_status"] = AlertAcknowledgeStatus.ACTIVE.value
        doc["acknowledged_by"] = None
        doc["acknowledged_at"] = None
        doc["detected_at"] = now
        doc["created_at"] = now
        doc["updated_at"] = now

        await db.alerts.insert_one(doc)
        logger.info(f"[AlertRepo] Created alert {doc_id} of type {payload.alert_type} for plate '{payload.normalized_plate}'")
        return doc_id

    async def get_alert(self, alert_id: str) -> Optional[AlertResponse]:
        db = get_database()
        doc = await db.alerts.find_one({"_id": alert_id})
        return self._map_alert(doc) if doc else None

    async def check_duplicate_alert(self, dedup_key: str, window_seconds: int) -> Optional[dict]:
        """
        Check if an active alert with the same dedup key was generated in the cooldown window.
        """
        db = get_database()
        threshold = datetime.utcnow() - timedelta(seconds=window_seconds)
        doc = await db.alerts.find_one(
            {
                "dedup_key": dedup_key,
                "detected_at": {"$gte": threshold}
            }
        )
        return doc

    async def list_alerts(
        self,
        page: int = 1,
        page_size: int = 20,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        acknowledge_status: Optional[str] = None,
        tracking_status: Optional[str] = None,
    ) -> Tuple[List[AlertResponse], int]:
        db = get_database()
        query: dict = {}
        if alert_type:
            query["alert_type"] = alert_type
        if severity:
            query["severity"] = severity
        if acknowledge_status:
            query["acknowledge_status"] = acknowledge_status
        if tracking_status:
            query["tracking_status"] = tracking_status

        total = await db.alerts.count_documents(query)
        cursor = (
            db.alerts.find(query)
            .sort("detected_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return [self._map_alert(d) for d in docs], total

    async def acknowledge_alert(self, alert_id: str, operator_name: str, note: Optional[str] = None) -> bool:
        db = get_database()
        now = datetime.utcnow()
        result = await db.alerts.update_one(
            {"_id": alert_id},
            {
                "$set": {
                    "acknowledge_status": AlertAcknowledgeStatus.ACKNOWLEDGED.value,
                    "acknowledged_by": operator_name,
                    "acknowledged_at": now,
                    "updated_at": now,
                    "note": note
                }
            }
        )
        return result.modified_count > 0

    async def update_tracking_status(self, alert_id: str, tracking_status: TrackingStatus, note: Optional[str] = None) -> bool:
        db = get_database()
        now = datetime.utcnow()
        result = await db.alerts.update_one(
            {"_id": alert_id},
            {
                "$set": {
                    "tracking_status": tracking_status.value,
                    "updated_at": now
                },
                "$push": {
                    "tracking_history": {
                        "status": tracking_status.value,
                        "updated_at": now,
                        "note": note
                    }
                }
            }
        )
        return result.modified_count > 0

    async def get_active_alerts(self, limit: int = 50) -> List[AlertResponse]:
        db = get_database()
        cursor = (
            db.alerts.find({"acknowledge_status": AlertAcknowledgeStatus.ACTIVE.value})
            .sort("detected_at", -1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [self._map_alert(d) for d in docs]


alert_repo = AlertRepository()
