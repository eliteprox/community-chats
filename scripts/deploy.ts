import { ethers } from "hardhat";
import { getDeploymentSigner } from "./utils/keystore";

async function main() {
  console.log("Deploying contracts...");

  // Use keystore or private key
  const signer = await getDeploymentSigner(ethers.provider);
  console.log("Deploying with account:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy CommunityAccess
  console.log("\n📝 Deploying CommunityAccess...");
  const CommunityAccess = await ethers.getContractFactory("CommunityAccess", signer);
  const communityAccess = await CommunityAccess.deploy();

  await communityAccess.waitForDeployment();

  const communityAccessAddress = await communityAccess.getAddress();
  console.log("✅ CommunityAccess deployed to:", communityAccessAddress);

  // Deploy MeetingScheduler
  console.log("\n📝 Deploying MeetingScheduler...");
  const MeetingScheduler = await ethers.getContractFactory("MeetingScheduler", signer);
  const meetingScheduler = await MeetingScheduler.deploy();

  await meetingScheduler.waitForDeployment();

  const meetingSchedulerAddress = await meetingScheduler.getAddress();
  console.log("✅ MeetingScheduler deployed to:", meetingSchedulerAddress);

  // Save deployment info
  console.log("\n📝 Add these to your .env file:");
  console.log(`COMMUNITY_ACCESS_CONTRACT=${communityAccessAddress}`);
  console.log(`MEETING_SCHEDULER_CONTRACT=${meetingSchedulerAddress}`);
  console.log(`\nVITE_COMMUNITY_ACCESS_CONTRACT=${communityAccessAddress}`);
  console.log(`VITE_MEETING_SCHEDULER_CONTRACT=${meetingSchedulerAddress}`);

  console.log("\n✅ All contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

