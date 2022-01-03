# ![ss](https://polygonscan.com/token/images/metasocceruniverse_32.png) MetaSoccer Scouts
[![contract](https://img.shields.io/badge/Contract-Polygon-%238247e5)]()
![coverage](https://img.shields.io/badge/Coverage-100-green)


  [Twitter](https://twitter.com/MetaSoccer_EN)
• [Discord](https://discord.gg/metasoccer)
• [Telegram](https://t.me/MetaSoccerOfficial)
• [Blog](https://metasoccer.medium.com/)
• [Game](https://metasoccer.com/)

### Test
Clone project, install dependencies, update API keys under hardhat.config.js, then you can compile latest changes and run tests with just:

```
npx hardhat test
npx hardhat coverage
```
### Deploy
Deployments are done with hardhat-deploy plugin that keeps track of contracts by network. To deploy:

```
npx hardhat --network mumbai deploy
```
The above command won't redeploy contracts if there's no changes, so its also very useful to use current deployment addresses:

```
user@MS:~/metasoccer/metasoccer/onchain/scouts$ npx hardhat --network mumbai deploy
reusing "EntropyManager" at 0x23A8E2c5EaD54d1b02D09275E293eBeB820B126e
reusing "ScoutsIdGenerator" at 0xa5299B89c5f1e8A6D525B801f42342dc18335964
reusing "YouthScouts" at 0xE8412eD89821BA4f11e9f6b80c8295a2FDE09945
reusing "TicketsRedeemer" at 0x9E6a18E421449a02061878533208645DDb082691
```

### Verify

To verify contracts on Polygonscan:

```
npx hardhat --network mumbai etherscan-verify
```

### Interacting with VRF

Since VRF is not available for local tests, it needs to be tested on test networks such as Mumbai. To make it work:

1. Get some tickets on Mumbai: 0xd90d9743d8b5a5b865fede3650a8e01b900b9241
2. Grant TicketsRedeemer the Scouts MINTER_ROLE
3. Grant EntropyManager the Scouts SET_ENTROPY_ROLE
4. Grant Scouts the EntropyManager REQUESTER_ROLE
5. Grant TicketsRedeemer approval to use your tickets
6. Send Link to EntropyManager to pay for VRF fees
7. Go to the TicketsRedeemer contract and call RedeemTicket with your token ID 
