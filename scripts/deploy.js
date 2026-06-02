const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(deployerBalance), "ETH");

  try {
    // Step 1: Deploy Token Contract
    console.log("\n--- Deploying Token Contract ---");
    const TokenFactory = await hre.ethers.getContractFactory("FRCToken");
    
    // Deploy with deployer as initial minter (will be changed to faucet later)
    const token = await TokenFactory.deploy(deployer.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("Token deployed to:", tokenAddress);

    // Step 2: Deploy Faucet Contract
    console.log("\n--- Deploying Faucet Contract ---");
    const FaucetFactory = await hre.ethers.getContractFactory("TokenFaucet");
    const faucet = await FaucetFactory.deploy(tokenAddress);
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    console.log("Faucet deployed to:", faucetAddress);

    // Step 3: Set Faucet as Minter
    console.log("\n--- Configuring Permissions ---");
    const setMinterTx = await token.setMinter(faucetAddress);
    await setMinterTx.wait();
    console.log("Faucet set as minter");

    // Step 4: Mint Initial Supply to Faucet
    console.log("\n--- Minting Initial Supply ---");
    const initialMint = hre.ethers.parseEther("100000"); // 100,000 tokens
    const mintTx = await token.mint(faucetAddress, initialMint);
    await mintTx.wait();
    console.log("Minted", hre.ethers.formatEther(initialMint), "tokens to faucet");

    // Verify minter
    const minter = await token.getMinter();
    console.log("Current minter:", minter);

    // Verify faucet balance
    const faucetBalance = await token.balanceOf(faucetAddress);
    console.log("Faucet balance:", hre.ethers.formatEther(faucetBalance), "tokens");

    // Step 5: Prepare Deployment Info
    console.log("\n--- Deployment Summary ---");
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        token: {
          address: tokenAddress,
          name: "FRCToken",
          maxSupply: hre.ethers.formatEther(await token.MAX_SUPPLY()),
        },
        faucet: {
          address: faucetAddress,
          name: "TokenFaucet",
          amount: hre.ethers.formatEther(await faucet.FAUCET_AMOUNT()),
          cooldown: (await faucet.COOLDOWN_TIME()).toString(),
          maxClaim: hre.ethers.formatEther(await faucet.MAX_CLAIM_AMOUNT()),
        },
      },
      initialBalance: hre.ethers.formatEther(faucetBalance),
    };

    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Step 6: Save Deployment Info
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = path.join(
      deploymentsDir,
      `${hre.network.name}-${Date.now()}.json`
    );
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", filename);

    // Also save latest deployment for frontend
    const latestFile = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("Latest deployment info saved to:", latestFile);

    // Step 7: Contract Verification (only for non-localhost)
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
      console.log("\n--- Verifying Contracts on Etherscan ---");
      console.log("Note: Verification requires ETHERSCAN_API_KEY");
      console.log("You can verify manually with:");
      console.log(
        `npx hardhat verify --network ${hre.network.name} ${tokenAddress} ${deployer.address}`
      );
      console.log(
        `npx hardhat verify --network ${hre.network.name} ${faucetAddress} ${tokenAddress}`
      );

      // Attempt automatic verification
      try {
        console.log("\nAttempting automatic verification...");
        
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [deployer.address],
          contract: "contracts/Token.sol:FRCToken",
        });
        console.log("Token verified successfully");
      } catch (error) {
        console.log("Token verification note:", error.message);
      }

      try {
        await hre.run("verify:verify", {
          address: faucetAddress,
          constructorArguments: [tokenAddress],
          contract: "contracts/TokenFaucet.sol:TokenFaucet",
        });
        console.log("Faucet verified successfully");
      } catch (error) {
        console.log("Faucet verification note:", error.message);
      }
    }

    console.log("\n✅ Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Copy the contract addresses to frontend .env file");
    console.log("2. Test the faucet on the testnet");
    console.log("3. Build the Docker image");

    return deploymentInfo;
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
