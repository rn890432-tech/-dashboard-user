# CyberChef AI

A modern AI-powered recipe platform for creators, food lovers, and home chefs.

![Dashboard Screenshot](docs/dashboard-screenshot.png)

## Features

- AI recipe generator
- AI nutrition analysis
- Social recipe feed
- AI video generator
- AI personal chef
- Public recipe marketplace
- Mobile app API
- Waitlist growth system
- Professional marketing site

## Architecture Overview

CyberChef AI is a microservice-based monorepo:

- **Apps:** Dashboard, Marketing
- **Services:** Auth, Recipe, AI, Video, Billing, Feed, Analytics
- **Infrastructure:** Docker, Nginx, CI/CD

## Installation

```bash
# Clone the repository
 git clone https://github.com/your-org/cyberchef-ai.git
 cd cyberchef-ai

# Install dependencies
 npm install

# Configure environment variables
 cp .env.example .env

# Start local development
 docker-compose up --build
```

## Deployment Guide

See [docs/deployment.md](docs/deployment.md) for production setup.

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Development Guide](docs/development-guide.md)

## License

MIT License

---
For screenshots, demo videos, and more, see the [docs](docs/) folder.
