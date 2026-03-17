const mongoose = require('mongoose');

const UserSignalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  signalType: { type: String, enum: ['COOKED_RECIPE', 'LIKED_RECIPE', 'SAVED_RECIPE'], required: true },
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserSignal', UserSignalSchema);
