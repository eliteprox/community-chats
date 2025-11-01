# Getting Started with Community Chats

This guide will help you set up and run the Community Chats Web3 audio conference application.

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- MetaMask or compatible Web3 wallet
- Git

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd community-chats
```

2. **Install root dependencies**

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd frontend
npm install
cd ..
```

4. **Set up environment variables**

```bash
# Copy example files
cp .env.example .env
cd frontend
cp .env.example .env
cd ..
```

Edit `.env` files with your configuration (see [Configuration](#configuration) section).

### Development

#### 1. Start Local Blockchain (Optional)

For local testing with Hardhat:

```bash
# Terminal 1: Start local node
npm run node
```

#### 2. Deploy Smart Contract

**Option A: Local Network**

```bash
# Terminal 2: Deploy to local network
npm run deploy:local
```

**Option B: Arbitrum Testnet**

```bash
# Deploy to Arbitrum Sepolia testnet
npm run deploy:arbitrum-testnet
```

Save the deployed contract address and add it to your `.env` files.

#### 3. Start Frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`

## Configuration

### Root `.env`

```bash
# Required for contract deployment
PRIVATE_KEY=your_private_key_here

# Arbitrum RPC URLs
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Optional: For contract verification
ARBISCAN_API_KEY=your_arbiscan_api_key

# Contract address (after deployment)
COMMUNITY_ACCESS_CONTRACT=0x...
```

### Frontend `.env`

```bash
# Network configuration
VITE_ARBITRUM_CHAIN_ID=42161
VITE_ARBITRUM_TESTNET_CHAIN_ID=421614
VITE_ENABLE_TESTNET=true

# Contract address (same as root)
VITE_COMMUNITY_ACCESS_CONTRACT=0x...

# Optional: Default streaming URLs
VITE_DEFAULT_WHIP_URL=https://your-whip-endpoint.com/whip
VITE_DEFAULT_RTMP_URL=rtmp://your-rtmp-server.com/live
```

## Using the Application

### 1. Connect Wallet

1. Click "Connect Wallet" in the top right
2. Approve MetaMask connection
3. Switch to Arbitrum network if prompted
4. Your address and ENS name (if available) will display

### 2. Create a Community

1. Go to "Communities" page
2. Click "Create Community"
3. Enter community details:
   - Name
   - Description
   - Optional: Require Livepeer registration
4. Confirm transaction in MetaMask
5. Wait for transaction confirmation

### 3. Schedule a Meeting

1. Go to "Calendar" page
2. Click "Schedule Meeting"
3. Fill in meeting details:
   - Title
   - Description
   - Date and time
   - Duration
   - Optional: WHIP/RTMP streaming URLs
4. Click "Schedule"

### 4. Join a Meeting

1. Find the meeting in your calendar
2. Click "Join" when meeting time arrives
3. Allow microphone access when prompted
4. Audio will be automatically mixed with other participants

### 5. Stream to External Platform

If you configured WHIP or RTMP URLs:

1. In the meeting, click "Start Streaming"
2. Mixed audio will be sent to configured endpoints
3. Use for recording or broadcasting to other platforms

## Features Overview

### Web3 Authentication

- **Wallet Connection**: Secure login via MetaMask
- **ENS Integration**: Automatic name and avatar resolution
- **Multi-wallet Support**: ENS delegation for multiple addresses

### Access Control

- **Smart Contract Gating**: On-chain allowlists via Arbitrum
- **Livepeer Integration**: Automatic access for registered service providers
- **Flexible Permissions**: Community-level and global allowlists

### Audio Features

- **Multi-source Audio**: Capture from multiple microphones simultaneously
- **Real-time Mixing**: Combine all participants into single stream
- **Volume Controls**: Individual participant volume adjustment
- **Speaking Detection**: Visual indicators for active speakers

### Streaming

- **WHIP Support**: WebRTC-HTTP Ingestion Protocol
- **RTMP Support**: Traditional RTMP streaming (requires relay server)
- **Dual Streaming**: Stream to multiple endpoints simultaneously
- **Quality Controls**: Configurable bitrate and codec

### Calendar

- **Schedule Events**: Create upcoming meetings
- **Recurring Meetings**: Support for daily, weekly, monthly repeats
- **iCal Export**: Export calendar to standard format
- **Meeting Status**: Live, scheduled, and ended states

## Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  ┌─────────────────────────────────┐   │
│  │     Web3 Services               │   │
│  │  • Wallet Connection            │   │
│  │  • ENS Resolution               │   │
│  │  • Contract Interaction         │   │
│  │  • Livepeer Registry Check      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │     Audio Services              │   │
│  │  • Device Management            │   │
│  │  • Audio Capture                │   │
│  │  • Real-time Mixing             │   │
│  │  • Volume Control               │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Streaming Services            │   │
│  │  • WHIP Streaming               │   │
│  │  • RTMP Streaming               │   │
│  │  • Stats Monitoring             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Arbitrum Smart Contract            │
│  • CommunityAccess.sol                  │
│  • Access Control Logic                 │
│  • Livepeer Integration                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Livepeer Service Registry             │
│  • 0xC92d3A360b8f9e083bA64DE15d95Cf8180897431
│  • Service Provider Verification        │
└─────────────────────────────────────────┘
```

## Development Workflow

### Making Changes

1. **Smart Contract Changes**

```bash
# Edit contracts/CommunityAccess.sol
nano contracts/CommunityAccess.sol

# Compile
npm run compile

# Run tests
npm run test

# Deploy
npm run deploy:local
```

2. **Frontend Changes**

```bash
cd frontend

# Make changes to src/

# Hot reload automatically updates browser
# Check http://localhost:3000
```

### Running Tests

```bash
# Test smart contracts
npm run test

# Test with coverage
npm run test -- --coverage

# Test specific file
npm run test test/CommunityAccess.test.ts
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Wallet Connection Issues

**Problem**: "MetaMask not detected"
- **Solution**: Install MetaMask extension

**Problem**: "Wrong network"
- **Solution**: Switch to Arbitrum in MetaMask settings

**Problem**: "Transaction failed"
- **Solution**: Check you have ETH for gas fees

### Audio Issues

**Problem**: "Microphone access denied"
- **Solution**: Grant permission in browser settings

**Problem**: "No audio from participants"
- **Solution**: Check participant hasn't muted themselves

**Problem**: "Echo or feedback"
- **Solution**: Enable echo cancellation in audio settings

### Contract Issues

**Problem**: "Contract not found"
- **Solution**: Verify contract address in `.env`

**Problem**: "Unauthorized"
- **Solution**: Ensure you're added to community allowlist

**Problem**: "Transaction reverted"
- **Solution**: Check contract logs on Arbiscan

### Streaming Issues

**Problem**: "WHIP connection failed"
- **Solution**: Verify WHIP endpoint URL is correct

**Problem**: "RTMP requires relay server"
- **Solution**: RTMP from browser needs WebSocket relay (see docs)

**Problem**: "Stream quality poor"
- **Solution**: Adjust bitrate in streaming config

## Next Steps

- **Production Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **ArWeave Hosting**: See [arweave-setup.md](./arweave-setup.md)
- **Smart Contract Details**: See [contracts/README.md](./contracts/README.md)
- **API Reference**: Check service files in `frontend/src/services/`

## Getting Help

- **Documentation**: Check the `/docs` folder
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community Discord
- **Email**: contact@community-chats.app

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details

