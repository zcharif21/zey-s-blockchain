// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BirthCertificateRegistry
 * @dev Smart contract for managing birth certificates on blockchain
 * @author E-Santé Team
 */
contract BirthCertificateRegistry is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Counter for generating unique certificate IDs
    Counters.Counter private _certificateIds;
    
    // Struct to store birth certificate data
    struct BirthCertificate {
        uint256 id;
        string babyName;
        string fatherName;
        string motherName;
        uint256 birthDate; // Unix timestamp
        string birthPlace;
        string hospitalName;
        address registeredBy; // Address of the person who registered
        uint256 registrationDate;
        bool exists;
        bool isRevoked;
        string ipfsHash; // Optional: store document hash on IPFS
    }
    
    // Mapping from certificate ID to certificate data
    mapping(uint256 => BirthCertificate) private certificates;
    
    // Mapping to track certificates by baby name (for search purposes)
    mapping(string => uint256[]) private certificatesByName;
    
    // Mapping to track authorized registrars (hospitals, civil offices)
    mapping(address => bool) public authorizedRegistrars;
    
    // Array to keep track of all certificate IDs
    uint256[] private allCertificateIds;
    
    // Events
    event BirthCertificateCreated(
        uint256 indexed certificateId,
        string babyName,
        address indexed registeredBy,
        uint256 registrationDate
    );
    
    event BirthCertificateRevoked(
        uint256 indexed certificateId,
        address indexed revokedBy,
        uint256 revocationDate
    );
    
    event RegistrarAuthorized(address indexed registrar, address indexed authorizedBy);
    event RegistrarRevoked(address indexed registrar, address indexed revokedBy);
    
    // Modifiers
    modifier onlyAuthorizedRegistrar() {
        require(
            authorizedRegistrars[msg.sender] || msg.sender == owner(),
            "Not authorized to register certificates"
        );
        _;
    }
    
    modifier certificateExists(uint256 _certificateId) {
        require(
            certificates[_certificateId].exists,
            "Birth certificate does not exist"
        );
        _;
    }
    
    modifier certificateNotRevoked(uint256 _certificateId) {
        require(
            !certificates[_certificateId].isRevoked,
            "Birth certificate has been revoked"
        );
        _;
    }
    
    constructor() {
        // Owner is automatically authorized
        authorizedRegistrars[msg.sender] = true;
    }
    
    /**
     * @dev Creates a new birth certificate
     * @param _babyName Name of the baby
     * @param _fatherName Name of the father
     * @param _motherName Name of the mother
     * @param _birthDate Birth date as Unix timestamp
     * @param _birthPlace Place of birth
     * @param _hospitalName Name of the hospital
     * @param _ipfsHash Optional IPFS hash for document storage
     * @return certificateId The ID of the created certificate
     */
    function createBirthCertificate(
        string memory _babyName,
        string memory _fatherName,
        string memory _motherName,
        uint256 _birthDate,
        string memory _birthPlace,
        string memory _hospitalName,
        string memory _ipfsHash
    ) external onlyAuthorizedRegistrar nonReentrant returns (uint256) {
        require(bytes(_babyName).length > 0, "Baby name cannot be empty");
        require(bytes(_fatherName).length > 0, "Father name cannot be empty");
        require(bytes(_motherName).length > 0, "Mother name cannot be empty");
        require(_birthDate > 0 && _birthDate <= block.timestamp, "Invalid birth date");
        require(bytes(_birthPlace).length > 0, "Birth place cannot be empty");
        
        _certificateIds.increment();
        uint256 newCertificateId = _certificateIds.current();
        
        certificates[newCertificateId] = BirthCertificate({
            id: newCertificateId,
            babyName: _babyName,
            fatherName: _fatherName,
            motherName: _motherName,
            birthDate: _birthDate,
            birthPlace: _birthPlace,
            hospitalName: _hospitalName,
            registeredBy: msg.sender,
            registrationDate: block.timestamp,
            exists: true,
            isRevoked: false,
            ipfsHash: _ipfsHash
        });
        
        // Add to tracking arrays
        allCertificateIds.push(newCertificateId);
        certificatesByName[_babyName].push(newCertificateId);
        
        emit BirthCertificateCreated(
            newCertificateId,
            _babyName,
            msg.sender,
            block.timestamp
        );
        
        return newCertificateId;
    }
    
    /**
     * @dev Retrieves birth certificate by ID
     * @param _certificateId The certificate ID
     * @return All certificate data
     */
    function getBirthCertificate(uint256 _certificateId)
        external
        view
        certificateExists(_certificateId)
        returns (
            uint256 id,
            string memory babyName,
            string memory fatherName,
            string memory motherName,
            uint256 birthDate,
            string memory birthPlace,
            string memory hospitalName,
            address registeredBy,
            uint256 registrationDate,
            bool isRevoked,
            string memory ipfsHash
        )
    {
        BirthCertificate memory cert = certificates[_certificateId];
        return (
            cert.id,
            cert.babyName,
            cert.fatherName,
            cert.motherName,
            cert.birthDate,
            cert.birthPlace,
            cert.hospitalName,
            cert.registeredBy,
            cert.registrationDate,
            cert.isRevoked,
            cert.ipfsHash
        );
    }
    
    /**
     * @dev Verifies if a birth certificate exists and is authentic
     * @param _certificateId The certificate ID to verify
     * @return exists Whether the certificate exists
     * @return isValid Whether the certificate is valid (not revoked)
     * @return registrationDate When the certificate was registered
     */
    function verifyBirthCertificate(uint256 _certificateId)
        external
        view
        returns (
            bool exists,
            bool isValid,
            uint256 registrationDate
        )
    {
        BirthCertificate memory cert = certificates[_certificateId];
        return (
            cert.exists,
            cert.exists && !cert.isRevoked,
            cert.registrationDate
        );
    }
    
    /**
     * @dev Revokes a birth certificate (only owner or registrar can revoke)
     * @param _certificateId The certificate ID to revoke
     */
    function revokeBirthCertificate(uint256 _certificateId)
        external
        onlyAuthorizedRegistrar
        certificateExists(_certificateId)
        certificateNotRevoked(_certificateId)
    {
        certificates[_certificateId].isRevoked = true;
        
        emit BirthCertificateRevoked(
            _certificateId,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Authorizes a new registrar
     * @param _registrar Address to authorize
     */
    function authorizeRegistrar(address _registrar) external onlyOwner {
        require(_registrar != address(0), "Invalid registrar address");
        require(!authorizedRegistrars[_registrar], "Registrar already authorized");
        
        authorizedRegistrars[_registrar] = true;
        emit RegistrarAuthorized(_registrar, msg.sender);
    }
    
    /**
     * @dev Revokes registrar authorization
     * @param _registrar Address to revoke
     */
    function revokeRegistrar(address _registrar) external onlyOwner {
        require(authorizedRegistrars[_registrar], "Registrar not authorized");
        require(_registrar != owner(), "Cannot revoke owner");
        
        authorizedRegistrars[_registrar] = false;
        emit RegistrarRevoked(_registrar, msg.sender);
    }
    
    /**
     * @dev Gets certificates by baby name
     * @param _babyName The baby's name to search for
     * @return Array of certificate IDs
     */
    function getCertificatesByName(string memory _babyName)
        external
        view
        returns (uint256[] memory)
    {
        return certificatesByName[_babyName];
    }
    
    /**
     * @dev Gets total number of certificates
     * @return Total count of certificates
     */
    function getTotalCertificates() external view returns (uint256) {
        return _certificateIds.current();
    }
    
    /**
     * @dev Gets all certificate IDs (pagination recommended for large datasets)
     * @param _offset Starting index
     * @param _limit Number of certificates to return
     * @return Array of certificate IDs
     */
    function getAllCertificateIds(uint256 _offset, uint256 _limit)
        external
        view
        returns (uint256[] memory)
    {
        require(_offset < allCertificateIds.length, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > allCertificateIds.length) {
            end = allCertificateIds.length;
        }
        
        uint256[] memory result = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = allCertificateIds[i];
        }
        
        return result;
    }
    
    /**
     * @dev Emergency function to pause the contract (inherited from Ownable)
     */
    function emergencyStop() external onlyOwner {
        // Implementation depends on specific requirements
        // Could transfer ownership to a multisig or implement pause functionality
    }
}
