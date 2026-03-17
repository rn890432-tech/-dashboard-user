const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  subscription: { type: String, enum: ['free', 'pro', 'creator'], default: 'free' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  username: { type: String },
  profilePhoto: { type: String },
  verified: { type: Boolean, default: false },
  verificationToken: { type: String },
  oauthProvider: { type: String },
  oauthId: { type: String },
  lastLogin: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);
