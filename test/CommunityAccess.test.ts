import { expect } from "chai";
import { ethers } from "hardhat";
import { CommunityAccess } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CommunityAccess", function () {
  let communityAccess: CommunityAccess;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const CommunityAccess = await ethers.getContractFactory("CommunityAccess");
    communityAccess = await CommunityAccess.deploy();
    await communityAccess.waitForDeployment();
  });

  describe("Community Creation", function () {
    it("Should create a new community", async function () {
      const tx = await communityAccess.createCommunity(
        "Test Community",
        "A test community for audio calls",
        false
      );
      await tx.wait();

      const [name, description, communityOwner, , isActive, participantCount] =
        await communityAccess.getCommunityInfo(0);

      expect(name).to.equal("Test Community");
      expect(description).to.equal("A test community for audio calls");
      expect(communityOwner).to.equal(owner.address);
      expect(isActive).to.be.true;
      expect(participantCount).to.equal(1); // Creator is auto-added
    });

    it("Should emit CommunityCreated event", async function () {
      await expect(
        communityAccess.createCommunity("Test Community", "Description", false)
      )
        .to.emit(communityAccess, "CommunityCreated")
        .withArgs(0, owner.address, "Test Community");
    });

    it("Should auto-add creator as participant", async function () {
      await communityAccess.createCommunity("Test", "Test", false);
      const hasAccess = await communityAccess.hasAccess(0, owner.address);
      expect(hasAccess).to.be.true;
    });

    it("Should create community with Livepeer requirement", async function () {
      await communityAccess.createCommunity("Livepeer Community", "Requires Livepeer", true);
      const requiresLivepeer = await communityAccess.communityRequiresLivepeer(0);
      expect(requiresLivepeer).to.be.true;
    });
  });

  describe("Participant Management", function () {
    beforeEach(async function () {
      await communityAccess.createCommunity("Test", "Test", false);
    });

    it("Should add participant to community", async function () {
      await communityAccess.addParticipantToCommunity(0, addr1.address);
      const hasAccess = await communityAccess.hasAccess(0, addr1.address);
      expect(hasAccess).to.be.true;
    });

    it("Should add multiple participants", async function () {
      await communityAccess.addParticipantsToCommunity(0, [
        addr1.address,
        addr2.address,
        addr3.address,
      ]);

      expect(await communityAccess.hasAccess(0, addr1.address)).to.be.true;
      expect(await communityAccess.hasAccess(0, addr2.address)).to.be.true;
      expect(await communityAccess.hasAccess(0, addr3.address)).to.be.true;
    });

    it("Should remove participant from community", async function () {
      await communityAccess.addParticipantToCommunity(0, addr1.address);
      await communityAccess.removeParticipantFromCommunity(0, addr1.address);

      const hasAccess = await communityAccess.hasAccess(0, addr1.address);
      expect(hasAccess).to.be.false;
    });

    it("Should emit ParticipantAdded event", async function () {
      await expect(communityAccess.addParticipantToCommunity(0, addr1.address))
        .to.emit(communityAccess, "ParticipantAdded")
        .withArgs(addr1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("Should only allow owner to add participants", async function () {
      await expect(
        communityAccess.connect(addr1).addParticipantToCommunity(0, addr2.address)
      ).to.be.revertedWith("Only community owner or contract owner can add participants");
    });

    it("Should get all community participants", async function () {
      await communityAccess.addParticipantsToCommunity(0, [
        addr1.address,
        addr2.address,
      ]);

      const participants = await communityAccess.getCommunityParticipants(0);
      expect(participants.length).to.equal(3); // Owner + 2 added
      expect(participants).to.include(owner.address);
      expect(participants).to.include(addr1.address);
      expect(participants).to.include(addr2.address);
    });
  });

  describe("Global Allowlist", function () {
    beforeEach(async function () {
      await communityAccess.createCommunity("Test", "Test", false);
    });

    it("Should add to global allowlist", async function () {
      await communityAccess.addToGlobalAllowlist(addr1.address);
      const hasAccess = await communityAccess.hasAccess(0, addr1.address);
      expect(hasAccess).to.be.true;
    });

    it("Should remove from global allowlist", async function () {
      await communityAccess.addToGlobalAllowlist(addr1.address);
      await communityAccess.removeFromGlobalAllowlist(addr1.address);

      const hasAccess = await communityAccess.hasAccess(0, addr1.address);
      expect(hasAccess).to.be.false;
    });

    it("Should only allow owner to modify global allowlist", async function () {
      await expect(
        communityAccess.connect(addr1).addToGlobalAllowlist(addr2.address)
      ).to.be.revertedWithCustomError(communityAccess, "OwnableUnauthorizedAccount");
    });

    it("Should get all global participants", async function () {
      await communityAccess.addToGlobalAllowlist(addr1.address);
      await communityAccess.addToGlobalAllowlist(addr2.address);

      const participants = await communityAccess.getGlobalParticipants();
      expect(participants.length).to.equal(2);
      expect(participants).to.include(addr1.address);
      expect(participants).to.include(addr2.address);
    });
  });

  describe("Community Updates", function () {
    beforeEach(async function () {
      await communityAccess.createCommunity("Original Name", "Original Description", false);
    });

    it("Should update community information", async function () {
      await communityAccess.updateCommunity(
        0,
        "Updated Name",
        "Updated Description"
      );

      const [name, description] = await communityAccess.getCommunityInfo(0);
      expect(name).to.equal("Updated Name");
      expect(description).to.equal("Updated Description");
    });

    it("Should only allow owner to update", async function () {
      await expect(
        communityAccess
          .connect(addr1)
          .updateCommunity(0, "Hacked", "Hacked")
      ).to.be.revertedWith("Only community owner can update");
    });

    it("Should deactivate community", async function () {
      await communityAccess.deactivateCommunity(0);
      const [, , , , isActive] = await communityAccess.getCommunityInfo(0);
      expect(isActive).to.be.false;
    });
  });

  describe("User Communities", function () {
    it("Should track user communities", async function () {
      // Create communities
      await communityAccess.createCommunity("Community 1", "Desc 1", false);
      await communityAccess.createCommunity("Community 2", "Desc 2", false);

      // Add addr1 to both
      await communityAccess.addParticipantToCommunity(0, addr1.address);
      await communityAccess.addParticipantToCommunity(1, addr1.address);

      const userCommunities = await communityAccess.getUserCommunities(
        addr1.address
      );
      expect(userCommunities.length).to.equal(2);
      expect(userCommunities[0]).to.equal(0);
      expect(userCommunities[1]).to.equal(1);
    });
  });
});

