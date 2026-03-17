const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /onboarding/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    // Add email verification token logic
    const verificationToken = Math.random().toString(36).substring(2);
    const user = await User.create({ email, password, name, verificationToken, verified: false });
    // Send verification email (placeholder)
    // sendEmailVerification(email, verificationToken);
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /onboarding/verify?token=xxx
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid token' });
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
