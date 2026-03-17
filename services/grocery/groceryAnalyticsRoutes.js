const express = require('express');
const router = express.Router();
const { trackGroceryEvent, events } = require('./groceryAnalytics');

// POST /analytics/grocery-event
router.post('/analytics/grocery-event', (req, res) => {
  trackGroceryEvent(req.body);
  res.json({ success: true });
});

// GET /analytics/grocery-events
router.get('/analytics/grocery-events', (req, res) => {
  res.json({ events });
});

module.exports = router;
