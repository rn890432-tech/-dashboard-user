const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// GET /api/recipes/share/:id
router.get('/share/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    // Generate OpenGraph metadata
    res.set('Content-Type', 'text/html');
    res.send(`
      <html>
        <head>
          <title>${recipe.title} | CyberChef</title>
          <meta name="description" content="${recipe.description}" />
          <meta property="og:title" content="${recipe.title}" />
          <meta property="og:description" content="${recipe.description}" />
          <meta property="og:image" content="${recipe.imageUrl}" />
          <meta property="og:url" content="https://cyberchef.ai/recipes/share/${id}" />
        </head>
        <body>
          <h1>${recipe.title}</h1>
          <img src="${recipe.imageUrl}" alt="${recipe.title}" />
          <p>${recipe.description}</p>
          <a href="https://cyberchef.ai/recipes/share/${id}">Share this recipe</a>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
