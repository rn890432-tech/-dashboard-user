const express = require('express');
const router = express.Router();

router.post('/analytics/demo-event', (req, res) => {
  // Track demo event
  // Example: { event: 'session_start', feature: 'recipe', conversion: false }
  // In real implementation, update demoAnalytics.js or DB
  res.status(200).send({ success: true });
});

module.exports = router;
