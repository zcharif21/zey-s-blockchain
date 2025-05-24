# 🧬 Projet Blockchain E-Santé (Simplifié)

Ce projet implémente une mini blockchain pour stocker des dossiers médicaux signés par clé RSA.

## 🔧 Lancement
1. Générer les clés :
```bash
node blockchain/utils/generateKeys.js
```
2. Lancer le service :
```bash
docker-compose up --build
```

## 📡 API
- `POST /ajouter-dossier` : Ajouter un nouveau dossier signé
- `GET /blockchain` : Voir toute la chaîne
