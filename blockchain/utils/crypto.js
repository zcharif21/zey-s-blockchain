const crypto = require('crypto');
const fs = require('fs');

const generateKeyPair = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    fs.writeFileSync('blockchain/utils/private.pem', privateKey);
    fs.writeFileSync('blockchain/utils/public.pem', publicKey);
    console.log('✔️  RSA Key Pair generated.');
};

const signData = (privateKey, data) => {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
};

const verifySignature = (publicKey, data, signature) => {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
};

module.exports = { generateKeyPair, signData, verifySignature };
