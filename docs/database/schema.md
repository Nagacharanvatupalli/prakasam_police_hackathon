# Database Schema & Indexing Strategy

TRINETHRA utilizes **PostgreSQL 17** equipped with the **PostGIS** extension for geographic calculations, alongside **Redis** for fast session caching and WebSockets pipelines.

---

## Entity Relationship Schemas

### 1. Users & Roles (RBAC)

```sql
CREATE TABLE roles (
    role_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role_id VARCHAR(32) REFERENCES roles(role_id),
    station_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(16) DEFAULT 'active'
);
```

### 2. Vehicle Registry & Embeddings

```sql
CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(16) UNIQUE NOT NULL,
    brand VARCHAR(64),
    model VARCHAR(64),
    color VARCHAR(32),
    type VARCHAR(32),
    owner_name VARCHAR(128),
    registration_status VARCHAR(16),
    threat_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_fingerprints (
    fingerprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    embedding vector(512), -- pgvector extension for similarity search
    visual_markers JSONB, -- headlight style, wheel patterns, accessories
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Surveillance Telemetry & GIS (PostGIS)

```sql
CREATE TABLE cameras (
    camera_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    gps_coordinates GEOMETRY(Point, 4326), -- PostGIS point data
    district VARCHAR(64),
    status VARCHAR(16) DEFAULT 'active'
);

CREATE TABLE detections (
    detection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id VARCHAR(64) REFERENCES cameras(camera_id),
    vehicle_id UUID REFERENCES vehicles(vehicle_id),
    plate_ocr VARCHAR(16),
    ocr_confidence NUMERIC(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    image_uri VARCHAR(512) -- Storage pointer in MinIO
);
```

### 4. Incidents & Audits

```sql
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_id UUID REFERENCES detections(detection_id),
    type VARCHAR(64),
    priority VARCHAR(16) DEFAULT 'medium',
    confidence NUMERIC(5,2),
    status VARCHAR(16) DEFAULT 'active',
    assigned_officer UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(128),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);
```

---

## Indexing Strategy

To maintain sub-200ms latency queries under high transaction rates:

1. **OCR Lookup Indexes**:
   ```sql
   CREATE INDEX idx_vehicles_plate ON vehicles (plate_number);
   CREATE INDEX idx_detections_plate_ocr ON detections (plate_ocr);
   ```
2. **GIS Spatial Indexes**:
   ```sql
   CREATE INDEX idx_cameras_gps ON cameras USING GIST (gps_coordinates);
   ```
3. **Audit Search Index**:
   ```sql
   CREATE INDEX idx_audit_user_time ON audit_logs (user_id, timestamp DESC);
   ```
