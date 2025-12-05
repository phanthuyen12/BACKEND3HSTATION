const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signToken = (payload, options = {}) =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn, ...options });

const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = {
  signToken,
  verifyToken
};

















