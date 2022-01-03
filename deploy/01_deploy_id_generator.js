
module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
    
  // It won't deploy if new changes aren't available
  await deploy('ScoutsIdGenerator', {
    from: deployer,
    log: true,
  });
};