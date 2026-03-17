const jwt = require('jsonwebtoken');

function createJWT(user) {
  return jwt.sign({
    userId: user._id,
    email: user.email,
    username: user.username,
    role: user.role
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifyJWT(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { createJWT, verifyJWT };
