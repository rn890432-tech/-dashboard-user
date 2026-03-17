const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const { enqueueVideoJob } = require('../jobs/videoQueue');
const VideoStatus = require('../jobs/videoStatus');

// POST /api/ai/generate-recipe-video
router.post('/generate-recipe-video', async (req, res) => {
  try {
    const { recipeId, style = 'modern' } = req.body;
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    await enqueueVideoJob({ recipeId, style });
    await VideoStatus.create({ recipeId, status: 'queued' });
    res.json({ success: true, message: 'Video generation started.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /generate-recipe-video/status/:recipeId
router.get('/generate-recipe-video/status/:recipeId', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const status = await VideoStatus.findOne({ recipeId });
    if (!status) return res.status(404).json({ error: 'Status not found' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
