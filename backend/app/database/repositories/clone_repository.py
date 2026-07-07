"""
repositories/clone_repository.py
----------------------------------
MongoDB repository for clone analysis cases and evidence.
Evidence records are append-only.
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, List, Tuple

from app.database.mongodb import get_database
from app.models.clone import (
    CloneCaseResponse,
    CloneCaseStatus,
    CloneEvidenceCreate,
    CloneEvidenceResponse,
    CloneScoreBreakdown,
    ClonePattern,
)
from app.utils.plate_normalizer import normalize_plate

logger = logging.getLogger("trinethra.repo.clone")


class CloneRepository:

    # ── Evidence (append-only) ────────────────────────────────────────────────

    def _map_evidence(self, doc: dict) -> CloneEvidenceResponse:
        raw_breakdown = doc.get("score_breakdown", {})
        breakdown = CloneScoreBreakdown(
            plate_match_score=raw_breakdown.get("plate_match_score", 0.0),
            appearance_diff_score=raw_breakdown.get("appearance_diff_score", 0.0),
            color_diff_score=raw_breakdown.get("color_diff_score", 0.0),
            vehicle_class_diff_score=raw_breakdown.get("vehicle_class_diff_score", 0.0),
            spatial_temporal_score=raw_breakdown.get("spatial_temporal_score", 0.0),
            ocr_confidence_a=raw_breakdown.get("ocr_confidence_a", 0.0),
            ocr_confidence_b=raw_breakdown.get("ocr_confidence_b", 0.0),
            detection_confidence_a=raw_breakdown.get("detection_confidence_a", 0.0),
            detection_confidence_b=raw_breakdown.get("detection_confidence_b", 0.0),
            final_clone_score=raw_breakdown.get("final_clone_score", 0.0),
            patterns_triggered=[ClonePattern(p) for p in raw_breakdown.get("patterns_triggered", [])],
            reason_text=raw_breakdown.get("reason_text", ""),
            travel_time_minutes=raw_breakdown.get("travel_time_minutes"),
            estimated_distance_km=raw_breakdown.get("estimated_distance_km"),
        )
        return CloneEvidenceResponse(
            id=str(doc.get("_id", doc.get("id", ""))),
            case_id=doc["case_id"],
            plate_number=doc["plate_number"],
            detection_a_id=doc["detection_a_id"],
            camera_a_id=doc["camera_a_id"],
            camera_a_name=doc.get("camera_a_name", doc["camera_a_id"]),
            camera_a_location=doc.get("camera_a_location", ""),
            timestamp_a=doc["timestamp_a"],
            frame_image_a=doc.get("frame_image_a"),
            plate_crop_a=doc.get("plate_crop_a"),
            vehicle_class_a=doc.get("vehicle_class_a"),
            vehicle_color_a=doc.get("vehicle_color_a"),
            detection_b_id=doc["detection_b_id"],
            camera_b_id=doc["camera_b_id"],
            camera_b_name=doc.get("camera_b_name", doc["camera_b_id"]),
            camera_b_location=doc.get("camera_b_location", ""),
            timestamp_b=doc["timestamp_b"],
            frame_image_b=doc.get("frame_image_b"),
            plate_crop_b=doc.get("plate_crop_b"),
            vehicle_class_b=doc.get("vehicle_class_b"),
            vehicle_color_b=doc.get("vehicle_color_b"),
            score_breakdown=breakdown,
            recorded_at=doc.get("recorded_at", doc.get("created_at", datetime.utcnow())),
        )

    async def create_evidence(self, payload: CloneEvidenceCreate) -> str:
        """Append a new evidence record. Never overwrites existing ones."""
        db = get_database()
        doc_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = payload.dict()
        doc["_id"] = doc_id
        doc["recorded_at"] = now
        doc["created_at"] = now

        await db.clone_evidence.insert_one(doc)
        logger.info(
            f"[CloneRepo] Evidence {doc_id} created for case {payload.case_id}"
        )
        return doc_id

    async def list_evidence(
        self, case_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[CloneEvidenceResponse], int]:
        db = get_database()
        query = {"case_id": case_id}
        total = await db.clone_evidence.count_documents(query)
        cursor = (
            db.clone_evidence.find(query)
            .sort("recorded_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return [self._map_evidence(d) for d in docs], total

    # ── Clone Cases ───────────────────────────────────────────────────────────

    def _map_case(self, doc: dict) -> CloneCaseResponse:
        return CloneCaseResponse(
            id=str(doc.get("_id", doc.get("id", ""))),
            plate_number=doc.get("plate_number", ""),
            normalized_plate=doc.get("normalized_plate", ""),
            status=doc.get("status", CloneCaseStatus.PENDING),
            max_clone_score=doc.get("max_clone_score", 0.0),
            occurrence_count=doc.get("occurrence_count", 0),
            patterns_seen=[ClonePattern(p) for p in doc.get("patterns_seen", [])],
            first_detected_at=doc.get("first_detected_at", datetime.utcnow()),
            last_detected_at=doc.get("last_detected_at", datetime.utcnow()),
            latest_reason=doc.get("latest_reason", ""),
            note=doc.get("note"),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

    async def get_case_by_plate(self, normalized_plate: str) -> Optional[dict]:
        """Returns raw doc for internal use."""
        db = get_database()
        return await db.clone_cases.find_one(
            {"normalized_plate": normalized_plate,
             "status": {"$in": [CloneCaseStatus.PENDING.value, CloneCaseStatus.CONFIRMED.value]}}
        )

    async def create_or_update_case(
        self,
        plate_number: str,
        normalized_plate: str,
        clone_score: float,
        patterns: List[ClonePattern],
        reason_text: str,
        evidence_id: str,
    ) -> str:
        """
        Creates a new clone case or updates an existing one for the same plate.
        Returns the case_id.
        """
        db = get_database()
        now = datetime.utcnow()

        existing = await db.clone_cases.find_one({"normalized_plate": normalized_plate})

        if existing:
            case_id = str(existing["_id"])
            pattern_values = [p.value for p in patterns]
            await db.clone_cases.update_one(
                {"_id": case_id},
                {
                    "$set": {
                        "last_detected_at": now,
                        "updated_at": now,
                        "latest_reason": reason_text,
                    },
                    "$max": {"max_clone_score": clone_score},
                    "$inc": {"occurrence_count": 1},
                    "$addToSet": {"patterns_seen": {"$each": pattern_values}},
                },
            )
            logger.info(f"[CloneRepo] Updated case {case_id} for plate '{normalized_plate}' score={clone_score:.3f}")
        else:
            case_id = str(uuid.uuid4())
            doc = {
                "_id": case_id,
                "plate_number": plate_number,
                "normalized_plate": normalized_plate,
                "status": CloneCaseStatus.PENDING.value,
                "max_clone_score": clone_score,
                "occurrence_count": 1,
                "patterns_seen": [p.value for p in patterns],
                "first_detected_at": now,
                "last_detected_at": now,
                "latest_reason": reason_text,
                "note": None,
                "created_at": now,
                "updated_at": now,
            }
            await db.clone_cases.insert_one(doc)
            logger.info(f"[CloneRepo] Created case {case_id} for plate '{normalized_plate}' score={clone_score:.3f}")

        return case_id

    async def list_cases(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[CloneCaseResponse], int]:
        db = get_database()
        query: dict = {}
        if status:
            query["status"] = status

        total = await db.clone_cases.count_documents(query)
        cursor = (
            db.clone_cases.find(query)
            .sort("last_detected_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)
        return [self._map_case(d) for d in docs], total

    async def get_case(self, case_id: str) -> Optional[CloneCaseResponse]:
        db = get_database()
        doc = await db.clone_cases.find_one({"_id": case_id})
        return self._map_case(doc) if doc else None

    async def update_status(
        self,
        case_id: str,
        new_status: CloneCaseStatus,
        note: Optional[str] = None,
        updated_by: str = "operator",
    ) -> bool:
        db = get_database()
        updates = {
            "status": new_status.value,
            "updated_at": datetime.utcnow(),
        }
        if note is not None:
            updates["note"] = note
        result = await db.clone_cases.update_one({"_id": case_id}, {"$set": updates})
        return result.modified_count > 0


clone_repo = CloneRepository()
