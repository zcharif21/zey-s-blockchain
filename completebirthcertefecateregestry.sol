// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BirthCertificateRegistry
 * @dev Comprehensive smart contract for managing birth certificates on blockchain
 * @author E-Santé Team
 * 
 * This contract provides:
 * - Secure birth certificate creation and storage
 * - Role-based access control for hospitals and civil registrars
 * - Certificate verification and authenticity checks
 * - Search and retrieval capabilities
 * - Audit trail and event logging
 * - Integration with existing e-santé infrastructure
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BirthCertificateRegistry is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;
    
    // Role definitions
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant HOSPITAL_ROLE = keccak256("HOSPITAL_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Counter for generating unique certificate IDs
    Counters.Counter private _certificateIds;
    
    // Enhanced birth certificate structure
    struct BirthCertificate {
        uint256 id;
        string babyName;
        string fatherName;
        string motherName;
        uint256 birthDate; // Unix timestamp
        string birthPlace;
        string hospitalName;
        string hospitalLicense; // Hospital license number
        address registeredBy; // Address of the registrar
        uint256 registrationDate;
        bool exists;
        bool isRevoked;
        string ipfsHash; // IPFS hash for document storage
        string medicalRecordHash; // Hash of associated medical records
        uint8 certificateVersion; // Version for upgrades
        bytes32 parentalConsentHash; // Hash of parental consent documents
    }
    
    // Hospital/Registrar information
    struct RegistrarInfo {
        string name;
        string licenseNumber;
        string location;
        bool isActive;
        uint256 registrationCount;
        uint256 addedDate;
    }
    
    // Mappings
    mapping(uint256 => BirthCertificate) private certificates;
    mapping(string => uint256[]) private certificatesByName;
    mapping(address => RegistrarInfo) public registrars;
    mapping(bytes32 => bool) private usedSignatures; // Prevent replay attacks
    mapping(string => uint256) private nameToLatestCertificate; // Quick name lookup
    
    // Arrays for enumeration
    uint256[] private allCertificateIds;
    address[] private allRegistrars;
    
    // State variables
    uint256 public constant MAX_CERTIFICATES_PER_REGISTRAR = 1000;
    uint256 public constant CERTIFICATE_VALIDITY_PERIOD = 365 days * 100; // 100 years
    uint8 public constant CURRENT_VERSION = 1;
