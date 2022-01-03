
const config = require("hardhat").config;

module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = parseInt(await getChainId());
  const network = Object.entries(config.networks).filter(([key, val]) => val.chainId == chainId)[0][1];

  // the following will only deploy "EntropyManager" if the contract was never deployed or if the code changed since last deployment
  await deploy('EntropyManager', {
    from: deployer,
    args: [network.VRFCoordinator, network.VRFKey, network.linkToken, ethers.utils.parseEther(network.VRFFee.toString())],
    log: true,
  });
};