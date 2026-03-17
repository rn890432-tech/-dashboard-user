const express = require('express');
const router = express.Router();
const { generateGroceryList } = require('./groceryListGenerator');
const { estimatePrice } = require('./priceEstimate');
const { exportCartToService } = require('./deliveryIntegration');
// POST /api/grocery/export-cart
router.post('/api/grocery/export-cart', (req, res) => {
  const { cart, service } = req.body;
  const result = exportCartToService(cart, service);
  res.json(result);
});

// Mock DBs for demo
const recipeDb = require('../demo/demoRecipes');
const mealPlanDb = require('../demo/demoMealPlans');


// POST /api/grocery/generate-list
router.post('/api/grocery/generate-list', (req, res) => {
  const { recipeIds, mealPlanId } = req.body;
  const groceryList = generateGroceryList({ recipeIds, mealPlanId }, recipeDb, mealPlanDb);
  res.json({ groceryList });
});

// GET /api/grocery/price-estimate
router.get('/api/grocery/price-estimate', (req, res) => {
  // Accept groceryList as query param (JSON string)
  const groceryList = JSON.parse(req.query.groceryList || '{}');
  const total = estimatePrice(groceryList);
  res.json({ estimatedTotal: total });
});

module.exports = router;
