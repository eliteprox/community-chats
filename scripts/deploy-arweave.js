import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

// File extensions to deploy
const DEPLOYABLE_EXTENSIONS = [
  '.html',
  '.js',
  '.css',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];

async function loadWallet() {
  const walletPath = process.env.ARWEAVE_WALLET_PATH || './arweave-wallet.json';
  
  if (!fs.existsSync(walletPath)) {
    throw new Error(
      `Arweave wallet not found at ${walletPath}. Please set ARWEAVE_WALLET_PATH environment variable.`
    );
  }

  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  return wallet;
}

async function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

async function uploadFile(wallet, filePath, relativePath) {
  try {
    const data = fs.readFileSync(filePath);
    const contentType = await getContentType(filePath);

    const transaction = await arweave.createTransaction({ data }, wallet);
    transaction.addTag('Content-Type', contentType);
    transaction.addTag('App-Name', 'Community Chats');
    transaction.addTag('App-Version', '1.0.0');
    transaction.addTag('File-Path', relativePath);

    await arweave.transactions.sign(transaction, wallet);
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200) {
      console.log(`✅ Uploaded: ${relativePath}`);
      console.log(`   TX ID: ${transaction.id}`);
      console.log(`   URL: https://arweave.net/${transaction.id}`);
      return {
        path: relativePath,
        txId: transaction.id,
        url: `https://arweave.net/${transaction.id}`,
      };
    } else {
      console.error(`❌ Failed to upload: ${relativePath}`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error uploading ${relativePath}:`, error.message);
    return null;
  }
}

async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath, baseDir)));
    } else {
      const ext = path.extname(entry.name);
      if (DEPLOYABLE_EXTENSIONS.includes(ext)) {
        files.push({ fullPath, relativePath });
      }
    }
  }

  return files;
}

async function createManifest(wallet, deployedFiles) {
  const manifest = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    index: {
      path: 'index.html',
    },
    paths: {},
  };

  // Map files to their transaction IDs
  deployedFiles.forEach((file) => {
    if (file) {
      manifest.paths[file.path] = { id: file.txId };
    }
  });

  // Upload manifest
  const manifestData = JSON.stringify(manifest);
  const transaction = await arweave.createTransaction({ data: manifestData }, wallet);
  transaction.addTag('Content-Type', 'application/x.arweave-manifest+json');
  transaction.addTag('App-Name', 'Community Chats');
  transaction.addTag('App-Version', '1.0.0');
  transaction.addTag('Type', 'manifest');

  await arweave.transactions.sign(transaction, wallet);
  const response = await arweave.transactions.post(transaction);

  if (response.status === 200) {
    console.log('\n🎉 Manifest uploaded successfully!');
    console.log(`   TX ID: ${transaction.id}`);
    console.log(`   URL: https://arweave.net/${transaction.id}`);
    return transaction.id;
  } else {
    throw new Error(`Failed to upload manifest: ${response.status}`);
  }
}

async function main() {
  console.log('🚀 Starting ArWeave deployment...\n');

  // Load wallet
  console.log('📄 Loading ArWeave wallet...');
  const wallet = await loadWallet();
  const address = await arweave.wallets.jwkToAddress(wallet);
  console.log(`   Wallet address: ${address}`);

  // Check balance
  const balance = await arweave.wallets.getBalance(address);
  const ar = arweave.ar.winstonToAr(balance);
  console.log(`   Balance: ${ar} AR\n`);

  if (parseFloat(ar) < 0.01) {
    console.warn('⚠️  Warning: Wallet balance is low. You may need more AR tokens.');
  }

  // Get build directory
  const buildDir = path.join(__dirname, '../frontend/dist');
  if (!fs.existsSync(buildDir)) {
    throw new Error(
      `Build directory not found at ${buildDir}. Please run 'npm run build' first.`
    );
  }

  // Get all files to upload
  console.log('📂 Scanning build directory...');
  const files = await getAllFiles(buildDir);
  console.log(`   Found ${files.length} files to upload\n`);

  // Upload files
  console.log('📤 Uploading files to ArWeave...\n');
  const deployedFiles = [];
  let uploadedCount = 0;

  for (const file of files) {
    const result = await uploadFile(wallet, file.fullPath, file.relativePath);
    if (result) {
      deployedFiles.push(result);
      uploadedCount++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Uploaded ${uploadedCount}/${files.length} files\n`);

  // Create and upload manifest
  console.log('📝 Creating manifest...');
  const manifestId = await createManifest(wallet, deployedFiles);

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    manifestId,
    manifestUrl: `https://arweave.net/${manifestId}`,
    files: deployedFiles,
    walletAddress: address,
  };

  const deploymentPath = path.join(__dirname, '../arweave-deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log('\n🎉 Deployment complete!');
  console.log(`\n🌐 Your app is now available at:`);
  console.log(`   https://arweave.net/${manifestId}`);
  console.log(`\n   Note: It may take a few minutes for the files to be available.`);
  console.log(`   Check status at: https://viewblock.io/arweave/tx/${manifestId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });

