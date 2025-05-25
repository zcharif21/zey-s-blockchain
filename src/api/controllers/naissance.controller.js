const { logger } = require('../../utils/logger');
const BlockchainService = require('../../services/blockchain/blockchain.service');
const VerificationService = require('../../services/verification/verification.service');
const { createIPFSHash } = require('../../utils/ipfs');

class NaissanceController {
    constructor() {
        this.blockchainService = new BlockchainService();
        this.verificationService = new VerificationService();
    }

    async createBirthCertificate(req, res) {
        try {
            const {
                babyName,
                fatherName,
                motherName,
                birthDate,
                birthPlace,
                hospitalName,
                additionalInfo
            } = req.body;

            // Create IPFS hash for additional documents if provided
            let ipfsHash = '';
            if (additionalInfo) {
                ipfsHash = await createIPFSHash(additionalInfo);
            }

            // Create birth certificate on blockchain
            const result = await this.blockchainService.createBirthCertificate({
                babyName,
                fatherName,
                motherName,
                birthDate: new Date(birthDate).getTime(),
                birthPlace,
                hospitalName,
                ipfsHash,
                registeredBy: req.user.id
            });

            logger.info(`Birth certificate created with ID: ${result.certificateId}`);

            res.status(201).json({
                success: true,
                data: {
                    certificateId: result.certificateId,
                    transactionHash: result.transactionHash
                }
            });
        } catch (error) {
            logger.error('Error creating birth certificate:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création du certificat de naissance'
            });
        }
    }

    async getBirthCertificate(req, res) {
        try {
            const certificateId = parseInt(req.params.id);
            const certificate = await this.blockchainService.getBirthCertificate(certificateId);

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    error: 'Certificat non trouvé'
                });
            }

            res.json({
                success: true,
                data: {
                    ...certificate,
                    birthDate: new Date(parseInt(certificate.birthDate)).toISOString()
                }
            });
        } catch (error) {
            logger.error('Error fetching birth certificate:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération du certificat'
            });
        }
    }

    async verifyBirthCertificate(req, res) {
        try {
            const certificateId = parseInt(req.params.id);
            const verificationResult = await this.verificationService.verifyBirthCertificate(certificateId);

            res.json({
                success: true,
                data: verificationResult
            });
        } catch (error) {
            logger.error('Error verifying birth certificate:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la vérification du certificat'
            });
        }
    }

    async getHospitalCertificates(req, res) {
        try {
            const hospitalId = req.params.hospitalId;
            const certificates = await this.blockchainService.getHospitalCertificates(hospitalId);

            res.json({
                success: true,
                data: certificates
            });
        } catch (error) {
            logger.error('Error fetching hospital certificates:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des certificats de l\'hôpital'
            });
        }
    }

    async getStatistics(req, res) {
        try {
            const stats = await this.blockchainService.getStatistics();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error fetching statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des statistiques'
            });
        }
    }
}

module.exports = new NaissanceController(); 