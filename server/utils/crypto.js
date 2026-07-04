const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
// The key should ideally be 32 bytes (64 hex characters) for AES-256
let ENCRYPTION_KEY = null;

if (ENCRYPTION_KEY_HEX) {
  if (ENCRYPTION_KEY_HEX.length === 64) {
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  } else {
    // If not exactly 32 bytes hex, hash it to ensure it is exactly 32 bytes.
    ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_HEX).digest();
  }
} else {
  console.warn('⚠️ WARNING: ENCRYPTION_KEY not found in .env. Data encryption at rest is disabled or will use a temporary fallback (not safe for production).');
  // Fallback for development if someone forgets to set it, so the app doesn't immediately crash.
  ENCRYPTION_KEY = crypto.createHash('sha256').update('fallback_secret_encryption_key_change_this').digest();
}

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} text - The plaintext data to encrypt.
 * @returns {string} The encrypted string in format: enc:<iv>:<authTag>:<encryptedData>
 */
function encryptText(text) {
  if (text === null || text === undefined) return text;
  if (typeof text !== 'string') text = String(text);
  
  // If already encrypted, don't double-encrypt
  if (text.startsWith(PREFIX)) return text;

  try {
    const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    const ivStr = iv.toString('base64');
    
    return `${PREFIX}${ivStr}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err.message);
    // On failure, return plaintext to avoid catastrophic data loss, 
    // but in a strict system we might prefer throwing an error.
    return text;
  }
}

/**
 * Decrypts an encrypted string.
 * @param {string} encryptedText - The string to decrypt.
 * @returns {string} The decrypted plaintext, or the original text if not encrypted or decryption fails.
 */
function decryptText(encryptedText) {
  if (typeof encryptedText !== 'string' || !encryptedText.startsWith(PREFIX)) {
    // If it doesn't have the prefix, it's either plaintext or another type.
    return encryptedText;
  }

  try {
    // Format: enc:<iv>:<authTag>:<encryptedData>
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText; // Malformed, return as is (could be an edge case)

    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const encryptedData = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed (returning original text):', err.message);
    return encryptedText; // Fallback to returning the raw string if decryption fails
  }
}

module.exports = {
  encryptText,
  decryptText
};
