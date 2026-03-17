const express = require('express');
const router = express.Router();

// Trending recipes by region
router.get('/trending-by-region', (req, res) => {
  // Example dataset
  const data = [
    {
      country: 'Italy',
      trendingRecipes: ['Truffle Pasta', 'Margherita Pizza'],
      topCreator: 'Chef Marco',
      mostCooked: 'Margherita Pizza',
      fastestGrowingCuisine: 'Tuscan',
      recipePopularity: 12000
    },
    {
      country: 'Japan',
      trendingRecipes: ['Sushi', 'Ramen'],
      topCreator: 'Chef Yuki',
      mostCooked: 'Sushi',
      fastestGrowingCuisine: 'Okinawan',
      recipePopularity: 15000
    },
    {
      country: 'Mexico',
      trendingRecipes: ['Tacos', 'Mole'],
      topCreator: 'Chef Ana',
      mostCooked: 'Tacos',
      fastestGrowingCuisine: 'Yucatecan',
      recipePopularity: 9000
    }
  ];
  res.json({ regions: data });
});

// Top creators by country
router.get('/top-creators', (req, res) => {
  const creators = [
    { country: 'Italy', creator: 'Chef Marco' },
    { country: 'Japan', creator: 'Chef Yuki' },
    { country: 'Mexico', creator: 'Chef Ana' }
  ];
  res.json({ creators });
});

module.exports = router;
