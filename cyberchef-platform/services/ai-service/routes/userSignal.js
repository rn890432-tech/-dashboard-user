const express = require('express');
const router = express.Router();
const UserSignal = require('../models/UserSignal');

// POST /user-signal
router.post('/', async (req, res) => {
  try {
    const { userId, signalType, recipeId } = req.body;
    const signal = await UserSignal.create({ userId, signalType, recipeId });
    res.json(signal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
