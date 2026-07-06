# TRINETHRA System Architecture

This document describes the scalable microservices architecture designed for national police intelligence operations.

```mermaid
graph TD
    %% User Tier
    Client[Next.js Client Command Center] -->|HTTPS / WSS| APIGateway[API Gateway / Nginx]

    %% Gateway Routing
    APIGateway --> AuthSvc[Authentication Service - JWT/RBAC]
    APIGateway --> SearchSvc[Vehicle Search Service]
    APIGateway --> TrackingSvc[Vehicle Tracking Service]
    APIGateway --> AISvc[AI Inference Service - YOLOv11/PaddleOCR]
    APIGateway --> RiskSvc[Risk Intelligence Engine]
    APIGateway --> EvidenceSvc[Evidence Locker Service]

    %% Data Tier
    SearchSvc --> DB[(PostgreSQL 17 + PostGIS)]
    TrackingSvc --> RedisCache[(Redis Session/Live Cache)]
    EvidenceSvc --> ObjectStore[(MinIO Object Storage)]
    AISvc --> VectorDB[(FAISS Vector Embeddings)]

    %% System Monitoring
    APIGateway -.-> Prometheus[System Health Monitor]
    Prometheus -.-> Grafana[Diagnostic Dashboards]
```

## Architectural Decoupling

1. **API Gateway (Nginx)**: Manages TLS termination, request rate-limiting, and microservices path routing.
2. **AI Inference pipeline**: Decoupled from core web operations. Utilizes Redis message broker arrays to handle video stream crops without locking user operations.
3. **Database Topology**:
   * **PostgreSQL 17 / PostGIS**: Hosts normalized relational data schemas (Users, Alerts, Audit trails) and executes fast geographical/GIS mapping calculations.
   * **MinIO Object Store**: Retains binary blobs (surveillance cctv crops, PDF report sheets).
   * **Redis Cache**: Holds short-term WebSocket alerts buffers and active operator sessions.
