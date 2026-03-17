// db.js
// Database configuration for MongoDB and SQLite

const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();

const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'mongodb' or 'sqlite'

let db = null;

async function connectDB() {
  if (DB_TYPE === 'mongodb') {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recipes_app';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    return db;
  } else {
    db = new sqlite3.Database('./recipes-app.sqlite', (err) => {
      if (err) console.error('SQLite connection error:', err);
      else console.log('Connected to SQLite database.');
    });
    return db;
  }
}

module.exports = { connectDB, DB_TYPE, mongoose, sqlite3, db };