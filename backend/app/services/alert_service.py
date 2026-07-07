"""
services/alert_service.py
-------------------------
Alert management and real-time dispatch service.
Coordinates database persistence and real-time broadcasts via WebSockets
for Stolen Vehicle and Clone Vehicle alerts.
"""

import logging
from datetime import datetime
from typing import Optional

from app.config import settings
from app.database.repositories.alert_repository import alert_repo
from app.services.websocket_service import ws_manager
from app.models.alert import (
    AlertCreate,
    AlertType,
    AlertSeverity,
    TrackingStatus,
)
from app.models.stolen_vehicle import StolenVehicleSightingCreate, SightingMatchType

logger = logging.getLogger("trinethra.service.alert")


class AlertService:

    async def create_stolen_alert(
        self,
        case: dict,
        sighting_id: str,
        sighting_payload: StolenVehicleSightingCreate,
        match_type: SightingMatchType,
        match_score: float
    ) -> Optional[str]:
        """
        Creates a Stolen Vehicle Alert, checks for duplicate alerts,
        persists to DB and broadcasts to frontend via WebSocket.
        """
        case_id = case["_id"]
        camera_id = sighting_payload.camera_id
        
        # Unique key to prevent duplicate alerts for the same vehicle on the same camera in cooldown window
        dedup_key = f"stolen_{case_id}_{camera_id}"
        
        # Check cooldown
        duplicate = await alert_repo.check_duplicate_alert(
            dedup_key=dedup_key,
            window_seconds=settings.STOLEN_ALERT_COOLDOWN_SECONDS
        )
        if duplicate:
            logger.debug(f"[AlertService] Duplicate alert suppressed for key: {dedup_key}")
            return None

        # Determine Alert Severity
        if match_type == SightingMatchType.EXACT:
            alert_type = AlertType.STOLEN_VEHICLE
            severity = AlertSeverity.CRITICAL
        elif match_type == SightingMatchType.PROBABLE:
            alert_type = AlertType.STOLEN_PROBABLE
            severity = AlertSeverity.HIGH
        else:
            alert_type = AlertType.STOLEN_REVIEW
            severity = AlertSeverity.MEDIUM

        alert_payload = AlertCreate(
            alert_type=alert_type,
            severity=severity,
            plate_number=sighting_payload.ocr_plate_text,
            normalized_plate=sighting_payload.normalized_plate,
            camera_id=sighting_payload.camera_id,
            camera_name=sighting_payload.camera_name,
            camera_location=sighting_payload.camera_location,
            detection_id=sighting_payload.detection_id,
            frame_image_path=sighting_payload.frame_image_path,
            plate_crop_path=sighting_payload.plate_crop_path,
            ocr_confidence=sighting_payload.ocr_confidence,
            detection_confidence=sighting_payload.detection_confidence,
            match_confidence=match_score,
            case_id=case_id,
            case_fir_number=case.get("fir_number"),
            vehicle_model=case.get("vehicle_model"),
            vehicle_color=case.get("vehicle_color"),
            owner_name=case.get("owner_name"),
            dedup_key=dedup_key
        )

        alert_id = await alert_repo.create_alert(alert_payload)
        
        # Fetch populated alert to broadcast
        alert_data = await alert_repo.get_alert(alert_id)
        if alert_data:
            await ws_manager.broadcast_all("alert_created", alert_data.dict())
            logger.info(f"[AlertService] Broadcasted STOLEN alert {alert_id} for plate {sighting_payload.normalized_plate}")
            
        return alert_id

    async def create_clone_alert(
        self,
        case_id: str,
        evidence_id: str,
        evidence_payload: 'CloneEvidenceCreate',
        clone_score: float
    ) -> Optional[str]:
        """
        Creates a Clone Vehicle Alert, check for duplicate alerts,
        persists to DB and broadcasts to frontend via WebSocket.
        """
        # Unique key to prevent spamming duplicate clone alerts for same plate in cooldown window
        dedup_key = f"clone_{case_id}"
        
        duplicate = await alert_repo.check_duplicate_alert(
            dedup_key=dedup_key,
            window_seconds=settings.STOLEN_ALERT_COOLDOWN_SECONDS
        )
        if duplicate:
            logger.debug(f"[AlertService] Duplicate clone alert suppressed for key: {dedup_key}")
            return None

        # Severity determined by score
        severity = AlertSeverity.CRITICAL if clone_score >= 0.85 else AlertSeverity.HIGH

        alert_payload = AlertCreate(
            alert_type=AlertType.CLONE_SUSPICION,
            severity=severity,
            plate_number=evidence_payload.plate_number,
            normalized_plate=evidence_payload.score_breakdown.reason_text, # Embed explanation
            camera_id=evidence_payload.camera_b_id,
            camera_name=evidence_payload.camera_b_name,
            camera_location=evidence_payload.camera_b_location,
            detection_id=evidence_payload.detection_b_id,
            frame_image_path=evidence_payload.frame_image_b,
            plate_crop_path=evidence_payload.plate_crop_b,
            ocr_confidence=evidence_payload.score_breakdown.ocr_confidence_b,
            detection_confidence=evidence_payload.score_breakdown.detection_confidence_b,
            match_confidence=clone_score,
            case_id=case_id,
            case_fir_number="CLONE-CASE",
            vehicle_model=f"{evidence_payload.vehicle_class_b or 'Car'}",
            vehicle_color=evidence_payload.vehicle_color_b or "Unknown",
            owner_name="Multiple Observations",
            dedup_key=dedup_key
        )

        alert_id = await alert_repo.create_alert(alert_payload)
        
        alert_data = await alert_repo.get_alert(alert_id)
        if alert_data:
            await ws_manager.broadcast_all("alert_created", alert_data.dict())
            logger.info(f"[AlertService] Broadcasted CLONE alert {alert_id} for plate {evidence_payload.plate_number}")
            
        return alert_id


alert_service = AlertService()
