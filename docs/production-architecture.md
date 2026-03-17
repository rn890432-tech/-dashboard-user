# CyberChef AI Production Architecture

```mermaid
graph TD
  subgraph Frontend
    F1[Web Dashboard]
    F2[Marketing Website]
    F3[Mobile App]
  end
  subgraph Backend
    B1[Auth Service]
    B2[Recipe Service]
    B3[AI Service]
    B4[Video Generation Service]
    B5[Creator Marketplace Service]
    B6[Grocery Service]
  end
  subgraph Infrastructure
    I1[MongoDB Cluster]
    I2[Redis Cache / Job Queue]
    I3[Cloud Storage (S3/Minio)]
    I4[CDN for Videos]
    I5[API Gateway]
    I6[Load Balancer]
    I7[Container Runtime]
    I8[Monitoring & Logging]
  end

  F1 --> I5
  F2 --> I5
  F3 --> I5
  I5 --> I6
  I6 --> B1
  I6 --> B2
  I6 --> B3
  I6 --> B4
  I6 --> B5
  I6 --> B6
  B1 --> I1
  B2 --> I1
  B2 --> I2
  B3 --> I2
  B4 --> I3
  B5 --> I1
  B6 --> I1
  B4 --> I4
  I8 --> I6
  I8 --> B1
  I8 --> B2
  I8 --> B3
  I8 --> B4
  I8 --> B5
  I8 --> B6
```

## Communication
- Frontend apps communicate via API Gateway
- API Gateway routes to backend microservices
- Backend services use MongoDB, Redis, S3, CDN
- Monitoring & Logging collect metrics and errors from all services
