// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BirthCertificate
 * @dev Manages birth certificates on the blockchain
 */
contract BirthCertificate is AccessControl, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Counters.Counter private _certificateIds;

    struct Certificate {
        uint256 id;
        string babyName;
        string fatherName;
        string motherName;
        uint256 birthDate;
        string birthPlace;
        string hospitalName;
        address registeredBy;
        uint256 registrationDate;
        bool isRevoked;
        string ipfsHash;
    }

    // Mappings
    mapping(uint256 => Certificate) private _certificates;
    mapping(string => uint256[]) private _hospitalCertificates;
    mapping(address => uint256[]) private _registrarCertificates;

    // Events
    event CertificateCreated(
        uint256 indexed id,
        string babyName,
        uint256 birthDate,
        address registeredBy
    );
    event CertificateRevoked(uint256 indexed id, address revokedBy);
    event CertificateUpdated(uint256 indexed id, address updatedBy);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Creates a new birth certificate
     */
    function createBirthCertificate(
        string memory _babyName,
        string memory _fatherName,
        string memory _motherName,
        uint256 _birthDate,
        string memory _birthPlace,
        string memory _hospitalName,
        string memory _ipfsHash
    ) public whenNotPaused onlyRole(REGISTRAR_ROLE) returns (uint256) {
        require(bytes(_babyName).length > 0, "Baby name required");
        require(bytes(_fatherName).length > 0, "Father name required");
        require(bytes(_motherName).length > 0, "Mother name required");
        require(_birthDate > 0, "Invalid birth date");
        require(bytes(_birthPlace).length > 0, "Birth place required");
        require(bytes(_hospitalName).length > 0, "Hospital name required");

        _certificateIds.increment();
        uint256 newCertificateId = _certificateIds.current();

        Certificate memory newCertificate = Certificate({
            id: newCertificateId,
            babyName: _babyName,
            fatherName: _fatherName,
            motherName: _motherName,
            birthDate: _birthDate,
            birthPlace: _birthPlace,
            hospitalName: _hospitalName,
            registeredBy: msg.sender,
            registrationDate: block.timestamp,
            isRevoked: false,
            ipfsHash: _ipfsHash
        });

        _certificates[newCertificateId] = newCertificate;
        _hospitalCertificates[_hospitalName].push(newCertificateId);
        _registrarCertificates[msg.sender].push(newCertificateId);

        emit CertificateCreated(newCertificateId, _babyName, _birthDate, msg.sender);
        return newCertificateId;
    }

    /**
     * @dev Retrieves a birth certificate by ID
     */
    function getBirthCertificate(uint256 _certificateId)
        public
        view
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
        require(_certificateId > 0 && _certificateId <= _certificateIds.current(), "Invalid certificate ID");
        Certificate memory cert = _certificates[_certificateId];
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
     * @dev Verifies a birth certificate's authenticity
     */
    function verifyCertificate(uint256 _certificateId)
        public
        view
        returns (
            bool exists,
            bool isValid,
            uint256 registrationDate
        )
    {
        if (_certificateId == 0 || _certificateId > _certificateIds.current()) {
            return (false, false, 0);
        }

        Certificate memory cert = _certificates[_certificateId];
        return (true, !cert.isRevoked, cert.registrationDate);
    }

    /**
     * @dev Revokes a birth certificate
     */
    function revokeCertificate(uint256 _certificateId) public onlyRole(ADMIN_ROLE) {
        require(_certificateId > 0 && _certificateId <= _certificateIds.current(), "Invalid certificate ID");
        require(!_certificates[_certificateId].isRevoked, "Certificate already revoked");

        _certificates[_certificateId].isRevoked = true;
        emit CertificateRevoked(_certificateId, msg.sender);
    }

    /**
     * @dev Gets certificates by hospital
     */
    function getHospitalCertificates(string memory _hospitalName)
        public
        view
        returns (uint256[] memory)
    {
        return _hospitalCertificates[_hospitalName];
    }

    /**
     * @dev Pauses all certificate operations
     */
    function pause() public onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all certificate operations
     */
    function unpause() public onlyRole(ADMIN_ROLE) {
        _unpause();
    }
} 