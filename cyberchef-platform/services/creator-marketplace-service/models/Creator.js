const { mongoose } = require('../db');

const creatorSchema = new mongoose.Schema(
  {
    handle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
      match: /^[a-z0-9_\.]+$/,
      index: true,
    },
    tier: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    followers: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

creatorSchema.index({ followers: -1 });

module.exports = mongoose.model('Creator', creatorSchema);
