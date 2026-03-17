const express = require('express');
const router = express.Router();
const { createDemoSession, loadDemoData } = require('./demoSession');

// Demo entry route
router.get('/demo', async (req, res) => {
  // Create demo session if not present
  if (!req.session.demo_user) {
    req.session.demo_user = await createDemoSession();
    req.session.demo_expiry = Date.now() + 30 * 60 * 1000;
  }
  // Load demo data
  const demoData = await loadDemoData();
  res.render('demo', { demo_user: req.session.demo_user, demoData });
});

module.exports = router;
