// Production analytics integration
export const analyticsConfig = {
  key: process.env.ANALYTICS_KEY,
  events: ['install', 'recipe_generation', 'video_generation', 'meal_plan_creation']
};
