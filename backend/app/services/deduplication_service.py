import logging
from datetime import datetime
from app.config import settings
from app.database.repositories.detection_repository import detection_repo
from app.utils.plate_normalizer import are_plates_similar, normalize_plate

logger = logging.getLogger("trinethra.deduplication")


class DeduplicationService:
    """
    Duplicate suppression for vehicle detection events.

    Checks both:
    1. Exact plate match within the time window (fast DB index lookup).
    2. Fuzzy similarity match using Levenshtein edit distance for OCR variations
       (e.g. AP39AB1234 vs AP39A81234) — fetches recent records and compares in-memory.

    Duplicate criteria considers:
    - camera_id / source_id  (never merge across cameras)
    - track-level time window
    - plate text similarity >= PLATE_SIMILARITY_THRESHOLD
    """

    def __init__(self):
        pass

    async def check_and_deduplicate(
        self,
        plate_number: str,
        source_id: str,
        detection_confidence: float,
        ocr_confidence: float,
        window_seconds: int = 30,
    ) -> tuple[bool, str | None]:
        """
        Checks if a plate detection is a duplicate within a time window,
        using both exact string matching and fuzzy edit-distance similarity.

        Returns:
            (is_duplicate: bool, existing_detection_id: str | None)
        """
        if not plate_number:
            return False, None

        normalized = normalize_plate(plate_number)
        if not normalized:
            return False, None

        try:
            # ── 1. Exact match check (fast indexed query) ────────────────
            exact_dup = await detection_repo.find_duplicate(
                plate_number=normalized,
                source_id=source_id,
                window_seconds=window_seconds,
            )

            if exact_dup:
                dup_id = str(exact_dup.get("_id", exact_dup.get("id", "")))
                logger.info(
                    f"[Dedup] Exact duplicate: plate='{normalized}' "
                    f"source='{source_id}' existing_id={dup_id}"
                )
                await self._update_existing(
                    dup_id, detection_confidence, ocr_confidence
                )
                return True, dup_id

            # ── 2. Fuzzy similarity check (catches OCR variation dupes) ──
            recent_records = await detection_repo.find_recent_by_source(
                source_id=source_id,
                window_seconds=window_seconds,
                limit=30,
            )

            for record in recent_records:
                stored_plate = normalize_plate(
                    record.get("plate_number", "")
                )
                if are_plates_similar(
                    stored_plate,
                    normalized,
                    threshold=settings.PLATE_SIMILARITY_THRESHOLD,
                ):
                    rec_id = str(record.get("_id", record.get("id", "")))
                    logger.info(
                        f"[Dedup] Fuzzy duplicate: plate='{normalized}' ~ "
                        f"'{stored_plate}' source='{source_id}' "
                        f"existing_id={rec_id}"
                    )
                    await self._update_existing(
                        rec_id, detection_confidence, ocr_confidence
                    )
                    return True, rec_id

            return False, None

        except Exception as exc:
            logger.error(f"[Dedup] Error during duplicate check/update: {exc}")
            return False, None

    async def _update_existing(
        self,
        detection_id: str,
        detection_confidence: float,
        ocr_confidence: float,
    ) -> None:
        """Update the existing duplicate record with improved confidence values."""
        try:
            await detection_repo.update_detection_duplicate(
                detection_id=detection_id,
                new_detection_confidence=detection_confidence,
                new_ocr_confidence=ocr_confidence,
                last_seen=datetime.utcnow(),
            )
        except Exception as exc:
            logger.error(f"[Dedup] Failed to update duplicate record {detection_id}: {exc}")


# Singleton Instance
dedup_service = DeduplicationService()
