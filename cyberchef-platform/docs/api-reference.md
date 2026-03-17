# API Reference

## Auth
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/verify-email
- GET /api/auth/google
- GET /api/auth/apple

## Recipes
- GET /api/recipes
- POST /api/recipes
- GET /api/recipes/:id
- GET /api/recipes/share/:id

## AI
- POST /api/ai/personalized-recipe
- POST /api/ai/meal-planner
- POST /api/ai/generate-recipe-video

## Feed
- GET /api/feed

## Billing
- POST /api/billing/subscribe

## Video
- GET /api/videos/recipe/:id
- POST /api/videos/share

## Analytics
- POST /api/analytics/event

### Example Request
```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "securepass",
  "username": "chefuser"
}
```

### Example Response
```json
{
  "success": true,
  "userId": "abc123"
}
```
