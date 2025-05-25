// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CompleteBirthCertificateRegistry
 * @dev Contrat intelligent pour gérer un registre de certificats de naissance sur blockchain
 */
contract CompleteBirthCertificateRegistry {
    
    // Structure pour représenter un certificat de naissance
    struct BirthCertificate {
        uint256 id;                    // Identifiant unique
        string fullName;               // Nom complet
        string dateOfBirth;            // Date de naissance
        string placeOfBirth;           // Lieu de naissance
        string motherName;             // Nom de la mère
        string fatherName;             // Nom du père
        address registrar;             // Adresse de l'officier d'état civil
        uint256 timestamp;             // Horodatage de l'enregistrement
        bool isValid;                  // Statut de validité
    }
    
    // Variables d'état
    mapping(uint256 => BirthCertificate) public certificates;
    mapping(address => bool) public authorizedRegistrars;
    uint256 public nextCertificateId;
    address public admin;
    
    // Événements
    event CertificateIssued(uint256 indexed certificateId, string fullName, address registrar);
    event RegistrarAuthorized(address indexed registrar);
    event RegistrarRevoked(address indexed registrar);
    event CertificateRevoked(uint256 indexed certificateId);
    
    // Modificateurs
    modifier onlyAdmin() {
        require(msg.sender == admin, "Seul l'administrateur peut effectuer cette action");
        _;
    }
    
    modifier onlyAuthorizedRegistrar() {
        require(authorizedRegistrars[msg.sender], "Seuls les officiers autorises peuvent enregistrer");
        _;
    }
    
    modifier certificateExists(uint256 _certificateId) {
        require(certificates[_certificateId].id != 0, "Certificat inexistant");
        _;
    }
    
    // Constructeur
    constructor() {
        admin = msg.sender;
        nextCertificateId = 1;
    }
    
    /**
     * @dev Autoriser un officier d'état civil
     * @param _registrar Adresse de l'officier à autoriser
     */
    function authorizeRegistrar(address _registrar) external onlyAdmin {
        require(_registrar != address(0), "Adresse invalide");
        authorizedRegistrars[_registrar] = true;
        emit RegistrarAuthorized(_registrar);
    }
    
    /**
     * @dev Révoquer l'autorisation d'un officier
     * @param _registrar Adresse de l'officier à révoquer
     */
    function revokeRegistrar(address _registrar) external onlyAdmin {
        authorizedRegistrars[_registrar] = false;
        emit RegistrarRevoked(_registrar);
    }
    
    /**
     * @dev Enregistrer un nouveau certificat de naissance
     * @param _fullName Nom complet de la personne
     * @param _dateOfBirth Date de naissance
     * @param _placeOfBirth Lieu de naissance
     * @param _motherName Nom de la mère
     * @param _fatherName Nom du père
     */
    function issueCertificate(
        string memory _fullName,
        string memory _dateOfBirth,
        string memory _placeOfBirth,
        string memory _motherName,
        string memory _fatherName
    ) external onlyAuthorizedRegistrar returns (uint256) {
        require(bytes(_fullName).length > 0, "Nom requis");
        require(bytes(_dateOfBirth).length > 0, "Date de naissance requise");
        
        uint256 certificateId = nextCertificateId;
        
        certificates[certificateId] = BirthCertificate({
            id: certificateId,
            fullName: _fullName,
            dateOfBirth: _dateOfBirth,
            placeOfBirth: _placeOfBirth,
            motherName: _motherName,
            fatherName: _fatherName,
            registrar: msg.sender,
            timestamp: block.timestamp,
            isValid: true
        });
        
        nextCertificateId++;
        
        emit CertificateIssued(certificateId, _fullName, msg.sender);
        
        return certificateId;
    }
    
    /**
     * @dev Récupérer les détails d'un certificat
     * @param _certificateId ID du certificat
     */
    function getCertificate(uint256 _certificateId) 
        external 
        view 
        certificateExists(_certificateId) 
        returns (
            uint256 id,
            string memory fullName,
            string memory dateOfBirth,
            string memory placeOfBirth,
            string memory motherName,
            string memory fatherName,
            address registrar,
            uint256 timestamp,
            bool isValid
        ) 
    {
        BirthCertificate memory cert = certificates[_certificateId];
        return (
            cert.id,
            cert.fullName,
            cert.dateOfBirth,
            cert.placeOfBirth,
            cert.motherName,
            cert.fatherName,
            cert.registrar,
            cert.timestamp,
            cert.isValid
        );
    }
    
    /**
     * @dev Vérifier la validité d'un certificat
     * @param _certificateId ID du certificat
     */
    function verifyCertificate(uint256 _certificateId) 
        external 
        view 
        certificateExists(_certificateId) 
        returns (bool) 
    {
        return certificates[_certificateId].isValid;
    }
    
    /**
     * @dev Révoquer un certificat (en cas d'erreur ou de fraude)
     * @param _certificateId ID du certificat à révoquer
     */
    function revokeCertificate(uint256 _certificateId) 
        external 
        onlyAdmin 
        certificateExists(_certificateId) 
    {
        certificates[_certificateId].isValid = false;
        emit CertificateRevoked(_certificateId);
    }
    
    /**
     * @dev Obtenir le nombre total de certificats émis
     */
    function getTotalCertificates() external view returns (uint256) {
        return nextCertificateId - 1;
    }
    
    /**
     * @dev Vérifier si une adresse est un officier autorisé
     * @param _registrar Adresse à vérifier
     */
    function isAuthorizedRegistrar(address _registrar) external view returns (bool) {
        return authorizedRegistrars[_registrar];
    }
}

/*
FONCTIONNALITÉS PRINCIPALES:

1. GESTION DES CERTIFICATS:
   - Enregistrement de nouveaux certificats de naissance
   - Stockage des informations essentielles (nom, date, lieu, parents)
   - Attribution d'identifiants uniques
   - Horodatage automatique

2. CONTRÔLE D'ACCÈS:
   - Administrateur principal
   - Officiers d'état civil autorisés
   - Système de permissions hiérarchiques

3. VÉRIFICATION:
   - Vérification de l'authenticité des certificats
   - Consultation publique des certificats
   - Traçabilité complète

4. SÉCURITÉ:
   - Protection contre les modifications non autorisées
   - Révocation possible en cas de fraude
   - Événements pour audit trail

5. TRANSPARENCE:
   - Tous les certificats sont vérifiables publiquement
   - Historique immuable sur blockchain
   - Traçabilité des officiers émetteurs

AVANTAGES BLOCKCHAIN:
- Immuabilité des données
- Transparence et vérifiabilité
- Décentralisation
- Réduction de la fraude
- Accès global et permanent
*/
