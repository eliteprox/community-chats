import { ethers } from "hardhat";

async function main() {
  console.log("Deploying CommunityAccess contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy CommunityAccess
  const CommunityAccess = await ethers.getContractFactory("CommunityAccess");
  const communityAccess = await CommunityAccess.deploy();

  await communityAccess.waitForDeployment();

  const address = await communityAccess.getAddress();
  console.log("CommunityAccess deployed to:", address);

  // Save deployment info
  console.log("\n📝 Add this to your .env file:");
  console.log(`COMMUNITY_ACCESS_CONTRACT=${address}`);
  console.log(`VITE_COMMUNITY_ACCESS_CONTRACT=${address}`);

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

