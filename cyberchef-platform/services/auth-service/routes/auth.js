const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { createJWT } = require('../utils/jwtService');
const { sendVerificationEmail } = require('../utils/emailService');
const rateLimiter = require('../utils/rateLimiter');
const csrfProtection = require('../utils/csrfProtection');

const router = express.Router();

router.use(rateLimiter);
router.use(csrfProtection);

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2);
    const user = await User.create({ email, password: hash, username, verificationToken, verified: false });
    await sendVerificationEmail(email, verificationToken);
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!user.verified) return res.status(400).json({ error: 'Email not verified' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid password' });
    user.lastLogin = new Date();
    await user.save();
    const token = createJWT(user);
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
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
