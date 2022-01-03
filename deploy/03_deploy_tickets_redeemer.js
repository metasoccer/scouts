
module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const scouts = await deployments.get('YouthScouts');
  console.log(scouts.address);
  const idGenerator = await deployments.get('ScoutsIdGenerator');
  console.log(idGenerator.address);

  // TODO - add vouchers as existing deployment (fallback: add in network config)
  const vouchersAddress = "0xd90d9743d8b5a5b865fede3650a8e01b900b9241";

  // Corresponds to "Tickets" enum value for RedeemersTypes
  const TICKETS = 0;
    
  // It won't deploy if new changes aren't available
  await deploy('TicketsRedeemer', {
    from: deployer,
    args: [scouts.address, vouchersAddress, 1, TICKETS],
    log: true,
  });
};