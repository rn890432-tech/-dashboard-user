# Domain Configuration

Domain: cyberchef.ai

## Routing
- /api → Nginx API gateway → backend services
- / → Next.js frontend (Vercel or container)

## Steps
1. Register cyberchef.ai with a domain provider.
2. Set A record to point to your cloud hosting IP (e.g., AWS, DigitalOcean, GCP).
3. Set CNAME for www to cyberchef.ai.
4. Configure Nginx to proxy /api to backend containers and / to frontend.
5. For Vercel, set up custom domain and connect to repo.
