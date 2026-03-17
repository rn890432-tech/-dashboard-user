// auth.js
// Passport strategies for local (email/password) and OAuth (Google, GitHub)

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');
const { DB_TYPE, db } = require('./db');
const { User, addUserSqlite, findUserByUsernameSqlite, findUserByOauthSqlite } = require('./userModel');

// Serialize/deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  if (DB_TYPE === 'mongodb') {
    User.findById(id, done);
  } else {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return done(err);
      done(null, row);
    });
  }
});

// Local Strategy
passport.use(new LocalStrategy(
  function(username, password, done) {
    if (DB_TYPE === 'mongodb') {
      User.findOne({ username }, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Incorrect password.' });
        return done(null, user);
      });
    } else {
      findUserByUsernameSqlite(db, username, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Incorrect password.' });
        return done(null, user);
      });
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
  callbackURL: '/auth/google/callback'
}, function(accessToken, refreshToken, profile, done) {
  if (DB_TYPE === 'mongodb') {
    User.findOneAndUpdate(
      { oauthProvider: 'google', oauthId: profile.id },
      { $setOnInsert: { username: profile.displayName, oauthProvider: 'google', oauthId: profile.id, password: '' } },
      { upsert: true, new: true },
      done
    );
  } else {
    findUserByOauthSqlite(db, 'google', profile.id, (err, user) => {
      if (user) return done(null, user);
      addUserSqlite(db, { username: profile.displayName, password: '', oauthProvider: 'google', oauthId: profile.id }, (err) => {
        if (err) return done(err);
        findUserByOauthSqlite(db, 'google', profile.id, done);
      });
    });
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'GITHUB_CLIENT_ID',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'GITHUB_CLIENT_SECRET',
  callbackURL: '/auth/github/callback'
}, function(accessToken, refreshToken, profile, done) {
  if (DB_TYPE === 'mongodb') {
    User.findOneAndUpdate(
      { oauthProvider: 'github', oauthId: profile.id },
      { $setOnInsert: { username: profile.username, oauthProvider: 'github', oauthId: profile.id, password: '' } },
      { upsert: true, new: true },
      done
    );
  } else {
    findUserByOauthSqlite(db, 'github', profile.id, (err, user) => {
      if (user) return done(null, user);
      addUserSqlite(db, { username: profile.username, password: '', oauthProvider: 'github', oauthId: profile.id }, (err) => {
        if (err) return done(err);
        findUserByOauthSqlite(db, 'github', profile.id, done);
      });
    });
  }
}));

module.exports = passport;
