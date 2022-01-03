import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  EntropyManager,
  EntropyManager__factory,
  TestERC20,
  TestERC20__factory,
  YouthScouts,
  YouthScouts__factory
} from "../typechain-types";

describe("EntropyManager", function () {
  let entropyManager: EntropyManager;
  let vrfCoordinatorAddr: string;
  const vrfKey = "0xefa06053e2ca99a43c97c4a4f3d8a394ee3323a8ff237e625fba09fe30ceb0a4";
  let linkAddr: string;
  let testToken: TestERC20;
  const fee = 1;

  beforeEach(async () => {
    const deployer = (await ethers.getSigners())[0];
    // rawFulfillRandomness checks that only vrfCoordinator can call it
    // So we are passing our deployer signer address
    vrfCoordinatorAddr = deployer.address;
    const testLinkTokenFactory = await ethers.getContractFactory<TestERC20__factory>("TestERC20");
    testToken = await testLinkTokenFactory.deploy("Link test", "LINK");
    await testToken.deployed();
    linkAddr = testToken.address;

    const entropyManagerFactory = await ethers.getContractFactory<EntropyManager__factory>("EntropyManager");
    entropyManager = await entropyManagerFactory.deploy(
      vrfCoordinatorAddr,
      vrfKey,
      linkAddr,
      fee,
    );

    // await testToken.mint(entropyManager.address, 20000);
  });

  describe("VRFFee change", () => {
    it("Should return the changed fee", async function () {
      const original = await entropyManager.VRFFee();
      expect(original).to.be.equal(1);
      await entropyManager.setVRFFee(2);
      const changed = await entropyManager.VRFFee();
      expect(changed).to.be.equal(2);
    });
  });

  describe("VRFKey change", () => {
    it("Should return the changed VRFKey", async function () {
      const original = await entropyManager.VRFKey();
      expect(original).to.be.equal(vrfKey);
      const newKey = "0x1111111111111111111111111111111111111111111111111111111111111234";
      await entropyManager.setVRFKey(newKey);
      const changed = await entropyManager.VRFKey();
      expect(changed).to.be.equal(newKey);
    });
  });

  describe("requestEntropy", () => {
    let scouts: YouthScouts;
    let adminNoRequestRole: SignerWithAddress;
    let withRequestRole: SignerWithAddress;

    //Token from the ERC721 and the entropy index
    const tokenId = 0;
    const index = 0;

    beforeEach(async () => {
      const signers = await ethers.getSigners();
      adminNoRequestRole = signers[0];
      withRequestRole = signers[1];

      const scoutsFactory = await ethers.getContractFactory<YouthScouts__factory>("YouthScouts");
      scouts = await scoutsFactory.deploy("Test", "tast", entropyManager.address, linkAddr);
      await scouts.deployed();

      const role = await entropyManager.REQUESTER_ROLE();
      await entropyManager.grantRole(role, withRequestRole.address);
    });

    it("Should fail if no REQUEST_ROLE", async function () {
      const r = entropyManager.requestEntropy(scouts.address, tokenId, index);
      await expect(r)
        .to
        .be
        .revertedWith(`AccessControl: account ${adminNoRequestRole.address.toLowerCase()}`);
    });

    it("Should fail if no funds", async function () {
      const r = entropyManager.connect(withRequestRole).requestEntropy(scouts.address, tokenId, index);
      await expect(r)
        .to
        .be
        .revertedWith(`Not enough LINK - fill contract with faucet`);
    });

    it("Should emit an event when entropy is requested", async () => {
      //We need the contract address to be predictable  since VRF uses it to create the requestId
      const deployerWithNonce0 = (await ethers.getSigners())[10];
      const entropyManagerFactory = await ethers
        .getContractFactory<EntropyManager__factory>("EntropyManager", deployerWithNonce0);

      let entropyManager = await entropyManagerFactory.deploy(
        vrfCoordinatorAddr,
        vrfKey,
        testToken.address,
        fee,
        {nonce: 1}
      );
      const role = await entropyManager.REQUESTER_ROLE();
      await entropyManager.grantRole(role, withRequestRole.address);

      await testToken.mint(entropyManager.address, 200);
      const r = entropyManager.connect(withRequestRole).requestEntropy(scouts.address, tokenId, index);

      // @dev it is basically a hash made out of things that we control such
      // the contract address, a nonce (which should be 0 at this point), keyhash, etc.
      // Since the state is reproduced before each test it should be safe to assume the
      // requestId return value
      const rId = "0x5f2e6235886ed37c26e71812d37e7ee3517d0e5539648e2c8d3bf3070f48e19f";
      await expect(r).to.emit(entropyManager, "EntropyRequested")
        .withArgs(scouts.address, tokenId, index, rId);
    });

    it("Should revert if entropy for that token was already requested", async () => {
      await testToken.mint(entropyManager.address, 200);
      await entropyManager.connect(withRequestRole).requestEntropy(scouts.address, tokenId, index);
      const r = entropyManager.connect(withRequestRole).requestEntropy(scouts.address, tokenId, index);
      await expect(r).to.be.revertedWith("Request already performed");
    });
  });

  describe("fulfillRandomness", () => {
    let scouts: YouthScouts;
    beforeEach(async () => {
      const admin = (await ethers.getSigners())[0];

      const scoutsFactory = await ethers.getContractFactory<YouthScouts__factory>("YouthScouts");
      scouts = await scoutsFactory.deploy("Test", "tast", entropyManager.address, linkAddr);
      await scouts.deployed();

      const entropySetRole = await scouts.SET_ENTROPY_ROLE();
      await scouts.grantRole(entropySetRole, entropyManager.address);
      const role = await entropyManager.REQUESTER_ROLE();
      await entropyManager.grantRole(role, admin.address);
      await testToken.mint(entropyManager.address, 200);
    });

    async function requestEntropy(): Promise<string>
    {
      const tx = await entropyManager.requestEntropy(scouts.address, 0, 0);
      const receipt = await tx.wait();
      return entropyManager.interface.parseLog(receipt.logs[0]).args[3];
    }

    it("Should revert if called twice for the same requestId", async () => {
      const reqId = await requestEntropy();
      await entropyManager.rawFulfillRandomness(reqId, 10);
      const r = entropyManager.rawFulfillRandomness(reqId, 10);
      await expect(r).to.revertedWith("Requested existent entropy");
    });

    it("Should set entropy for erc721+token+index", async () => {
      const reqId = await requestEntropy();
      await entropyManager.rawFulfillRandomness(reqId, 10);
      const hasEntropy = await scouts.hasEntropy(0, 0);
      expect(hasEntropy).to.be.true;
    });

    it("Should emit EntropyReceived", async () => {
      const fReceived = entropyManager.filters.EntropyReceived(scouts.address, 0, 0);
      const reqId = await requestEntropy();
      const tx = await entropyManager.rawFulfillRandomness(reqId, 10);
      const receipt = await tx.wait();

      const q = entropyManager.interface.getEvent("EntropyReceived");
      const t = entropyManager.interface.getEventTopic(q);

      const received = receipt.logs.filter((log) => {
        return log.topics.includes(t) &&
        log.address.toLowerCase() == entropyManager.address.toLowerCase()
      });
      expect(received).is.not.empty;
      const entropy = entropyManager.interface.parseLog(received[0]).args[3] as string;
      expect(entropy).to.be.equal(10);
    });
  });
});
