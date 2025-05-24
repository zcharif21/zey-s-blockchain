const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const privateKey = fs.readFileSync(path.join(__dirname, 'private.pem'), 'utf8');
const publicKey = fs.readFileSync(path.join(__dirname, 'public.pem'), 'utf8');

function signData(data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

function verifySignature(data, signature) {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}

module.exports = { signData, verifySignature };
