const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');

// POST /api/analytics/event
router.post('/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    await AnalyticsEvent.create({ eventType, eventData });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
