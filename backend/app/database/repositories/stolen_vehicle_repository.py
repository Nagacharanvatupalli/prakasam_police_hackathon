"""
repositories/stolen_vehicle_repository.py
------------------------------------------
MongoDB repository for stolen vehicle cases and sightings.
All writes use transactions where possible.
Sightings are append-only — never overwritten.
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, List, Tuple

from app.database.mongodb import get_database
from app.models.stolen_vehicle import (
    StolenVehicleCreate,
    StolenVehicleUpdate,
    StolenVehicleResponse,
    StolenVehicleSightingCreate,
    StolenVehicleSightingResponse,
    StolenVehicleStatus,
    CaseStatusHistoryEntry,
)
from app.utils.plate_normalizer import normalize_plate

logger = logging.getLogger("trinethra.repo.stolen_vehicle")

# Statuses considered "active" for the real-time matching hot path
ACTIVE_STATUSES = {
    StolenVehicleStatus.STOLEN,
    StolenVehicleStatus.UNDER_INVESTIGATION,
    StolenVehicleStatus.IDENTIFIED,
    StolenVehicleStatus.TRACKING,
}


class StolenVehicleRepository:

    # ── Case CRUD ─────────────────────────────────────────────────────────────

    def _map_case(self, doc: dict) -> StolenVehicleResponse:
        return StolenVehicleResponse(
            id=str(doc.get("_id", doc.get("id", ""))),
            vehicle_number=doc.get("vehicle_number", ""),
            normalized_plate_number=doc.get("normalized_plate_number", ""),
            vehicle_type=doc.get("vehicle_type"),
            vehicle_model=doc.get("vehicle_model"),
            vehicle_color=doc.get("vehicle_color"),
            owner_name=doc.get("owner_name"),
            contact_number=doc.get("contact_number"),
            fir_number=doc.get("fir_number"),
            police_station=doc.get("police_station"),
            reported_date=doc.get("reported_date"),
            description=doc.get("description"),
            reference_image=doc.get("reference_image"),
            status=doc.get("status", StolenVehicleStatus.STOLEN),
            status_history=[CaseStatusHistoryEntry(**h) for h in doc.get("status_history", [])],
            sighting_count=doc.get("sighting_count", 0),
            last_sighted_at=doc.get("last_sighted_at"),
            last_sighted_camera=doc.get("last_sighted_camera"),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

    async def create_case(self, payload: StolenVehicleCreate) -> str:
        db = get_database()
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        normalized = normalize_plate(payload.vehicle_number)

        initial_history = CaseStatusHistoryEntry(
            status=payload.status,
            changed_at=now,
            changed_by="system",
            note="Case created",
        )
        doc = payload.dict()
        doc["_id"] = doc_id
        doc["normalized_plate_number"] = normalized
        doc["status_history"] = [initial_history.dict()]
        doc["sighting_count"] = 0
        doc["last_sighted_at"] = None
        doc["last_sighted_camera"] = None
        doc["created_at"] = now
        doc["updated_at"] = now

        await db.stolen_vehicle_cases.insert_one(doc)
        logger.info(f"[StolenRepo] Created case {doc_id} for plate '{normalized}'")
        return doc_id

    async def get_case(self, case_id: str) -> Optional[StolenVehicleResponse]:
        db = get_database()
        doc = await db.stolen_vehicle_cases.find_one({"_id": case_id})
        return self._map_case(doc) if doc else None

    async def get_case_by_plate(self, normalized_plate: str) -> Optional[dict]:
        """Returns raw dict for internal use (hot path matching)."""
        db = get_database()
        return await db.stolen_vehicle_cases.find_one(
            {"normalized_plate_number": normalized_plate,
             "status": {"$in": [s.value for s in ACTIVE_STATUSES]}}
        )

    async def list_cases(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[StolenVehicleResponse], int]:
        db = get_database()
        query: dict = {}
        if status:
            query["status"] = status
        if search:
            query["$or"] = [
                {"normalized_plate_number": {"$regex": search.upper(), "$options": "i"}},
                {"vehicle_number": {"$regex": search, "$options": "i"}},
                {"fir_number": {"$regex": search, "$options": "i"}},
                {"owner_name": {"$regex": search, "$options": "i"}},
            ]

        total = await db.stolen_vehicle_cases.count_documents(query)
        cursor = (
            db.stolen_vehicle_cases.find(query)
            .sort("updated_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return [self._map_case(d) for d in docs], total

    async def update_case(self, case_id: str, payload: StolenVehicleUpdate) -> bool:
        db = get_database()
        updates = {k: v for k, v in payload.dict().items() if v is not None}
        updates["updated_at"] = datetime.utcnow()
        result = await db.stolen_vehicle_cases.update_one(
            {"_id": case_id}, {"$set": updates}
        )
        return result.modified_count > 0

    async def update_status(
        self,
        case_id: str,
        new_status: StolenVehicleStatus,
        note: Optional[str] = None,
        changed_by: str = "operator",
    ) -> bool:
        db = get_database()
        now = datetime.utcnow()
        history_entry = CaseStatusHistoryEntry(
            status=new_status,
            changed_at=now,
            changed_by=changed_by,
            note=note,
        ).dict()
        result = await db.stolen_vehicle_cases.update_one(
            {"_id": case_id},
            {
                "$set": {"status": new_status.value, "updated_at": now},
                "$push": {"status_history": history_entry},
            },
        )
        return result.modified_count > 0

    async def update_reference_image(self, case_id: str, image_path: str) -> bool:
        db = get_database()
        result = await db.stolen_vehicle_cases.update_one(
            {"_id": case_id},
            {"$set": {"reference_image": image_path, "updated_at": datetime.utcnow()}},
        )
        return result.modified_count > 0

    async def get_active_plates(self) -> List[dict]:
        """
        Returns all active stolen cases as lightweight dicts for the matching hot path.
        Used by stolen_vehicle_service to build the in-memory cache.
        """
        db = get_database()
        cursor = db.stolen_vehicle_cases.find(
            {"status": {"$in": [s.value for s in ACTIVE_STATUSES]}},
            {
                "_id": 1,
                "normalized_plate_number": 1,
                "vehicle_number": 1,
                "vehicle_model": 1,
                "vehicle_color": 1,
                "fir_number": 1,
                "status": 1,
                "owner_name": 1,
            },
        )
        return await cursor.to_list(length=10000)

    # ── Sightings (append-only) ───────────────────────────────────────────────

    def _map_sighting(self, doc: dict) -> StolenVehicleSightingResponse:
        return StolenVehicleSightingResponse(
            id=str(doc.get("_id", doc.get("id", ""))),
            case_id=doc["case_id"],
            normalized_plate=doc["normalized_plate"],
            ocr_plate_text=doc["ocr_plate_text"],
            camera_id=doc["camera_id"],
            camera_name=doc.get("camera_name", doc["camera_id"]),
            camera_location=doc.get("camera_location", ""),
            detection_id=doc["detection_id"],
            frame_image_path=doc.get("frame_image_path"),
            plate_crop_path=doc.get("plate_crop_path"),
            ocr_confidence=doc.get("ocr_confidence", 0.0),
            detection_confidence=doc.get("detection_confidence", 0.0),
            match_type=doc.get("match_type", "exact"),
            match_score=doc.get("match_score", 1.0),
            tracking_status=doc.get("tracking_status", "detected"),
            detected_at=doc.get("detected_at", doc.get("created_at", datetime.utcnow())),
            created_at=doc.get("created_at", datetime.utcnow()),
        )

    async def create_sighting(self, payload: StolenVehicleSightingCreate) -> str:
        """Appends a new sighting. Never updates existing ones."""
        db = get_database()
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = payload.dict()
        doc["_id"] = doc_id
        doc["detected_at"] = now
        doc["created_at"] = now

        await db.stolen_vehicle_sightings.insert_one(doc)

        # Update parent case counters
        await db.stolen_vehicle_cases.update_one(
            {"_id": payload.case_id},
            {
                "$inc": {"sighting_count": 1},
                "$set": {
                    "last_sighted_at": now,
                    "last_sighted_camera": payload.camera_id,
                    "updated_at": now,
                },
            },
        )
        logger.info(
            f"[StolenRepo] Sighting {doc_id} created for case {payload.case_id} "
            f"on camera {payload.camera_id}"
        )
        return doc_id

    async def list_sightings(
        self, case_id: str, page: int = 1, page_size: int = 50
    ) -> Tuple[List[StolenVehicleSightingResponse], int]:
        db = get_database()
        query = {"case_id": case_id}
        total = await db.stolen_vehicle_sightings.count_documents(query)
        cursor = (
            db.stolen_vehicle_sightings.find(query)
            .sort("detected_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return [self._map_sighting(d) for d in docs], total

    async def get_recent_sighting(
        self, case_id: str, camera_id: str, window_seconds: int
    ) -> Optional[dict]:
        """Used for alert deduplication. Returns raw doc if found within window."""
        from datetime import timedelta
        db = get_database()
        threshold = datetime.utcnow() - timedelta(seconds=window_seconds)
        return await db.stolen_vehicle_sightings.find_one(
            {
                "case_id": case_id,
                "camera_id": camera_id,
                "detected_at": {"$gte": threshold},
            }
        )

    async def get_identified_vehicles(
        self, page: int = 1, page_size: int = 20
    ) -> Tuple[List[dict], int]:
        """
        Returns sightings joined with their case data for the Identified Vehicles view.
        Returns raw dicts for flexible frontend rendering.
        """
        db = get_database()
        pipeline = [
            {"$sort": {"detected_at": -1}},
            {"$skip": (page - 1) * page_size},
            {"$limit": page_size},
            {
                "$lookup": {
                    "from": "stolen_vehicle_cases",
                    "localField": "case_id",
                    "foreignField": "_id",
                    "as": "case",
                }
            },
            {"$unwind": "$case"},
        ]
        count_pipeline = [{"$count": "total"}]
        total_result = await db.stolen_vehicle_sightings.aggregate(count_pipeline).to_list(1)
        total = total_result[0]["total"] if total_result else 0
        docs = await db.stolen_vehicle_sightings.aggregate(pipeline).to_list(length=page_size)
        return docs, total


stolen_vehicle_repo = StolenVehicleRepository()
