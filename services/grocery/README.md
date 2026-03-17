# Grocery System Architecture

## Overview
The grocery system converts meal plans and recipes into categorized grocery lists, estimates prices, supports delivery integration, and tracks analytics.

## Architecture
- **Service:** groceryListGenerator.js (aggregation, categorization)
- **Endpoints:**
  - POST /api/grocery/generate-list
  - GET /api/grocery/price-estimate
  - POST /api/grocery/export-cart
  - POST /analytics/grocery-event
- **UI Components:**
  - GroceryList.jsx (checkboxes, quantity, grouping, export)
  - GroceryPage.jsx (list, meal plan, delivery options)
  - MealPlanPage.jsx (offer grocery list generation)
- **Caching:** groceryCache.js (Redis, 30-min expiration)
- **Analytics:** groceryAnalytics.js, groceryAnalyticsRoutes.js

## Example Grocery List Output
```
{
  produce: [ { name: 'lettuce', quantity: 2 }, { name: 'tomato', quantity: 3 } ],
  proteins: [ { name: 'chicken', quantity: 500 } ],
  grains: [ { name: 'rice', quantity: 1 } ],
  dairy: [ { name: 'milk', quantity: 1 } ],
  spices: [ { name: 'salt', quantity: 1 } ],
  other: [ { name: 'olive oil', quantity: 1 } ]
}
```

## UI Structure
- GroceryList.jsx: grouped list, checkboxes, quantity, export
- GroceryPage.jsx: grocery list, meal plan groceries, delivery options
- MealPlanPage.jsx: "Generate Grocery List" button

---
For full implementation, see grocery service files and dashboard UI components.
