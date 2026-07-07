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

def classify_vehicle_color(image: np.ndarray) -> str:
    """
    Classifies the dominant color of a vehicle image crop using HSV heuristics.
    Returns: 'White', 'Black', 'Silver', 'Red', 'Blue', 'Green', 'Yellow', or 'Unknown'.
    """
    if image is None or image.size == 0:
        return "Unknown"
        
    # Resize to speed up calculation and blur out noise
    small = cv2.resize(image, (30, 30))
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    
    # Calculate average S and V
    mean_s = np.mean(hsv[:, :, 1])
    mean_v = np.mean(hsv[:, :, 2])
    
    # Heuristics for grayscale colors (White, Black, Silver/Gray)
    if mean_v < 40:
        return "Black"
    if mean_s < 35:
        if mean_v > 195:
            return "White"
        return "Silver"
        
    # Heuristic for colored pixels: find the dominant hue
    hues = hsv[:, :, 0].flatten()
    # Filter out low saturation/value pixels to avoid neutral color bias
    mask = (hsv[:, :, 1] > 40) & (hsv[:, :, 2] > 40)
    valid_hues = hues[mask.flatten()]
    
    if len(valid_hues) == 0:
        if mean_v > 160:
            return "White"
        elif mean_v < 70:
            return "Black"
        return "Silver"
        
    # Find the bin with maximum frequency in hue histogram
    hist, bins = np.histogram(valid_hues, bins=18, range=(0, 180))
    max_bin = np.argmax(hist)
    h_val = (bins[max_bin] + bins[max_bin+1]) / 2.0
    
    # Hue ranges (OpenCV Hue is 0-180)
    if h_val < 10 or h_val >= 165:
        return "Red"
    elif 10 <= h_val < 22:
        return "Yellow" # Includes orange
    elif 22 <= h_val < 38:
        return "Yellow"
    elif 38 <= h_val < 80:
        return "Green"
    elif 80 <= h_val < 130:
        return "Blue"
    elif 130 <= h_val < 165:
        return "Red" # Violet/pink grouped to red/unknown
        
    return "Silver"
