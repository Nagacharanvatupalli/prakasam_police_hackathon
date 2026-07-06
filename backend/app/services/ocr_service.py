import logging
import threading
import cv2
import numpy as np
from paddleocr import PaddleOCR
from app.utils.image_preprocessing import preprocess_plate_crop
from app.utils.plate_normalizer import get_plate_info

logger = logging.getLogger("trinethra.ocr")


class OCRService:
    def __init__(self):
        self.reader = None
        # Thread lock to serialize PaddleOCR GPU/CPU execution across threads
        self.lock = threading.Lock()

    def initialize(self, languages: list[str] = None):
        if languages is None:
            languages = ["en"]

        lang = languages[0] if languages else "en"

        try:
            import paddle
            use_gpu = paddle.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0
            device = "gpu:0" if use_gpu else "cpu"
        except Exception:
            device = "cpu"

        logger.info(f"Initializing PaddleOCR (v3.7) reader with lang: {lang} on device: {device}...")
        try:
            self.reader = PaddleOCR(
                lang=lang,
                use_textline_orientation=True,   # replaces old use_angle_cls
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                device=device,
                enable_mkldnn=False
            )
            logger.info("PaddleOCR reader initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing PaddleOCR: {e}")
            raise e

    @property
    def is_initialized(self) -> bool:
        return self.reader is not None

    def _run_ocr(self, img: np.ndarray) -> list:
        """
        Runs PaddleOCR on an image under the global thread lock.
        Returns results shaped like EasyOCR output:
        a list of (bbox, text, confidence) tuples.
        """
        if img is None or img.size == 0:
            return []

        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        # Serialize OCR execution to prevent concurrent GPU context issues
        with self.lock:
            results = self.reader.predict(img)

        if not results:
            return []

        parsed = []
        for res in results:
            if hasattr(res, "get"):
                texts = res.get("rec_texts", [])
                scores = res.get("rec_scores", [])
                polys = res.get("rec_polys", [])
            else:
                texts = getattr(res, "rec_texts", [])
                scores = getattr(res, "rec_scores", [])
                polys = getattr(res, "rec_polys", [])

            for i, text in enumerate(texts):
                bbox = polys[i] if i < len(polys) else None
                conf = scores[i] if i < len(scores) else 0.0
                parsed.append((bbox, text, conf))

        return parsed

    def recognize(self, crop: np.ndarray) -> dict:
        """
        Runs multi-strategy PaddleOCR on a plate crop.
        Returns the best result including text, confidence, and validation info.
        """
        if not self.is_initialized:
            logger.error("OCR service is not initialized.")
            return {"text": "", "raw_text": "", "confidence": 0.0, "is_valid": False}

        if crop is None or crop.size == 0:
            return {"text": "", "raw_text": "", "confidence": 0.0, "is_valid": False}

        variants = preprocess_plate_crop(crop)
        candidates = []

        for preprocessed_img, strategy_name in variants:
            try:
                results = self._run_ocr(preprocessed_img)
                if not results:
                    continue

                raw_text = " ".join([res[1] for res in results])
                conf = sum([res[2] for res in results]) / len(results)
                info = get_plate_info(raw_text)

                candidates.append({
                    "raw_text": raw_text,
                    "text": info["normalized"],
                    "confidence": conf,
                    "is_valid": info["is_valid"],
                    "validation_status": info["validation_status"],
                    "validity_score": info["validity_score"],
                    "strategy": strategy_name
                })
            except Exception as e:
                logger.warning(f"Strategy {strategy_name} OCR failed: {e}")
                continue

        if not candidates:
            try:
                results = self._run_ocr(crop)
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
                        "validity_score": info["validity_score"],
                        "strategy": "original"
                    })
            except Exception as e:
                logger.error(f"OCR fallback on original failed: {e}")

        if not candidates:
            return {
                "text": "", "raw_text": "", "confidence": 0.0,
                "is_valid": False, "status": "invalid", "validity_score": 0.0
            }

        # Prefer valid candidates, then sort by confidence
        valid_candidates = [c for c in candidates if c["is_valid"]]

        if valid_candidates:
            valid_candidates.sort(key=lambda x: x["confidence"], reverse=True)
            best = valid_candidates[0]
        else:
            candidates.sort(key=lambda x: x["confidence"], reverse=True)
            best = candidates[0]

        return {
            "text": best["text"],
            "raw_text": best["raw_text"],
            "confidence": best["confidence"],
            "is_valid": best["is_valid"],
            "status": best["validation_status"],
            "validity_score": best["validity_score"],
        }


# Singleton Instance
ocr_service = OCRService()