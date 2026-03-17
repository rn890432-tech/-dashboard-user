const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['free', 'pro', 'creator'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'canceled'], default: 'active' },
  stripeId: { type: String },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
