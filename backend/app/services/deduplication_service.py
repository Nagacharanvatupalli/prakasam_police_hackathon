import logging
from datetime import datetime
from app.database.repositories.detection_repository import detection_repo

logger = logging.getLogger("trinethra.deduplication")

class DeduplicationService:
    def __init__(self):
        pass

    async def check_and_deduplicate(
        self, 
        plate_number: str, 
        source_id: str, 
        detection_confidence: float, 
        ocr_confidence: float, 
        window_seconds: int = 30
    ) -> tuple[bool, str | None]:
        """
        Checks if a plate detection is a duplicate within a time window.
        If it is, updates the existing detection document.
        Returns:
            (is_duplicate, detection_id)
        """
        if not plate_number:
            return False, None

        try:
            # Query the database for recent duplicate detections
            duplicate = await detection_repo.find_duplicate(
                plate_number=plate_number,
                source_id=source_id,
                window_seconds=window_seconds
            )
            
            if duplicate:
                dup_id = duplicate["_id"]
                logger.info(f"Duplicate plate {plate_number} detected on source {source_id}. Updating detection ID: {dup_id}")
                
                # Update the duplicate document in DB
                now = datetime.utcnow()
                await detection_repo.update_detection_duplicate(
                    detection_id=dup_id,
                    new_detection_confidence=detection_confidence,
                    new_ocr_confidence=ocr_confidence,
                    last_seen=now
                )
                return True, dup_id
                
            return False, None
            
        except Exception as e:
            logger.error(f"Error during duplicate check/update: {e}")
            return False, None

# Singleton Instance
dedup_service = DeduplicationService()
