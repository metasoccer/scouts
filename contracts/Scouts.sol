pragma solidity ^0.8.9;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
//Just so hardhat picks it up
import "@metasoccer/vouchers/contracts/Vouchers.sol";
import "./EntropyStorage.sol";
import "./IEntropyManager.sol";
import "./IScoutsIdGenerator.sol";
import "./TokenWithdraw.sol";

/**
 * @dev YouthScouts implementation
 *
 * Youth Scouts are minted from Redeemer Contracts.
 * EntropyStorage and EntropyManager are used to store the attributes seeds.
 *
 */
contract YouthScouts is ERC721Enumerable, EntropyStorage, TokenWithdraw, ReentrancyGuard {
  using Strings for uint256;

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant SET_DNA_ROLE = keccak256("SET_DNA_ROLE");
  bytes32 public constant SET_ATTRIBUTES_ROLE = keccak256("SET_ATTRIBUTES_ROLE");
  
  mapping(uint256 => string) public tokenDNA;
  mapping(uint256 => mapping(string => string)) public tokenAttributes; 
  /// @dev Maps the YouthScout id to the original redeemer and its local token
  mapping(uint256 => uint256[2]) public tokenGenerator;

  IEntropyManager public entropyManager;
  IScoutsIdGenerator public idGenerator;

  string public metadata_uri = "https://metadata.metassocer.com/scouts";

  constructor(string memory _description, string memory _name, address _entropyManager, address _idGenerator) ERC721(_description, _name) {
    entropyManager = IEntropyManager(_entropyManager);
    idGenerator = IScoutsIdGenerator(_idGenerator);
  }

  function supportsInterface(bytes4 _interfaceId) public view virtual override(ERC721Enumerable, AccessControl) returns (bool) {
    return super.supportsInterface(_interfaceId);
  }

  // Minting should be called by external contract/account with minter role
  function mintScout(address _owner, uint8 _randomSeeds, uint8 _reedemerName, uint256 _generatorTokenId) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
    require(_owner != address(0), "Invalid owner address");

    /// @dev getScoutId already checks taht _redeemerName and _generatorTokenId to be correct
    uint256 _tokenId = idGenerator.getScoutId(_reedemerName, _generatorTokenId);
    tokenGenerator[_tokenId][0] = _reedemerName;
    tokenGenerator[_tokenId][1] = _generatorTokenId;

    for(uint i = 0; i < _randomSeeds; i++){
      entropyManager.requestEntropy(address(this), _tokenId, i);
    }

    _safeMint(_owner, _tokenId);
    return _tokenId;
  }

  function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
    return string(abi.encodePacked(metadata_uri, "/", _tokenId.toString()));
  }

  function contractURI() public view returns (string memory) {
    return metadata_uri;
  }

  function setDNA(uint256 _tokenId, string memory _dna) external onlyRole(SET_DNA_ROLE) {
    require(bytes(tokenDNA[_tokenId]).length == 0, "DNA already exists");
    tokenDNA[_tokenId] = _dna;
  }

  function setAttribute(uint256 _tokenId, string memory _attribute, string memory _value) external onlyRole(SET_ATTRIBUTES_ROLE) {
    tokenAttributes[_tokenId][_attribute] = _value;
  }

  function burnToken(uint256 _tokenId) external {
    require(_isApprovedOrOwner(msg.sender, _tokenId), "Sender is not owner nor approved");
    _burn(_tokenId);
  }

  function setMetadataURI(string memory _new_uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
    metadata_uri = _new_uri;
  }

  function setEntropyManager(address _entropyManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
    entropyManager = IEntropyManager(_entropyManager);
  }

  function setIdGenerator(address _newIdGenerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
    idGenerator = IScoutsIdGenerator(_newIdGenerator);
  }

  function getTokenOrigin(uint256 _tokenId) external view returns(uint256[2] memory) {
    return tokenGenerator[_tokenId];
  }

  function getOwnedTokenIds(address owner) external view returns (uint256[] memory) {
    uint256[] memory ret = new uint256[](balanceOf(owner));
    for (uint256 i = 0; i < balanceOf(owner); i++) {
        ret[i] = tokenOfOwnerByIndex(owner, i);
    }
    return ret;
  }
}