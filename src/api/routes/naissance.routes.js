const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const naissanceController = require('../controllers/naissance.controller');
const { validateRequest } = require('../middleware/validation.middleware');
const { authenticateJWT } = require('../middleware/auth.middleware');

// Validation middleware
const createBirthValidator = [
    body('babyName').trim().isLength({ min: 2, max: 100 }).withMessage('Nom du bébé invalide'),
    body('fatherName').trim().isLength({ min: 2, max: 100 }).withMessage('Nom du père invalide'),
    body('motherName').trim().isLength({ min: 2, max: 100 }).withMessage('Nom de la mère invalide'),
    body('birthDate').isISO8601().withMessage('Date de naissance invalide'),
    body('birthPlace').trim().isLength({ min: 2, max: 200 }).withMessage('Lieu de naissance invalide'),
    body('hospitalName').trim().isLength({ min: 2, max: 200 }).withMessage('Nom de l\'hôpital invalide'),
    validateRequest
];

const idValidator = [
    param('id').isInt().withMessage('ID invalide'),
    validateRequest
];

// Routes
router.post('/', 
    authenticateJWT(['admin', 'medecin', 'secretaire']), 
    createBirthValidator,
    naissanceController.createBirthCertificate
);

router.get('/:id',
    authenticateJWT(['admin', 'medecin', 'secretaire', 'patient']),
    idValidator,
    naissanceController.getBirthCertificate
);

router.get('/verify/:id',
    authenticateJWT(['admin', 'medecin', 'secretaire', 'patient']),
    idValidator,
    naissanceController.verifyBirthCertificate
);

// Additional routes for administrative purposes
router.get('/hospital/:hospitalId',
    authenticateJWT(['admin', 'medecin', 'secretaire']),
    naissanceController.getHospitalCertificates
);

router.get('/statistics',
    authenticateJWT(['admin']),
    naissanceController.getStatistics
);

module.exports = router; 