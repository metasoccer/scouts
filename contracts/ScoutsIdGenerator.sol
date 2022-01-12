pragma solidity ^0.8.9;
// SPDX-License-Identifier: MIT

import "./IScoutsIdGenerator.sol";
import "./Redeemers.sol";

/**
 * @dev ScoutsIdGenerator implementation
 *
 * When we generate the scouts skills and properties we take into account not
 * only the random number(s) that comes along with it but also which contract
 * minted it. We call such contract a Redeemer.
 *
 * We are starting with one Redeemer (Tickets) that uses from id 0 to 4699,
 * and the second one (Tickets V2) that uses from id 0 to 4699
 *
 */
contract ScoutsIdGenerator is IScoutsIdGenerator {
  ///This is just so the different types are visible in the ABI
  RedeemersTypes public constant REDEEMER_TICKET = RedeemersTypes.Tickets;
  RedeemersTypes public constant REDEEMER_TICKETV2 = RedeemersTypes.TicketsV2;

  /// @dev ScoutId reserver for each redeemer
  /// @dev From 0 to 4699 TicketsV1 both inclusive (4700 in total)
  uint256 public constant TICKETS_MAX_ID = 4699;
  /// @dev From 4700 to 16699 TicketsV2 both inclusive (12000 in total)
  uint256 public constant TICKETS_V2_MAX_ID = 16699;

  ///We use uint8 instead of the Types enum because Scouts.sol is not upgradeable.
  function getScoutId(uint8 _redeemerType, uint256 _tokenId) public pure returns (uint256) {
    if (_redeemerType == uint8(RedeemersTypes.Tickets)) {
      // First 4699 scouts reserved for Pioneers
      require(_tokenId <= TICKETS_MAX_ID, "Only 4700 Pioneers should be available");
      return(_tokenId);
    }
    require(_redeemerType == uint8(RedeemersTypes.TicketsV2), 'invalid redeemerType');
    // First Scout from v2 tickets should have ID 4700 so we need to add 1 to make it so for tokenId 0
    uint256 scoutId = TICKETS_MAX_ID + _tokenId + 1;
    require(scoutId <= TICKETS_V2_MAX_ID, "Only 12000 TicketsV2 scouts should be available");
    return scoutId;
  }

  ///This is just a helper function to help with transparency
  function typeBounds() public pure returns(uint8, uint8) {
    return(uint8(type(RedeemersTypes).min), uint8(type(RedeemersTypes).max));
  }

  ///This is just a helper function to help with transparency
  function typeName(uint8 _redeemerType) public pure returns(string memory) {
    if (_redeemerType == uint8(RedeemersTypes.Tickets)) {
      return "Tickets";
    } else if (_redeemerType == uint8(RedeemersTypes.TicketsV2)) {
      return "TicketsV2";
    }

    revert("Not existing");
  }
}