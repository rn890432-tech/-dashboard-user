const uuid = require('uuid');

function createDemoSession() {
  return Promise.resolve({
    username: 'demo_user',
    permissions: ['demo'],
    sessionId: uuid.v4(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    isDemo: true
  });
}

function loadDemoData() {
  // Load sample recipes, videos, meal plans, analytics
  return Promise.resolve({
    recipes: require('./demoRecipes'),
    videos: require('./demoVideos'),
    mealPlans: require('./demoMealPlans'),
    analytics: require('./demoAnalytics')
  });
}

module.exports = { createDemoSession, loadDemoData };
