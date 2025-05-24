const crypto = require('crypto');

class Block {
    constructor(index, timestamp, data, previousHash = '', signature = '') {
        // Input validation
        this.validateInputs(index, timestamp, data, previousHash);
        
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.signature = signature;
        this.nonce = 0; // For mining/proof of work
        this.hash = this.calculateHash();
    }

    validateInputs(index, timestamp, data, previousHash) {
        if (typeof index !== 'number' || index < 0) {
            throw new Error('Invalid index: must be a non-negative number');
        }
        
        if (typeof timestamp !== 'number' || timestamp <= 0) {
            throw new Error('Invalid timestamp: must be a positive number');
        }
        
        if (!data) {
            throw new Error('Data cannot be empty');
        }
        
        if (typeof previousHash !== 'string') {
            throw new Error('Previous hash must be a string');
        }
        
        // Validate timestamp is not in the future (with small tolerance)
        const now = Date.now();
        const tolerance = 2 * 60 * 1000; // 2 minutes tolerance
        if (timestamp > now + tolerance) {
            throw new Error('Timestamp cannot be in the future');
        }
    }

    calculateHash() {
        // Use delimiter to prevent hash collision
        const dataString = [
            String(this.index),
            String(this.timestamp),
            String(this.previousHash),
            JSON.stringify(this.data),
            String(this.signature),
            String(this.nonce)
        ].join('|'); // Using delimiter
        
        return crypto.createHash('sha256')
            .update(dataString)
            .digest('hex');
    }

    // Method for mining (proof of work)
    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join('0');
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        
        console.log(`Block mined: ${this.hash}`);
    }

    // Verify block integrity
    isValid(previousBlock = null) {
        // Check if current hash is valid
        if (this.hash !== this.calculateHash()) {
            return false;
        }
        
        // Check if previous hash matches
        if (previousBlock && this.previousHash !== previousBlock.hash) {
            return false;
        }
        
        // Check timestamp is reasonable
        if (previousBlock && this.timestamp <= previousBlock.timestamp) {
            return false;
        }
        
        return true;
    }

    // Get block info without hash recalculation
    getBlockInfo() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            data: this.data,
            previousHash: this.previousHash,
            hash: this.hash,
            nonce: this.nonce,
            signature: this.signature
        };
    }

    // Static method to create genesis block
    static createGenesisBlock() {
        return new Block(0, Date.now(), 'Genesis Block', '0');
    }
}

module.exports = Block;