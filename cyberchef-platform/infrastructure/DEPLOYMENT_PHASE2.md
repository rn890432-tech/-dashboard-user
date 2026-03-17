# CyberChef AI Production Deployment

## Infrastructure Architecture Diagram

```
[Internet]
   |
[cyberchef.ai]
   |
[NGINX API Gateway (SSL)]
   |
+-----------------------------+
|         Containers          |
|  auth  recipe  ai  feed     |
|  billing  analytics  video  |
+-----------------------------+
   |
[MongoDB] [Redis] [Cloud Storage]
   |
[Monitoring/Logging]
```

## Deployment Commands

### Build and Deploy Containers
```
cd infrastructure
# Build and start all containers
sudo docker-compose -f cloud-deployment.yml up -d --build
```

### SSL Setup
```
sudo certbot --nginx -d cyberchef.ai -d www.cyberchef.ai
sudo certbot renew --dry-run
```

### Domain Routing
- Set A record for cyberchef.ai to your server IP
- Set CNAME for www to cyberchef.ai

### Storage Integration
- Create buckets in AWS S3, GCP, or Azure Blob
- Add access keys to .env.production

### Monitoring & Logging
- Install monitoring agent (CloudWatch, Datadog, etc.)
- Configure log aggregation

### Connect Frontend and Backend
- Frontend (Next.js) points API calls to /api (Nginx gateway)
- Backend services respond via Nginx proxy

### Launch Platform Publicly
- Confirm all containers are running
- Test domain and SSL
- Test API and frontend
- Monitor logs and metrics

---

For detailed steps, see each config file in infrastructure/.
