// index.js
const express = require('express');
const cors = require('cors');
const Blockchain = require('./blockchain');
const { verifySignature } = require('../../shared/rsa/signature');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

const blockchain = new Blockchain();

// Smart contract logique simple
function smartContract(data) {
  // Vérifie que le rôle est "medecin" et que la signature est valide
  return data.role === 'medecin' && verifySignature(data.message, data.signature, data.publicKey);
}

// Endpoint pour ajouter un bloc
app.post('/add-block', (req, res) => {
  const data = req.body;

  if (smartContract(data)) {
    blockchain.addBlock(data);
    res.json({ message: 'Bloc ajouté avec succès', chain: blockchain.chain });
  } else {
    res.status(403).json({ error: 'Smart contract a rejeté les données.' });
  }
});

// Endpoint pour obtenir la blockchain
app.get('/chain', (req, res) => {
  res.json(blockchain.chain);
});

app.listen(port, () => {
  console.log(`Blockchain service listening on port ${port}`);
});
