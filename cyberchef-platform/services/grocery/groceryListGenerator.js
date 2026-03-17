// Grocery List Generator
// Converts recipes or meal plans into categorized grocery list

const ingredientCategories = {
  produce: ['lettuce', 'tomato', 'onion', 'avocado', 'carrot', 'spinach', 'broccoli', 'apple', 'banana'],
  proteins: ['chicken', 'beef', 'tofu', 'egg', 'fish', 'beans'],
  grains: ['rice', 'bread', 'pasta', 'quinoa', 'oats'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter'],
  spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano'],
};

function categorizeIngredient(name) {
  for (const [cat, items] of Object.entries(ingredientCategories)) {
    if (items.some(i => name.toLowerCase().includes(i))) return cat;
  }
  return 'other';
}

function aggregateIngredients(recipes) {
  const aggregated = {};
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      const key = ing.name.toLowerCase();
      if (!aggregated[key]) {
        aggregated[key] = { ...ing, quantity: ing.quantity || 1 };
      } else {
        aggregated[key].quantity += ing.quantity || 1;
      }
    });
  });
  return aggregated;
}

function generateGroceryList({ recipeIds, mealPlanId }, recipeDb, mealPlanDb) {
  let recipes = [];
  if (recipeIds) {
    recipes = recipeIds.map(id => recipeDb.find(r => r.id === id)).filter(Boolean);
  } else if (mealPlanId) {
    const mealPlan = mealPlanDb.find(mp => mp.id === mealPlanId);
    if (mealPlan) {
      recipes = mealPlan.recipes.map(id => recipeDb.find(r => r.id === id)).filter(Boolean);
    }
  }
  const aggregated = aggregateIngredients(recipes);
  const categorized = {};
  Object.values(aggregated).forEach(ing => {
    const cat = categorizeIngredient(ing.name);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(ing);
  });
  return categorized;
}

module.exports = { generateGroceryList };
