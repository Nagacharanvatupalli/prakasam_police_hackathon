"""
api/search_routes.py
--------------------
Advanced search router for vehicle detections.
Supports exact/partial license plates, vehicle types, colors, camera,
locations, date-time ranges, confidence filters, and pagination.
Provides OCR confusion/fuzzy-based "Related Searches" on zero matches.
Efficiently queries detections from the last 1 hour using indexed timestamps.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException

from app.database.mongodb import get_database
from app.database.repositories.detection_repository import detection_repo
from app.models.detection import DetectionResponse
from app.utils.plate_normalizer import string_similarity, edit_distance, normalize_plate

logger = logging.getLogger("trinethra.api.search")
router = APIRouter(prefix="/api/search", tags=["search"])


# ─── Heuristic helpers for related suggestions ────────────────────────────────

async def generate_related_suggestions(
    plate_number: Optional[str],
    vehicle_type: Optional[str],
    vehicle_color: Optional[str],
    camera_id: Optional[str]
) -> List[dict]:
    """Generates suggested related results when primary search returns zero matches."""
    db = get_database()
    suggestions = []
    
    # 1. Fuzzy plate matching (OCR confusion / Levenshtein distance)
    if plate_number:
        norm_input = normalize_plate(plate_number)
        # Fetch recent detections to scan for edit distance/similarities in memory
        cursor = db.detections.find({}).sort("created_at", -1).limit(100)
        recent_docs = await cursor.to_list(length=100)
        
        for doc in recent_docs:
            doc_plate = normalize_plate(doc.get("plate_number", ""))
            if not doc_plate:
                continue
                
            sim = string_similarity(norm_input, doc_plate)
            # Match if similarity is high (e.g., Levenshtein distance 1 or 2)
            if 0.50 <= sim < 1.0:
                mapped_doc = {
                    "id": str(doc["_id"]),
                    "plate_number": doc["plate_number"],
                    "raw_ocr_text": doc.get("raw_ocr_text", ""),
                    "detection_confidence": doc.get("detection_confidence", 0.0),
                    "ocr_confidence": doc.get("ocr_confidence", 0.0),
                    "track_id": doc.get("track_id"),
                    "source": doc["source"],
                    "bounding_box": doc["bounding_box"],
                    "media": doc.get("media"),
                    "first_seen": doc["first_seen"],
                    "last_seen": doc["last_seen"],
                    "occurrence_count": doc.get("occurrence_count", 1),
                    "status": doc.get("status", "verified"),
                    "created_at": doc["created_at"],
                    "vehicle_type": doc.get("vehicle_type"),
                    "vehicle_color": doc.get("vehicle_color"),
                    "suggestion_reason": f"Fuzzy plate match ({int(sim*100)}% similarity)"
                }
                suggestions.append(mapped_doc)
                if len(suggestions) >= 5:
                    break

    # 2. Match by type and color if no plates matched
    if len(suggestions) < 5 and (vehicle_type or vehicle_color):
        query = {}
        if vehicle_type:
            query["vehicle_type"] = {"$regex": vehicle_type, "$options": "i"}
        if vehicle_color:
            query["vehicle_color"] = {"$regex": vehicle_color, "$options": "i"}
            
        cursor = db.detections.find(query).sort("created_at", -1).limit(5)
        docs = await cursor.to_list(length=5)
        for doc in docs:
            if any(str(s["id"]) == str(doc["_id"]) for s in suggestions):
                continue
            suggestions.append({
                "id": str(doc["_id"]),
                "plate_number": doc["plate_number"],
                "raw_ocr_text": doc.get("raw_ocr_text", ""),
                "detection_confidence": doc.get("detection_confidence", 0.0),
                "ocr_confidence": doc.get("ocr_confidence", 0.0),
                "track_id": doc.get("track_id"),
                "source": doc["source"],
                "bounding_box": doc["bounding_box"],
                "media": doc.get("media"),
                "first_seen": doc["first_seen"],
                "last_seen": doc["last_seen"],
                "occurrence_count": doc.get("occurrence_count", 1),
                "status": doc.get("status", "verified"),
                "created_at": doc["created_at"],
                "vehicle_type": doc.get("vehicle_type"),
                "vehicle_color": doc.get("vehicle_color"),
                "suggestion_reason": "Similar features (make/color)"
            })
            
    return suggestions[:10]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/vehicles", response_model=dict)
async def advanced_search(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    plate_number: Optional[str] = Query(None),
    partial_plate: Optional[bool] = Query(True),
    vehicle_type: Optional[str] = Query(None),
    vehicle_color: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None), # YYYY-MM-DD
    start_time: Optional[str] = Query(None), # ISO/Timestamp/Time
    end_time: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    stolen_status: Optional[str] = Query(None), # stolen | clean
    clone_status: Optional[str] = Query(None), # clone | clean
):
    """
    Advanced query builder supporting combined parameters.
    Returns exact results, or fuzzy suggestions if exact returns empty.
    """
    db = get_database()
    query = {}
    
    # Plate filter (exact vs regex partial)
    if plate_number:
        normalized = normalize_plate(plate_number)
        if normalized:
            if partial_plate:
                query["plate_number"] = {"$regex": normalized, "$options": "i"}
            else:
                query["plate_number"] = normalized

    # Vehicle type/color filters
    if vehicle_type and vehicle_type != "all":
        query["vehicle_type"] = {"$regex": vehicle_type, "$options": "i"}
    if vehicle_color and vehicle_color != "all":
        query["vehicle_color"] = {"$regex": vehicle_color, "$options": "i"}

    # Camera/Location filters
    if camera_id and camera_id != "all":
        query["source.source_id"] = camera_id
    if location and location != "all":
        query["source.name"] = {"$regex": location, "$options": "i"}

    # Confidence filter
    if min_confidence is not None:
        query["ocr_confidence"] = {"$gte": min_confidence}

    # Date range filters
    date_query = {}
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
            date_query["$gte"] = target_date
            date_query["$lte"] = target_date + timedelta(days=1) - timedelta(seconds=1)
        except ValueError:
            pass

    if start_time:
        try:
            date_query["$gte"] = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except ValueError:
            pass
    if end_time:
        try:
            date_query["$lte"] = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        except ValueError:
            pass

    if date_query:
        query["created_at"] = date_query

    # Status / Match filter joins (Stolen / Clone Case matches)
    # If filter is 'stolen', we only return detections whose plate exists in active stolen cases.
    if stolen_status == "stolen":
        # Get list of all active stolen plates
        active_stolen = await db.stolen_vehicle_cases.distinct("normalized_plate_number", {"status": {"$in": ["stolen", "under_investigation", "identified", "tracking"]}})
        query["plate_number"] = {"$in": active_stolen}
    elif stolen_status == "clean":
        active_stolen = await db.stolen_vehicle_cases.distinct("normalized_plate_number", {"status": {"$in": ["stolen", "under_investigation", "identified", "tracking"]}})
        query["plate_number"] = {"$notin": active_stolen}

    if clone_status == "clone":
        active_clones = await db.clone_cases.distinct("normalized_plate", {"status": {"$in": ["pending", "confirmed"]}})
        query["plate_number"] = {"$in": active_clones}

    # Execute query
    total = await db.detections.count_documents(query)
    
    cursor = (
        db.detections.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    docs = await cursor.to_list(length=page_size)
    
    detections = []
    for doc in docs:
        detections.append({
            "id": str(doc["_id"]),
            "plate_number": doc["plate_number"],
            "raw_ocr_text": doc.get("raw_ocr_text", ""),
            "detection_confidence": doc.get("detection_confidence", 0.0),
            "ocr_confidence": doc.get("ocr_confidence", 0.0),
            "track_id": doc.get("track_id"),
            "source": doc["source"],
            "bounding_box": doc["bounding_box"],
            "media": doc.get("media"),
            "first_seen": doc["first_seen"],
            "last_seen": doc["last_seen"],
            "occurrence_count": doc.get("occurrence_count", 1),
            "status": doc.get("status", "verified"),
            "created_at": doc["created_at"],
            "vehicle_type": doc.get("vehicle_type"),
            "vehicle_color": doc.get("vehicle_color"),
        })

    related_suggestions = []
    if total == 0:
        related_suggestions = await generate_related_suggestions(
            plate_number=plate_number,
            vehicle_type=vehicle_type,
            vehicle_color=vehicle_color,
            camera_id=camera_id
        )

    return {
        "detections": detections,
        "related_suggestions": related_suggestions,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/last-hour", response_model=dict)
async def get_last_hour_detections(limit: int = Query(50, ge=1, le=200)):
    """
    Returns detections identified in the last rolling 60 minutes,
    using indexed timestamps.
    """
    db = get_database()
    threshold = datetime.utcnow() - timedelta(minutes=60)
    
    query = {"created_at": {"$gte": threshold}}
    total = await db.detections.count_documents(query)
    
    cursor = db.detections.find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    detections = []
    for doc in docs:
        detections.append({
            "id": str(doc["_id"]),
            "plate_number": doc["plate_number"],
            "raw_ocr_text": doc.get("raw_ocr_text", ""),
            "detection_confidence": doc.get("detection_confidence", 0.0),
            "ocr_confidence": doc.get("ocr_confidence", 0.0),
            "track_id": doc.get("track_id"),
            "source": doc["source"],
            "bounding_box": doc["bounding_box"],
            "media": doc.get("media"),
            "first_seen": doc["first_seen"],
            "last_seen": doc["last_seen"],
            "occurrence_count": doc.get("occurrence_count", 1),
            "status": doc.get("status", "verified"),
            "created_at": doc["created_at"],
            "vehicle_type": doc.get("vehicle_type"),
            "vehicle_color": doc.get("vehicle_color"),
        })
        
    return {
        "detections": detections,
        "total": total
    }
