import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { Wallet } from "ethers";

dotenv.config();

// Function to get accounts configuration
function getAccounts() {
  // Option 1: Use keystore file (more secure)
  if (process.env.KEYSTORE_PATH && process.env.KEYSTORE_PASSWORD) {
    try {
      const keystoreJson = fs.readFileSync(process.env.KEYSTORE_PATH, "utf8");
      const wallet = Wallet.fromEncryptedJsonSync(keystoreJson, process.env.KEYSTORE_PASSWORD);
      console.log("✅ Using keystore file for deployment");
      return [wallet.privateKey];
    } catch (error) {
      console.error("❌ Failed to decrypt keystore:", error);
      return [];
    }
  }
  
  // Option 2: Use raw private key
  if (process.env.PRIVATE_KEY) {
    return [process.env.PRIVATE_KEY];
  }
  
  return [];
}

const accounts = getAccounts();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: accounts,
      chainId: 42161,
    },
    arbitrumTestnet: {
      url: process.env.ARBITRUM_TESTNET_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: accounts,
      chainId: 421614,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ETHERSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

