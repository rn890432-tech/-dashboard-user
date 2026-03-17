const express = require('express');
const router = express.Router();

const recommendations = [
  { id: 1, title: 'Vegan Pasta' },
  { id: 2, title: 'Avocado Toast' }
];
const trending = [
  { id: 2, title: 'Avocado Toast' },
  { id: 1, title: 'Vegan Pasta' }
];

router.get('/feed/recommendations', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const paged = recommendations.slice((page-1)*perPage, page*perPage);
  res.json({ recommendations: paged, page });
});

router.get('/feed/trending', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const paged = trending.slice((page-1)*perPage, page*perPage);
  res.json({ trending: paged, page });
});

module.exports = router;
