const CryptoJS = require('crypto-js');

/**
 * Encrypt data using AES-256
 * @param {object|string} data - Data to encrypt
 * @param {string} key - Encryption key (must be 32 characters)
 * @returns {string} Encrypted data
 */
function encrypt(data, key) {
  if (!key || key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters');
  }
  
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
  return encrypted;
}

/**
 * Decrypt AES-256 encrypted data
 * @param {string} encryptedData - Encrypted data
 * @param {string} key - Encryption key (must be 32 characters)
 * @returns {object|string} Decrypted data
 */
function decrypt(encryptedData, key) {
  if (!key || key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters');
  }
  
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
  
  try {
    return JSON.parse(decryptedString);
  } catch {
    return decryptedString;
  }
}

/**
 * Create encrypted response
 * @param {object} data - Response data
 * @param {string} key - Encryption key
 * @param {boolean} success - Success status
 * @returns {object} Encrypted response object
 */
function createEncryptedResponse(data, key, success = true) {
  const payload = {
    success,
    timestamp: new Date().toISOString(),
    data
  };
  
  return {
    encrypted: true,
    payload: encrypt(payload, key)
  };
}

module.exports = {
  encrypt,
  decrypt,
  createEncryptedResponse
};
