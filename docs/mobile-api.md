# CyberChef AI Mobile API Documentation

## Base Route
`/api/mobile/`

## Authentication
- `POST /api/mobile/auth/login` — Login, returns JWT token
- `POST /api/mobile/auth/register` — Register, returns JWT token
- `POST /api/mobile/auth/refresh-token` — Refresh JWT token
- `GET /api/mobile/auth/profile` — Get user profile

## Recipes
- `GET /api/mobile/recipes` — List recipes
- `GET /api/mobile/recipes/:id` — Recipe details
- `POST /api/mobile/recipes/like` — Like recipe
- `POST /api/mobile/recipes/comment` — Add comment

## AI Features
- `POST /api/mobile/ai/generate-recipe` — Generate recipe
- `POST /api/mobile/ai/analyze-nutrition` — Analyze nutrition
- `POST /api/mobile/ai/meal-plan` — Generate meal plan

## Videos
- `GET /api/mobile/videos/:recipeId` — Get recipe video URL

## Grocery
- `POST /api/mobile/grocery/generate` — Generate grocery list

## Feed
- `GET /api/mobile/feed/recommendations` — Recommendations (pagination)
- `GET /api/mobile/feed/trending` — Trending (pagination)

## Performance
- Response compression
- Caching headers
- Pagination supported

## Example Request
```
POST /api/mobile/auth/login
{
  "username": "demo",
  "password": "demo123"
}
```

## Example Response
```
{
  "token": "eyJhbGci..."
}
```

---
For full endpoint details, see mobile service files.
