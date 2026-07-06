import logging
import time
from pathlib import Path
import numpy as np
import torch
from ultralytics import YOLO

logger = logging.getLogger("trinethra.yolo")

class YOLOService:
    def __init__(self):
        self.model = None
        self._device = "cpu"
        self._model_path = ""

    def load_model(self, model_path: str, device: str = "auto"):
        self._model_path = model_path
        
        # Determine device
        normalized = str(device).lower().strip()
        if normalized == "auto":
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
        elif normalized in {"gpu", "cuda", "cuda:0", "0"}:
            self._device = "cuda:0" if torch.cuda.is_available() else "cpu"
        else:
            self._device = normalized
            
        logger.info(f"YOLO Inference Service using device: {self._device}")
        
        resolved_path = Path(model_path)
        if not resolved_path.is_absolute():
            resolved_path = Path(__file__).resolve().parent.parent.parent / resolved_path
            
        logger.info(f"Loading YOLO model from {resolved_path} (original: {model_path})...")
        
        start_time = time.time()
        try:
            if not resolved_path.exists():
                logger.warning(f"Configured model path {resolved_path} does not exist!")
                # Fallback to standard yolov8n.pt for safety if model doesn't exist yet
                fallback_model = "yolov8n.pt"
                logger.warning(f"Using default fallback model: {fallback_model}")
                self.model = YOLO(fallback_model)
            else:
                self.model = YOLO(str(resolved_path))
                
            # Move to device
            self.model.to(self._device)
            load_time = time.time() - start_time
            logger.info(f"YOLO Model loaded successfully in {load_time:.2f} seconds.")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")
            raise e

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def detect(self, frame: np.ndarray, confidence_threshold: float = 0.25) -> list[dict]:
        """Runs inference on a single frame and returns detections."""
        if not self.is_loaded:
            logger.error("YOLO model not loaded.")
            return []
            
        # Run inference
        results = self.model(frame, conf=confidence_threshold, device=self._device, verbose=False)
        detections = []
        
        if not results:
            return detections
            
        result = results[0]
        boxes = result.boxes
        
        for box in boxes:
            # Get box coordinates (x1, y1, x2, y2)
            coords = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = self.model.names[cls_id]
            
            detections.append({
                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": cls_name
            })
            
        return detections

    def detect_and_track(self, frame: np.ndarray, confidence_threshold: float = 0.25, tracker_config: str = "botsort.yaml") -> list[dict]:
        """Runs tracking on a frame and returns detections with track IDs."""
        if not self.is_loaded:
            logger.error("YOLO model not loaded.")
            return []
            
        # Using built-in tracker configs (botsort.yaml or bytetrack.yaml)
        # We need persist=True to keep tracks across frames
        results = self.model.track(
            frame, 
            conf=confidence_threshold, 
            persist=True, 
            tracker=tracker_config,
            device=self._device, 
            verbose=False
        )
        
        detections = []
        if not results or results[0].boxes is None:
            return detections
            
        result = results[0]
        boxes = result.boxes
        
        for box in boxes:
            coords = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = self.model.names[cls_id]
            
            # Note: box.id is track ID. It might be None if track is not active yet
            track_id = int(box.id[0].cpu().numpy()) if box.id is not None else None
            
            detections.append({
                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": cls_name,
                "track_id": track_id
            })
            
        return detections

    def crop_detection(self, frame: np.ndarray, bbox: list[int], padding_pct: float = 0.05) -> np.ndarray:
        """Crops a detected plate from the frame with configurable padding."""
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = bbox
        
        # Calculate padding
        bw = x2 - x1
        bh = y2 - y1
        pad_w = int(bw * padding_pct)
        pad_h = int(bh * padding_pct)
        
        # Apply padding while keeping within bounds
        cx1 = max(0, x1 - pad_w)
        cy1 = max(0, y1 - pad_h)
        cx2 = min(w, x2 + pad_w)
        cy2 = min(h, y2 + pad_h)
        
        return frame[cy1:cy2, cx1:cx2].copy()

# Singleton Instance
yolo_service = YOLOService()
