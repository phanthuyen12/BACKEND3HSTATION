// src/utils/encryption.js
// Simple AES-256-GCM encryption/decryption utility for storing Facebook page access tokens.
// Uses a secret key from environment variable FB_TOKEN_SECRET (32-byte base64 string).

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.FB_TOKEN_SECRET || '', 'base64'); // 32 bytes
if (!KEY.length) {
  console.warn('[encryption] FB_TOKEN_SECRET not set. Token encryption will be disabled.');
}

function encrypt(text) {
  if (!KEY.length) return text; // no encryption fallback
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64: iv:encrypted:tag
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

function decrypt(enc) {
  if (!KEY.length) return enc; // no decryption fallback
  const data = Buffer.from(enc, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(data.length - 16);
  const encrypted = data.slice(12, data.length - 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
