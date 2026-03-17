const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const { getCachedVideo } = require('../utils/cache');

// GET /api/videos/recipe/:id
router.get('/recipe/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let videoUrl = await getCachedVideo(id);
    const recipe = await Recipe.findById(id);
    if (!recipe || (!recipe.videoUrl && !videoUrl)) return res.status(404).json({ error: 'Video not found' });
    if (!videoUrl) videoUrl = recipe.videoUrl;
    // OpenGraph metadata for social sharing
    res.set('Content-Type', 'text/html');
    res.send(`
      <html>
        <head>
          <title>${recipe.title} | CyberChef</title>
          <meta name="description" content="${recipe.description}" />
          <meta property="og:title" content="${recipe.title}" />
          <meta property="og:description" content="${recipe.description}" />
          <meta property="og:image" content="${recipe.imageUrl}" />
          <meta property="og:video" content="${recipe.videoUrl}" />
          <meta property="og:url" content="https://cyberchef.ai/videos/recipe/${id}" />
        </head>
        <body>
          <h1>${recipe.title}</h1>
          <video src="${videoUrl}" controls width="480"></video>
          <p>${recipe.description}</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/share
router.post('/share', async (req, res) => {
  try {
    const { videoUrl, platform } = req.body;
    // Placeholder: Share video to TikTok, Instagram, YouTube
    res.json({ success: true, message: `Video shared to ${platform}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
