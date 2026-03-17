// Serve real-time map events for dashboard
router.get('/map-events', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, 'map-events.log');
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) return res.json({ events: [] });
    const events = data.split('\n').filter(Boolean).map(line => {
      const [time, eventType, country, recipe, creator, userId] = line.split('|');
      return { time, eventType, country, recipe, creator, userId };
    });
    res.json({ events });
  });
});
// Real-time map events (WebSocket stub)
const mapEventSubscribers = [];
router.get('/map-events/subscribe', (req, res) => {
  // Stub: In production, use WebSocket server
  res.json({ message: 'WebSocket endpoint for real-time map events' });
});
const express = require('express');
const router = express.Router();

// Analytics tracking for map events
const fs = require('fs');
const path = require('path');
router.post('/map-event', (req, res) => {
  const { eventType, country, recipe, creator, userId } = req.body;
  const logEntry = `${new Date().toISOString()}|${eventType}|${country}|${recipe}|${creator}|${userId}\n`;
  fs.appendFile(path.join(__dirname, 'map-events.log'), logEntry, err => {
    if (err) return res.status(500).json({ error: 'Failed to log event' });
    res.json({ success: true });
  });
});

module.exports = router;
