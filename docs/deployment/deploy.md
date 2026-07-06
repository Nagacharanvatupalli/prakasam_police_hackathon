# Production Deployment Manual

TRINETHRA uses containerized deployments via Docker and Nginx gateways.

---

## 1. Nginx Reverse Proxy Config

Place this block under `/etc/nginx/conf.d/trinethra.conf` for reverse routing.

```nginx
server {
    listen 443 ssl;
    server_name surveillance.trinethra.gov.in;

    ssl_certificate /etc/letsencrypt/live/trinethra/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trinethra/privkey.pem;

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/v1/ {
        proxy_pass http://api_gateway:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 2. Docker Compose Infrastructure

Deploy the database layer, Redis cache, object storage, and microservices.

```yaml
version: '3.8'

services:
  database:
    image: postgis/postgis:17-3.4
    environment:
      POSTGRES_USER: trinethra_admin
      POSTGRES_PASSWORD: SecureDbPassword123
      POSTGRES_DB: trinethra_intel
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis_cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio_storage:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: SecureStoragePassword123
    ports:
      - "9000:9000"
    command: server /data

volumes:
  pgdata:
```
