const express = require('express');
const Web3 = require('web3');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const winston = require('winston');
require('dotenv').config();

// Contract ABI (abbreviated for readability - full ABI would be generated from compilation)
const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_babyName", "type": "string"},
            {"internalType": "string", "name": "_fatherName", "type": "string"},
            {"internalType": "string", "name": "_motherName", "type": "string"},
            {"internalType": "uint256", "name": "_birthDate", "type": "uint256"},
            {"internalType": "string", "name": "_birthPlace", "type": "string"},
            {"internalType": "string", "name": "_hospitalName", "type": "string"},
            {"internalType": "string", "name": "_ipfsHash", "type": "string"}
        ],
        "name": "createBirthCertificate",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_certificateId", "type": "uint256"}],
        "name": "getBirthCertificate",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "string", "name": "babyName", "type": "string"},
            {"internalType": "string", "name": "fatherName", "type": "string"},
            {"internalType": "string", "name": "motherName", "type": "string"},
            {"internalType": "uint256", "name": "birthDate", "type": "uint256"},
            {"internalType": "string", "name": "birthPlace", "type": "string"},
            {"internalType": "string", "name": "hospitalName", "type": "string"},
            {"internalType": "address", "name": "registeredBy", "type": "address"},
            {"internalType": "uint256", "name": "registrationDate", "type": "uint256"},
            {"internalType": "bool", "name": "isRevoked", "type": "bool"},
            {"internalType": "string", "name": "ipfsHash", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_certificateId", "type": "uint256"}],
        "name": "verifyBirthCertificate",
        "outputs": [
            {"internalType": "bool", "name": "exists", "type": "bool"},
            {"internalType": "bool", "name": "isValid", "type": "bool"},
            {"internalType": "uint256", "name": "registrationDate", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

class NaissanceService {
    constructor() {
        this.app = express();
        this.web3 = null;
        this.contract = null;
        this.account = null;
        
        this.setupLogger();
        this.setupWeb3();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: './logs/naissance-error.log', level: 'error' }),
                new winston.transports.File({ filename: './logs/naissance.log' }),
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });
    }

    async setupWeb3() {
        try {
            // Connect to Ethereum network (Ganache for development, Infura for production)
            const provider = process.env.ETHEREUM_PROVIDER || 'ws://localhost:8545';
            this.web3 = new Web3(provider);

            // Set default account
            const accounts = await this.web3.eth.getAccounts();
            this.account = accounts[0];

            // Initialize contract
            const contractAddress = process.env.CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('CONTRACT_ADDRESS environment variable not set');
            }

            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, contractAddress);
            this.logger.info('Web3 and contract initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Web3:', error);
            throw error;
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP'
        });
        this.app.use(limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                web3Connected: this.web3 !== null,
                contractAddress: process.env.CONTRACT_ADDRESS
            });
        });

        // Create birth certificate
        this.app.post('/naissance',
            [
                body('babyName').trim().isLength({ min: 1, max: 100 }).escape(),
                body('fatherName').trim().isLength({ min: 1, max: 100 }).escape(),
                body('motherName').trim().isLength({ min: 1, max: 100 }).escape(),
                body('birthDate').isISO8601().toDate(),
                body('birthPlace').trim().isLength({ min: 1, max: 200 }).escape(),
                body('hospitalName').trim().isLength({ min: 1, max: 200 }).escape(),
                body('ipfsHash').optional().trim().isLength({ max: 100 })
            ],
            this.createBirthCertificate.bind(this)
        );

        // Get birth certificate by ID
        this.app.get('/naissance/:id',
            [param('id').isInt({ min: 1 })],
            this.getBirthCertificate.bind(this)
        );

        // Verify birth certificate
        this.app.get('/naissance/verify/:id',
            [param('id').isInt({ min: 1 })],
            this.verifyBirthCertificate.bind(this)
        );

        // Get certificates by name (search functionality)
        this.app.get('/naissance/search/:name',
            [param('name').trim().isLength({ min: 1, max: 100 }).escape()],
            this.getCertificatesByName.bind(this)
        );

        // Get total certificates count
        this.app.get('/naissance/stats/total', this.getTotalCertificates.bind(this));

        // List all certificates (paginated)
        this.app.get('/naissance/list/:offset/:limit',
            [
                param('offset').isInt({ min: 0 }),
                param('limit').isInt({ min: 1, max: 100 })
            ],
            this.getAllCertificates.bind(this)
        );
    }

    setupErrorHandling() {
        // Validation error handler
        this.app.use((err, req, res, next) => {
            if (err instanceof Error && err.message.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: err.message
                });
            }
            next(err);
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            this.logger.error('Unhandled error:', err);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        });
    }

    async createBirthCertificate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { babyName, fatherName, motherName, birthDate, birthPlace, hospitalName, ipfsHash = '' } = req.body;

            // Convert birthDate to Unix timestamp
            const birthTimestamp = Math.floor(new Date(birthDate).getTime() / 1000);

            // Estimate gas
            const gasEstimate = await this.contract.methods.createBirthCertificate(
                babyName,
                fatherName,
                motherName,
                birthTimestamp,
                birthPlace,
                hospitalName,
                ipfsHash
            ).estimateGas({ from: this.account });

            // Execute transaction
            const result = await this.contract.methods.createBirthCertificate(
                babyName,
                fatherName,
                motherName,
                birthTimestamp,
                birthPlace,
                hospitalName,
                ipfsHash
            ).send({
                from: this.account,
                gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
                gasPrice: await this.web3.eth.getGasPrice()
            });

            // Extract certificate ID from transaction receipt
            const certificateId = result.events.BirthCertificateCreated.returnValues.certificateId;

            this.logger.info(`Birth certificate created with ID: ${certificateId}`, {
                babyName,
                transactionHash: result.transactionHash
            });

            res.status(201).json({
                success: true,
                data: {
                    certificateId: certificateId,
                    transactionHash: result.transactionHash,
                    blockNumber: result.blockNumber,
                    gasUsed: result.gasUsed
                },
                message: 'Birth certificate created successfully'
            });

        } catch (error) {
            this.logger.error('Error creating birth certificate:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create birth certificate',
                details: error.message
            });
        }
    }

    async getBirthCertificate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const certificateId = req.params.id;

            const certificate = await this.contract.methods.getBirthCertificate(certificateId).call();

            // Format the response
            const formattedCertificate = {
                id: certificate.id,
                babyName: certificate.babyName,
                fatherName: certificate.fatherName,
                motherName: certificate.motherName,
                birthDate: new Date(certificate.birthDate * 1000).toISOString(),
                birthPlace: certificate.birthPlace,
                hospitalName: certificate.hospitalName,
                registeredBy: certificate.registeredBy,
                registrationDate: new Date(certificate.registrationDate * 1000).toISOString(),
                isRevoked: certificate.isRevoked,
                ipfsHash: certificate.ipfsHash
            };

            res.json({
                success: true,
                data: formattedCertificate
            });

        } catch (error) {
            this.logger.error('Error getting birth certificate:', error);
            
            if (error.message.includes('Birth certificate does not exist')) {
                return res.status(404).json({
                    success: false,
                    error: 'Birth certificate not found'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve birth certificate',
                details: error.message
            });
        }
    }

    async verifyBirthCertificate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const certificateId = req.params.id;

            const verification = await this.contract.methods.verifyBirthCertificate(certificateId).call();

            res.json({
                success: true,
                data: {
                    certificateId: certificateId,
                    exists: verification.exists,
                    isValid: verification.isValid,
                    registrationDate: verification.registrationDate > 0 
                        ? new Date(verification.registrationDate * 1000).toISOString() 
                        : null,
                    status: verification.exists 
                        ? (verification.isValid ? 'valid' : 'revoked') 
                        : 'not_found'
                }
            });

        } catch (error) {
            this.logger.error('Error verifying birth certificate:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify birth certificate',
                details: error.message
            });
        }
    }

    async getCertificatesByName(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const name = req.params.name;
            const certificateIds = await this.contract.methods.getCertificatesByName(name).call();

            res.json({
                success: true,
                data: {
                    name: name,
                    certificateIds: certificateIds.map(id => id.toString()),
                    count: certificateIds.length
                }
            });

        } catch (error) {
            this.logger.error('Error searching certificates by name:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to search certificates',
                details: error.message
            });
        }
    }

    async getTotalCertificates(req, res) {
        try {
            const total = await this.contract.methods.getTotalCertificates().call();

            res.json({
                success: true,
                data: {
                    totalCertificates: total.toString()
                }
            });

        } catch (error) {
            this.logger.error('Error getting total certificates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get total certificates',
                details: error.message
            });
        }
    }

    async getAllCertificates(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const offset = parseInt(req.params.offset);
            const limit = parseInt(req.params.limit);

            const certificateIds = await this.contract.methods.getAllCertificateIds(offset, limit).call();

            res.json({
                success: true,
                data: {
                    certificateIds: certificateIds.map(id => id.toString()),
                    offset: offset,
                    limit: limit,
                    count: certificateIds.length
                }
            });

        } catch (error) {
            this.logger.error('Error getting all certificates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get certificates list',
                details: error.message
            });
        }
    }

    start() {
        const PORT = process.env.PORT || 3001;
        this.app.listen(PORT, () => {
            this.logger.info(`Naissance service running on port ${PORT}`);
        });
    }
}

// Start the service
if (require.main === module) {
    const service = new NaissanceService();
    service.start();
}

module.exports = NaissanceService;
