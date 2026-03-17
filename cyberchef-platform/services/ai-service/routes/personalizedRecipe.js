const express = require('express');
const router = express.Router();
const NutritionProfile = require('../models/NutritionProfile');
// Assume Recipe model exists
const Recipe = require('../models/Recipe');

// POST /ai/personalized-recipe
router.post('/', async (req, res) => {
  try {
    const { userId } = req.body;
    const profile = await NutritionProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: 'Nutrition profile not found' });
    // AI logic placeholder: filter recipes by dietType, calorieGoal, preferences
    const query = {
      dietType: profile.dietType,
      ingredients: { $nin: profile.dislikedIngredients, $in: profile.favoriteIngredients },
      calories: { $lte: profile.dailyCalorieGoal || 2000 }
    };
    const recipes = await Recipe.find(query).limit(5);
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
