// services/naissance/tests/integration.test.js
const request = require('supertest');
const NaissanceService = require('../index');

describe('Naissance Service Integration Tests', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Wait for blockchain connection
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        app = new NaissanceService();
        server = app.app.listen(0); // Use random port for testing
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    describe('Health Check', () => {
        test('should return healthy status', async () => {
            const response = await request(app.app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('healthy');
            expect(response.body.web3Connected).toBe(true);
        });
    });

    describe('Birth Certificate Creation', () => {
        test('should create a birth certificate successfully', async () => {
            const certificateData = {
                babyName: 'Test Baby',
                fatherName: 'Test Father',
                motherName: 'Test Mother',
                birthDate: '2023-01-01T00:00:00.000Z',
                birthPlace: 'Test Hospital, Test City',
                hospitalName: 'Test Hospital',
                ipfsHash: ''
            };

            const response = await request(app.app)
                .post('/naissance')
                .send(certificateData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.certificateId).toBeDefined();
            expect(response.body.data.transactionHash).toBeDefined();
        });

        test('should reject invalid birth certificate data', async () => {
            const invalidData = {
                babyName: '', // Invalid: empty name
                fatherName: 'Test Father',
                motherName: 'Test Mother',
                birthDate: 'invalid-date',
                birthPlace: 'Test Hospital',
                hospitalName: 'Test Hospital'
            };

            await request(app.app)
                .post('/naissance')
                .send(invalidData)
                .expect(400);
        });
    });

    describe('Birth Certificate Retrieval', () => {
        let certificateId;

        beforeAll(async () => {
            // Create a certificate for testing
            const certificateData = {
                babyName: 'Retrieval Test Baby',
                fatherName: 'Test Father',
                motherName: 'Test Mother',
                birthDate: '2023-01-01T00:00:00.000Z',
                birthPlace: 'Test Hospital',
                hospitalName: 'Test Hospital'
            };

            const response = await request(app.app)
                .post('/naissance')
                .send(certificateData);

            certificateId = response.body.data.certificateId;
        });

        test('should retrieve birth certificate by ID', async () => {
            const response = await request(app.app)
                .get(`/naissance/${certificateId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(certificateId);
            expect(response.body.data.babyName).toBe('Retrieval Test Baby');
        });

        test('should return 404 for non-existent certificate', async () => {
            await request(app.app)
                .get('/naissance/99999')
                .expect(404);
        });
    });

    describe('Birth Certificate Verification', () => {
        let certificateId;

        beforeAll(async () => {
            const certificateData = {
                babyName: 'Verification Test Baby',
                fatherName: 'Test Father',
                motherName: 'Test Mother',
                birthDate: '2023-01-01T00:00:00.000Z',
                birthPlace: 'Test Hospital',
                hospitalName: 'Test Hospital'
            };

            const response = await request(app.app)
                .post('/naissance')
                .send(certificateData);

            certificateId = response.body.data.certificateId;
        });

        test('should verify existing certificate', async () => {
            const response = await request(app.app)
                .get(`/naissance/verify/${certificateId}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.exists).toBe(true);
            expect(response.body.data.isValid).toBe(true);
            expect(response.body.data.status).toBe('valid');
        });

        test('should handle non-existent certificate verification', async () => {
            const response = await request(app.app)
                .get('/naissance/verify/99999')
                .expect(200);

            expect(response.body.data.exists).toBe(false);
            expect(response.body.data.status).toBe('not_found');
        });
    });
});

---

// scripts/setup-environment.js
const fs = require('fs');
const path = require('path');

class EnvironmentSetup {
    constructor() {
        this.baseDir = path.join(__dirname, '..');
    }

    createDirectories() {
        const directories = [
            'services/naissance',
            'services/naissance/contracts',
            'services/naissance/scripts',
            'services/naissance/tests',
            'logs',
            'database/init'
        ];

        directories.forEach(dir => {
            const fullPath = path.join(this.baseDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            }
        });
    }

