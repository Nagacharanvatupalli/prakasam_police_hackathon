# REST API Reference Manual

All endpoints conform to JSON REST design. Authentication is authorized using Bearer tokens in headers.

---

## 1. Authentication Service

### POST `/api/v1/auth/login`
Authenticate system dispatcher credentials.

* **Request Payload**:
  ```json
  {
    "username": "sp_ongole",
    "password": "SecurePassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "role": "SP_ADMIN"
  }
  ```

---

## 2. Vehicle Intelligence

### GET `/api/v1/vehicles/search`
Query registration entries matching filters.

* **Query Parameters**:
  * `query`: string (plate, owner)
  * `brand`: string (e.g. "Hyundai")
  * `risk`: string (e.g. "critical")
* **Success Response (200 OK)**:
  ```json
  {
    "results": [
      {
        "id": "VEH-AP39AB",
        "plate_number": "AP39AB1234",
        "brand": "Hyundai",
        "model": "Creta",
        "risk_level": "critical",
        "threat_score": 12
      }
    ]
  }
  ```

### GET `/api/v1/vehicles/{id}/profile`
Fetch complete Digital Twin registry coordinates.

* **Success Response (200 OK)**:
  ```json
  {
    "id": "VEH-AP39AB",
    "plate_number": "AP39AB1234",
    "owner": "Ravi Reddy",
    "compliance": {
      "registration": "valid",
      "insurance": "expired",
      "fitness": "valid"
    },
    "fingerprint": {
      "make_match": 98.4,
      "color_match": 99.0
    }
  }
  ```

---

## 3. Incident Alerts Center

### POST `/api/v1/alerts/{id}/resolve`
Update status of surveillance alerts.

* **Request Payload**:
  ```json
  {
    "action": "resolve",
    "notes": "Dispatch vehicle verified chassis matches original owner registry file."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "alert_id": "ALT-1002",
    "status": "resolved",
    "updated_at": "2026-07-05T16:00:00Z"
  }
  ```
