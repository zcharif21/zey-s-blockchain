const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CryptoManager {
    constructor() {
        this.keyDir = path.join(__dirname, '..', 'keys');
        this.algorithm = 'aes-256-gcm';
        this.rsaOptions = {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        };
    }

    // Ensure keys directory exists
    ensureKeyDirectory() {
        if (!fs.existsSync(this.keyDir)) {
            fs.mkdirSync(this.keyDir, { recursive: true });
        }
    }

    // Generate RSA key pair with optional password protection
    generateKeyPair(password = null, keyName = 'default') {
        try {
            this.ensureKeyDirectory();

            const options = { ...this.rsaOptions };
            
            // Add password protection if provided
            if (password) {
                options.privateKeyEncoding.passphrase = password;
                options.privateKeyEncoding.cipher = 'aes-256-cbc';
            }

            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', options);

            // Save keys with proper naming
            const privateKeyPath = path.join(this.keyDir, `${keyName}_private.pem`);
            const publicKeyPath = path.join(this.keyDir, `${keyName}_public.pem`);

            fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Restrict permissions
            fs.writeFileSync(publicKeyPath, publicKey);

            console.log(`✔️  RSA Key Pair '${keyName}' generated and saved securely.`);
            
            return {
                publicKey,
                privateKey,
                publicKeyPath,
                privateKeyPath,
                address: this.generateAddress(publicKey)
            };
        } catch (error) {
            throw new Error(`Failed to generate key pair: ${error.message}`);
        }
    }

    // Load existing key pair
    loadKeyPair(keyName = 'default', password = null) {
        try {
            const privateKeyPath = path.join(this.keyDir, `${keyName}_private.pem`);
            const publicKeyPath = path.join(this.keyDir, `${keyName}_public.pem`);

            if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
                throw new Error(`Key pair '${keyName}' not found`);
            }

            let privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

            // If password provided, verify it works
            if (password) {
                try {
                    // Test the key with password
                    crypto.createSign('SHA256').update('test').sign({ key: privateKey, passphrase: password });
                } catch (error) {
                    throw new Error('Invalid password for private key');
                }
            }

            return {
                publicKey,
                privateKey,
                address: this.generateAddress(publicKey)
            };
        } catch (error) {
            throw new Error(`Failed to load key pair: ${error.message}`);
        }
    }

    // Generate wallet address from public key
    generateAddress(publicKey) {
        return crypto.createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, 40); // Take first 40 chars as address
    }

    // Sign data with private key
    signData(privateKey, data, password = null) {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(JSON.stringify(data));
            sign.end();

            const keyOptions = password ? { key: privateKey, passphrase: password } : privateKey;
            return sign.sign(keyOptions, 'hex');
        } catch (error) {
            throw new Error(`Failed to sign data: ${error.message}`);
        }
    }

    // Verify signature
    verifySignature(publicKey, data, signature) {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(JSON.stringify(data));
            verify.end();
            return verify.verify(publicKey, signature, 'hex');
        } catch (error) {
            console.error('Signature verification failed:', error.message);
            return false;
        }
    }

    // Encrypt data using AES
    encryptData(data, password) {
        try {
            const key = crypto.scryptSync(password, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.algorithm, key);
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    // Decrypt data using AES
    decryptData(encryptedData, password) {
        try {
            const key = crypto.scryptSync(password, 'salt', 32);
            const decipher = crypto.createDecipher(this.algorithm, key);
            
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    // Create transaction signature
    signTransaction(transaction, privateKey, password = null) {
        try {
            // Create transaction hash
            const transactionData = {
                from: transaction.from,
                to: transaction.to,
                amount: transaction.amount,
                timestamp: transaction.timestamp
            };

            const signature = this.signData(privateKey, transactionData, password);
            
            return {
                ...transaction,
                signature,
                hash: this.hashTransaction(transactionData)
            };
        } catch (error) {
            throw new Error(`Transaction signing failed: ${error.message}`);
        }
    }

    // Verify transaction signature
    verifyTransaction(transaction, publicKey) {
        try {
            const transactionData = {
                from: transaction.from,
                to: transaction.to,
                amount: transaction.amount,
                timestamp: transaction.timestamp
            };

            return this.verifySignature(publicKey, transactionData, transaction.signature);
        } catch (error) {
            console.error('Transaction verification failed:', error.message);
            return false;
        }
    }

    // Hash transaction data
    hashTransaction(transactionData) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(transactionData))
            .digest('hex');
    }

    // Generate random secure password
    generateSecurePassword(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Key derivation for wallets (HD wallets concept)
    deriveKey(masterKey, index) {
        const hmac = crypto.createHmac('sha512', masterKey);
        hmac.update(`${index}`);
        return hmac.digest('hex');
    }

    // List available key pairs
    listKeyPairs() {
        try {
            this.ensureKeyDirectory();
            const files = fs.readdirSync(this.keyDir);
            const keyPairs = new Set();

            files.forEach(file => {
                if (file.endsWith('_private.pem')) {
                    const keyName = file.replace('_private.pem', '');
                    keyPairs.add(keyName);
                }
            });

            return Array.from(keyPairs);
        } catch (error) {
            throw new Error(`Failed to list key pairs: ${error.message}`);
        }
    }

    // Delete key pair
    deleteKeyPair(keyName) {
        try {
            const privateKeyPath = path.join(this.keyDir, `${keyName}_private.pem`);
            const publicKeyPath = path.join(this.keyDir, `${keyName}_public.pem`);

            if (fs.existsSync(privateKeyPath)) fs.unlinkSync(privateKeyPath);
            if (fs.existsSync(publicKeyPath)) fs.unlinkSync(publicKeyPath);

            console.log(`✔️  Key pair '${keyName}' deleted.`);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete key pair: ${error.message}`);
        }
    }
}

// Legacy functions for backward compatibility
const cryptoManager = new CryptoManager();

const generateKeyPair = (password, keyName) => {
    return cryptoManager.generateKeyPair(password, keyName);
};

const signData = (privateKey, data, password) => {
    return cryptoManager.signData(privateKey, data, password);
};

const verifySignature = (publicKey, data, signature) => {
    return cryptoManager.verifySignature(publicKey, data, signature);
};

module.exports = {
    CryptoManager,
    generateKeyPair,
    signData,
    verifySignature,
    // Export instance for direct use
    crypto: cryptoManager
};