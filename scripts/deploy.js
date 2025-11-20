const hre = require("hardhat");

async function main() {
  console.log("⚡ Starting ZeroTrade deployment...\n");

  // Get deployer signer
  const signers = await hre.ethers.getSigners();
  
  // Check if accounts are available
  if (signers.length === 0) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: No accounts available!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.error("Possible causes:");
    console.error("1. PRIVATE_KEY not set in .env file");
    console.error("2. PRIVATE_KEY is not 64 characters (hex format, without 0x)");
    console.error("3. .env file not found or not loaded properly\n");
    console.error("Solution:");
    console.error("1. Open .env file in root directory");
    console.error("2. Set PRIVATE_KEY=your_64_char_hex_key (without 0x prefix)");
    console.error("3. Set SEPOLIA_RPC_URL=your_rpc_url");
    console.error("4. Make sure your wallet has Sepolia ETH");
    console.error("   Get free Sepolia ETH: https://sepoliafaucet.com/\n");
    console.error("Example .env:");
    console.error("PRIVATE_KEY=abc123def456... (64 chars)");
    console.error("SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY");
    console.error("ETHERSCAN_API_KEY=your_key\n");
    process.exit(1);
  }
  
  const deployer = signers[0];
  
  console.log("📋 Deployment Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📦 Deploying ZeroTrade contract...");

  const ZeroTrade = await hre.ethers.getContractFactory("ZeroTrade");
  const marketplace = await ZeroTrade.deploy();
  
  await marketplace.waitForDeployment();
  const address = await marketplace.getAddress();

  console.log("✅ Contract deployed successfully!\n");
  
  console.log("📝 Contract Information:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract Address: ${address}`);
  console.log(`Platform Owner: ${await marketplace.platformOwner()}`);
  console.log(`Platform Fee: ${await marketplace.PLATFORM_FEE_PERCENT()}%`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("🔧 Configuration for frontend/.env:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (hre.network.name === "sepolia") {
    console.log("⏳ Waiting for block confirmations...");
    await marketplace.deploymentTransaction().wait(5);
    
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  console.log("\n✨ Deployment complete! Next steps:");
  console.log("1. Copy the contract address to frontend/.env");
  console.log("2. Run: cd frontend && npm install");
  console.log("3. Run: npm run dev");
  console.log("\n🎉 Happy trading with privacy on ZeroTrade!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
