const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// POST /ai/grocery-list
router.post('/', async (req, res) => {
  try {
    const { mealPlan } = req.body; // mealPlan: [{ day, meals: [{ title, mealType }] }]
    let ingredients = [];
    for (const day of mealPlan) {
      for (const meal of day.meals) {
        const recipe = await Recipe.findOne({ title: meal.title });
        if (recipe && recipe.ingredients) {
          ingredients = ingredients.concat(recipe.ingredients);
        }
      }
    }
    // Categorize ingredients
    const categories = {
      Produce: [],
      Proteins: [],
      Grains: [],
      Dairy: [],
      Spices: [],
      Other: []
    };
    for (const item of ingredients) {
      // Simple categorization logic (placeholder)
      if (/tomato|lettuce|carrot|apple/i.test(item)) categories.Produce.push(item);
      else if (/chicken|beef|tofu|egg/i.test(item)) categories.Proteins.push(item);
      else if (/rice|bread|pasta/i.test(item)) categories.Grains.push(item);
      else if (/milk|cheese|yogurt/i.test(item)) categories.Dairy.push(item);
      else if (/salt|pepper|cumin|oregano/i.test(item)) categories.Spices.push(item);
      else categories.Other.push(item);
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
