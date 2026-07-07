"""
services/stolen_vehicle_service.py
-----------------------------------
Fuzzy stolen vehicle matching service using normalized string matching,
OCR confusion-aware character mapping, and Levenshtein edit distance.
Maintains an in-memory cache of active stolen plates for O(1)/O(N) fast lookups.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Tuple

from app.config import settings
from app.database.repositories.stolen_vehicle_repository import stolen_vehicle_repo
from app.models.stolen_vehicle import (
    StolenVehicleSightingCreate,
    SightingMatchType,
    StolenVehicleStatus,
)
from app.utils.plate_normalizer import normalize_plate, string_similarity, edit_distance

logger = logging.getLogger("trinethra.service.stolen_vehicle")

# OCR character confusion mapping for confusion-aware checking
# Maps confusable characters to a single group representative
CONFUSION_GROUPS = {
    '0': '0', 'O': '0',
    '1': '1', 'I': '1',
    '2': '2', 'Z': '2',
    '5': '5', 'S': '5',
    '8': '8', 'B': '8'
}

def map_confusion_chars(text: str) -> str:
    """Replaces confusable characters with standard representatives for unified matching."""
    return "".join(CONFUSION_GROUPS.get(char, char) for char in text)


class StolenVehicleService:
    def __init__(self):
        self._active_cases_cache: List[Dict] = []
        self._last_cache_update: Optional[datetime] = None

    async def update_cache_if_needed(self):
        """Update active stolen plates cache from DB periodically (e.g. every 60s)."""
        now = datetime.utcnow()
        if not self._active_cases_cache or not self._last_cache_update or (now - self._last_cache_update).total_seconds() > 60:
            try:
                self._active_cases_cache = await stolen_vehicle_repo.get_active_plates()
                self._last_cache_update = now
                logger.info(f"[StolenService] Refreshed stolen plates cache. Active cases: {len(self._active_cases_cache)}")
            except Exception as e:
                logger.error(f"[StolenService] Failed to update stolen plates cache: {e}")

    def calculate_match_score(self, plate_a: str, plate_b: str) -> Tuple[float, SightingMatchType]:
        """
        Computes match score and type between two normalized plates:
        1. Exact Match -> Score 1.0, EXACT
        2. Confusion-aware Match -> Score 0.95, PROBABLE (treated as probable alert)
        3. Character-level similarity (Levenshtein) -> Score variable, EXACT/PROBABLE/REVIEW
        """
        if plate_a == plate_b:
            return 1.0, SightingMatchType.EXACT

        # OCR Confusion-aware match check
        conf_a = map_confusion_chars(plate_a)
        conf_b = map_confusion_chars(plate_b)
        if conf_a == conf_b:
            return 0.92, SightingMatchType.PROBABLE

        # Levenshtein distance similarity
        similarity = string_similarity(plate_a, plate_b)

        if similarity >= settings.STOLEN_MATCH_EXACT_THRESHOLD:
            return similarity, SightingMatchType.EXACT
        elif similarity >= settings.STOLEN_MATCH_FUZZY_THRESHOLD:
            return similarity, SightingMatchType.PROBABLE
        elif similarity >= 0.65:
            return similarity, SightingMatchType.REVIEW
        
        return similarity, SightingMatchType.REVIEW

    async def process_detection(
        self,
        detection_id: str,
        plate_number: str,
        ocr_confidence: float,
        detection_confidence: float,
        camera_id: str,
        camera_name: str,
        camera_location: str,
        frame_image_path: Optional[str] = None,
        plate_crop_path: Optional[str] = None
    ) -> List[dict]:
        """
        Runs the normalized plate matching against the active stolen cases cache.
        If a match is found, registers a sighting event and triggers alerts.
        """
        await self.update_cache_if_needed()
        normalized_det = normalize_plate(plate_number)
        if not normalized_det:
            return []

        matches = []
        for case in self._active_cases_cache:
            normalized_stolen = case.get("normalized_plate_number", "")
            if not normalized_stolen:
                continue

            score, match_type = self.calculate_match_score(normalized_det, normalized_stolen)

            # Check if threshold criteria are met
            is_valid_match = False
            if match_type == SightingMatchType.EXACT:
                is_valid_match = True
            elif match_type == SightingMatchType.PROBABLE:
                is_valid_match = True
            elif match_type == SightingMatchType.REVIEW and score >= 0.70:
                is_valid_match = True  # Flag lower-confidence matches for operator review

            if is_valid_match:
                case_id = case["_id"]
                
                # Check for duplicate sighting within cooldown to prevent spamming
                dup_sighting = await stolen_vehicle_repo.get_recent_sighting(
                    case_id=case_id,
                    camera_id=camera_id,
                    window_seconds=settings.STOLEN_ALERT_COOLDOWN_SECONDS
                )
                
                if dup_sighting:
                    logger.debug(f"[StolenService] Sighting duplicate found for case {case_id} on camera {camera_id}. Cooldown active.")
                    continue

                # Register new sighting event
                sighting_payload = StolenVehicleSightingCreate(
                    case_id=case_id,
                    normalized_plate=normalized_stolen,
                    ocr_plate_text=plate_number,
                    camera_id=camera_id,
                    camera_name=camera_name,
                    camera_location=camera_location,
                    detection_id=detection_id,
                    frame_image_path=frame_image_path,
                    plate_crop_path=plate_crop_path,
                    ocr_confidence=ocr_confidence,
                    detection_confidence=detection_confidence,
                    match_type=match_type,
                    match_score=score,
                    tracking_status="detected"
                )

                sighting_id = await stolen_vehicle_repo.create_sighting(sighting_payload)

                # Update status of stolen vehicle case to "identified" if it's currently "stolen" or "under_investigation"
                current_status = case.get("status")
                if current_status in [StolenVehicleStatus.STOLEN.value, StolenVehicleStatus.UNDER_INVESTIGATION.value]:
                    await stolen_vehicle_repo.update_status(
                        case_id=case_id,
                        new_status=StolenVehicleStatus.IDENTIFIED,
                        note=f"Stolen vehicle spotted on camera {camera_name} (Sighting match type: {match_type.value})",
                        changed_by="system"
                    )

                # Add to match results
                matches.append({
                    "case_id": case_id,
                    "sighting_id": sighting_id,
                    "match_type": match_type,
                    "match_score": score,
                    "case": case
                })

                # Trigger alert dispatch asynchronously via the alert service
                from app.services.alert_service import alert_service
                try:
                    await alert_service.create_stolen_alert(
                        case=case,
                        sighting_id=sighting_id,
                        sighting_payload=sighting_payload,
                        match_type=match_type,
                        match_score=score
                    )
                except Exception as alert_err:
                    logger.error(f"[StolenService] Failed to trigger alert for sighting {sighting_id}: {alert_err}")

        return matches


stolen_vehicle_service = StolenVehicleService()
