import cv2
import numpy as np

def calculate_sharpness(image: np.ndarray) -> float:
    """Calculates image sharpness using the Laplacian variance method."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def add_padding(image: np.ndarray, padding_pct: float = 0.1) -> np.ndarray:
    """Adds percentage padding around the image borders."""
    h, w = image.shape[:2]
    top = int(h * padding_pct)
    bottom = int(h * padding_pct)
    left = int(w * padding_pct)
    right = int(w * padding_pct)
    
    # Border replication prevents black borders which can affect OCR
    return cv2.copyMakeBorder(image, top, bottom, left, right, cv2.BORDER_REPLICATE)

def resize_plate(image: np.ndarray, target_height: int = 64) -> np.ndarray:
    """Resizes the image maintaining the aspect ratio."""
    h, w = image.shape[:2]
    aspect = w / h
    target_width = int(target_height * aspect)
    return cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_CUBIC)

def preprocess_plate_crop(image: np.ndarray) -> list[tuple[np.ndarray, str]]:
    """
    Applies multiple preprocessing strategies on the cropped plate to feed into OCR.
    Returns list of tuples: (preprocessed_image, strategy_name)
    """
    strategies = []
    
    # Base grayscale image
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
        
    # Strategy 0: Simple grayscale + resize (Baseline)
    resized_gray = resize_plate(gray, target_height=64)
    strategies.append((resized_gray, "grayscale_resized"))
    
    # Strategy 1: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_clahe = clahe.apply(gray)
    resized_clahe = resize_plate(gray_clahe, target_height=64)
    strategies.append((resized_clahe, "clahe_resized"))
    
    # Strategy 2: Bilateral Filtering (Denoise while preserving edges) + Thresholding
    bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
    # Adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        bilateral, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    resized_thresh = resize_plate(thresh, target_height=64)
    strategies.append((resized_thresh, "bilateral_adaptive_threshold"))
    
    # Strategy 3: Image sharpening
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(gray, -1, kernel)
    resized_sharp = resize_plate(sharpened, target_height=64)
    strategies.append((resized_sharp, "sharpened_resized"))
    
    return strategies
