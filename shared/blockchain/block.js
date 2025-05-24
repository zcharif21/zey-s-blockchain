class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const crypto = require('crypto');
    const strData = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash;
    return crypto.createHash('sha256').update(strData).digest('hex');
  }
}

module.exports = Block;
