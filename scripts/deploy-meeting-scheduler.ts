import { ethers } from "hardhat";
import { getDeploymentSigner } from "./utils/keystore";

async function main() {
  console.log("Deploying MeetingScheduler contract...");

  // Use keystore or private key
  const signer = await getDeploymentSigner(ethers.provider);
  console.log("Deploying with account:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy MeetingScheduler (no constructor parameters needed)
  const MeetingScheduler = await ethers.getContractFactory("MeetingScheduler", signer);
  const meetingScheduler = await MeetingScheduler.deploy();

  await meetingScheduler.waitForDeployment();

  const address = await meetingScheduler.getAddress();
  console.log("MeetingScheduler deployed to:", address);

  // Save deployment info
  console.log("\n📝 Add these to your .env files:");
  console.log("\nRoot .env:");
  console.log(`MEETING_SCHEDULER_CONTRACT=${address}`);
  console.log("\nFrontend .env:");
  console.log(`VITE_MEETING_SCHEDULER_CONTRACT=${address}`);

  console.log("\n✅ Deployment complete!");
  console.log("\nNow meetings will be stored on-chain and visible across all browsers!");
  console.log("\nNote: Access control is handled by the frontend using CommunityAccess contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

