const mongoose = require('mongoose');

const VideoStatusSchema = new mongoose.Schema({
  recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
  videoUrl: { type: String },
  error: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VideoStatus', VideoStatusSchema);
