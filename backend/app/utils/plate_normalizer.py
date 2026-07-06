import re

# Standard Indian License Plate regex
# Example: AP 39 QJ 2036, DL 3C AY 1111, MH 02 1234, TS09EA4456, etc.
# Format: 2-letter state code + 2-digit district code + 0-3 letters (optional series) + 1-4 digit number
INDIAN_PLATE_PATTERN = re.compile(
    r"^[A-Z]{2}[0-9]{2}[A-Z]{0,3}[0-9]{1,4}$"
)

# Common OCR character confusion corrections (used for format scoring, not replacement)
COMMON_OCR_CONFUSION = {
    "O": "0",  # O confused with 0
    "0": "O",  # 0 confused with O
    "I": "1",  # I confused with 1
    "1": "I",  # 1 confused with I
    "B": "8",  # B confused with 8
    "8": "B",  # 8 confused with B
    "S": "5",  # S confused with 5
    "Z": "2",  # Z confused with 2
}


def normalize_plate(raw_text: str) -> str:
    """
    Normalizes OCR text to a standard format for comparison and storage.
    Uppercases, removes whitespace, and strips non-alphanumeric characters.
    """
    if not raw_text:
        return ""
    # Uppercase
    text = raw_text.upper()
    # Remove whitespace, hyphens, dots, colons, slashes, or other non-alphanumeric chars
    normalized = re.sub(r"[^A-Z0-9]", "", text)
    return normalized.strip()


def validate_indian_plate(normalized: str) -> bool:
    """Validates whether a normalized string matches Indian license plate format."""
    if not normalized:
        return False
    return bool(INDIAN_PLATE_PATTERN.match(normalized))


def get_plate_validity_score(normalized: str) -> float:
    """
    Returns a score between 0.0 and 1.0 representing how well the text
    matches Indian plate format patterns:
     - 1.0 = exact match
     - 0.6 = partial match (right length, some alphanumeric pattern)
     - 0.2 = too short or invalid
     - 0.0 = empty
    """
    if not normalized:
        return 0.0
    if validate_indian_plate(normalized):
        return 1.0
    # Check length heuristics
    if len(normalized) < 4:
        return 0.0
    if len(normalized) < 6:
        return 0.2
    # Check if starts with two letters (state code)
    if re.match(r"^[A-Z]{2}[0-9]{2}", normalized):
        return 0.6
    # Has some alphanumeric content
    return 0.3


def get_plate_info(raw_text: str) -> dict:
    """
    Parses and validates raw OCR text as an Indian license plate.
    Returns normalized form, validity, and validation status.
    """
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
        "validation_status": validation_status,
        "validity_score": get_plate_validity_score(normalized),
    }


def edit_distance(s1: str, s2: str) -> int:
    """
    Calculates Levenshtein edit distance between two strings.
    Uses dynamic programming with O(min(len(s1), len(s2))) space.
    """
    if s1 == s2:
        return 0
    if not s1:
        return len(s2)
    if not s2:
        return len(s1)

    # Ensure s1 is the shorter string to optimize space
    if len(s1) > len(s2):
        s1, s2 = s2, s1

    prev_row = list(range(len(s1) + 1))

    for j, c2 in enumerate(s2, 1):
        curr_row = [j]
        for i, c1 in enumerate(s1, 1):
            if c1 == c2:
                curr_row.append(prev_row[i - 1])
            else:
                curr_row.append(1 + min(prev_row[i], curr_row[i - 1], prev_row[i - 1]))
        prev_row = curr_row

    return prev_row[-1]


def string_similarity(s1: str, s2: str) -> float:
    """
    Calculates normalized string similarity (0.0 = completely different, 1.0 = identical).
    Uses edit distance normalized by the max length of the two strings.
    """
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0
    max_len = max(len(s1), len(s2))
    dist = edit_distance(s1, s2)
    return 1.0 - (dist / max_len)


def are_plates_similar(plate1: str, plate2: str, threshold: float = 0.8) -> bool:
    """
    Returns True if two plate texts are considered similar enough to be the same plate.
    Both inputs are normalized before comparison.
    """
    n1 = normalize_plate(plate1)
    n2 = normalize_plate(plate2)
    if not n1 or not n2:
        return False
    return string_similarity(n1, n2) >= threshold
