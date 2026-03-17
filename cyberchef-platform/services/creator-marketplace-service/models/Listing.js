const { mongoose } = require('../db');

const listingSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creator',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140,
      index: true,
    },
    priceUsd: { type: Number, required: true, min: 0.01, max: 100000 },
  },
  { timestamps: true }
);

listingSchema.index({ creatorId: 1, createdAt: -1 });
listingSchema.index(
  { creatorId: 1, title: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Listing', listingSchema);
