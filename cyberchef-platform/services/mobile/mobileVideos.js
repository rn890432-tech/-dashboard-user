const express = require('express');
const router = express.Router();

const videos = {
  1: { url: 'https://cdn.cyberchef.ai/videos/vegan-pasta.mp4' },
  2: { url: 'https://cdn.cyberchef.ai/videos/avocado-toast.mp4' }
};

router.get('/videos/:recipeId', (req, res) => {
  const video = videos[req.params.recipeId];
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ video });
});

module.exports = router;