    copyContractFiles() {
        // Contract will be created separately as BirthCertificateRegistry.sol
        const contractContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import statements for OpenZeppelin contracts
// Note: These need to be installed via: npm install @openzeppelin/contracts

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// The full contract code from the first artifact would go here
`;

        const contractPath = path.join(this.baseDir, 'services/naissance/contracts/BirthCertificateRegistry.sol');
        fs.writeFileSync(contractPath, contractContent);
        console.log('✅ Contract file created');
    }

    createMigrationFiles() {
        const migrationContent = `const BirthCertificateRegistry = artifacts.require("BirthCertificateRegistry");

module.exports = function(deployer) {
  deployer.deploy(BirthCertificateRegistry);
};
`;

        const migrationPath = path.join(this.baseDir, 'services/naissance/migrations/2_deploy_contracts.js');
        if (!fs.existsSync(path.dirname(migrationPath))) {
            fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
        }
        fs.writeFileSync(migrationPath, migrationContent);
        console.log('✅ Migration file created');
    }

    updateDockerCompose() {
        const dockerComposePath = path.join(this.baseDir, 'docker-compose.yml');
        
        if (fs.existsSync(dockerComposePath)) {
            let dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
            
            // Add naissance service to existing docker-compose
            const naissanceService = `
  # Naissance Service
  naissance-service:
    build:
      context: ./services/naissance
      dockerfile: Dockerfile
    container_name: naissance-service
    ports:
      - "3004:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - ETHEREUM_PROVIDER=ws://ganache:8545
      - CONTRACT_ADDRESS=\${CONTRACT_ADDRESS:-}
      - LOG_LEVEL=info
      - ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
    volumes:
      - ./services/naissance:/app
      - ./logs:/app/logs
    depends_on:
      - ganache
    networks:
      - blockchain-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Ganache CLI for local Ethereum blockchain
  ganache:
    image: trufflesuite/ganache-cli:latest
    container_name: ganache-blockchain
    ports:
      - "8545:8545"
    command: >
      --host 0.0.0.0
      --port 8545
      --networkId 1337
      --gasLimit 10000000
      --gasPrice 20000000000
      --accounts 10
      --ether 100
      --deterministic
      --mnemonic "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
    networks:
      - blockchain-network
    restart: unless-stopped
`;

            // Insert before the last service or at the end
            if (!dockerContent.includes('naissance-service')) {
                dockerContent = dockerContent.replace(/^services:$/m, `services:${naissanceService}`);
                fs.writeFileSync(dockerComposePath, dockerContent);
                console.log('✅ Updated docker-compose.yml with naissance service');
            }
        }
    }

    createReadme() {
        const readmeContent = `# 🏥 Birth Certificate Management System

## 🚀 Quick Start

### 1. Environment Setup
\`\`\`bash
# Install dependencies
cd services/naissance
npm install

# Copy environment file
cp .env.example .env
\`\`\`

### 2. Start Blockchain Network
\`\`\`bash
# Start Ganache blockchain
docker-compose up ganache -d

# Deploy smart contract
cd services/naissance
npm run deploy-contract
\`\`\`

### 3. Start Services
\`\`\`bash
# Start all services
docker-compose up --build

# Or start only naissance service
docker-compose up naissance-service
\`\`\`

## 📡 API Endpoints

### Create Birth Certificate
\`\`\`http
POST /naissance
Content-Type: application/json

{
  "babyName": "John Doe",
  "fatherName": "Father Name",
  "motherName": "Mother Name",
  "birthDate": "2023-01-01T00:00:00.000Z",
  "birthPlace": "Hospital Name, City",
  "hospitalName": "Hospital Name",
  "ipfsHash": ""
}
\`\`\`

### Get Birth Certificate
\`\`\`http
GET /naissance/{certificateId}
\`\`\`

### Verify Birth Certificate
\`\`\`http
GET /naissance/verify/{certificateId}
\`\`\`

### Search by Name
\`\`\`http
GET /naissance/search/{babyName}
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run integration tests
npm test

# Run with coverage
npm run test:coverage
\`\`\`

## 🔧 Development

### Local Development
\`\`\`bash
# Install Truffle globally
npm install -g truffle

# Compile contracts
truffle compile

# Deploy to local network
truffle migrate --network development

# Start development server
npm run dev
\`\`\`

### Smart Contract Development
\`\`\`bash
# Test contracts
truffle test

# Console access
truffle console --network development
\`\`\`

## 🌐 Integration with E-Santé System

This service integrates with the existing e-santé microservices:

- **Admin Service**: Manages authorized registrars
- **Patient Service**: Links birth certificates to patient records  
- **Médecin Service**: Access for medical professionals
- **Secrétaire Service**: Administrative access

## 🔐 Security Features

- RSA signature verification
- Role-based access control
- Rate limiting
- Input validation
- Audit logging
- Smart contract security patterns

## 📊 Monitoring

Access monitoring dashboards:
- Grafana: http://localhost:3003
- Prometheus: http://localhost:9090
- Service Health: http://localhost:3004/health
`;

        const readmePath = path.join(this.baseDir, 'BIRTH_CERTIFICATE_README.md');
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ README file created');
    }

