# AI Intelligence Model Pipeline

This document details the multi-stage machine learning pipeline driving TRINETHRA's surveillance analysis.

---

## 1. Object Detection (YOLOv11)

* **Purpose**: Identifies multi-class vehicle bounding frames (Cars, SUV, motorcycles, auto rickshaws) in real-time camera streams.
* **Input**: 1080p surveillance video stream frame.
* **Output**: Class bounding boxes [x_min, y_min, x_max, y_max, confidence].
* **Confidence Threshold**: 0.75 for automated triggers.

---

## 2. Multi-Object Tracking & Re-ID (BoT-SORT & FastReID)

* **Purpose**: Tracks detected targets across frame sequences and re-identifies them when passing subsequent cameras.
* **Architecture**: ResNet50 backbone trained on the VeRi-776 dataset to produce a 512-dimensional visual embedding.
* **Matching**: Cosine similarity comparator against database vector embeddings.

---

## 3. Optical Character Recognition (PaddleOCR)

* **Purpose**: Localizes plate boundaries and executes text sequence conversion.
* **Rule Engine**: Validates raw OCR outputs against Indian standard RTO registration patterns (e.g. `^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$`).
* **Correction**: Distance metric dictionaries correct common OCR parsing issues (e.g. replacing '0' with 'O' or '8' with 'B' based on context).

---

## 4. Fingerprint Vector Search (FAISS)

* **Purpose**: Computes structural comparisons of vehicle designs to detect cloned registration numbers.
* **Matching**: Indexes embeddings vector space using FlatL2 quantization for fast sub-millisecond similarity scoring.
