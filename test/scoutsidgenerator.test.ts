import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ScoutsIdGenerator,
  ScoutsIdGenerator__factory,
} from "../typechain-types";

describe("ScoutsIdGenerator", function () {
  let idGenerator: ScoutsIdGenerator;

  before(async () => {
    const scoutFactory =
      await ethers.getContractFactory<ScoutsIdGenerator__factory>(
        "ScoutsIdGenerator"
      );
    idGenerator = await scoutFactory.deploy();
  });
  describe("getScoutId", () => {
    it("Should revert properly if type does not exists", async function () {
      const e = idGenerator.getScoutId(255, 1);
      await expect(e).to.be.revertedWith("invalid redeemerType");
    });
    it("Should revert properly if tokenId exceeds range for tickets", async function () {
      const e = idGenerator.getScoutId(0, 4700);
      await expect(e).to.be.revertedWith(
        "Only 4700 Pioneers should be available"
      );
    });
    it("Should return an id if type is Tickets and tokenId < 4700", async () => {
      const id = await idGenerator.getScoutId(0, 4699);
      expect(id).to.be.equal(4699);
    });
    it("Should return an id if type is TicketsV2 and tokenId > 4699", async () => {
      let id = await idGenerator.getScoutId(1, 1);
      expect(id).to.be.equal(4700);

      id = await idGenerator.getScoutId(1, 12000);
      expect(id).to.be.equal(16699);
    });
    it("Should revert properly if tokenId exceeds range for ticketsV2", async function () {
      const e = idGenerator.getScoutId(1, 12001);
      await expect(e).to.be.revertedWith(
        "Only 12000 TicketsV2 scouts should be available"
      );
    });
  });

  describe("typeBounds", () => {
    it("Should return the types bound", async function () {
      const e = await idGenerator.typeBounds();
      expect(e).to.be.an("array").that.is.not.empty;
      expect(e[1]).is.greaterThanOrEqual(e[0]);
    });
  });

  describe("typeName", () => {
    it("Should return the types name", async function () {
      const e = await idGenerator.typeName(0);
      expect(e).to.be.equal("Tickets");
    });
    it("Should revert with Not existing", async function () {
      const e = idGenerator.typeName(2);
      await expect(e).to.be.revertedWith("Not existing");
    });
  });
});
