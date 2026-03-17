const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/ai/generate-recipe', aiController.generateRecipe);
router.post('/ai/analyze-nutrition', aiController.analyzeNutrition);
router.post('/ai/meal-plan', aiController.mealPlan);
// Optional: Recommendation endpoint
router.post('/ai/recommend', aiController.recommendRecipes);

module.exports = router;
