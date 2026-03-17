const livestream = require('./livestream');
router.use('/livestream', livestream);
// Community features (Stub)
const comments = [];
const likes = [];
const reviews = [];

router.post('/recipes/:recipeId/comment', (req, res) => {
  const { userId, text } = req.body;
  comments.push({ recipeId: req.params.recipeId, userId, text, timestamp: Date.now() });
  res.json({ success: true });
});

router.post('/recipes/:recipeId/like', (req, res) => {
  const { userId } = req.body;
  likes.push({ recipeId: req.params.recipeId, userId });
  res.json({ success: true });
});

router.post('/recipes/:recipeId/review', (req, res) => {
  const { userId, rating, text } = req.body;
  reviews.push({ recipeId: req.params.recipeId, userId, rating, text, timestamp: Date.now() });
  res.json({ success: true });
});
const discovery = require('./discoveryFeed');
// Creator discovery feed
router.get('/trending', (req, res) => {
  const creators = discovery.getTrendingCreators();
  res.json({ creators });
});
// Creator recipe publishing
router.post('/recipes', (req, res) => {
  const { creatorId, title, ingredients, instructions, video, pricing } = req.body;
  const recipeId = logic.uploadRecipe(creatorId, { title, ingredients, instructions, video, pricing });
  res.json({ success: true, recipeId });
});
// Creator application endpoint
router.post('/apply', (req, res) => {
  const { userId, profile } = req.body;
  logic.applyToCreator(userId, profile);
  res.json({ success: true });
});
const analytics = require('./analyticsDashboard');
// Creator analytics dashboard
router.get('/:creatorId/analytics', (req, res) => {
  const data = analytics.getCreatorAnalytics(req.params.creatorId);
  if (!data) return res.status(404).json({ error: 'Creator not found' });
  res.json(data);
});
const payout = require('./payoutIntegration');
// Payout to creator
router.post('/:creatorId/payout', async (req, res) => {
  const { amount } = req.body;
  try {
    const result = await payout.payoutToCreator(req.params.creatorId, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Payout failed', details: err.message });
  }
});
const express = require('express');
const router = express.Router();

// Creator Marketplace Endpoints

const logic = require('./creatorMarketplaceLogic');
const payment = require('./paymentIntegration');

// Upload recipe
router.post('/upload-recipe', (req, res) => {
  const { creatorId, recipeData } = req.body;
  const recipeId = logic.uploadRecipe(creatorId, recipeData);
  res.json({ success: true, recipeId });
});

// Subscribe to creator
router.post('/subscribe', (req, res) => {
  const { userId, creatorId, tier } = req.body;
  let price = 0;
  if (tier === 'Premium') price = 500;
  else if (tier === 'VIP') price = 1500;
  if (price > 0) {
    payment.createSubscription(userId, creatorId)
      .then(url => {
        logic.subscribeToCreator(userId, creatorId);
        res.json({ success: true, checkoutUrl: url });
      })
      .catch(err => {
        res.status(500).json({ error: 'Payment failed', details: err.message });
      });
  } else {
    logic.subscribeToCreator(userId, creatorId);
    res.json({ success: true, tier });
  }
});

// Track video views
router.post('/video-view', (req, res) => {
  const { recipeId } = req.body;
  logic.addVideoView(recipeId);
  res.json({ success: true });
});

// Get creator earnings
router.get('/:creatorId/earnings', (req, res) => {
  const earnings = logic.getCreatorEarnings(req.params.creatorId);
  res.json({ earnings });
});

module.exports = router;
