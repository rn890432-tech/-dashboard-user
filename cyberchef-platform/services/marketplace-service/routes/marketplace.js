const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// GET /api/marketplace/recipes
router.get('/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find({ isPublic: true }).limit(50);
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketplace/recipe/:id/share
router.post('/recipe/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    await Recipe.findByIdAndUpdate(id, { isPublic: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
