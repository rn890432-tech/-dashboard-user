const express = require('express');
const router = express.Router();
const NutritionProfile = require('../models/NutritionProfile');

// POST /nutrition/profile
router.post('/profile', async (req, res) => {
  try {
    const { userId, dietType, allergies, dailyCalorieGoal, proteinGoal, carbGoal, fatGoal, favoriteIngredients, dislikedIngredients } = req.body;
    let profile = await NutritionProfile.findOne({ userId });
    if (profile) {
      // Update existing profile
      profile.set({ dietType, allergies, dailyCalorieGoal, proteinGoal, carbGoal, fatGoal, favoriteIngredients, dislikedIngredients });
      await profile.save();
    } else {
      // Create new profile
      profile = await NutritionProfile.create({ userId, dietType, allergies, dailyCalorieGoal, proteinGoal, carbGoal, fatGoal, favoriteIngredients, dislikedIngredients });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /nutrition/profile?userId=xxx
router.get('/profile', async (req, res) => {
  try {
    const { userId } = req.query;
    const profile = await NutritionProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
