# Deployment Guide

Complete guide for deploying Community Chats to production.

## Table of Contents

1. [Smart Contract Deployment](#smart-contract-deployment)
2. [Frontend Deployment](#frontend-deployment)
3. [ArWeave Deployment](#arweave-deployment)
4. [Configuration](#configuration)
5. [Verification](#verification)

## Smart Contract Deployment

### Prerequisites

- Node.js 18+
- Hardhat configured
- Private key with ETH for gas (Arbitrum)
- Arbiscan API key (optional, for verification)

### Deploy to Arbitrum Testnet

```bash
# Set up environment variables
cp .env.example .env
# Edit .env and add your PRIVATE_KEY and ARBITRUM_TESTNET_RPC_URL

# Deploy contract
npm run deploy:arbitrum-testnet
```

### Deploy to Arbitrum Mainnet

```bash
# Make sure you have mainnet configuration in .env
# PRIVATE_KEY=your_private_key
# ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
# ARBISCAN_API_KEY=your_arbiscan_api_key

# Deploy contract
npm run deploy:arbitrum

# Verify on Arbiscan (optional but recommended)
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS>
```

### Save Contract Address

After deployment, save the contract address:

```bash
# Add to .env
echo "COMMUNITY_ACCESS_CONTRACT=0x..." >> .env
echo "VITE_COMMUNITY_ACCESS_CONTRACT=0x..." >> frontend/.env
```

## Frontend Deployment

### Option 1: Traditional Hosting (Vercel/Netlify)

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
cd frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Option 2: IPFS

```bash
# Install IPFS CLI
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

### Option 3: ArWeave (Recommended for Full Decentralization)

See [arweave-setup.md](./arweave-setup.md) for detailed instructions.

Quick start:

```bash
# Build for ArWeave
cd frontend
npm run build:arweave

# Deploy to ArWeave
cd ..
npm run deploy:arweave
```

## ArWeave Deployment

### Setup

1. **Get ArWeave Wallet**
   ```bash
   # Download wallet from https://arweave.app
   mv ~/Downloads/arweave-keyfile.json ./arweave-wallet.json
   ```

2. **Fund Wallet**
   - Testnet: https://faucet.arweave.net
   - Mainnet: Purchase AR tokens

3. **Configure Environment**
   ```bash
   echo "ARWEAVE_WALLET_PATH=./arweave-wallet.json" >> .env
   ```

### Deploy

```bash
# Install dependencies
npm install

# Build frontend
cd frontend && npm run build:arweave && cd ..

# Deploy to ArWeave
npm run deploy:arweave
```

### Access App

After deployment:
- URL: `https://arweave.net/[MANIFEST_TX_ID]`
- Info saved to: `arweave-deployment.json`
- View on explorer: `https://viewblock.io/arweave/tx/[MANIFEST_TX_ID]`

### Custom Domain

Options:
1. **ArNS**: Register at https://arns.app
2. **DNS CNAME**: Point to ArWeave gateway
3. **Custom Gateway**: Use ar.io or g8way.io

## Configuration

### Environment Variables

Create `.env` files with these variables:

#### Root `.env`

```bash
# Blockchain
PRIVATE_KEY=your_private_key_here
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key

# Contracts
COMMUNITY_ACCESS_CONTRACT=0x...

# ArWeave
ARWEAVE_WALLET_PATH=./arweave-wallet.json
```

#### Frontend `.env`

```bash
# Network
VITE_ARBITRUM_CHAIN_ID=42161
VITE_ARBITRUM_TESTNET_CHAIN_ID=421614
VITE_ENABLE_TESTNET=false

# Contracts
VITE_COMMUNITY_ACCESS_CONTRACT=0x...

# Defaults
VITE_DEFAULT_WHIP_URL=
VITE_DEFAULT_RTMP_URL=
```

### Update Contract ABIs

If you modify the smart contract:

1. Recompile: `npm run compile`
2. Update ABI in `frontend/src/services/web3.ts`
3. Redeploy contract
4. Update contract address in environment variables

## Verification

### Smart Contract

Verify on Arbiscan:

```bash
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS>
```

Or manually:
1. Go to https://arbiscan.io/address/<CONTRACT_ADDRESS>#code
2. Click "Verify and Publish"
3. Upload contract source

### Frontend

Test deployed frontend:

1. **Wallet Connection**
   ```
   - Connect MetaMask
   - Switch to Arbitrum network
   - Verify address displays correctly
   ```

2. **Contract Interaction**
   ```
   - Create a community
   - Add participants
   - Check Livepeer registration
   ```

3. **Audio Features**
   ```
   - Join a meeting
   - Enable microphone
   - Check audio levels
   - Test mute/unmute
   ```

4. **Streaming**
   ```
   - Configure WHIP/RTMP URL
   - Start streaming
   - Verify external ingest
   ```

### Checklist

- [ ] Smart contract deployed to Arbitrum
- [ ] Contract verified on Arbiscan
- [ ] Frontend built successfully
- [ ] Environment variables configured
- [ ] Wallet connection works
- [ ] ENS resolution works
- [ ] Livepeer integration works
- [ ] Audio capture works
- [ ] Streaming to WHIP/RTMP works
- [ ] Calendar functions work
- [ ] Mobile responsive
- [ ] ArWeave deployment (if applicable)

## Monitoring

### Smart Contract

Monitor on Arbiscan:
- Transactions: `https://arbiscan.io/address/<CONTRACT_ADDRESS>`
- Events: Check `CommunityCreated`, `ParticipantAdded` events
- Gas usage: Track deployment and transaction costs

### Frontend

Track:
- User connections (wallet addresses)
- Meeting participation
- Streaming sessions
- Error rates

### ArWeave

Monitor:
- Transaction confirmations
- File availability
- Gateway performance
- Storage usage

## Rollback

If issues occur:

### Smart Contract

Contracts are immutable, so you cannot rollback. Instead:
1. Deploy new contract version
2. Update frontend to use new address
3. Migrate data if possible

### Frontend

#### Traditional Hosting

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

#### ArWeave

- Previous versions remain at their TX IDs
- Update links to point to previous manifest
- No need to redeploy

## Support

For deployment issues:

1. **Smart Contracts**: 
   - Check Hardhat documentation
   - Review Arbitrum docs
   - Ask in Arbitrum Discord

2. **Frontend**:
   - Check build logs
   - Verify environment variables
   - Test locally first

3. **ArWeave**:
   - Review transaction status
   - Check wallet balance
   - Visit ArWeave Discord

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Arbitrum Developer Docs](https://docs.arbitrum.io)
- [ArWeave Documentation](https://docs.arweave.org)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [Web3 Best Practices](https://consensys.github.io/smart-contract-best-practices/)