    run() {
        console.log('🏗️  Setting up Birth Certificate Management System...');
        
        this.createDirectories();
        this.copyContractFiles();
        this.createMigrationFiles();
        this.updateDockerCompose();
        this.createReadme();
        
        console.log('\n🎉 Setup completed!');
        console.log('\nNext steps:');
        console.log('1. cd services/naissance && npm install');
        console.log('2. cp .env.example .env');
        console.log('3. docker-compose up ganache -d');
        console.log('4. npm run deploy-contract');
        console.log('5. docker-compose up naissance-service');
    }
}

// Run setup
if (require.main === module) {
    const setup = new EnvironmentSetup();
    setup.run();
}

module.exports = EnvironmentSetup;

---

// Integration with existing medical service
// services/naissance/middleware/integration.js
const axios = require('axios');

class EHealthIntegration {
    constructor() {
        this.services = {
            medecin: process.env.MEDECIN_SERVICE_URL || 'http://medcin:3001',
            patient: process.env.PATIENT_SERVICE_URL || 'http://patient:3002',
            admin: process.env.ADMIN_SERVICE_URL || 'http://admin:3003'
        };
    }

    async notifyPatientService(certificateData) {
        try {
            const patientData = {
                type: 'birth_certificate',
                certificateId: certificateData.certificateId,
                babyName: certificateData.babyName,
                parentNames: {
                    father: certificateData.fatherName,
                    mother: certificateData.motherName
                },
                birthDate: certificateData.birthDate,
                hospitalName: certificateData.hospitalName
            };

            await axios.post(`${this.services.patient}/notifications/birth-certificate`, patientData);
            console.log('✅ Patient service notified');
        } catch (error) {
            console.error('❌ Failed to notify patient service:', error.message);
        }
    }

    async validateMedicalStaff(registrarAddress) {
        try {
            const response = await axios.get(`${this.services.medecin}/validate-staff/${registrarAddress}`);
            return response.data.isValid;
        } catch (error) {
            console.error('❌ Medical staff validation failed:', error.message);
            return false;
        }
    }

    async logToAdminSystem(action, certificateId, metadata) {
        try {
            const logData = {
                service: 'naissance',
                action: action,
                certificateId: certificateId,
                timestamp: new Date().toISOString(),
                metadata: metadata
            };

            await axios.post(`${this.services.admin}/audit-logs`, logData);
        } catch (error) {
            console.error('❌ Admin logging failed:', error.message);
        }
    }

    async checkPermissions(userRole, action) {
        const permissions = {
            'medecin': ['create', 'read', 'verify'],
            'secretaire': ['create', 'read', 'search'],
            'admin': ['create', 'read', 'verify', 'revoke', 'search'],
            'patient': ['read', 'verify']
        };

        return permissions[userRole]?.includes(action) || false;
    }
}

module.exports = EHealthIntegration;
