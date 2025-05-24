const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const privateKey = fs.readFileSync(path.join(__dirname, '../rsa/private.pem'), 'utf8');
const publicKey = fs.readFileSync(path.join(__dirname, '../rsa/public.pem'), 'utf8');

function generateToken(payload) {
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { generateToken, verifyToken };
