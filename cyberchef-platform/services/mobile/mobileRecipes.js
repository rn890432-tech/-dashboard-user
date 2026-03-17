const express = require('express');
const router = express.Router();

const recipes = [
  { id: 1, title: 'Vegan Pasta', likes: 10, comments: [], ingredients: ['pasta', 'tomato', 'basil'] },
  { id: 2, title: 'Avocado Toast', likes: 5, comments: [], ingredients: ['bread', 'avocado', 'lemon'] }
];

router.get('/recipes', (req, res) => {
  res.json({ recipes });
});

router.get('/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id == req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ recipe });
});

router.post('/recipes/like', (req, res) => {
  const { id } = req.body;
  const recipe = recipes.find(r => r.id == id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  recipe.likes += 1;
  res.json({ success: true, likes: recipe.likes });
});

router.post('/recipes/comment', (req, res) => {
  const { id, comment } = req.body;
  const recipe = recipes.find(r => r.id == id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  recipe.comments.push(comment);
  res.json({ success: true, comments: recipe.comments });
});

module.exports = router;
