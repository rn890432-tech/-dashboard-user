const express = require('express');
const router = express.Router();

// Global Food Map Endpoint
router.get('/food-map', (req, res) => {
  // Example: trending recipes by country
  const trending = [
    { country: 'Italy', recipe: 'Pasta Carbonara', views: 12000 },
    { country: 'Japan', recipe: 'Sushi', views: 15000 },
    { country: 'Mexico', recipe: 'Tacos', views: 9000 },
    { country: 'India', recipe: 'Butter Chicken', views: 11000 },
    { country: 'USA', recipe: 'Burgers', views: 13000 }
  ];
  res.json({ trending });
});

module.exports = router;
