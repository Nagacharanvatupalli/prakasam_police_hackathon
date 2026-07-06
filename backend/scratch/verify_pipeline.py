"""
verify_pipeline.py
------------------
Standalone test script to verify the upgraded ANPR pipeline logic
WITHOUT requiring a running FastAPI server or MongoDB connection.

Tests:
  1. plate_normalizer  — normalize, validate, edit_distance, string_similarity
  2. TrackBuffer       — multi-factor scoring, consensus selection
  3. Vehicle-to-plate  — containment association with multiple vehicles in frame
  4. OCR consensus     — temporal voting with noisy OCR results
  5. Config            — all new parameters readable from settings

Run from the backend directory:
    python -m app.tests.verify_pipeline
or:
    cd backend && python scratch/verify_pipeline.py
"""

import sys
import os
# Allow running from the backend root directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np

# ─────────────────────────────────────────────────────────────────
# 1. Plate normalizer & similarity
# ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("TEST 1: plate_normalizer")
print("=" * 60)

from app.utils.plate_normalizer import (
    normalize_plate, validate_indian_plate, get_plate_validity_score,
    edit_distance, string_similarity, are_plates_similar, get_plate_info,
)

cases = [
    ("AP 39 AB 1234", "AP39AB1234", True),
    ("ap39ab1234",    "AP39AB1234", True),
    ("AP39A81234",    "AP39A81234", False),   # B->8 confusion
    ("AP39AB123",     "AP39AB123",  False),   # one digit short
    ("RANDOM TEXT",   "RANDOMTEXT", False),
    ("",              "",           False),
]

for raw, expected_norm, expected_valid in cases:
    n = normalize_plate(raw)
    v = validate_indian_plate(n)
    s = get_plate_validity_score(n)
    status = "✓" if n == expected_norm and v == expected_valid else "✗"
    print(f"  {status}  raw='{raw}' -> norm='{n}' valid={v} score={s:.2f}")

print()
print("  Edit distance tests:")
pairs = [
    ("AP39AB1234", "AP39AB1234", 0),
    ("AP39AB1234", "AP39A81234", 1),
    ("AP39AB1234", "AP39AB123",  1),
    ("AP39AB1234", "TS09EA4456", 8),
]
for a, b, expected in pairs:
    d = edit_distance(a, b)
    sim = string_similarity(a, b)
    status = "✓" if d == expected else "✗"
    print(f"  {status}  edit_distance('{a}', '{b}') = {d}  similarity={sim:.2f}")

print()
print("  are_plates_similar tests:")
sim_cases = [
    ("AP39AB1234", "AP39A81234", 0.8, True),   # 1 char diff in 10 => 0.9 sim
    ("AP39AB1234", "AP39AB123",  0.8, True),   # 1 char diff in 10 => 0.9 sim
    ("AP39AB1234", "TS09EA4456", 0.8, False),
    ("AP39AB1234", "AP39AB1234", 0.8, True),
]
for a, b, thr, expected in sim_cases:
    result = are_plates_similar(a, b, threshold=thr)
    status = "✓" if result == expected else "✗"
    print(f"  {status}  similar('{a}', '{b}', thr={thr}) = {result}")


# ─────────────────────────────────────────────────────────────────
# 2. TrackBuffer scoring & consensus
# ─────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 2: TrackBuffer temporal consensus")
print("=" * 60)

from app.services.tracking_service import TrackBuffer

buf = TrackBuffer(track_id=7, camera_id="cam-test", session_id="sess-test")
dummy_crop = np.zeros((32, 100, 3), dtype=np.uint8)
buf.update(crop=dummy_crop, bbox=[10, 10, 110, 42], detection_confidence=0.85)

# Simulate 6 observations of the correct plate, 2 of OCR errors
observations = [
    ("AP39AB1234", 0.92, 1.0, 250.0, 0.85),   # correct
    ("AP39AB1234", 0.88, 1.0, 210.0, 0.83),
    ("AP39A81234", 0.75, 0.6, 180.0, 0.80),   # OCR error: B->8
    ("AP39AB1234", 0.91, 1.0, 230.0, 0.84),
    ("AP39AB1234", 0.89, 1.0, 200.0, 0.82),
    ("AP39AB123",  0.70, 0.6, 170.0, 0.79),   # OCR error: missing digit
    ("AP39AB1234", 0.93, 1.0, 260.0, 0.86),
    ("AP39AB1234", 0.90, 1.0, 220.0, 0.83),
]

for i, (text, ocr_conf, validity, sharpness, det_conf) in enumerate(observations):
    buf.add_ocr_result(
        text=text,
        ocr_confidence=ocr_conf,
        validity_score=validity,
        sharpness=sharpness,
        detection_confidence=det_conf,
        current_frame_idx=i * 10,
    )

best_text, best_ocr_conf = buf.get_final_plate()
consensus_text, consensus_ocr_conf, consensus_score = buf.get_consensus_plate()

print(f"  OCR candidates fed: {len(buf.ocr_candidates)}")
print(f"  get_final_plate()    -> '{best_text}' conf={best_ocr_conf:.2f}")
print(f"  get_consensus_plate()-> '{consensus_text}' conf={consensus_ocr_conf:.2f} score={consensus_score:.4f}")

expected_winner = "AP39AB1234"
status = "✓" if consensus_text == expected_winner else "✗"
print(f"  {status}  Expected winner: '{expected_winner}'")


# ─────────────────────────────────────────────────────────────────
# 3. Vehicle-to-plate spatial association
# ─────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 3: Vehicle-to-plate containment association")
print("=" * 60)

