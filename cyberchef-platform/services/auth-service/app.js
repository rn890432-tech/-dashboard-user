require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const oauthRoutes = require('./routes/oauth');
const oauthBackendRoutes = require('./routes/oauthBackend');
const db = require('./config/db');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/auth', oauthBackendRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
