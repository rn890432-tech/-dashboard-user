# Mobile API Architecture

## Overview
The mobile API exposes secure, optimized endpoints for iOS and Android apps to access platform features.

## Architecture
- **Gateway:** mobileApiGateway.js (base route /api/mobile/)
- **Authentication:** mobileAuth.js (JWT, login/register/refresh/profile)
- **Recipes:** mobileRecipes.js (list, details, like, comment)
- **AI Features:** mobileAI.js (generate recipe, analyze nutrition, meal plan)
- **Videos:** mobileVideos.js (streaming URLs)
- **Grocery:** mobileGrocery.js (generate grocery list)
- **Feed:** mobileFeed.js (recommendations, trending, pagination)
- **Performance:** mobilePerformance.js (compression, caching)

## Endpoint Examples
- POST /api/mobile/auth/login
- GET /api/mobile/recipes
- POST /api/mobile/ai/generate-recipe
- GET /api/mobile/videos/:recipeId
- POST /api/mobile/grocery/generate
- GET /api/mobile/feed/recommendations

## Sample JSON Response
```
{
  "recipes": [
    { "id": 1, "title": "Vegan Pasta", "likes": 10 }
  ]
}
```

---
For full implementation, see mobile service files and docs/mobile-api.md.
