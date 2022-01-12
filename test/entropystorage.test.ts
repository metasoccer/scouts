import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { EntropyStorage } from "../typechain-types";

describe("EntropyStorage", () => {
  let entropyStorage: EntropyStorage;
  const tokenId = Math.floor(Math.random() * 100);
  const indexId = Math.floor(Math.random() * 100);

  beforeEach(async () => {
    const storageFactory = await ethers.getContractFactory("EntropyStorage");
    entropyStorage = await storageFactory.deploy();
    await entropyStorage.deployed();
  });

  describe("hasEntropy", () => {
    it("Should return false if not exists", async () => {
      const r = await entropyStorage.hasEntropy(tokenId, indexId);
      expect(r).to.be.false;
    });
  });

  describe("getEntropy", () => {
    it("Should revert if token or index do not exists", async () => {
      const r = entropyStorage.getEntropy(tokenId, indexId);
      await expect(r).to.be.revertedWith("Queried non-existent entropy");
    });
  });
  describe("setEntropy", () => {
    it("Should revert if sender doesn't have role", async () => {
      const r = entropyStorage.setEntropy(tokenId, indexId, 1);
      await expect(r).to.be.revertedWith("AccessControl: account");
    });
  });

  describe("Data is stored and accessible", () => {
    let admin: SignerWithAddress;
    let entropySetter: SignerWithAddress;
    const seed = 10;

    beforeEach(async () => {
      const wallets = await ethers.getSigners();
      admin = wallets[0];
      entropySetter = wallets[1];

      const SET_ENTROPY_ROLE = await entropyStorage.SET_ENTROPY_ROLE();
      entropyStorage.grantRole(SET_ENTROPY_ROLE, entropySetter.address);
      entropyStorage = entropyStorage.connect(entropySetter);
      await entropyStorage.setEntropy(tokenId, indexId, seed);
    });

    it("Should return seed when getEntropy is called", async () => {
      const r = await entropyStorage.getEntropy(tokenId, indexId);
      expect(r).to.be.equal(seed);
    });

    it("Should true when hasEntropy is called", async () => {
      const r = await entropyStorage.hasEntropy(tokenId, indexId);
      expect(r).to.be.true;
    });

    it("Should revert when trying to overwrite", async () => {
      const r = entropyStorage.setEntropy(tokenId, indexId, 20);
      await expect(r).to.be.revertedWith("Setting existent entropy");
    });
  });
});
