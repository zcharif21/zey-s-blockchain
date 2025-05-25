const Web3 = require('web3');
const { logger } = require('../../utils/logger');
const BirthCertificateABI = require('../../blockchain/contracts/BirthCertificate.json');

class BlockchainService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Connect to Ethereum network
            const provider = process.env.ETHEREUM_PROVIDER || 'ws://localhost:8545';
            this.web3 = new Web3(provider);

            // Get default account
            const accounts = await this.web3.eth.getAccounts();
            this.account = accounts[0];

            // Initialize contract
            const contractAddress = process.env.CONTRACT_ADDRESS;
            if (!contractAddress) {
                throw new Error('CONTRACT_ADDRESS environment variable not set');
            }

            this.contract = new this.web3.eth.Contract(
                BirthCertificateABI,
                contractAddress
            );

            logger.info('Blockchain service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize blockchain service:', error);
            throw error;
        }
    }

    async createBirthCertificate(certificateData) {
        try {
            const {
                babyName,
                fatherName,
                motherName,
                birthDate,
                birthPlace,
                hospitalName,
                ipfsHash,
                registeredBy
            } = certificateData;

            const result = await this.contract.methods
                .createBirthCertificate(
                    babyName,
                    fatherName,
                    motherName,
                    birthDate,
                    birthPlace,
                    hospitalName,
                    ipfsHash
                )
                .send({ from: registeredBy });

            const certificateId = result.events.CertificateCreated.returnValues.id;

            return {
                certificateId,
                transactionHash: result.transactionHash
            };
        } catch (error) {
            logger.error('Error creating birth certificate on blockchain:', error);
            throw error;
        }
    }

    async getBirthCertificate(certificateId) {
        try {
            const certificate = await this.contract.methods
                .getBirthCertificate(certificateId)
                .call();

            return {
                id: certificate.id,
                babyName: certificate.babyName,
                fatherName: certificate.fatherName,
                motherName: certificate.motherName,
                birthDate: certificate.birthDate,
                birthPlace: certificate.birthPlace,
                hospitalName: certificate.hospitalName,
                registeredBy: certificate.registeredBy,
                registrationDate: certificate.registrationDate,
                isRevoked: certificate.isRevoked,
                ipfsHash: certificate.ipfsHash
            };
        } catch (error) {
            logger.error('Error fetching birth certificate from blockchain:', error);
            throw error;
        }
    }

    async verifyBirthCertificate(certificateId) {
        try {
            const result = await this.contract.methods
                .verifyCertificate(certificateId)
                .call();

            return {
                exists: result.exists,
                isValid: result.isValid,
                registrationDate: result.registrationDate
            };
        } catch (error) {
            logger.error('Error verifying birth certificate:', error);
            throw error;
        }
    }

    async getHospitalCertificates(hospitalName) {
        try {
            const certificateIds = await this.contract.methods
                .getHospitalCertificates(hospitalName)
                .call();

            const certificates = await Promise.all(
                certificateIds.map(id => this.getBirthCertificate(id))
            );

            return certificates;
        } catch (error) {
            logger.error('Error fetching hospital certificates:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            // Get total certificates count
            const latestId = await this.contract.methods.getCurrentId().call();
            
            // Get certificates created in last 24 hours
            const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
            let recentCertificates = 0;

            for (let i = 1; i <= latestId; i++) {
                const cert = await this.getBirthCertificate(i);
                if (cert.registrationDate >= oneDayAgo) {
                    recentCertificates++;
                }
            }

            return {
                totalCertificates: parseInt(latestId),
                certificatesLast24h: recentCertificates
            };
        } catch (error) {
            logger.error('Error fetching statistics:', error);
            throw error;
        }
    }
}

module.exports = BlockchainService; 