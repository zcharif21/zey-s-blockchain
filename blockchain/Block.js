const crypto = require('crypto');

class Block {
    constructor(index, timestamp, data, previousHash = '', signature = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.signature = signature;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto.createHash('sha256')
            .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.signature)
            .digest('hex');
    }
}

module.exports = Block;
