const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { generateScript } = require('./scriptGenerator');
const { renderVideo } = require('./videoRenderer');
const generateRecipeVideoRoutes = require('./routes/generateRecipeVideo');
const videosRoutes = require('./routes/videos');
require('dotenv').config();

const app = express();
app.use(express.json());

async function getRecipeById(recipeId) {
  return {
    id: recipeId,
    title: 'Generated Recipe',
    description: 'Placeholder recipe used when upstream recipe lookup is not wired.',
    ingredients: [],
    steps: [],
  };
}

app.post('/video/generate', async (req, res) => {
  const { recipeId } = req.body;
  // Fetch recipe data (mock)
  const recipe = await getRecipeById(recipeId); // Implement this
  const script = generateScript(recipe);
  const videoPath = await renderVideo(recipe, script);
  // Store video in /storage/videos/{recipeId}.mp4
  res.json({ generatedVideoURL: `/storage/videos/${recipeId}.mp4` });
});

app.post('/ai/video-script', async (req, res) => {
  const { recipe } = req.body;
  const script = generateScript(recipe);
  res.json({ script });
});

app.use('/api/ai', generateRecipeVideoRoutes);
app.use('/api/videos', videosRoutes);

const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`Video Service running on port ${PORT}`);
});
