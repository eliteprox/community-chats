# Community Chats - Web3 Audio Conference Platform

A decentralized audio-only conference application with Web3 authentication, ENS integration, and blockchain-based access control.

## Features

- 🔐 **Web3 Authentication**: Secure login via Ethereum wallets
- 🎙️ **Multi-Source Audio**: Broadcast from multiple audio sources simultaneously
- 🔊 **Audio Muxing**: Combine all participants into a single stream
- 📡 **WHIP/RTMP Streaming**: Broadcast to custom ingest endpoints
- 👥 **Smart Contract Gating**: Arbitrum-based access control
- 🌐 **ENS Integration**: Display names and avatars from ENS profiles
- 📅 **Community Calendar**: Schedule and manage community calls
- ☁️ **ArWeave Deployment**: Serverless hosting on the blockchain

## Architecture

```
┌─────────────────┐
│  ArWeave Host   │
│   (Frontend)    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Web3 Auth │
    │ (MetaMask)│
    └────┬─────┘
         │
┌────────▼────────────┐
│ Arbitrum Contract   │
│ (Access Control)    │
└─────────────────────┘

┌──────────────┐      ┌──────────────┐
│ Participant  │─────▶│ Audio Muxer  │
│   Audio 1    │      │              │
└──────────────┘      │              │
                      │              │──▶ WHIP/RTMP
┌──────────────┐      │              │    Endpoint
│ Participant  │─────▶│              │
│   Audio 2    │      └──────────────┘
└──────────────┘
```

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- ethers.js for Web3 interactions
- WebRTC for audio streaming
- TailwindCSS for styling

### Smart Contracts
- Solidity ^0.8.20
- Hardhat development environment
- Arbitrum deployment

### Audio Processing
- WebRTC for P2P audio
- MediaStream API for audio capture
- Audio Context API for mixing

## Project Structure

```
community-chats/
├── contracts/          # Solidity smart contracts
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
├── scripts/           # Deployment and utility scripts
└── test/             # Contract tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet
- Arbitrum testnet ETH (for testing)

### Installation

```bash
# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Compile contracts
npm run compile

# Run tests
npm run test
```

### Development

```bash
# Terminal 1: Start Gun.js relay (recommended for multi-user testing)
npm run gun-relay

# Terminal 2: Start local Hardhat node (optional)
npm run node

# Terminal 3: Deploy contracts to local network
npm run deploy:local

# Terminal 4: Start frontend dev server
cd frontend && npm run dev
```

The app will be available at `http://localhost:3001`

**Note**: Gun.js relay is optional - the app works without it using localStorage, but a relay enables better real-time participant discovery across different browsers/computers.

### Deployment

```bash
# Deploy to Arbitrum testnet
npm run deploy:arbitrum-testnet

# Build frontend for ArWeave
cd frontend && npm run build:arweave

# Deploy to ArWeave
npm run deploy:arweave
```

## Smart Contract

The `CommunityAccess.sol` contract manages participant access:

- Maintains allowlist of Ethereum addresses
- Owner can add/remove participants
- Query participant status on-chain
- Events for access changes

## ENS Integration

The application resolves ENS names and fetches:
- Primary ENS name
- Avatar URL
- Delegate addresses (for multi-wallet support)

## Audio Streaming

Each participant's audio is:
1. Captured via `getUserMedia()`
2. Transmitted via WebRTC
3. Mixed using Web Audio API
4. Streamed to WHIP/RTMP endpoint

## Community Calendar

- Create scheduled events
- Invite participants (by address or ENS)
- Set custom WHIP/RTMP endpoints per event
- Manage recurring meetings

## License

MIT

