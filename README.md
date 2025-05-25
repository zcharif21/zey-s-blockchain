# Service de Certificats de Naissance E-Santé

Un microservice blockchain pour la gestion des certificats de naissance dans le système E-Santé.

## 🏗️ Architecture

Le service est construit avec une architecture microservices et utilise deux implémentations blockchain :

1. **Blockchain Ethereum** (`src/blockchain/`) :
   - Gestion des certificats de naissance
   - Smart contracts Solidity
   - Intégration avec Web3.js

2. **Blockchain Personnalisée** (`blockchain/`) :
   - Implémentation blockchain personnalisée
   - Utilisée pour d'autres cas d'usage du système E-Santé
   - Stockage de données médicales générales

### Structure du Projet
```
/
├── src/                      # Nouveau code pour certificats de naissance
│   ├── api/                 # API REST
│   │   ├── routes/        # Définitions des routes
│   │   ├── controllers/   # Contrôleurs
│   │   ├── middleware/    # Middleware (auth, validation)
│   │   └── validators/    # Validateurs de requêtes
│   ├── blockchain/        # Implémentation Ethereum
│   │   ├── contracts/    # Smart contracts Solidity
│   │   └── migrations/   # Scripts de migration Truffle
│   ├── services/         # Services métier
│   │   ├── blockchain/  # Service blockchain
│   │   └── verification/# Service de vérification
│   └── utils/            # Utilitaires
├── blockchain/            # Blockchain personnalisée
│   ├── Blockchain.js     # Implémentation core
│   ├── Block.js          # Définition des blocks
│   └── utils/           # Utilitaires blockchain
├── tests/                # Tests
├── docker/              # Configuration Docker
└── scripts/             # Scripts utilitaires
```

## 🚀 Fonctionnalités

### Certificats de Naissance (Ethereum)
- `POST /naissance` : Créer un nouveau certificat
- `GET /naissance/:id` : Récupérer un certificat
- `GET /naissance/verify/:id` : Vérifier l'authenticité
- `GET /naissance/hospital/:hospitalId` : Liste des certificats d'un hôpital
- `GET /naissance/statistics` : Statistiques globales

### Blockchain Personnalisée
- Stockage sécurisé des dossiers médicaux
- Signature RSA des données
- Traçabilité complète des modifications

## 🛠️ Technologies

- **Backend** : Node.js, Express
- **Blockchain** : Ethereum, Solidity, Web3.js
- **Storage** : IPFS
- **Container** : Docker
- **Tests** : Jest
- **Documentation** : Swagger/OpenAPI

## 📋 Prérequis

- Node.js v18+
- Docker et Docker Compose
- Ganache (pour développement local)
- Metamask (pour tests)

## 🔧 Installation

1. Cloner le repository :
```bash
git clone [url-repo]
cd naissance-service
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer l'environnement :
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. Démarrer les services :
```bash
docker-compose up -d
```

5. Déployer le smart contract :
```bash
npm run deploy-contract
```

## 🔍 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tous les tests
npm test
```

## 🔐 Sécurité

- Authentification JWT
- Validation des rôles (RBAC)
- Vérification cryptographique des certificats
- Protection contre les attaques courantes (rate limiting, CORS, etc.)

## 🤝 Intégration

Le service s'intègre avec les autres microservices du système E-Santé :
- Service d'authentification
- Service patient
- Service médecin
- Service administratif

## 📄 Licence

MIT
