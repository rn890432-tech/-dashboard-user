const express = require('express');
const router = express.Router();
const UserSignal = require('../models/UserSignal');
const NutritionProfile = require('../models/NutritionProfile');

// GET /ai/insights?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    // Most eaten ingredients (placeholder logic)
    const signals = await UserSignal.find({ userId, signalType: 'COOKED_RECIPE' });
    // Assume Recipe model exists
    const Recipe = require('../models/Recipe');
    const ingredientCount = {};
    for (const signal of signals) {
      const recipe = await Recipe.findById(signal.recipeId);
      if (recipe && recipe.ingredients) {
        for (const ing of recipe.ingredients) {
          ingredientCount[ing] = (ingredientCount[ing] || 0) + 1;
        }
      }
    }
    // Nutrition balance trends (placeholder)
    const profile = await NutritionProfile.findOne({ userId });
    const nutritionTrends = profile ? {
      calories: profile.dailyCalorieGoal,
      protein: profile.proteinGoal,
      carbs: profile.carbGoal,
      fat: profile.fatGoal
    } : {};
    // Suggested dietary improvements (placeholder)
    const suggestions = [];
    if (profile && profile.dietType === 'keto' && nutritionTrends.carbs > 50) suggestions.push('Reduce carb intake for keto diet');
    res.json({
      mostEatenIngredients: ingredientCount,
      nutritionTrends,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
