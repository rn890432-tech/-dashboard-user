const express = require('express');
const router = express.Router();
const NutritionProfile = require('../models/NutritionProfile');
const Recipe = require('../models/Recipe');

// POST /ai/weekly-meal-plan
router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    const profile = await NutritionProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: 'Nutrition profile not found' });
    // AI logic placeholder: generate 7-day meal plan
    const plan = [];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    for (let i = 0; i < 7; i++) {
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
