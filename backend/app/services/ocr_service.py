import logging
import easyocr
import numpy as np
from app.utils.image_preprocessing import preprocess_plate_crop
from app.utils.plate_normalizer import get_plate_info

logger = logging.getLogger("trinethra.ocr")

class OCRService:
    def __init__(self):
        self.reader = None

    def initialize(self, languages: list[str] = None):
        if languages is None:
            languages = ["en"]
            
        logger.info(f"Initializing EasyOCR reader with languages: {languages}...")
        try:
            # gpu=True will auto-detect CUDA and use it if available
            self.reader = easyocr.Reader(languages, gpu=True, verbose=False)
            logger.info("EasyOCR reader initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing EasyOCR: {e}")
            raise e

    @property
    def is_initialized(self) -> bool:
        return self.reader is not None

    def recognize(self, crop: np.ndarray) -> dict:
        """
        Runs OCR on a license plate crop image.
        Uses multiple preprocessing strategies, evaluates each output, 
        and selects the best candidate based on confidence and validity.
        """
        if not self.is_initialized:
            logger.error("OCR service is not initialized.")
            return {"text": "", "raw_text": "", "confidence": 0.0, "is_valid": False}
            
        if crop is None or crop.size == 0:
            return {"text": "", "raw_text": "", "confidence": 0.0, "is_valid": False}

        # Get preprocessed crops
        variants = preprocess_plate_crop(crop)
        candidates = []
        
        for preprocessed_img, strategy_name in variants:
            try:
                results = self.reader.readtext(preprocessed_img)
                if not results:
                    continue
                
                # Join multi-line or multi-box detections if present
                raw_text = " ".join([res[1] for res in results])
                # Calculate average confidence
                conf = sum([res[2] for res in results]) / len(results)
                
                # Normalize and validate
                info = get_plate_info(raw_text)
                
                candidates.append({
                    "raw_text": raw_text,
                    "text": info["normalized"],
                    "confidence": conf,
                    "is_valid": info["is_valid"],
                    "validation_status": info["validation_status"],
                    "strategy": strategy_name
                })
            except Exception as e:
                logger.warning(f"Strategy {strategy_name} OCR failed: {e}")
                continue

        # If no strategy returned results, run on original crop directly
        if not candidates:
            try:
                results = self.reader.readtext(crop)
                if results:
                    raw_text = " ".join([res[1] for res in results])
                    conf = sum([res[2] for res in results]) / len(results)
                    info = get_plate_info(raw_text)
                    candidates.append({
                        "raw_text": raw_text,
                        "text": info["normalized"],
                        "confidence": conf,
                        "is_valid": info["is_valid"],
                        "validation_status": info["validation_status"],
                        "strategy": "original"
                    })
            except Exception as e:
                logger.error(f"OCR fallback on original failed: {e}")

        # Choose the best candidate:
        # Priority: 
        # 1. Valid Indian Plate with highest confidence
        # 2. Invalid Plate with highest confidence
        if not candidates:
            return {
                "text": "",
                "raw_text": "",
                "confidence": 0.0,
                "is_valid": False,
                "status": "invalid"
            }
            
        valid_candidates = [c for c in candidates if c["is_valid"]]
        
        if valid_candidates:
            # Sort by confidence descending
            valid_candidates.sort(key=lambda x: x["confidence"], reverse=True)
            best = valid_candidates[0]
        else:
            # Sort all by confidence descending
            candidates.sort(key=lambda x: x["confidence"], reverse=True)
            best = candidates[0]
            
        return {
            "text": best["text"],
            "raw_text": best["raw_text"],
            "confidence": best["confidence"],
            "is_valid": best["is_valid"],
            "status": best["validation_status"]
        }

# Singleton Instance
ocr_service = OCRService()
