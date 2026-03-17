# CyberChef AI Deployment Architecture

## Architecture Diagram

```
[Internet]
   |
[NGINX API Gateway]
   |
+-----------------------------+
|         Services            |
|  auth  recipe  ai  feed     |
|  billing  analytics  video  |
+-----------------------------+
   |
[MongoDB] [Redis] [Cloud Storage]
   |
[Monitoring/Logging]
```

## Service Communication Flow

- Frontend (Next.js) → Nginx → Backend services
- Nginx routes /api/* to corresponding microservice
- Backend services connect to MongoDB, Redis, and Cloud Storage
- Monitoring/logging collects metrics and errors

## Deployment Commands

### Build and Start All Services Locally
```
docker-compose up --build
```

### Production Build Frontend
```
cd apps/dashboard
npm run build
npm run start
```

### Deploy to Cloud (example ECS)
- Push Docker images to registry
- Create ECS tasks/services for each microservice
- Configure Nginx, MongoDB, Redis, and Storage
- Set environment variables from .env.production

### Vercel Frontend Deploy
- Connect repo to Vercel
- Set environment variables
- Deploy

### SSL/Domain
- Configure Nginx for HTTPS
- Use certbot or cloud provider for SSL

### Monitoring
- Integrate with CloudWatch, Datadog, or Elastic

---

For detailed steps, see each service's README.
