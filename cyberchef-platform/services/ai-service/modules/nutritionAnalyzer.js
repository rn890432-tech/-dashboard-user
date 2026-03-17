// Nutrition Analyzer: Calculates calories, protein, carbs, fat
module.exports = function analyzeNutrition({ ingredients }) {
  // Placeholder: In production, use real nutrition DB/API
  let nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  (ingredients || []).forEach(() => {
    nutrition.calories += 100;
    nutrition.protein += 5;
    nutrition.carbs += 15;
    nutrition.fat += 3;
  });
  return nutrition;
};