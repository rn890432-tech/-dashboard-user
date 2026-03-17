const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDb } = require('./db');
const GroceryItem = require('./models/GroceryItem');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'grocery-service',
    dbState: mongoose.connection.readyState,
  });
});

app.get('/api/grocery/items', async (_req, res) => {
  try {
    const items = await GroceryItem.find().sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grocery/items', async (req, res) => {
  try {
    const { name, quantity = 1, unit = 'pcs' } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'name must be a string with at least 2 characters' });
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be a number >= 1' });
    }

    if (typeof unit !== 'string' || unit.trim().length === 0 || unit.trim().length > 24) {
      return res.status(400).json({ error: 'unit must be a non-empty string up to 24 characters' });
    }

    const item = await GroceryItem.create({
      name: name.trim(),
      quantity,
      unit: unit.trim(),
      checked: false,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/grocery/items/:id/check', async (req, res) => {
  try {
    const item = await GroceryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'item not found' });
    }

    item.checked = !item.checked;
    await item.save();
    return res.json({ item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 5007;

connectDb()
  .then(async () => {
    const count = await GroceryItem.countDocuments();
    if (count === 0) {
      await GroceryItem.insertMany([
        { name: 'Tomatoes', quantity: 4, unit: 'pcs', checked: false },
        { name: 'Olive Oil', quantity: 1, unit: 'bottle', checked: false },
      ]);
    }

    app.listen(PORT, () => {
      console.log(`Grocery service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB for grocery-service', err);
    process.exit(1);
  });
