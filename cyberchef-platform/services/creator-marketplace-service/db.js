const mongoose = require('mongoose');

async function connectDb() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/marketplace';
  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 10000,
  });
}

module.exports = { connectDb, mongoose };
