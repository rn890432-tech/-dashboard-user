const express = require('express');
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/recipes', recipeController.getRecipes);
router.post('/recipes', auth(), recipeController.createRecipe);
router.get('/recipes/:id', recipeController.getRecipeById);
router.put('/recipes/:id', auth(), recipeController.updateRecipe);
router.delete('/recipes/:id', auth(), recipeController.deleteRecipe);

// Rating
router.post('/recipes/:id/rate', auth(), recipeController.rateRecipe);
// Comment
router.post('/recipes/:id/comment', auth(), recipeController.commentRecipe);

module.exports = router;
