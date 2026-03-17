import axios from 'axios';

const API_BASE = 'https://api.cyberchef.ai/api/mobile';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

export function login(username, password) {
  return api.post('/auth/login', { username, password });
}

export function getRecommendations() {
  return api.get('/feed/recommendations');
}

export function getRecipe(id) {
  return api.get(`/recipes/${id}`);
}

export function generateRecipe(ingredients) {
  return api.post('/ai/generate-recipe', { ingredients });
}

export function generateMealPlan(preferences) {
  return api.post('/ai/meal-plan', { preferences });
}

export function generateGroceryList(mealPlanId) {
  return api.post('/grocery/generate', { mealPlanId });
}

export function getRecipeVideo(recipeId) {
  return api.get(`/videos/${recipeId}`);
}

export function generateRecipeVideo(recipe) {
  return api.post('/ai/recipe-video', { recipe });
}
