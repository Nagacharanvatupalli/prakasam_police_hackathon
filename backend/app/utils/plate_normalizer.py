import re

# Standard Indian License Plate regex
# Example: AP 39 QJ 2036, DL 3C AY 1111, MH 02 1234, TS09EA4456, etc.
# Format: 2-letter state code + 2-digit district code + 0-2 letters (optional series) + 1-4 digit number
INDIAN_PLATE_PATTERN = re.compile(
    r"^[A-Z]{2}[0-9]{2}[A-Z]{0,3}[0-9]{1,4}$"
)

def normalize_plate(raw_text: str) -> str:
    if not raw_text:
        return ""
    # Uppercase
    text = raw_text.upper()
    # Remove whitespace, hyphens, dots, colons, slashes, or other non-alphanumeric chars
    normalized = re.sub(r"[^A-Z0-9]", "", text)
    return normalized.strip()

def validate_indian_plate(normalized: str) -> bool:
    if not normalized:
        return False
    return bool(INDIAN_PLATE_PATTERN.match(normalized))

def get_plate_info(raw_text: str) -> dict:
    normalized = normalize_plate(raw_text)
    is_valid = validate_indian_plate(normalized)
    
    validation_status = "verified" if is_valid else "unverified"
    
    # Check length heuristic as basic check
    if len(normalized) < 4:
        validation_status = "invalid"
        is_valid = False
        
    return {
        "raw": raw_text.strip(),
        "normalized": normalized,
        "is_valid": is_valid,
        "validation_status": validation_status
    }
