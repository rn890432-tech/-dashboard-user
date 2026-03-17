const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { createJWT } = require('../utils/jwtService');

const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
  const { id, displayName, emails, photos, provider } = req.user;
  let user = await User.findOne({ oauthProvider: provider, oauthId: id });
  if (!user) {
    user = await User.create({
      username: displayName,
      email: emails[0].value,
      profilePhoto: photos[0].value,
      oauthProvider: provider,
      oauthId: id,
      verified: true
    });
  }
  const token = createJWT(user);
  res.redirect(`/onboarding?token=${token}`);
});

// Apple OAuth
router.get('/apple', passport.authenticate('apple'));
router.get('/apple/callback', passport.authenticate('apple', { failureRedirect: '/login' }), async (req, res) => {
  const { id, displayName, emails, provider } = req.user;
  let user = await User.findOne({ oauthProvider: provider, oauthId: id });
  if (!user) {
    user = await User.create({
      username: displayName,
      email: emails[0].value,
      oauthProvider: provider,
      oauthId: id,
      verified: true
    });
  }
  const token = createJWT(user);
  res.redirect(`/onboarding?token=${token}`);
});

module.exports = router;
