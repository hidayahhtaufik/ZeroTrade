const hre = require("hardhat");

async function main() {
  const contractAddress = "0xb35a478a14673F51FAf34aBd3917CeA3a6F2D446";
  
  console.log("🔍 Verifying ZeroTrade on Sepolia Etherscan...\n");
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments: [] (no constructor arguments)\n");

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    
    console.log("\n✅ Contract verified successfully!");
    console.log(`📝 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
      console.log(`📝 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else {
      console.error("\n❌ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
