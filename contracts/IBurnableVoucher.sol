pragma solidity ^0.8.9;
// SPDX-License-Identifier: MIT

import "./Redeemers.sol";

///@dev The interface we couple Scouts contract to
interface IBurnableVoucher {
  function ownerOf(uint256 _tokenId) external view returns (address owner);
  function burnToken(uint256 _tokenId) external;
}