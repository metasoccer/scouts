import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { ethers, waffle, artifacts } from "hardhat";

import { YouthScouts, YouthScouts__factory} from '../typechain-types'

describe("Scouts", function () {
  let scouts: YouthScouts;
  let admin: SignerWithAddress;
  let si: MockContract;
  const tokenIdGen = 1;

  beforeEach(async () => {
    admin = (await ethers.getSigners())[0];
    const p = await waffle.deployMockContract(admin, artifacts.readArtifactSync("EntropyManager").abi);
    si = await waffle.deployMockContract(admin, artifacts.readArtifactSync("ScoutsIdGenerator").abi);
    await si.mock.getScoutId.returns(tokenIdGen);
    p.mock.requestEntropy.returns();

    const scoutFactory = await ethers.getContractFactory<YouthScouts__factory>("YouthScouts");
    scouts = await scoutFactory.deploy("youth", "scout", p.address, si.address);
    scouts.grantRole(await scouts.MINTER_ROLE(), admin.address);
  });

  describe("mintScout", () => {
    it("Should revert properly if role is missing", async function () {
      const noRoleSigner = (await ethers.getSigners())[1];
      const e = scouts.connect(noRoleSigner).mintScout(admin.address, 1, 0, 0);
      await expect(e).to.be.revertedWith(`AccessControl: account ${noRoleSigner.address.toLowerCase()}`);
    });

    it("Should revert on invalid address", async function () {
      const addr = "0x0000000000000000000000000000000000000000";
      const e = scouts.mintScout(addr, 1, 0, 0);
      await expect(e).to.be.revertedWith("Invalid owner address");
    });

    it("Should revert if minting twice the same token", async function () {
      await scouts.mintScout(admin.address, 1, 0, 0);
      const e = scouts.mintScout(admin.address, 1, 0, 0);
      expect(e).to.be.revertedWith("ERC721: token already minted");
    });

    it("Should not revert if everything is in order", async function () {
      const e = scouts.mintScout(admin.address, 1, 0, 0);
      expect(e).to.not.be.reverted;
    });

    it("Should save the origin of the token", async function () {
      const redeemerTId = 2;
      const e = scouts.mintScout(admin.address, 1, 0, redeemerTId);
      const [redeemerType, redeemerTokenId] = await scouts.getTokenOrigin(tokenIdGen);
      expect(redeemerType).to.be.equal(0);
      expect(redeemerTokenId).to.be.equal(redeemerTId);
    });

    it("Should return the IDs of the owned tokens", async function () {
      const redeemerTId1 = 5;
      const redeemerTId2 = 108;
      const redeemerTId3 = 1234;
      await si.mock.getScoutId.returns(redeemerTId1);
      scouts.mintScout(admin.address, 1, 0, redeemerTId1);
      await si.mock.getScoutId.returns(redeemerTId2);
      scouts.mintScout(admin.address, 1, 0, redeemerTId2);
      await si.mock.getScoutId.returns(redeemerTId3);
      scouts.mintScout(admin.address, 1, 0, redeemerTId3);
      const getOwnedTokenIds = await scouts.getOwnedTokenIds(admin.address);
      expect(getOwnedTokenIds.map((el) => el.toNumber())).to.be.deep.equal([redeemerTId1, redeemerTId2, redeemerTId3]);
    });
  });
});
