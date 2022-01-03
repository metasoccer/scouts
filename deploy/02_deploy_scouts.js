
module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const {chainId} = await getChainId();

  const entropyManager = await deployments.get('EntropyManager');
  const scoutsIdGenerator = await deployments.get('ScoutsIdGenerator');
    
  // It won't deploy if new changes aren't available
  await deploy('YouthScouts', {
    from: deployer,
    args: ["Test Youth Scouts", "TYS", entropyManager.address, scoutsIdGenerator.address],
    log: true,
  });
};