const { expect } = require("chai");

describe("Scouts Contract with external logic for minting and entropy", () => {

  before(async  () => {
    const wallets = await ethers.getSigners();
    this.admin = wallets[0];
    this.alice = wallets[1];
    this.bob = wallets[2];
    this.charlie = wallets[3];
    this.TICKETS = 0;
  });

  describe('Setting up the vouchers environment', () => {
    it("Should deploy Vouchers", async () => {
      const Vouchers = await ethers.getContractFactory("Vouchers");
      this.vouchers = await Vouchers.connect(this.admin).deploy()
        .then(f => f.deployed());
      expect(await this.vouchers.name()).to.equal('MetaSoccer Youth Scout Tickets');
      expect(await this.vouchers.symbol()).to.equal('MSYST');
  	  expect(await this.vouchers.totalSupply()).to.equal(0);
    })

    it("Should mint giveaway vouchers", async () => {
      await this.vouchers.connect(this.admin).mintForGiveaway(10, "GOALKEEPER");
      expect(await this.vouchers.ownerOf(0)).to.equal(this.admin.address);
  	  expect(await this.vouchers.totalSupply()).to.equal(10);
    })
  })

  describe('Setting up scouts environment', () => {
    it("Should deploy EntropyManager Contract", async () => {
      const EntropyManager = await ethers.getContractFactory("EntropyManager");
      this.entropyManager = await EntropyManager.connect(this.admin).deploy('0x0000000000000000000000000000000000000000', '0xefa06053e2ca99a43c97c4a4f3d8a394ee3323a8ff237e625fba09fe30ceb0a4', '0x0000000000000000000000000000000000000000', 0)
        .then(f => f.deployed());
      const adminRole = await this.entropyManager.DEFAULT_ADMIN_ROLE();
      expect(await this.entropyManager.hasRole(adminRole, this.admin.address)).to.equal(true);
    })

    it("Should deploy first version of Scouts Contract", async () => {
      const ScoutsIDGenerator = await ethers.getContractFactory("ScoutsIdGenerator");
      // Deploying without entropy request since VRF not available in test..
    this.idGenerator = await ScoutsIDGenerator.connect(this.admin).deploy()
      .then(f => f.deployed());

      const YouthScouts = await ethers.getContractFactory("YouthScouts");
      this.scouts = await YouthScouts.connect(this.admin).deploy("MetaSoccer Youth Scouts", "MYS", this.entropyManager.address, this.idGenerator.address);
      const value = await this.scouts.name();
      expect(value.toString()).to.equal('MetaSoccer Youth Scouts');
      expect(await this.scouts.MINTER_ROLE())
        .to.equal('0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6');
    })

    it("Should return collection URL", async () => {
      const res = await this.scouts.contractURI();
      expect(res).to.equal("https://metadata.metassocer.com/scouts");
    })

    it("Should support 721 Enumerable interface", async () => {
      expect(await this.scouts.supportsInterface("0x780e9d63")).to.equal(true);
    })

    it("Should allow Admin to set a new Id Generator", async () => {
      await this.scouts.connect(this.admin).setIdGenerator(this.admin.address);
      expect(await this.scouts.idGenerator()).to.equal(this.admin.address);
      //TODO: Remove this hack, if above line fails the other tests won't complete
      await this.scouts.connect(this.admin).setIdGenerator(this.idGenerator.address);
    })

    it("Shouldn't allow Alice to set a new Id Generator", async () => {
      const DEFAULT_ADMIN_ROLE = await this.scouts.DEFAULT_ADMIN_ROLE();
      await expect(this.scouts.connect(this.alice).setIdGenerator(this.alice.address)).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE);
    })
  })

  describe('Setting up Tickets Redeemer environment', () => {

    it("Should deploy TicketsRedeemer Contract", async () => {
      const TicketsRedeemer = await ethers.getContractFactory("TicketsRedeemer");
      // Deploying without entropy request since VRF not available in test..
      this.ticketsRedeemer = await TicketsRedeemer.connect(this.admin).deploy(this.scouts.address, this.vouchers.address, 0, this.TICKETS)
        .then(f => f.deployed());
    })

    it("Should grant scouts minter role to tickets redeemer contract", async () => {
      const MINTER_ROLE = await this.scouts.MINTER_ROLE()
      await this.scouts.connect(this.admin).grantRole(MINTER_ROLE, this.ticketsRedeemer.address)
  	  expect(await this.scouts.hasRole(MINTER_ROLE, this.ticketsRedeemer.address)).to.equal(true);
    })

    it("Should grant scouts set entropy role to entropy contract", async () => {
      const SET_ENTROPY_ROLE = await this.scouts.SET_ENTROPY_ROLE()
      await this.scouts.connect(this.admin).grantRole(SET_ENTROPY_ROLE, this.entropyManager.address)
  	  expect(await this.scouts.hasRole(SET_ENTROPY_ROLE, this.entropyManager.address)).to.equal(true);
    })
  })

  describe('Redeeming a Voucher', () => {
    it("Should fail to redeem without approval", async () => {
      await expect(this.ticketsRedeemer.connect(this.admin).redeemTicket(0)).to.be.revertedWith('Sender is not owner nor approved');
    })

    it("Should grant vouchers approval to tickets redeemer contract", async () => {
      await this.vouchers.connect(this.admin).setApprovalForAll(this.ticketsRedeemer.address, true);
  	  expect(await this.vouchers.isApprovedForAll(this.admin.address, this.ticketsRedeemer.address)).to.equal(true);
    })

    it("Shouldn't allow Alice to redeem not owned tickets", async () => {
      await expect(this.ticketsRedeemer.connect(this.alice).redeemTicket(0)).to.be.revertedWith("Only ticket owner can redeem");
    })

    it("Should redeem a ticket", async () => {
      await this.ticketsRedeemer.connect(this.admin).redeemTicket(0);
      expect(await this.scouts.ownerOf(0)).to.equal(this.admin.address);
  	  expect(await this.scouts.totalSupply()).to.equal(1);
    })

    it("Should return URL", async () => {
      const res = await this.scouts.tokenURI(0);
      expect(res).to.equal("https://metadata.metassocer.com/scouts/0");
    })
  })

  describe('Updating Metadata', () => {
    it("Should update Metadata URI", async () => {
      await this.scouts.connect(this.admin).setMetadataURI("https://metadatav2.metassocer.com/metadata/scouts")
      const tokenURI = await this.scouts.tokenURI(0);
      expect(tokenURI).to.equal("https://metadatav2.metassocer.com/metadata/scouts/0");
      const contractURI = await this.scouts.contractURI();
      expect(contractURI).to.equal("https://metadatav2.metassocer.com/metadata/scouts");
    })
  })

  describe('Scouts minting should fail as expected', () => {
    it("Shouldn't allow Alice to mint NFT since she doesn't have minter role", async () => {
      const MINTER_ROLE = await this.scouts.MINTER_ROLE();
      await expect(this.scouts.connect(this.alice).mintScout(this.alice.address, 0, this.TICKETS, 0)).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + MINTER_ROLE);
    })

    it("Should grant scouts minter role to Alice", async () => {
      const MINTER_ROLE = await this.scouts.MINTER_ROLE()
      await this.scouts.connect(this.admin).grantRole(MINTER_ROLE, this.alice.address)
  	  expect(await this.scouts.hasRole(MINTER_ROLE, this.alice.address)).to.equal(true);
    })

    it("Shouldn't allow Alice to mint NFT to address 0", async () => {
      await expect(this.scouts.connect(this.alice).mintScout('0x0000000000000000000000000000000000000000', 0, this.TICKETS, 0)).to.be.revertedWith('Invalid owner address');
    })
  })

  describe('Admin functions', () => {
    it("Shouldn't allow Alice to set NFT DNA since she don't have required role", async () => {
      const SET_DNA_ROLE = await this.scouts.SET_DNA_ROLE();
      await expect(this.scouts.connect(this.alice).setDNA(0, "My DNA")).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + SET_DNA_ROLE);
    })

    it("Shouldn't allow Alice to set NFT Attribute since she don't have required role", async () => {
      const SET_ATTRIBUTES_ROLE = await this.scouts.SET_ATTRIBUTES_ROLE();
      await expect(this.scouts.connect(this.alice).setAttribute(0, "Name", "Alice")).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + SET_ATTRIBUTES_ROLE);
    })

    it("Should grant Alice permissions to set DNA and attributes", async () => {
      const SET_DNA_ROLE = await this.scouts.SET_DNA_ROLE();
      const SET_ATTRIBUTES_ROLE = await this.scouts.SET_ATTRIBUTES_ROLE();
      await this.scouts.connect(this.admin).grantRole(SET_DNA_ROLE, this.alice.address)
  	  expect(await this.scouts.hasRole(SET_DNA_ROLE, this.alice.address)).to.equal(true);
      await this.scouts.connect(this.admin).grantRole(SET_ATTRIBUTES_ROLE, this.alice.address)
  	  expect(await this.scouts.hasRole(SET_ATTRIBUTES_ROLE, this.alice.address)).to.equal(true);
    })

    it("Should allow Alice to set NFT DNA since she has required role", async () => {
      await this.scouts.connect(this.alice).setDNA(0, "My DNA");
      const value = await this.scouts.tokenDNA(0);
      expect(value).to.equal('My DNA');
    })
    
    it("Shouldn't allow Alice to set NFT DNA since DNA is already defined", async () => {
      await expect(this.scouts.connect(this.alice).setDNA(0, "My DNA")).to.be.revertedWith('DNA already exists');
    })

    it("Shouldn't allow Alice to set NFT Attribute since she don't have required role", async () => {
      await this.scouts.connect(this.alice).setAttribute(0, "Name", "Alice");
      const value = await this.scouts.tokenAttributes(0, "Name");
      expect(value).to.equal('Alice');
    })

    it("Shouldn't allow Alice to set a new Entropy Manager", async () => {
      const DEFAULT_ADMIN_ROLE = await this.scouts.DEFAULT_ADMIN_ROLE();
      await expect(this.scouts.connect(this.alice).setEntropyManager(this.alice.address)).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE);
    })

    it("Should allow Admin to set a new Entropy Manager", async () => {
      await this.scouts.connect(this.admin).setEntropyManager(this.admin.address);
      expect(await this.scouts.entropyManager()).to.equal(this.admin.address);
    })

    it("Shouldn't allow Alice to use external redeemal since she doesn't have role", async () => {
      const REDEEMER_ROLE = await this.ticketsRedeemer.REDEEMER_ROLE();
      await expect(this.ticketsRedeemer.connect(this.alice).redeemExternalTicket(1)).to.be.revertedWith('AccessControl: account ' + this.alice.address.toLowerCase() + ' is missing role ' + REDEEMER_ROLE);
    })

    it("Should allow Alice to use external redeemal when she has role", async () => {
      const balanceOfBefore = (await this.scouts.balanceOf(this.admin.address)).toNumber();
      const REDEEMER_ROLE = await this.ticketsRedeemer.REDEEMER_ROLE();
      await this.ticketsRedeemer.connect(this.admin).grantRole(REDEEMER_ROLE, this.alice.address);
      await this.ticketsRedeemer.connect(this.alice).redeemExternalTicket(9);
      const value = await this.scouts.balanceOf(this.admin.address);
      expect(value).to.equal(balanceOfBefore + 1);
    })
    
  })

  describe('Burning an approved NFT', () => {
    const tokenId = 0;

    it("Shouldn't allow Bob to burn admin NFT since not approved yet", async () => {
      await expect(this.scouts.connect(this.bob).burnToken(tokenId)).to.be.revertedWith('Sender is not owner nor approved');
    })

    it("Should allow Admin to approve Bob for using his NFT", async () => {
      await this.scouts.connect(this.admin).approve(this.bob.address, tokenId);
      expect(await this.scouts.getApproved(tokenId)).to.equal(this.bob.address);
    })

    it("Should allow Admin to burn Bob NFT", async () => {
      await this.scouts.connect(this.bob).burnToken(tokenId);
      await expect(this.scouts.ownerOf(tokenId)).to.be.revertedWith('ERC721: owner query for nonexistent token');
    })
  })

})