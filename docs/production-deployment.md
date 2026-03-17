# CyberChef AI Production Deployment Instructions

## Prerequisites
- Docker & Docker Compose installed
- .env.prod file created from .env.prod.template
- All code built and tested

## Step-by-Step Deployment

1. Build Docker images:
   ```sh
   docker-compose -f docker-compose.prod.yml build
   ```

2. Start containers:
   ```sh
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. Check logs:
   ```sh
   docker-compose -f docker-compose.prod.yml logs -f
   ```

4. Verify services:
   - Web dashboard: http://localhost
   - API: http://localhost:4000
   - Auth: http://localhost:4001
   - AI: http://localhost:4002
   - Video: http://localhost:4003
   - Grocery: http://localhost:4004
   - Marketplace: http://localhost:4005
   - Monitoring: http://localhost:9090
   - Logging: http://localhost:3001

5. Set up Minio (S3):
   - Access http://localhost:9000
   - Login with MINIO_ROOT_USER and MINIO_ROOT_PASSWORD
   - Create buckets: cyberchef-recipes, cyberchef-videos

6. Set up MongoDB & Redis:
   - MongoDB: Data persists in mongo-data volume
   - Redis: Data persists in redis-data volume

7. Configure Nginx for HTTPS:
   - Edit nginx.conf as needed
   - Restart nginx container

8. Configure Prometheus & Grafana:
   - Edit prometheus.yml for targets
   - Access Grafana at http://localhost:3001

## Environment Variables
- Copy .env.prod.template to .env.prod and fill in secrets

## Updating & Redeploying
- Rebuild images after code changes:
   ```sh
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Troubleshooting
- Check logs for errors
- Ensure all containers are running
- Verify network and port mappings
