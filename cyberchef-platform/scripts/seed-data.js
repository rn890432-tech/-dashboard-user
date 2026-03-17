// Seed data script for CyberChef AI
const mongoose = require('mongoose');
const User = require('../services/auth-service/models/User');
const Recipe = require('../services/recipe-service/models/Recipe');
const Video = require('../services/video-service/models/Video');

async function seed() {
  await mongoose.connect(process.env.DATABASE_URL);
  await User.create({ email: 'demo@cyberchef.ai', password: 'hashed', username: 'DemoUser' });
  await Recipe.create({ title: 'AI Vegan Pasta', ingredients: ['Chickpea pasta', 'Tomato basil sauce'], steps: ['Boil pasta', 'Add sauce'], isPublic: true });
  await Video.create({ recipeId: 'demoRecipeId', videoUrl: 'https://s3.amazonaws.com/bucket/recipes/videos/demoRecipeId/video.mp4' });
  console.log('Seed data added.');
  process.exit();
}
seed();
