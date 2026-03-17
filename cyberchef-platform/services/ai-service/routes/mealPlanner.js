const express = require('express');
const router = express.Router();
const NutritionProfile = require('../models/NutritionProfile');
const Recipe = require('../models/Recipe');

// POST /api/ai/meal-planner
router.post('/meal-planner', async (req, res) => {
  try {
    const { userId, days = 7 } = req.body;
    const profile = await NutritionProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: 'Nutrition profile not found' });
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    const plan = [];
    for (let i = 0; i < days; i++) {
      const day = { day: `Day ${i + 1}`, meals: [] };
      for (const mealType of mealTypes) {
        const recipe = await Recipe.findOne({ dietType: profile.dietType });
        day.meals.push({ title: recipe ? recipe.title : 'AI Meal', cuisine: recipe ? recipe.cuisine : 'Global', mealType });
      }
      plan.push(day);
    }
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
