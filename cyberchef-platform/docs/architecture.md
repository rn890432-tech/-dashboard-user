# Architecture Overview

CyberChef AI is a microservice-based platform:

## System Components
- Dashboard (Next.js)
- Marketing Site (Next.js)
- Auth Service
- Recipe Service
- AI Service
- Video Service
- Billing Service
- Feed Service
- Analytics Service

## Microservice Communication
- REST APIs via Nginx API gateway
- JWT authentication
- Redis for caching and queues

## Database Schema
- MongoDB collections: users, recipes, videos, nutrition_profiles, analytics, waitlist

## AI Processing Pipeline
- Recipe text → AI model → nutrition analysis → meal plan → video generation

## Video Generation Workflow
- Recipe steps → scene generation → image generation → video assembly → cloud storage

See [deployment.md](deployment.md) for production setup.
