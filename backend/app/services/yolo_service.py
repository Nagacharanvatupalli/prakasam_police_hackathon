import logging
import time
from pathlib import Path
import numpy as np
import torch
from ultralytics import YOLO

logger = logging.getLogger("trinethra.yolo")

# COCO vehicle class IDs to track as vehicles
# car=2, motorcycle=3, bus=5, truck=7
VEHICLE_CLASS_IDS = {2, 3, 5, 7}


class YOLOService:
    def __init__(self):
        # Primary plate-detection model (custom best.pt)
        self.model = None
        # Standard COCO vehicle tracking model (yolov8n.pt)
        self.vehicle_model = None
        self._device = "cpu"
        self._model_path = ""
        self._resolved_model_path = None

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

        self._resolved_model_path = resolved_path
        logger.info(f"Loading YOLO plate model from {resolved_path} (original: {model_path})...")

        start_time = time.time()
        try:
            if not resolved_path.exists():
                logger.warning(f"Configured model path {resolved_path} does not exist!")
                fallback_model = "yolov8n.pt"
                logger.warning(f"Using default fallback model: {fallback_model}")
                self.model = YOLO(fallback_model)
                self._resolved_model_path = Path(fallback_model)
            else:
                self.model = YOLO(str(resolved_path))

            self.model.to(self._device)
            load_time = time.time() - start_time
            logger.info(f"YOLO plate model loaded successfully in {load_time:.2f} seconds.")
        except Exception as e:
            logger.error(f"Error loading YOLO plate model: {e}")
            raise e

        # Load standard COCO model for vehicle tracking
        self._load_vehicle_model()

    def _load_vehicle_model(self):
        """Load the standard COCO yolov8n model for vehicle class tracking."""
        try:
            logger.info("Loading standard yolov8n COCO vehicle tracking model...")
            start = time.time()
            self.vehicle_model = YOLO("yolov8n.pt")
            self.vehicle_model.to(self._device)
            logger.info(f"Vehicle tracking model loaded in {time.time()-start:.2f}s.")
        except Exception as e:
            logger.warning(f"Could not load yolov8n vehicle model: {e}. Vehicle association will be skipped.")
            self.vehicle_model = None

    def create_plate_tracker_model(self) -> YOLO | None:
        """Create a separate YOLO plate-detection model instance for per-camera use."""
        if not self.is_loaded:
            logger.error("YOLO plate model not loaded; cannot create tracker model.")
            return None
        if not self._resolved_model_path:
            logger.error("YOLO resolved model path not available.")
            return None
        try:
            tracker_model = YOLO(str(self._resolved_model_path))
            tracker_model.to(self._device)
            return tracker_model
        except Exception as e:
            logger.error(f"Failed to create plate tracker model instance: {e}")
            return None

    def create_vehicle_tracker_model(self) -> YOLO | None:
        """Create a separate yolov8n COCO vehicle tracker model for per-camera use."""
        try:
            model = YOLO("yolov8n.pt")
            model.to(self._device)
            return model
        except Exception as e:
            logger.error(f"Failed to create vehicle tracker model instance: {e}")
            return None

    # Keep old method name for backward compatibility
    def create_tracker_model(self) -> YOLO | None:
        return self.create_plate_tracker_model()

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def detect(self, frame: np.ndarray, confidence_threshold: float = 0.25) -> list[dict]:
        """Runs plate detection (no tracking) on a single frame."""
        if not self.is_loaded:
            logger.error("YOLO model not loaded.")
            return []

        results = self.model(frame, conf=confidence_threshold, device=self._device, verbose=False)
        detections = []

        if not results:
            return detections

        result = results[0]
        boxes = result.boxes

        for box in boxes:
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

    def detect_and_track(
        self,
        frame: np.ndarray,
        confidence_threshold: float = 0.25,
        tracker_config: str = "botsort.yaml"
    ) -> list[dict]:
        """Runs plate detection+tracking on a frame using the global shared model."""
        if not self.is_loaded:
            logger.error("YOLO model not loaded.")
            return []

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
            track_id = int(box.id[0].cpu().numpy()) if box.id is not None else None

            detections.append({
                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": cls_name,
                "track_id": track_id
            })

        return detections

    def detect_vehicles(
        self,
        frame: np.ndarray,
        vehicle_model: YOLO,
        confidence_threshold: float = 0.25,
        tracker_config: str = "botsort.yaml"
    ) -> list[dict]:
        """
        Runs vehicle detection and tracking using the provided per-camera vehicle model.
        Returns only COCO vehicle classes: car, motorcycle, bus, truck.
        """
        if vehicle_model is None:
            return []

        try:
            results = vehicle_model.track(
                frame,
                conf=confidence_threshold,
                persist=True,
                tracker=tracker_config,
                device=self._device,
                verbose=False,
                classes=list(VEHICLE_CLASS_IDS)
            )
        except Exception as e:
            logger.warning(f"Vehicle tracking failed: {e}")
            return []

        detections = []
        if not results or results[0].boxes is None:
            return detections

        result = results[0]
        boxes = result.boxes

        for box in boxes:
            coords = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = vehicle_model.names[cls_id]
            track_id = int(box.id[0].cpu().numpy()) if box.id is not None else None

            if cls_id not in VEHICLE_CLASS_IDS:
                continue

            detections.append({
                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": cls_name,
                "track_id": track_id
            })

        return detections

    def detect_plates(
        self,
        frame: np.ndarray,
        plate_model: YOLO,
        confidence_threshold: float = 0.25
    ) -> list[dict]:
        """
        Runs plate-only detection (no tracking) using the per-camera plate model.
        Returns detected plate bounding boxes and confidences.
        """
        if plate_model is None:
            return []

        try:
            results = plate_model(frame, conf=confidence_threshold, device=self._device, verbose=False)
        except Exception as e:
            logger.warning(f"Plate detection failed: {e}")
            return []

        detections = []
        if not results or results[0].boxes is None:
            return detections

        result = results[0]
        boxes = result.boxes

        for box in boxes:
            coords = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())

            detections.append({
                "bbox": [int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": plate_model.names.get(cls_id, "license_plate"),
            })

        return detections

    def crop_detection(self, frame: np.ndarray, bbox: list[int], padding_pct: float = 0.05) -> np.ndarray:
        """Crops a detected plate from the frame with configurable padding."""
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = bbox

        bw = x2 - x1
        bh = y2 - y1
        pad_w = int(bw * padding_pct)
        pad_h = int(bh * padding_pct)

        cx1 = max(0, x1 - pad_w)
        cy1 = max(0, y1 - pad_h)
        cx2 = min(w, x2 + pad_w)
        cy2 = min(h, y2 + pad_h)

        return frame[cy1:cy2, cx1:cx2].copy()


# Singleton Instance
yolo_service = YOLOService()