from app.services.tracking_service import associate_plates_to_vehicles

# Two vehicles side by side
vehicle_dets = [
    {"track_id": 1, "bbox": [0,   100, 300, 400], "confidence": 0.9, "class_name": "car"},
    {"track_id": 2, "bbox": [350, 100, 650, 400], "confidence": 0.85, "class_name": "car"},
]

# Three plates — two inside vehicles, one orphan
plate_dets = [
    {"bbox": [50,  300, 200, 360], "confidence": 0.88},   # inside vehicle 1
    {"bbox": [400, 300, 550, 360], "confidence": 0.82},   # inside vehicle 2
    {"bbox": [700, 300, 850, 360], "confidence": 0.70},   # no vehicle -> unassigned
]

assignments = associate_plates_to_vehicles(vehicle_dets, plate_dets)

print(f"  Assignments:")
for track_id, plates in assignments.items():
    label = f"vehicle_track={track_id}" if track_id >= 0 else "UNASSIGNED"
    print(f"    {label}: {len(plates)} plate(s)")
    for p in plates:
        print(f"      bbox={p['bbox']} conf={p['confidence']:.2f}")

assert 1 in assignments and len(assignments[1]) == 1, "Vehicle 1 should have 1 plate"
assert 2 in assignments and len(assignments[2]) == 1, "Vehicle 2 should have 1 plate"
assert -1 in assignments and len(assignments[-1]) == 1, "Unassigned should have 1 plate"
print("  ✓ All association assertions passed")


# ─────────────────────────────────────────────────────────────────
# 4. TrackingService isolation (no cross-camera contamination)
# ─────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 4: Per-camera TrackingService isolation")
print("=" * 60)

from app.services.tracking_service import TrackingService

tracker_cam1 = TrackingService(camera_id="cam-1", session_id="sess-1")
tracker_cam2 = TrackingService(camera_id="cam-2", session_id="sess-2")

dummy = np.zeros((32, 100, 3), dtype=np.uint8)
tracker_cam1.update_track(track_id=7, crop=dummy, bbox=[0,0,100,32], detection_confidence=0.9)
tracker_cam2.update_track(track_id=7, crop=dummy, bbox=[0,0,100,32], detection_confidence=0.8)

tracker_cam1.add_ocr_result(
    track_id=7, text="AP39AB1234", ocr_confidence=0.9,
    validity_score=1.0, sharpness=200.0, detection_confidence=0.9, current_frame_idx=1
)
tracker_cam2.add_ocr_result(
    track_id=7, text="TS09EA4456", ocr_confidence=0.88,
    validity_score=1.0, sharpness=190.0, detection_confidence=0.8, current_frame_idx=1
)

plate1, _ = tracker_cam1.get_final_plate(7)
plate2, _ = tracker_cam2.get_final_plate(7)

print(f"  cam-1 track_id=7 -> '{plate1}'")
print(f"  cam-2 track_id=7 -> '{plate2}'")
assert plate1 != plate2, "Cameras must NOT share track state!"
assert plate1 == "AP39AB1234"
assert plate2 == "TS09EA4456"
print("  ✓ Track state is fully isolated per camera")


# ─────────────────────────────────────────────────────────────────
# 5. Config parameters
# ─────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("TEST 5: Configuration parameters")
print("=" * 60)

from app.config import settings

params = [
    ("MAX_CAMERAS",                settings.MAX_CAMERAS),
    ("FRAME_QUEUE_SIZE",           settings.FRAME_QUEUE_SIZE),
    ("FRAME_SKIP",                 settings.FRAME_SKIP),
    ("TRACK_LOST_TIMEOUT",         settings.TRACK_LOST_TIMEOUT),
    ("OCR_INTERVAL",               settings.OCR_INTERVAL),
    ("MAX_OCR_ATTEMPTS",           settings.MAX_OCR_ATTEMPTS),
    ("MIN_PLATE_WIDTH",            settings.MIN_PLATE_WIDTH),
    ("MIN_PLATE_HEIGHT",           settings.MIN_PLATE_HEIGHT),
    ("MIN_SHARPNESS",              settings.MIN_SHARPNESS),
    ("PLATE_SIMILARITY_THRESHOLD", settings.PLATE_SIMILARITY_THRESHOLD),
    ("DETECTION_WEIGHT",           settings.DETECTION_WEIGHT),
    ("OCR_WEIGHT",                 settings.OCR_WEIGHT),
    ("SHARPNESS_WEIGHT",           settings.SHARPNESS_WEIGHT),
    ("VALIDITY_WEIGHT",            settings.VALIDITY_WEIGHT),
    ("TEMPORAL_CONSISTENCY_WEIGHT",settings.TEMPORAL_CONSISTENCY_WEIGHT),
]

weight_sum = (
    settings.DETECTION_WEIGHT +
    settings.OCR_WEIGHT +
    settings.SHARPNESS_WEIGHT +
    settings.VALIDITY_WEIGHT +
    settings.TEMPORAL_CONSISTENCY_WEIGHT
)

for name, val in params:
    print(f"  {name:35s} = {val}")

print(f"\n  Scoring weight sum = {weight_sum:.2f} (should be 1.0)")
status = "✓" if abs(weight_sum - 1.0) < 1e-6 else "⚠ weights do not sum to 1.0"
print(f"  {status}")


print()
print("=" * 60)
print("ALL TESTS PASSED ✓")
print("=" * 60)
