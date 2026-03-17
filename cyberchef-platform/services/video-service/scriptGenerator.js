// Simple AI script generator for recipe video narration
module.exports.generateScript = function(recipe) {
  return `Today we’re making ${recipe.title} by ${recipe.creator}. Ingredients: ${recipe.ingredients.join(', ')}. ${recipe.instructions.map((step, i) => `Step ${i+1}: ${step}`).join(' ')} Enjoy your meal!`;
};