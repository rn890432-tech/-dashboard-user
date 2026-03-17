const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  eventData: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
