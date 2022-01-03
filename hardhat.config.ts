import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "hardhat-deploy";
const msConfig = require("@metasoccer/config");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: msConfig.hardhat.networks,
  etherscan: msConfig.hardhat.etherscan,
  namedAccounts: {
    deployer: 0,
  },
};
