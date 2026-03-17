const recipeGenerator = require('../modules/recipeGenerator');
const nutritionAnalyzer = require('../modules/nutritionAnalyzer');
const mealPlanner = require('../modules/mealPlanner');
const recommendationEngine = require('../modules/recommendationEngine');

exports.generateRecipe = (req, res) => {
  const { ingredients, diet, cuisine } = req.body;
  const recipe = recipeGenerator({ ingredients, diet, cuisine });
  res.json(recipe);
};

exports.analyzeNutrition = (req, res) => {
  const { ingredients } = req.body;
  const nutrition = nutritionAnalyzer({ ingredients });
  res.json(nutrition);
};

exports.mealPlan = (req, res) => {
  const { diet, cuisine } = req.body;
  const plan = mealPlanner({ diet, cuisine });
  res.json(plan);
};

exports.recommendRecipes = (req, res) => {
  const { userHistory } = req.body;
  const recommendations = recommendationEngine({ userHistory });
  res.json(recommendations);
};
