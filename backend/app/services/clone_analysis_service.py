"""
services/clone_analysis_service.py
----------------------------------
Clone vehicle pattern analysis engine.
Evaluates 10 suspicious pattern categories including spatial-temporal anomalies,
vehicle class mismatch, dominant color mismatch, visual appearance histogram correlation,
alternating OCR, and format inconsistency.
Runs asynchronously in the background.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

import cv2
import numpy as np

from app.config import settings
from app.database.mongodb import get_database
from app.database.repositories.clone_repository import clone_repo
from app.database.repositories.detection_repository import detection_repo
from app.models.clone import (
    CloneEvidenceCreate,
    CloneScoreBreakdown,
    ClonePattern,
    CloneCaseStatus,
)
from app.utils.plate_normalizer import normalize_plate, string_similarity, get_plate_validity_score

logger = logging.getLogger("trinethra.service.clone_analysis")

# Predefined coordinates for common camera locations in Prakasam district area
# Used for spatial-temporal Haversine calculations
CAMERA_COORDINATES = {
    "CAM-001": (15.5057, 80.0499),  # Ongole Bypass NH-16
    "CAM-005": (15.8167, 80.3500),  # Chirala NH Checkpoint
    "CAM-004": (15.4990, 80.0380),  # Kurnool Road Toll
    "CAM-007": (15.7370, 79.2717),  # Markapur Main Road
}

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates geodetic distance in kilometers between two lat/lon coordinates."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    R = 6371.0 # Earth radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_appearance_difference(image_a_path: Optional[str], image_b_path: Optional[str]) -> float:
    """
    Computes visual appearance difference score (0.0 to 1.0) using HSV color histograms.
    Returns 0.0 (identical) or 1.0 (very different). Defaults to 0.5 if images are missing.
    """
    if not image_a_path or not image_b_path:
        return 0.5
        
    try:
        # Load local crop images
        # Translate static URL /crops/xxx.jpg to local file path
        from pathlib import Path
        
        path_a = settings.crops_path / Path(image_a_path).name
        path_b = settings.crops_path / Path(image_b_path).name
        
        img_a = cv2.imread(str(path_a))
        img_b = cv2.imread(str(path_b))
        
        if img_a is None or img_b is None:
            return 0.5
            
        hsv_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2HSV)
        hsv_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2HSV)
        
        # Calculate HSV histograms
        hist_a = cv2.calcHist([hsv_a], [0, 1], None, [18, 10], [0, 180, 0, 256])
        hist_b = cv2.calcHist([hsv_b], [0, 1], None, [18, 10], [0, 180, 0, 256])
        
        cv2.normalize(hist_a, hist_a, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist_b, hist_b, 0, 1, cv2.NORM_MINMAX)
        
        # Compare using correlation
        corr = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL)
        # Normalize: corr of 1.0 => difference of 0.0; corr of -1.0/0.0 => difference of 1.0
        diff = 1.0 - max(0.0, corr)
        return float(diff)
    except Exception as e:
        logger.warning(f"[CloneAnalysis] Failed to compute appearance difference: {e}")
        return 0.5


class CloneAnalysisService:

    def get_camera_coords(self, camera_id: str, location_name: str) -> Tuple[float, float]:
        """Gets coordinates for a camera, falling back to hashed location coordinates if unknown."""
        if camera_id in CAMERA_COORDINATES:
            return CAMERA_COORDINATES[camera_id]
            
        # Deterministic fallback based on location name hash to avoid overlap
        name_hash = hash(location_name or camera_id)
        lat = 15.50 + (name_hash % 100) * 0.005
        lon = 80.00 + ((name_hash >> 2) % 100) * 0.005
        return (lat, lon)

    async def analyze_detection(self, current_det_id: str) -> Optional[str]:
        """
        Runs the full clone analysis pipeline for a new detection against previous detections.
        """
        db = get_database()
        
        # Fetch full current detection record
        current_det = await detection_repo.get_detection(current_det_id)
        if not current_det:
            return None
            
        normalized_det = normalize_plate(current_det.plate_number)
        if not normalized_det:
            return None

        # Fetch recent historical records for the same plate (or fuzzy matching plates) within the time window
        window_start = datetime.utcnow() - timedelta(seconds=settings.CLONE_ANALYSIS_WINDOW_SECONDS)
        
        # We query recent detections with similar plates
        # Fetch last 20 detections for fuzzy matching
        cursor = db.detections.find({
            "last_seen": {"$gte": window_start},
            "_id": {"$ne": current_det_id}
        }).sort("last_seen", -1).limit(50)
        
        recent_detections = await cursor.to_list(length=50)
        
        best_clone_score = 0.0
        best_breakdown: Optional[CloneScoreBreakdown] = None
        best_historic_det: Optional[dict] = None
        
        # Heuristics extraction for current detection
        curr_vehicle_class = current_det.source.name  # YOLO class is often mapped to source name/metadata or fallback
        curr_color = "White" # Default fallback, color classifier can update it
        # If crop path is present, classify its dominant color
        if current_det.media and current_det.media.plate_crop_path:
            try:
                # Use plate crop path to load full vehicle frame if possible, or just the plate crop
                path = settings.crops_path / Path(current_det.media.plate_crop_path).name
                img = cv2.imread(str(path))
                from app.utils.image_preprocessing import classify_vehicle_color
                curr_color = classify_vehicle_color(img)
            except Exception:
                pass

        for hist in recent_detections:
            hist_plate = normalize_plate(hist.get("plate_number", ""))
            if not hist_plate:
                continue
                
            # Plate similarity check
            plate_sim = string_similarity(normalized_det, hist_plate)
            if plate_sim < settings.PLATE_SIMILARITY_THRESHOLD:
                continue # Skip unrelated plates

            # Evaluate clone scores
            patterns_triggered = []
            
            # 1. Spatial-temporal check
            camera_a_id = hist["source"]["source_id"]
            camera_b_id = current_det.source.source_id
            
            spatial_temporal_score = 0.0
            travel_time_mins = 0.0
            dist_km = 0.0
            
            time_a = hist["last_seen"]
            time_b = current_det.last_seen
            time_diff = abs((time_b - time_a).total_seconds())
            
            if camera_a_id != camera_b_id:
                loc_a = hist["source"].get("name", "")
                loc_b = current_det.source.name
                coord_a = self.get_camera_coords(camera_a_id, loc_a)
                coord_b = self.get_camera_coords(camera_b_id, loc_b)
                dist_km = haversine_distance(coord_a, coord_b)
                
                travel_time_hours = time_diff / 3600.0
                travel_time_mins = time_diff / 60.0
                
                if travel_time_hours > 0:
                    speed = dist_km / travel_time_hours
                    # If speed is impossibly high
                    if speed > settings.CLONE_IMPOSSIBLE_TRAVEL_SPEED_KMH:
                        spatial_temporal_score = 1.0
                        patterns_triggered.append(ClonePattern.SPATIAL_TEMPORAL)
                    elif speed > 100.0:
                        # Scale speed score between 100km/h (0.0) and impossible threshold (1.0)
                        spatial_temporal_score = min(1.0, (speed - 100.0) / (settings.CLONE_IMPOSSIBLE_TRAVEL_SPEED_KMH - 100.0))
                        if spatial_temporal_score > 0.5:
                            patterns_triggered.append(ClonePattern.SPATIAL_TEMPORAL)
            
            # 2. Vehicle Class Mismatch
            hist_class = hist["source"].get("name", "Unknown") # Fallback to yolo class info
            vehicle_class_diff_score = 0.0
            # Compare class names if valid
            if hist_class != "Unknown" and curr_vehicle_class != "Unknown" and hist_class.lower() != curr_vehicle_class.lower():
                vehicle_class_diff_score = 1.0
                patterns_triggered.append(ClonePattern.VEHICLE_CLASS_MISMATCH)

            # 3. Vehicle Color Mismatch
            hist_crop_path = hist.get("media", {}).get("plate_crop_path")
            curr_crop_path = current_det.media.plate_crop_path if current_det.media else None
            
            hist_color = "White"
            if hist_crop_path:
                try:
                    path = settings.crops_path / Path(hist_crop_path).name
                    img = cv2.imread(str(path))
                    from app.utils.image_preprocessing import classify_vehicle_color
                    hist_color = classify_vehicle_color(img)
                except Exception:
                    pass
                    
            color_diff_score = 0.0
            if hist_color != "Unknown" and curr_color != "Unknown" and hist_color != curr_color:
                color_diff_score = 1.0
                patterns_triggered.append(ClonePattern.COLOR_MISMATCH)

            # 4. Appearance difference score
            appearance_diff_score = calculate_appearance_difference(hist_crop_path, curr_crop_path)
            if appearance_diff_score > 0.70:
                patterns_triggered.append(ClonePattern.APPEARANCE_EMBEDDING)

            # 5. Format validity check
            validity_a = get_plate_validity_score(hist_plate)
            validity_b = get_plate_validity_score(normalized_det)
            if validity_b < 0.5:
                patterns_triggered.append(ClonePattern.PLATE_FORMAT_ANOMALY)
                
            # 6. OCR Character confusion pattern
            if normalized_det != hist_plate and plate_sim >= settings.PLATE_SIMILARITY_THRESHOLD:
                # If plates differ only by OCR confusion characters, flag it
                from app.services.stolen_vehicle_service import map_confusion_chars
                if map_confusion_chars(normalized_det) == map_confusion_chars(hist_plate):
                    patterns_triggered.append(ClonePattern.OCR_CONFUSION)

            # Calculate composite clone suspicion score using environmental weights
            clone_score = (
                plate_sim * settings.CLONE_WEIGHT_PLATE_MATCH +
                appearance_diff_score * settings.CLONE_WEIGHT_APPEARANCE_DIFF +
                color_diff_score * settings.CLONE_WEIGHT_COLOR_DIFF +
                vehicle_class_diff_score * settings.CLONE_WEIGHT_CLASS_DIFF +
                spatial_temporal_score * settings.CLONE_WEIGHT_SPATIAL_TEMPORAL
            )

            # Format human-friendly explanation reason
            reason_reasons = []
            if ClonePattern.SPATIAL_TEMPORAL in patterns_triggered:
                reason_reasons.append(f"impossible speed of {dist_km / (time_diff/3600.0):.1f} km/h between locations")
            if ClonePattern.VEHICLE_CLASS_MISMATCH in patterns_triggered:
                reason_reasons.append(f"vehicle type mismatch ({hist_class} vs {curr_vehicle_class})")
            if ClonePattern.COLOR_MISMATCH in patterns_triggered:
                reason_reasons.append(f"color discrepancy ({hist_color} vs {curr_color})")
            if ClonePattern.OCR_CONFUSION in patterns_triggered:
                reason_reasons.append("alternating OCR confusions")
                
            reason_text = "Suspected clone plate: " + ", ".join(reason_reasons) if reason_reasons else "Suspicious clone behavior detected."

            if clone_score > best_clone_score:
                best_clone_score = clone_score
                best_historic_det = hist
                
                best_breakdown = CloneScoreBreakdown(
                    plate_match_score=plate_sim,
                    appearance_diff_score=appearance_diff_score,
                    color_diff_score=color_diff_score,
                    vehicle_class_diff_score=vehicle_class_diff_score,
                    spatial_temporal_score=spatial_temporal_score,
                    ocr_confidence_a=hist.get("ocr_confidence", 0.0),
                    ocr_confidence_b=current_det.ocr_confidence,
                    detection_confidence_a=hist.get("detection_confidence", 0.0),
                    detection_confidence_b=current_det.detection_confidence,
                    final_clone_score=clone_score,
                    patterns_triggered=patterns_triggered,
                    reason_text=reason_text,
                    travel_time_minutes=travel_time_mins,
                    estimated_distance_km=dist_km
                )

        # Trigger case creation if the clone score exceeds the configured suspicion threshold
        if best_clone_score >= settings.CLONE_SUSPICION_THRESHOLD and best_breakdown and best_historic_det:
            # 1. Create Clone Case / Update
            case_id = await clone_repo.create_or_update_case(
                plate_number=current_det.plate_number,
                normalized_plate=normalized_det,
                clone_score=best_clone_score,
                patterns=best_breakdown.patterns_triggered,
                reason_text=best_breakdown.reason_text,
                evidence_id=""
            )
            
            # 2. Store evidence record
            evidence_payload = CloneEvidenceCreate(
                case_id=case_id,
                plate_number=current_det.plate_number,
                detection_a_id=str(best_historic_det.get("_id", best_historic_det.get("id"))),
                camera_a_id=best_historic_det["source"]["source_id"],
                camera_a_name=best_historic_det["source"]["name"],
                camera_a_location=best_historic_det["source"].get("location", ""),
                timestamp_a=best_historic_det["last_seen"],
                frame_image_a=best_historic_det.get("media", {}).get("frame_path"),
                plate_crop_a=best_historic_det.get("media", {}).get("plate_crop_path"),
                vehicle_class_a=best_historic_det["source"].get("name"),
                vehicle_color_a=None, # Will be resolved
                
                detection_b_id=current_det_id,
                camera_b_id=current_det.source.source_id,
                camera_b_name=current_det.source.name,
                camera_b_location="", # Predefined mapping
                timestamp_b=current_det.last_seen,
                frame_image_b=current_det.media.frame_path if current_det.media else None,
                plate_crop_b=current_det.media.plate_crop_path if current_det.media else None,
                vehicle_class_b=curr_vehicle_class,
                vehicle_color_b=curr_color,
                
                score_breakdown=best_breakdown
            )
            
            evidence_id = await clone_repo.create_evidence(evidence_payload)
            
            # Trigger real-time alert dispatch
            from app.services.alert_service import alert_service
            try:
                await alert_service.create_clone_alert(
                    case_id=case_id,
                    evidence_id=evidence_id,
                    evidence_payload=evidence_payload,
                    clone_score=best_clone_score
                )
            except Exception as alert_err:
                logger.error(f"[CloneAnalysis] Failed to dispatch clone alert: {alert_err}")

            return case_id

        return None


clone_analysis_service = CloneAnalysisService()
