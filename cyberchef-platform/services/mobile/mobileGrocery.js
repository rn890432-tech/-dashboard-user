const express = require('express');
const router = express.Router();

router.post('/grocery/generate', (req, res) => {
  const { recipeIds, mealPlanId } = req.body;
  // Simulate categorized grocery list
  res.json({ groceryList: {
    produce: [{ name: 'lettuce', quantity: 2 }],
    proteins: [{ name: 'chicken', quantity: 500 }],
    grains: [{ name: 'rice', quantity: 1 }],
    dairy: [{ name: 'milk', quantity: 1 }],
    spices: [{ name: 'salt', quantity: 1 }],
    other: [{ name: 'olive oil', quantity: 1 }]
  }});
});

module.exports = router;
