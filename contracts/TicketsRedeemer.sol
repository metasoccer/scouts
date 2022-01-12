pragma solidity ^0.8.9;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ScoutsIdGenerator.sol";
import "./Scouts.sol";
import "./Redeemers.sol";
import "./IBurnableVoucher.sol";


/**
 * @dev This small contract burns a "scout ticket" and mints the actual scout
 *
 * To avoid scams we decided to burn the tickets/vouchers once the actual NFT is minted
 * This contact does just that.
 *
 * Note we are inherting from ReentracyGuard although, in theory, we should not be vulnerable
 * to reentracy attacks since we are burning before the minting. But just in case nonReentrant
 * uses a bit of gas and let's us sleep better at night.
 *
 * Note also, we have an method redeemExternalTicket only to be called by accounts with the REDEEMER_ROLE
 * role, this is so we can perform bulk redeemed for users with a huge amount of tickets.
 */
contract TicketsRedeemer is AccessControl, ReentrancyGuard {

  bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

  event TicketRedeemed(uint256 indexed ticketId, uint256 indexed scoutId, address indexed owner);

  RedeemersTypes public immutable redeemerType;
  uint8 public immutable requiredSeeds;
  IBurnableVoucher public immutable ticketsContract;
  YouthScouts public immutable scoutsContract;

  constructor(address _scoutsAddress, address _ticketsAddress, uint8 _requiredSeeds, RedeemersTypes _redeemerType) {
    ticketsContract = IBurnableVoucher(_ticketsAddress); /// Original ERC72 to exchange for a Scout
    scoutsContract = YouthScouts(_scoutsAddress); /// Scout ERC721 the ticket will be converted to
    requiredSeeds = _requiredSeeds; /// Amount of entropy seeds to ask for
    redeemerType = _redeemerType; // Type of the redeemable tickets

    /// @dev This is just so the Contract can be tested by itself
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  /// @param _redeemTokenId the tokenId from the ERC721 to be redeemed
  function redeemTicket(uint256 _redeemTokenId) external nonReentrant {
    /// @dev This is not needed for security but for usability it makes sense.
    require(msg.sender == ticketsContract.ownerOf(_redeemTokenId), "Only ticket owner can redeem");
    _redeemTicket(_redeemTokenId);
  }

  /// @param _redeemTokenId the tokenId from the ERC721 to be redeemed
  function redeemExternalTicket(uint256 _redeemTokenId) external onlyRole(REDEEMER_ROLE) {
    _redeemTicket(_redeemTokenId);
  }

  /// @param _redeemTokenId the tokenId from the ERC721 to be redeemed
  function _redeemTicket(uint256 _redeemTokenId) internal {
    address ticketOwner = ticketsContract.ownerOf(_redeemTokenId);
    /// We burn first so the token can't be redeemed again if minting succeeds
    ticketsContract.burnToken(_redeemTokenId);
    /// We mint the scout
    uint256 scoutId = scoutsContract.mintScout(ticketOwner, requiredSeeds, uint8(redeemerType), _redeemTokenId);
    emit TicketRedeemed(_redeemTokenId, scoutId, scoutsContract.ownerOf(scoutId));
  }
}