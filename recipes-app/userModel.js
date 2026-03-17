// userModel.js
// User model for both MongoDB (Mongoose) and SQLite

const { DB_TYPE, mongoose, sqlite3 } = require('./db');
const bcrypt = require('bcrypt');

// MongoDB User Schema
let User = null;
if (DB_TYPE === 'mongodb') {
  const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    oauthProvider: String,
    oauthId: String,
    createdAt: { type: Date, default: Date.now }
  });
  userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
  };
  User = mongoose.model('User', userSchema);
}

// SQLite helpers
function createUserTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    oauthProvider TEXT,
    oauthId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function addUserSqlite(db, { username, password, oauthProvider, oauthId }, cb) {
  db.run(
    `INSERT INTO users (username, password, oauthProvider, oauthId) VALUES (?, ?, ?, ?)`,
    [username, password, oauthProvider || null, oauthId || null],
    cb
  );
}

function findUserByUsernameSqlite(db, username, cb) {
  db.get(`SELECT * FROM users WHERE username = ?`, [username], cb);
}

function findUserByOauthSqlite(db, provider, oauthId, cb) {
  db.get(`SELECT * FROM users WHERE oauthProvider = ? AND oauthId = ?`, [provider, oauthId], cb);
}

module.exports = { User, createUserTable, addUserSqlite, findUserByUsernameSqlite, findUserByOauthSqlite };