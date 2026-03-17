# Deployment Guide

## Local Development
1. Clone repo
2. Install dependencies
3. Configure .env
4. Run `docker-compose up --build`

## Production Deployment
- Configure .env.production
- Deploy containers to cloud server
- Set up domain and HTTPS
- Connect AWS S3 bucket
- Configure monitoring/logging

## Infrastructure
- Docker, Nginx, CI/CD

## Monitoring
- CloudWatch, Datadog, ELK

See [architecture.md](architecture.md) for system details.
