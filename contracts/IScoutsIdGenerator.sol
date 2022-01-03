pragma solidity ^0.8.9;
// SPDX-License-Identifier: MIT

import "./Redeemers.sol";

///@dev The interface we couple Scouts contract to
interface IScoutsIdGenerator {
  function getScoutId(uint8 _redeemerName, uint256 _tokenId) pure external returns (uint256);
}