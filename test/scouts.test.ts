import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { ethers, waffle, artifacts } from "hardhat";

import { YouthScouts } from "../typechain-types";

describe("Scouts", function () {
  let scouts: YouthScouts;
  let admin: SignerWithAddress;
  let si: MockContract;
  let tokenId: number = 0;

  before(async () => {
    admin = (await ethers.getSigners())[0];
    const p = await waffle.deployMockContract(
      admin,
      artifacts.readArtifactSync("EntropyManager").abi
    );
    si = await waffle.deployMockContract(
      admin,
      artifacts.readArtifactSync("ScoutsIdGenerator").abi
    );
    await si.mock.getScoutId.returns(tokenId);
    p.mock.requestEntropy.returns();

    const scoutFactory = await ethers.getContractFactory("YouthScouts");
    scouts = await scoutFactory.deploy("youth", "scout", p.address, si.address);
    scouts.grantRole(await scouts.MINTER_ROLE(), admin.address);
  });

  async function increaseTokenId() {
    tokenId += 1;
    await si.mock.getScoutId.returns(tokenId);
  }

  beforeEach(async () => {
    await increaseTokenId();
  });

  describe("mintScout", () => {
    it("Should revert properly if role is missing", async function () {
      const noRoleSigner = (await ethers.getSigners())[1];
      const e = scouts
        .connect(noRoleSigner)
        .mintScout(admin.address, 1, 0, tokenId);
      await expect(e).to.be.revertedWith(
        `AccessControl: account ${noRoleSigner.address.toLowerCase()}`
      );
    });

    it("Should revert on invalid address", async function () {
      const addr = "0x0000000000000000000000000000000000000000";
      const e = scouts.mintScout(addr, 1, 0, tokenId);
      await expect(e).to.be.revertedWith("Invalid owner address");
    });

    it("Should revert if minting twice the same token", async function () {
      await scouts.mintScout(admin.address, 1, 0, tokenId);
      const e = scouts.mintScout(admin.address, 1, 0, tokenId);
      expect(e).to.be.revertedWith("ERC721: token already minted");
    });

    it("Should not revert if everything is in order", async function () {
      const e = scouts.mintScout(admin.address, 1, 0, tokenId);
      expect(e).to.not.be.reverted;
    });

    it("Should save the origin of the token", async function () {
      await scouts.mintScout(admin.address, 1, 0, tokenId);
      const [redeemerType, redeemerTokenId] = await scouts.getTokenOrigin(
        tokenId
      );
      expect(redeemerType).to.be.equal(0);
      expect(redeemerTokenId).to.be.equal(tokenId);
    });

    it("Should return the IDs of the owned tokens", async function () {
      let redeemerTId1 = tokenId;
      await scouts.mintScout(admin.address, 1, 0, 1);

      await increaseTokenId();
      let redeemerTId2 = tokenId;
      await scouts.mintScout(admin.address, 1, 0, redeemerTId2);

      await increaseTokenId();
      let redeemerTId3 = tokenId;
      await scouts.mintScout(admin.address, 1, 0, redeemerTId3);

      const getOwnedTokenIds = await scouts.getOwnedTokenIds(admin.address);
      expect(getOwnedTokenIds.map((el) => el.toNumber())).to.be.include.members(
        [redeemerTId1, redeemerTId2, redeemerTId3]
      );
    });
  });
});
