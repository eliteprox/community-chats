# Deployment Guide

Complete guide for deploying Community Chats to production with secure keystore management.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Keystore Setup](#keystore-setup)
3. [Smart Contract Deployment](#smart-contract-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [ArWeave Deployment](#arweave-deployment)
6. [Gun.js Relay Setup](#gunjs-relay-setup)
7. [Configuration](#configuration)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+
- MetaMask wallet with ETH on Arbitrum
- ArWeave wallet with AR tokens (for permanent hosting)
- Etherscan API key (optional, for verification)

## Keystore Setup

### Why Use Keystore?

**Keystore** (encrypted JSON wallet) is more secure than storing private keys in `.env`:

| Method | Security | Use Case |
|--------|----------|----------|
| **Private Key** | ⚠️ Low | Local testing only |
| **Keystore** | ✅ High | Production deployments |
| **Hardware Wallet** | ✅✅ Highest | High-value mainnet |

### Creating a Keystore

**Option 1: Use Our Tool**

```bash
npm run create-keystore
```

Follow the prompts:
```
🔐 Keystore Creation Tool
========================

Enter your private key (with 0x prefix): 0x...
Enter a strong password: ********
Confirm password: ********
Output path (default: ./keystore.json): 

✅ Keystore created at ./keystore.json
   Address: 0x...
```

**Option 2: From MetaMask**

1. Open MetaMask → Account details
2. Click "Export Private Key"
3. Enter MetaMask password
4. Copy private key
5. Run `npm run create-keystore` and paste it

**Option 3: Using ethers CLI**

```bash
npx ethers-wallet create keystore.json
```

### Securing Your Keystore

```bash
# Set proper permissions (Unix/Linux/Mac)
chmod 600 keystore.json

# Verify it's not in git (already in .gitignore)
cat .gitignore | grep keystore.json
```

**⚠️ IMPORTANT:** Never commit keystore files to git!

### Configure Environment

Create `.env` in project root:

```bash
# Keystore (recommended)
KEYSTORE_PATH=./keystore.json
KEYSTORE_PASSWORD=your_strong_password

# Or use private key (testing only)
# PRIVATE_KEY=0x...

# Network configuration
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# API keys
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Smart Contract Deployment

### Step 1: Compile Contracts

```bash
npm run compile
```

Verifies both `CommunityAccess.sol` and `MeetingScheduler.sol` compile successfully.

### Step 2: Deploy to Testnet

```bash
npm run deploy:arbitrum-testnet
```

Expected output:
```
✅ Using keystore file for deployment
Deploying with account: 0x...
Account balance: 0.049 ETH

Deploying CommunityAccess...
CommunityAccess deployed to: 0x...

Deploying MeetingScheduler...
MeetingScheduler deployed to: 0x...

📝 Add these to your .env files:
COMMUNITY_ACCESS_CONTRACT=0x...
MEETING_SCHEDULER_CONTRACT=0x...
```

### Step 3: Deploy to Mainnet

**⚠️ Use testnet first! Only deploy to mainnet after thorough testing.**

```bash
npm run deploy:arbitrum
```

### Step 4: Verify Contracts

Verify on Arbiscan for transparency:

```bash
# Verify CommunityAccess
npx hardhat verify --network arbitrum <COMMUNITY_ACCESS_ADDRESS>

# Verify MeetingScheduler
npx hardhat verify --network arbitrum <MEETING_SCHEDULER_ADDRESS>
```

Or manually:
1. Go to https://arbiscan.io/address/<CONTRACT_ADDRESS>#code
2. Click "Verify and Publish"
3. Upload contract source

### Step 5: Save Contract Addresses

Update environment files:

**Root `.env`:**
```bash
COMMUNITY_ACCESS_CONTRACT=0x...
MEETING_SCHEDULER_CONTRACT=0x...
```

**Frontend `.env`:**
```bash
VITE_COMMUNITY_ACCESS_CONTRACT=0x...
VITE_MEETING_SCHEDULER_CONTRACT=0x...
```

## Frontend Deployment

### Option 1: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
cd frontend
npm run build
vercel --prod
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
cd frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Option 3: IPFS

```bash
# Install IPFS
# https://docs.ipfs.io/install/

# Build frontend
cd frontend
npm run build

# Add to IPFS
ipfs add -r dist/

# Pin to ensure availability
ipfs pin add <IPFS_HASH>

# Access at: https://ipfs.io/ipfs/<IPFS_HASH>
```

### Option 4: ArWeave (Recommended)

See [ArWeave Deployment](#arweave-deployment) section below.

## ArWeave Deployment

### Why ArWeave?

- **Permanent storage:** Pay once, hosted forever
- **Censorship-resistant:** No one can take it down
- **No ongoing costs:** ~$0.01-0.05 one-time payment
- **Decentralized CDN:** Multiple gateways worldwide

### Setup ArWeave Wallet

1. **Get ArWeave Wallet**
   ```bash
   # Download from https://arweave.app
   mv ~/Downloads/arweave-keyfile.json ./arweave-wallet.json
   chmod 600 arweave-wallet.json
   ```

2. **Fund Wallet**
   - **Testnet:** https://faucet.arweave.net
   - **Mainnet:** Purchase AR tokens from exchanges

3. **Configure Environment**
   ```bash
   # Root .env
   ARWEAVE_WALLET_PATH=./arweave-wallet.json
   ```

### Deploy to ArWeave

```bash
# Build frontend for ArWeave
cd frontend
npm run build:arweave

# Deploy to ArWeave
cd ..
npm run deploy:arweave
```

**Output:**
```
📦 Deploying to ArWeave...
✅ All files uploaded
✅ Manifest created
📝 Deployment info saved to: arweave-deployment.json

Your app is now live at:
https://arweave.net/[MANIFEST_TX_ID]

View on explorer:
https://viewblock.io/arweave/tx/[MANIFEST_TX_ID]
```

### Access Your App

After deployment (confirmation takes 5-10 minutes):
- **Primary:** `https://arweave.net/[MANIFEST_TX_ID]`
- **Alternative gateways:**
  - `https://ar.io/[MANIFEST_TX_ID]`
  - `https://g8way.io/[MANIFEST_TX_ID]`

### Custom Domain

**Option 1: ArNS (ArWeave Name Service)**
1. Go to https://arns.app
2. Register a name (e.g., `community-chats`)
3. Point to your manifest TX ID
4. Access at: `https://community-chats.arweave.dev`

**Option 2: Traditional DNS**
```
CNAME: your-domain.com -> arweave.net
```
Then use path: `https://your-domain.com/[MANIFEST_TX_ID]`

### Update Your App

To deploy updates:
```bash
cd frontend
npm run build:arweave
cd ..
npm run deploy:arweave
```

**Note:** Previous versions remain at their original TX IDs (immutable).

## Gun.js Relay Setup

### Why Run a Relay?

Gun.js relays enable:
- Real-time participant discovery across browsers/devices
- P2P signaling for WebRTC
- Chat message synchronization

Without a relay:
- ❌ Works only in same browser (different tabs)
- ❌ No cross-device discovery
- ✅ Still works with localStorage fallback

### Local Development

```bash
# Start local relay
npm run gun-relay
```

Output:
```
🚀 Gun.js Relay Server Started
Port: 8765
WebSocket URL: ws://localhost:8765/gun
```

Configure frontend:
```bash
# frontend/.env
VITE_GUN_RELAY_URL=http://localhost:8765/gun
```

### Production Deployment

**Option 1: Railway.app (Recommended)**

1. Create `gun-relay.js` (already included in project)
2. Create account at https://railway.app
3. Create new project
4. Connect GitHub repository
5. Select `gun-relay.js` as entry point
6. Deploy

Your relay URL: `https://your-app.railway.app/gun`

**Option 2: Render.com**

1. Create account at https://render.com
2. Create new Web Service
3. Point to your repository
4. Start command: `node gun-relay-server.js`
5. Deploy

**Option 3: Your Own VPS**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Gun
npm install gun

# Run with PM2 for auto-restart
npm install -g pm2
pm2 start gun-relay-server.js
pm2 save
pm2 startup
```

**Option 4: Docker**

```yaml
# docker-compose.yml
version: '3.8'
services:
  gun-relay:
    build: .
    ports:
      - "8765:8765"
    restart: unless-stopped
```

```bash
docker-compose up -d
```

### Configure Frontend

Update `frontend/.env` with your relay URL:

```bash
# Development
VITE_GUN_RELAY_URL=http://localhost:8765/gun

# Production
VITE_GUN_RELAY_URL=https://your-relay.railway.app/gun
```

### Multiple Relays (Recommended)

For redundancy, configure multiple relays:

```typescript
// frontend/src/services/decentralized-signaling.ts
this.gun = Gun({
  peers: [
    'https://gun-relay-1.railway.app/gun',  // Your primary
    'https://gun-relay-2.render.com/gun',   // Your backup
    'https://gun-manhattan.herokuapp.com/gun', // Public
  ],
  localStorage: true,  // Fallback if all relays down
  radisk: true,
});
```

## Configuration

### Environment Variables Reference

**Root `.env`:**
```bash
# Deployment method (choose one)
KEYSTORE_PATH=./keystore.json
KEYSTORE_PASSWORD=your_password
# OR
# PRIVATE_KEY=0x...

# Network configuration
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Contract addresses
COMMUNITY_ACCESS_CONTRACT=0x...
MEETING_SCHEDULER_CONTRACT=0x...

# API keys
ETHERSCAN_API_KEY=your_key

# ArWeave
ARWEAVE_WALLET_PATH=./arweave-wallet.json
```

**Frontend `.env`:**
```bash
# Network
VITE_ARBITRUM_CHAIN_ID=42161
VITE_ARBITRUM_TESTNET_CHAIN_ID=421614
VITE_ENABLE_TESTNET=false

# Contracts
VITE_COMMUNITY_ACCESS_CONTRACT=0x...
VITE_MEETING_SCHEDULER_CONTRACT=0x...

# Gun.js relay
VITE_GUN_RELAY_URL=https://your-relay.railway.app/gun

# API keys
VITE_ETHERSCAN_API_KEY=your_key

# Optional: Default streaming URLs
VITE_DEFAULT_WHIP_URL=
VITE_DEFAULT_RTMP_URL=
```

## Verification

### Smart Contract Verification

**On Arbiscan:**
1. Visit https://arbiscan.io/address/<CONTRACT_ADDRESS>
2. Check contract is verified (green checkmark)
3. Read contract functions work
4. Review transaction history

**Test Transactions:**
```bash
# Using Hardhat console
npx hardhat console --network arbitrum

> const contract = await ethers.getContractAt("CommunityAccess", "0x...");
> await contract.hasAccess(0, "0x...");
```

### Frontend Verification

**Test Checklist:**

1. **Wallet Connection**
   - ✅ MetaMask popup appears
   - ✅ Connected to Arbitrum network
   - ✅ Address displays correctly
   - ✅ ENS name resolves (if available)

2. **Contract Interaction**
   - ✅ Create a community
   - ✅ Add participants
   - ✅ Check contract on Arbiscan
   - ✅ Livepeer registration check works

3. **Meeting Features**
   - ✅ Schedule meeting
   - ✅ Meeting appears on blockchain
   - ✅ Join meeting (host)
   - ✅ Join meeting (participant)
   - ✅ Cross-browser visibility

4. **Audio Features**
   - ✅ Microphone access granted
   - ✅ Audio levels show
   - ✅ Mute/unmute works
   - ✅ Speaking detection works
   - ✅ Multiple participants audio mixes

5. **P2P Features**
   - ✅ Gun.js relay connects
   - ✅ Participants appear in real-time
   - ✅ Chat messages sync
   - ✅ Participant leave detected

6. **Streaming**
   - ✅ WHIP URL configurable
   - ✅ RTMP URL configurable
   - ✅ Start streaming works
   - ✅ External ingest receives stream

### ArWeave Verification

```bash
# Check deployment info
cat arweave-deployment.json

# Verify all files are accessible
curl https://arweave.net/[MANIFEST_TX_ID]
curl https://arweave.net/[MANIFEST_TX_ID]/assets/index.js
```

## Troubleshooting

### Keystore Issues

**Problem:** "Failed to decrypt keystore"
```bash
# Solution: Verify password is correct
# Try interactive mode (no KEYSTORE_PASSWORD in .env)
unset KEYSTORE_PASSWORD
npm run deploy:arbitrum-testnet
# Will prompt for password
```

**Problem:** "Keystore file not found"
```bash
# Solution: Check path
ls -la keystore.json
# Update KEYSTORE_PATH in .env
```

**Problem:** "Insufficient funds"
```bash
# Solution: Add ETH to wallet
# Check balance on Arbiscan
# Get testnet ETH: https://faucet.quicknode.com/arbitrum/sepolia
```

### Deployment Issues

**Problem:** Contract deployment fails
```bash
# Check gas price
npx hardhat run scripts/check-gas-price.ts --network arbitrum

# Increase gas limit in hardhat.config.ts
networks: {
  arbitrum: {
    gas: 10000000,
    gasPrice: 'auto',
  }
}
```

**Problem:** "Transaction underpriced"
```bash
# Wait a few minutes and retry
# Or increase gas price multiplier
```

**Problem:** Frontend build fails
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules dist .vite
npm install
npm run build
```

### ArWeave Issues

**Problem:** "Insufficient balance"
```bash
# Check AR balance
# Mainnet: Purchase AR tokens
# Testnet: https://faucet.arweave.net
```

**Problem:** "Upload failed"
```bash
# Retry deployment (idempotent)
npm run deploy:arweave

# Check ArWeave gateway status
curl https://arweave.net/info
```

**Problem:** Files not loading
```bash
# Wait 5-10 minutes for confirmation
# Try alternative gateway:
# https://ar.io/[TX_ID]
# https://g8way.io/[TX_ID]
```

### Gun.js Relay Issues

**Problem:** Relay not connecting
```bash
# Test relay endpoint
curl http://localhost:8765/gun

# Check relay logs
npm run gun-relay
# Should show: "Gun.js Relay Server Started"
```

**Problem:** Cross-browser sync not working
```bash
# Verify relay URL in frontend/.env
echo $VITE_GUN_RELAY_URL

# Test from browser console
const gun = Gun({ peers: ['http://localhost:8765/gun'] });
gun.get('test').put({ hello: 'world' });
gun.get('test').on(data => console.log(data));
```

**Problem:** High latency
```bash
# Deploy relay closer to users
# Use multiple relays for redundancy
# Enable localStorage fallback
```

### Network Issues

**Problem:** Wrong network
```bash
# Verify network in MetaMask
# App will prompt to switch to Arbitrum
# Check chainId in frontend/.env
```

**Problem:** RPC errors
```bash
# Try alternative RPC
# Arbitrum: https://arb1.arbitrum.io/rpc
# Or use Alchemy/Infura
```

## Security Best Practices

### ✅ Do

- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Store keystore outside git repository
- Use different wallets for dev/staging/production
- Back up keystore securely
- Test on testnet before mainnet
- Verify contracts on Arbiscan
- Use hardware wallet for high-value mainnet deployments

### ❌ Don't

- Commit keystore or private keys to git
- Use same wallet for testing and production
- Share keystore files
- Store passwords in plain text
- Skip testnet testing
- Use weak passwords

## Cost Summary

### One-Time Deployment Costs

| Item | Cost |
|------|------|
| CommunityAccess deployment | ~$2 |
| MeetingScheduler deployment | ~$2 |
| ArWeave upload | ~$0.05 |
| **Total** | **~$4** |

### Per-Use Costs

| Action | Cost |
|--------|------|
| Create meeting | ~$0.01 |
| Join meeting | ~$0.003 |
| Audio/Chat | $0 (P2P) |

### Monthly Costs

| Service | Cost |
|---------|------|
| ArWeave hosting | $0 (permanent) |
| Gun relay | $0-5 (free tier available) |
| Smart contracts | $0 (pay per use) |
| **Total** | **$0-5/month** |

## Monitoring

### Smart Contracts

Monitor on Arbiscan:
- Transactions: `https://arbiscan.io/address/<CONTRACT_ADDRESS>`
- Events: Check `MeetingCreated`, `ParticipantAdded` events
- Gas usage: Track deployment and transaction costs

### Frontend

Use ArWeave analytics:
- Transaction confirmations
- File availability
- Gateway performance
- Access patterns

### Gun.js Relay

Monitor relay health:
```bash
# Check relay is running
curl http://your-relay.com/gun

# Monitor logs (if self-hosted)
pm2 logs gun-relay
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install && cd frontend && npm install
      
      - name: Create keystore
        run: echo "${{ secrets.KEYSTORE_JSON }}" > keystore.json
      
      - name: Deploy contracts
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          ARBITRUM_RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
        run: npm run deploy:arbitrum
      
      - name: Build frontend
        run: cd frontend && npm run build:arweave
      
      - name: Deploy to ArWeave
        env:
          ARWEAVE_WALLET: ${{ secrets.ARWEAVE_WALLET }}
        run: |
          echo "$ARWEAVE_WALLET" > arweave-wallet.json
          npm run deploy:arweave
```

Store in GitHub Secrets:
- `KEYSTORE_JSON`: Full keystore.json content
- `KEYSTORE_PASSWORD`: Your keystore password
- `ARBITRUM_RPC_URL`: RPC endpoint
- `ARWEAVE_WALLET`: Full arweave-wallet.json content

## Rollback Strategy

### Smart Contracts

Contracts are immutable. To "rollback":
1. Deploy new version
2. Update frontend to use new address
3. Migrate data if needed
4. Keep old contract addresses for history

### Frontend

**ArWeave:**
- Previous versions remain at their TX IDs
- Update links to point to previous manifest
- No need to redeploy

**Traditional hosting:**
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

## Support Resources

- **Hardhat Documentation:** https://hardhat.org/docs
- **Arbitrum Developer Docs:** https://docs.arbitrum.io
- **ArWeave Documentation:** https://docs.arweave.org
- **Gun.js Documentation:** https://gun.eco/docs
- **Etherscan API:** https://docs.etherscan.io/etherscan-v2/

## Checklist

Before going live:

- [ ] Smart contracts deployed to mainnet
- [ ] Contracts verified on Arbiscan
- [ ] Frontend built successfully
- [ ] Environment variables configured
- [ ] Gun.js relay deployed
- [ ] ArWeave deployment complete
- [ ] Wallet connection tested
- [ ] ENS resolution tested
- [ ] Audio capture tested
- [ ] Multi-user meeting tested
- [ ] Streaming tested (if used)
- [ ] Mobile responsive verified
- [ ] Browser compatibility tested
- [ ] Monitoring setup
- [ ] Backup plan documented

---

**Your fully decentralized application is ready for production! 🚀**

For questions or issues, review the [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details or open an issue on GitHub.
