// recipeModel.js
// Recipe model for both MongoDB (Mongoose) and SQLite

const { DB_TYPE, mongoose, sqlite3 } = require('./db');

// MongoDB Recipe Schema
let Recipe = null;
if (DB_TYPE === 'mongodb') {
  const recipeSchema = new mongoose.Schema({
    title: String,
    description: String,
    ingredients: String,
    instructions: String,
    imageUrl: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  });
  Recipe = mongoose.model('Recipe', recipeSchema);
}

// SQLite helpers
function createRecipeTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    ingredients TEXT,
    instructions TEXT,
    imageUrl TEXT,
    author INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { Recipe, createRecipeTable };