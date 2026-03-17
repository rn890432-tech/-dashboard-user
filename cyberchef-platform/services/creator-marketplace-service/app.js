const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDb } = require('./db');
const Creator = require('./models/Creator');
const Listing = require('./models/Listing');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'creator-marketplace-service',
    dbState: mongoose.connection.readyState,
  });
});

app.get('/api/marketplace/creators', async (_req, res) => {
  try {
    const creators = await Creator.find().sort({ createdAt: -1 }).lean();
    res.json({ creators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketplace/listings', async (_req, res) => {
  try {
    const listings = await Listing.find().populate('creatorId', 'handle tier').sort({ createdAt: -1 }).lean();
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace/listings', async (req, res) => {
  try {
    const { creatorId, title, priceUsd } = req.body || {};
    if (!creatorId || typeof creatorId !== 'string') {
      return res.status(400).json({ error: 'creatorId is required' });
    }

    if (!mongoose.isValidObjectId(creatorId)) {
      return res.status(400).json({ error: 'creatorId must be a valid ObjectId' });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'title must be a string with at least 3 characters' });
    }

    if (!Number.isFinite(priceUsd) || priceUsd < 0.01) {
      return res.status(400).json({ error: 'priceUsd must be a number >= 0.01' });
    }

    const creator = await Creator.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ error: 'creator not found' });
    }

    const listing = await Listing.create({
      creatorId,
      title: title.trim(),
      priceUsd,
    });
    return res.status(201).json({ listing });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'listing already exists for this creator and title' });
    }
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: 'listing already exists for this creator and title' });
  }
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 5011;

connectDb()
  .then(async () => {
    const creatorsCount = await Creator.countDocuments();
    if (creatorsCount === 0) {
      const seeded = await Creator.insertMany([
        { handle: 'chef_ava', tier: 'pro', followers: 12000 },
        { handle: 'pasta_lab', tier: 'starter', followers: 3400 },
      ]);

      await Listing.insertMany([
        { creatorId: seeded[0]._id, title: '7-Day Italian Meal Pack', priceUsd: 19.99 },
        { creatorId: seeded[1]._id, title: 'Quick Weeknight Bowl Series', priceUsd: 9.99 },
      ]);
    }

    app.listen(PORT, () => {
      console.log(`Creator marketplace service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB for creator-marketplace-service', err);
    process.exit(1);
  });
