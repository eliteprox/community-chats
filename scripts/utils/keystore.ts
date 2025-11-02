import { Wallet } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

/**
 * Load wallet from keystore file with password
 */
export async function loadKeystoreWallet(): Promise<Wallet> {
  const keystorePath = process.env.KEYSTORE_PATH || './keystore.json';
  
  // Check if keystore file exists
  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Keystore file not found at ${keystorePath}`);
  }

  // Read keystore file
  const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
  
  // Get password from environment or prompt
  let password = process.env.KEYSTORE_PASSWORD;
  
  if (!password) {
    password = await promptPassword();
  }

  try {
    // Decrypt wallet from keystore
    console.log('✅ Using keystore file for deployment');
    const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
    return wallet;
  } catch (error) {
    throw new Error('Failed to decrypt keystore. Check your password.');
  }
}

/**
 * Prompt user for password (if not in env)
 */
async function promptPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('🔐 Enter keystore password: ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

/**
 * Get signer for deployment (keystore or private key)
 */
export async function getDeploymentSigner(provider: any): Promise<Wallet> {
  // Try keystore first
  if (process.env.KEYSTORE_PATH || fs.existsSync('./keystore.json')) {
    const wallet = await loadKeystoreWallet();
    return wallet.connect(provider);
  }

  // Fall back to private key
  if (process.env.PRIVATE_KEY) {
    console.log('✅ Using private key from environment');
    return new Wallet(process.env.PRIVATE_KEY, provider);
  }

  throw new Error(
    'No deployment credentials found. Set KEYSTORE_PATH or PRIVATE_KEY in .env'
  );
}

/**
 * Create a new keystore file from private key
 */
export async function createKeystore(
  privateKey: string,
  password: string,
  outputPath: string = './keystore.json'
): Promise<void> {
  const wallet = new Wallet(privateKey);
  
  console.log('Creating encrypted keystore...');
  const encryptedJson = await wallet.encrypt(password, {
    scrypt: {
      N: 131072, // Higher security (slower)
    },
  });

  fs.writeFileSync(outputPath, encryptedJson);
  console.log(`✅ Keystore created at ${outputPath}`);
  console.log(`   Address: ${wallet.address}`);
}

