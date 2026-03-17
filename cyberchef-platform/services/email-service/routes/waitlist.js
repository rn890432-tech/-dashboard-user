const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');

// POST /api/email/waitlist
router.post('/waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    await Waitlist.create({ email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
