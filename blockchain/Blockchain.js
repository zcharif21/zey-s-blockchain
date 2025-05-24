const Block = require('./Block');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2; // Mining difficulty
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    createGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), "Genesis Block", "0", "");
        genesisBlock.mineBlock(this.difficulty);
        return genesisBlock;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Add pending transaction instead of direct block
    addTransaction(transaction) {
        // Validate transaction structure
        if (!transaction || !transaction.from || !transaction.to || !transaction.amount) {
            throw new Error('Invalid transaction structure');
        }
        
        if (transaction.amount <= 0) {
            throw new Error('Transaction amount must be positive');
        }
        
        this.pendingTransactions.push(transaction);
    }

    // Mine pending transactions into a block
    minePendingTransactions(miningRewardAddress) {
        if (!miningRewardAddress) {
            throw new Error('Mining reward address required');
        }

        // Add mining reward transaction
        const rewardTransaction = {
            from: null, // Mining reward comes from system
            to: miningRewardAddress,
            amount: this.miningReward,
            timestamp: Date.now()
        };
        
        this.pendingTransactions.push(rewardTransaction);

        // Create new block with pending transactions
        const block = new Block(
            this.chain.length,
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        // Mine the block
        block.mineBlock(this.difficulty);
        
        // Validate block before adding
        if (!this.isValidNewBlock(block)) {
            throw new Error('Invalid block - cannot add to chain');
        }

        // Add block to chain
        this.chain.push(block);
        
        // Clear pending transactions
        this.pendingTransactions = [];
        
        console.log(`Block ${block.index} mined successfully!`);
        return block;
    }

    // Legacy method for backward compatibility (but secured)
    addBlock(newBlock) {
        if (!newBlock instanceof Block) {
            throw new Error('Must provide valid Block instance');
        }

        // Set correct previous hash
        newBlock.previousHash = this.getLatestBlock().hash;
        
        // Force mining
        newBlock.mineBlock(this.difficulty);
        
        // Validate before adding
        if (!this.isValidNewBlock(newBlock)) {
            throw new Error('Invalid block - cannot add to chain');
        }
        
        this.chain.push(newBlock);
    }

    // Validate a new block before adding to chain
    isValidNewBlock(newBlock) {
        const latestBlock = this.getLatestBlock();
        
        // Check index
        if (newBlock.index !== latestBlock.index + 1) {
            console.log('Invalid index');
            return false;
        }
        
        // Check previous hash
        if (newBlock.previousHash !== latestBlock.hash) {
            console.log('Invalid previous hash');
            return false;
        }
        
        // Check hash calculation
        if (newBlock.hash !== newBlock.calculateHash()) {
            console.log('Invalid hash');
            return false;
        }
        
        // Check mining difficulty
        if (!this.hasValidDifficulty(newBlock)) {
            console.log('Block not properly mined');
            return false;
        }
        
        // Check timestamp
        if (newBlock.timestamp <= latestBlock.timestamp) {
            console.log('Invalid timestamp');
            return false;
        }
        
        return true;
    }

    // Check if block meets mining difficulty
    hasValidDifficulty(block) {
        const target = Array(this.difficulty + 1).join('0');
        return block.hash.substring(0, this.difficulty) === target;
    }

    // Enhanced chain validation
    isChainValid() {
        // Check genesis block
        if (JSON.stringify(this.chain[0]) !== JSON.stringify(this.createGenesisBlock())) {
            console.log('Invalid genesis block');
            return false;
        }

        // Check all blocks
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Use block's own validation method
            if (!currentBlock.isValid(previousBlock)) {
                console.log(`Invalid block at index ${i}`);
                return false;
            }

            // Check mining difficulty
            if (!this.hasValidDifficulty(currentBlock)) {
                console.log(`Block ${i} not properly mined`);
                return false;
            }
        }
        
        return true;
    }

    // Get balance for address (for cryptocurrency use)
    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            if (Array.isArray(block.data)) {
                for (const trans of block.data) {
                    if (trans.from === address) {
                        balance -= trans.amount;
                    }
                    if (trans.to === address) {
                        balance += trans.amount;
                    }
                }
            }
        }

        return balance;
    }

    // Get all transactions for address
    getTransactionsOfAddress(address) {
        const transactions = [];

        for (const block of this.chain) {
            if (Array.isArray(block.data)) {
                for (const trans of block.data) {
                    if (trans.from === address || trans.to === address) {
                        transactions.push({
                            ...trans,
                            blockIndex: block.index,
                            blockHash: block.hash
                        });
                    }
                }
            }
        }

        return transactions;
    }

    // Get blockchain stats
    getStats() {
        return {
            totalBlocks: this.chain.length,
            difficulty: this.difficulty,
            pendingTransactions: this.pendingTransactions.length,
            lastBlock: this.getLatestBlock().getBlockInfo()
        };
    }

    // Export chain for backup
    exportChain() {
        return {
            chain: this.chain.map(block => block.getBlockInfo()),
            difficulty: this.difficulty,
            pendingTransactions: this.pendingTransactions
        };
    }
}

module.exports = Blockchain;