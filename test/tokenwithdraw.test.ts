import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  TokenWithdraw,
  TokenWithdraw__factory,
  TestERC20,
  TestERC20__factory,
  TestERC721,
  TestERC721__factory,

} from "../typechain-types";

describe("TokenWithdraw", function () {
  let tokenWithdraw: TokenWithdraw;
  let testToken: TestERC20;

  beforeEach(async () => {
    const withdrawFactory = await ethers.getContractFactory<TokenWithdraw__factory>("TokenWithdraw");
    tokenWithdraw = await withdrawFactory.deploy();
  });

  describe("withdrawERC20", () => {
    let testToken: TestERC20;
    let admin: SignerWithAddress;
    let nonAdmin: SignerWithAddress;

    beforeEach(async () => {
      const signers = await ethers.getSigners();
      admin = signers[0];
      nonAdmin = signers[1];
      const testTokenFactory = await ethers.getContractFactory<TestERC20__factory>("TestERC20");
      testToken = await testTokenFactory.deploy("Some", "TKN");
      await testToken.deployed();
      await testToken.mint(tokenWithdraw.address, 200);
    });

    it("Should fail to transfer if no admin role", async () => {
      const r = tokenWithdraw
        .connect(nonAdmin)
        .withdrawERC20(testToken.address, 200);
      await expect(r).to.be.revertedWith(`AccessControl: account ${nonAdmin.address.toLowerCase()}`);
    });

    it("Should transfer if admin role", async () => {
      const contractBalance = await testToken.balanceOf(tokenWithdraw.address);
      expect(contractBalance.toNumber()).to.be.greaterThan(0);
      const adminBeforeBalance = await testToken.balanceOf(admin.address);

      await tokenWithdraw.withdrawERC20(testToken.address, contractBalance);

      const currentContractBalance = await testToken.balanceOf(tokenWithdraw.address);
      const adminCurrentBalance = await testToken.balanceOf(admin.address);
      expect(currentContractBalance).to.be.equal(0);
      expect(adminCurrentBalance).to.be.equal(adminBeforeBalance.add(contractBalance));
    });
  });

  describe("withdrawNFT", () => {
    let testToken: TestERC721;
    let admin: SignerWithAddress;
    let nonAdmin: SignerWithAddress;
    const tokenId = 1337;

    beforeEach(async () => {
      const signers = await ethers.getSigners();
      admin = signers[0];
      nonAdmin = signers[1];
      const testTokenFactory = await ethers.getContractFactory<TestERC721__factory>("TestERC721");
      testToken = await testTokenFactory.deploy("Some", "TKN");
      await testToken.deployed();
      await testToken.mint(tokenWithdraw.address, tokenId);
    });

    it("Should fail to transfer if no admin role", async () => {
      const r = tokenWithdraw
        .connect(nonAdmin)
        .withdrawNFT(testToken.address, tokenId);
      await expect(r).to.be.revertedWith(`AccessControl: account ${nonAdmin.address.toLowerCase()}`);
    });

    it("Should transfer if admin role", async () => {
      const owner = await testToken.ownerOf(tokenId);
      expect(owner).to.be.equal(tokenWithdraw.address);

      await tokenWithdraw.withdrawNFT(testToken.address, tokenId);
      const newOwner = await testToken.ownerOf(tokenId);
      expect(newOwner).to.be.equal(admin.address);
    });
  });
});
