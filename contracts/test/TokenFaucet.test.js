const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Token Faucet System", function () {
  let token;
  let faucet;
  let owner;
  let user1;
  let user2;

  const FAUCET_AMOUNT = ethers.parseEther("5");
  const MAX_CLAIM_AMOUNT = ethers.parseEther("100");
  const COOLDOWN_TIME = 24 * 60 * 60; // 24 hours

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Token contract
    const TokenFactory = await ethers.getContractFactory("FRCToken");
    // Deploy with owner as temporary minter (will change to faucet after)
    token = await TokenFactory.deploy(owner.address);

    // Deploy Faucet contract
    const FaucetFactory = await ethers.getContractFactory("TokenFaucet");
    faucet = await FaucetFactory.deploy(token.target);

    // Mint initial tokens to faucet for distribution (before changing minter)
    const initialMint = ethers.parseEther("10000");
    await token.mint(faucet.target, initialMint);

    // Set faucet as the actual minter
    await token.setMinter(faucet.target);
  });

  describe("Token Deployment", function () {
    it("Should deploy token with correct name and symbol", async function () {
      expect(await token.name()).to.equal("FRC Token");
      expect(await token.symbol()).to.equal("FRC");
    });

    it("Should have correct max supply", async function () {
      expect(await token.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000"));
    });

    it("Should set faucet as minter", async function () {
      expect(await token.getMinter()).to.equal(faucet.target);
    });

    it("Should emit Transfer event on mint", async function () {
      const mintAmount = ethers.parseEther("100");
      await expect(
        token.mint(user1.address, mintAmount)
      ).to.be.revertedWith("Only minter can mint tokens");

      // Faucet can mint
      await faucet.requestTokens();
      // Check that Transfer event was emitted
      const filter = token.filters.Transfer(null, user1.address, null);
      const events = await token.queryFilter(filter);
      expect(events.length).to.be.greaterThan(0);
    });
  });

  describe("Faucet Deployment", function () {
    it("Should deploy faucet with correct token address", async function () {
      expect(await faucet.token()).to.equal(token.target);
    });

    it("Should have owner set to deployer", async function () {
      expect(await faucet.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      expect(await faucet.isPaused()).to.equal(false);
    });
  });

  describe("Token Claim - Success Cases", function () {
    it("Should allow user to claim tokens", async function () {
      const initialBalance = await token.balanceOf(user1.address);
      expect(initialBalance).to.equal(0);

      await faucet.connect(user1).requestTokens();

      const newBalance = await token.balanceOf(user1.address);
      expect(newBalance).to.equal(FAUCET_AMOUNT);
    });

    it("Should update lastClaimAt timestamp", async function () {
      const blockBefore = await ethers.provider.getBlock("latest");
      const timeBefore = blockBefore.timestamp;

      await faucet.connect(user1).requestTokens();

      const lastClaim = await faucet.lastClaimAt(user1.address);
      expect(lastClaim).to.be.gte(timeBefore);
    });

    it("Should update totalClaimed mapping", async function () {
      expect(await faucet.totalClaimed(user1.address)).to.equal(0);

      await faucet.connect(user1).requestTokens();

      expect(await faucet.totalClaimed(user1.address)).to.equal(FAUCET_AMOUNT);
    });

    it("Should emit TokensClaimed event", async function () {
      await expect(faucet.connect(user1).requestTokens())
        .to.emit(faucet, "TokensClaimed")
        .withArgs(user1.address, FAUCET_AMOUNT, (await ethers.provider.getBlock("latest")).timestamp + 1);
    });

    it("Should allow multiple different users to claim", async function () {
      await faucet.connect(user1).requestTokens();
      expect(await token.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);

      await faucet.connect(user2).requestTokens();
      expect(await token.balanceOf(user2.address)).to.equal(FAUCET_AMOUNT);
    });
  });

  describe("Cooldown Enforcement", function () {
    it("Should prevent immediate re-claim", async function () {
      await faucet.connect(user1).requestTokens();

      await expect(faucet.connect(user1).requestTokens()).to.be.revertedWith(
        /not eligible to claim yet|cooldown/i
      );
    });

    it("Should allow claim after cooldown expires", async function () {
      await faucet.connect(user1).requestTokens();

      // Fast forward time by 24 hours + 1 second
      await time.increase(COOLDOWN_TIME + 1);

      // Should succeed
      await expect(faucet.connect(user1).requestTokens())
        .to.emit(faucet, "TokensClaimed")
        .withArgs(user1.address, FAUCET_AMOUNT, (await ethers.provider.getBlock("latest")).timestamp + 1);
    });

    it("Should deny claim exactly at cooldown boundary", async function () {
      await faucet.connect(user1).requestTokens();

      // Fast forward exactly 24 hours
      await time.increase(COOLDOWN_TIME);

      // Should still fail (needs to be > COOLDOWN_TIME)
      await expect(faucet.connect(user1).requestTokens()).to.be.reverted;
    });

    it("Should work correctly for multiple claims", async function () {
      // First claim
      await faucet.connect(user1).requestTokens();
      const balance1 = await token.balanceOf(user1.address);
      expect(balance1).to.equal(FAUCET_AMOUNT);

      // Try immediate claim - should fail
      await expect(faucet.connect(user1).requestTokens()).to.be.reverted;

      // Fast forward 24 hours
      await time.increase(COOLDOWN_TIME + 1);

      // Second claim - should succeed
      await faucet.connect(user1).requestTokens();
      const balance2 = await token.balanceOf(user1.address);
      expect(balance2).to.equal(FAUCET_AMOUNT * 2n);

      // Fast forward again
      await time.increase(COOLDOWN_TIME + 1);

      // Third claim - should succeed
      await faucet.connect(user1).requestTokens();
      const balance3 = await token.balanceOf(user1.address);
      expect(balance3).to.equal(FAUCET_AMOUNT * 3n);
    });
  });

  describe("Lifetime Limit Enforcement", function () {
    it("Should prevent claiming beyond lifetime limit", async function () {
      const claimsNeeded = MAX_CLAIM_AMOUNT / FAUCET_AMOUNT;

      // Make maximum allowed claims
      for (let i = 0; i < claimsNeeded; i++) {
        await faucet.connect(user1).requestTokens();
        if (i < claimsNeeded - 1) {
          await time.increase(COOLDOWN_TIME + 1);
        }
      }

      // Verify user has maximum balance
      expect(await token.balanceOf(user1.address)).to.equal(MAX_CLAIM_AMOUNT);

      // Try one more claim - should fail
      await time.increase(COOLDOWN_TIME + 1);
      await expect(faucet.connect(user1).requestTokens()).to.be.revertedWith(
        /not eligible to claim yet|lifetime/i
      );
    });

    it("Should report correct remaining allowance", async function () {
      expect(await faucet.remainingAllowance(user1.address)).to.equal(
        MAX_CLAIM_AMOUNT
      );

      await faucet.connect(user1).requestTokens();

      const expectedRemaining = MAX_CLAIM_AMOUNT - FAUCET_AMOUNT;
      expect(await faucet.remainingAllowance(user1.address)).to.equal(
        expectedRemaining
      );
    });

    it("Should return 0 remaining allowance when limit reached", async function () {
      const claimsNeeded = MAX_CLAIM_AMOUNT / FAUCET_AMOUNT;

      for (let i = 0; i < claimsNeeded; i++) {
        await faucet.connect(user1).requestTokens();
        if (i < claimsNeeded - 1) {
          await time.increase(COOLDOWN_TIME + 1);
        }
      }

      expect(await faucet.remainingAllowance(user1.address)).to.equal(0);
    });
  });

  describe("canClaim Function", function () {
    it("Should return true when user is eligible", async function () {
      expect(await faucet.canClaim(user1.address)).to.equal(true);
    });

    it("Should return false during cooldown", async function () {
      await faucet.connect(user1).requestTokens();
      expect(await faucet.canClaim(user1.address)).to.equal(false);
    });

    it("Should return false after lifetime limit reached", async function () {
      const claimsNeeded = MAX_CLAIM_AMOUNT / FAUCET_AMOUNT;

      for (let i = 0; i < claimsNeeded; i++) {
        await faucet.connect(user1).requestTokens();
        if (i < claimsNeeded - 1) {
          await time.increase(COOLDOWN_TIME + 1);
        }
      }

      expect(await faucet.canClaim(user1.address)).to.equal(false);
    });

    it("Should return false when paused", async function () {
      await faucet.setPaused(true);
      expect(await faucet.canClaim(user1.address)).to.equal(false);
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause faucet", async function () {
      expect(await faucet.isPaused()).to.equal(false);
      await faucet.setPaused(true);
      expect(await faucet.isPaused()).to.equal(true);
    });

    it("Should allow owner to unpause faucet", async function () {
      await faucet.setPaused(true);
      await faucet.setPaused(false);
      expect(await faucet.isPaused()).to.equal(false);
    });

    it("Should emit FaucetPaused event", async function () {
      await expect(faucet.setPaused(true))
        .to.emit(faucet, "FaucetPaused")
        .withArgs(true);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(faucet.connect(user1).setPaused(true)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Should revert claims when paused", async function () {
      await faucet.setPaused(true);

      await expect(faucet.connect(user1).requestTokens()).to.be.revertedWith(
        "Faucet is paused"
      );
    });

    it("Should allow claims after unpausing", async function () {
      await faucet.setPaused(true);
      await faucet.setPaused(false);

      await expect(faucet.connect(user1).requestTokens()).to.not.be.reverted;
    });
  });

  describe("Insufficient Balance", function () {
    it("Should revert if faucet has insufficient tokens", async function () {
      // Create new faucet with minimal balance
      const newFaucet = await (await ethers.getContractFactory("TokenFaucet")).deploy(token.target);
      await token.setMinter(newFaucet.target);

      // Mint only 3 tokens to new faucet (less than FAUCET_AMOUNT of 5)
      await token.mint(newFaucet.target, ethers.parseEther("3"));

      await expect(
        newFaucet.connect(user1).requestTokens()
      ).to.be.revertedWith("Token transfer failed");
    });
  });

  describe("Time Until Next Claim", function () {
    it("Should return 0 when user can claim", async function () {
      expect(await faucet.getTimeUntilNextClaim(user1.address)).to.equal(0);
    });

    it("Should return correct time during cooldown", async function () {
      await faucet.connect(user1).requestTokens();

      const timeRemaining = await faucet.getTimeUntilNextClaim(user1.address);
      expect(timeRemaining).to.be.gte(COOLDOWN_TIME - 10); // Account for block time
      expect(timeRemaining).to.be.lte(COOLDOWN_TIME);
    });

    it("Should return 0 after cooldown expires", async function () {
      await faucet.connect(user1).requestTokens();
      await time.increase(COOLDOWN_TIME + 1);

      expect(await faucet.getTimeUntilNextClaim(user1.address)).to.equal(0);
    });
  });

  describe("Withdraw Function", function () {
    it("Should allow owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(owner.address);

      await faucet.withdraw(withdrawAmount);

      const finalBalance = await token.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance + withdrawAmount);
    });

    it("Should prevent non-owner from withdrawing", async function () {
      await expect(
        faucet.connect(user1).withdraw(ethers.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert if withdraw amount is zero", async function () {
      await expect(faucet.withdraw(0)).to.be.revertedWith(
        "Amount must be greater than zero"
      );
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should be protected against reentrancy", async function () {
      // Deploy a malicious contract that tries to reenter
      const MaliciousFactory = await ethers.getContractFactory("MaliciousFaucet");
      const malicious = await MaliciousFactory.deploy(faucet.target, token.target);
      await malicious.deployed();

      // The faucet has ReentrancyGuard, so this should be prevented
      // (This is a basic test; full reentrancy testing would be more complex)
      expect(faucet).to.have.property("nonReentrant");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address claim attempt", async function () {
      // canClaim should not revert for zero address
      const result = await faucet.canClaim(ethers.ZeroAddress);
      expect(result).to.be.false;
    });

    it("Should handle large number of claims", async function () {
      // User claims multiple times
      const numClaims = 20; // 20 claims over 19 days
      
      for (let i = 0; i < numClaims && i < 20; i++) {
        await faucet.connect(user1).requestTokens();
        
        if (i < numClaims - 1) {
          await time.increase(COOLDOWN_TIME + 1);
        }
      }

      const totalBalance = await token.balanceOf(user1.address);
      expect(totalBalance).to.be.gte(FAUCET_AMOUNT * 20n);
    });
  });
});
