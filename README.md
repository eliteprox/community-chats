# Community Chats - Decentralized Audio Conference Platform

A fully decentralized Web3 audio-only conference application with blockchain-based access control, ENS integration, and permanent hosting on ArWeave.

## 🚀 Quick Start

```bash
# Install dependencies
npm install && cd frontend && npm install && cd ..

# Start Gun.js relay for P2P signaling
npm run gun-relay

# In another terminal, start frontend
cd frontend && npm run dev
```

Open http://localhost:3001 and connect your Web3 wallet!

## ✨ Features

- 🔐 **Web3 Authentication** - Secure login via Ethereum wallets
- 🎙️ **Real-Time Audio** - P2P audio mixing with WebRTC
- 👥 **Smart Contract Gating** - Arbitrum-based access control
- 🌐 **ENS Integration** - Display names and avatars from ENS profiles
- 📅 **On-Chain Calendar** - Schedule meetings on Arbitrum blockchain
- 💬 **P2P Chat** - Decentralized messaging via Gun.js
- 📡 **WHIP/RTMP Streaming** - Broadcast to custom ingest endpoints
- ☁️ **ArWeave Deployment** - Permanent serverless hosting
- 🔗 **Livepeer Integration** - Automatic access for registered service providers

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│            ArWeave (Frontend Hosting)                   │
│               Permanent Storage                         │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
┌───▼────┐ ┌──▼───┐ ┌────▼───┐ ┌───▼───┐ ┌───▼──────┐
│Arbitrum│ │Gun.js│ │  ENS   │ │Livepeer│ │   Web3   │
│   L2   │ │ P2P  │ │Identity│ │Registry│ │  Wallets │
│        │ │      │ │        │ │        │ │          │
│•Access │ │•Signal│ │•Names  │ │•Verify │ │•MetaMask │
│•Meetings│•Chat  │ │•Avatar │ │•URIs   │ │•WalletCon│
└────────┘ └──────┘ └────────┘ └────────┘ └──────────┘
```

**100% Decentralized • 100% Serverless • $0 Monthly Cost**

## 📋 Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Arbitrum testnet ETH (for testing)
- AR tokens (for ArWeave deployment)

## 🎯 Core Use Cases

- ✅ Community audio calls
- ✅ DAO meetings
- ✅ Livepeer orchestrator calls
- ✅ Web3 project discussions
- ✅ Podcast recording & live streaming
- ✅ Token-gated community events

## 💻 Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- ethers.js for Web3
- TailwindCSS for styling
- Zustand for state management

### Smart Contracts
- Solidity ^0.8.20
- Hardhat development environment
- Arbitrum L2 deployment

### Decentralized Services
- Gun.js for P2P signaling & chat
- WebRTC for P2P audio
- ENS for identity
- ArWeave for permanent storage
- Livepeer Service Registry

## 📦 Project Structure

```
community-chats/
├── contracts/              # Solidity smart contracts
│   ├── CommunityAccess.sol
│   └── MeetingScheduler.sol
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # Business logic
│   │   └── store/          # State management
├── scripts/                # Deployment scripts
├── test/                   # Contract tests
└── gun-relay-server.js     # P2P relay server
```

## 🔧 Development

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Environment

Create `.env` files:

**Root `.env`:**
```bash
PRIVATE_KEY=your_private_key
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

**Frontend `.env`:**
```bash
VITE_ENABLE_TESTNET=true
VITE_COMMUNITY_ACCESS_CONTRACT=0x...
VITE_MEETING_SCHEDULER_CONTRACT=0x...
VITE_GUN_RELAY_URL=http://localhost:8765/gun
```

### 3. Run Local Development

```bash
# Terminal 1: Start Gun.js relay
npm run gun-relay

# Terminal 2: Start frontend
cd frontend && npm run dev
```

Visit http://localhost:3001

### 4. Deploy Smart Contracts (Optional)

```bash
# Compile contracts
npm run compile

# Deploy to Arbitrum testnet
npm run deploy:arbitrum-testnet
```

## 🌐 Using the Application

### Connect Wallet
1. Click "Connect Wallet"
2. Approve MetaMask connection
3. Switch to Arbitrum network if prompted

### Create a Community
1. Go to "Communities" page
2. Click "Create Community"
3. Configure access control
4. Confirm transaction

### Schedule a Meeting
1. Go to "Calendar" page
2. Click "Schedule Meeting"
3. Fill in meeting details
4. Optional: Set WHIP/RTMP streaming URLs

### Join a Meeting
1. Find meeting in calendar
2. Click "Join"
3. Allow microphone access
4. Audio automatically mixed with other participants

### Stream to External Platform
1. Configure WHIP or RTMP URL
2. In meeting, click "Start Streaming"
3. Mixed audio broadcasts to your endpoint

## 🚢 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions including:
- Keystore setup for secure deployments
- Smart contract deployment to Arbitrum mainnet
- Frontend deployment to ArWeave
- Custom domain configuration

## 🧪 Testing

### Run Contract Tests
```bash
npm run test
```

### Test Multi-User Meetings
1. Open two different browsers
2. Connect different wallets in each
3. Join the same meeting
4. Verify audio, chat, and participant list work

## 🔒 Security Features

- ✅ Wallet-based authentication (no passwords)
- ✅ On-chain access control
- ✅ Encrypted keystore for deployments
- ✅ No centralized servers
- ✅ End-to-end P2P connections
- ✅ No private keys stored in code

## 💰 Cost Breakdown

### One-Time Deployment
- Smart contracts: ~$2-4 (Arbitrum)
- ArWeave hosting: ~$0.01-0.05 (permanent)
- **Total: ~$5 one time**

### Per-Use Costs
- Create meeting: ~$0.01 (Arbitrum gas)
- Join meeting: ~$0.003 (Arbitrum gas)
- Audio/Chat: $0 (P2P)

### Monthly Costs
- **$0** - Fully decentralized, no servers!

## 🐛 Troubleshooting

### Wallet Connection Issues
**Problem:** "MetaMask not detected"
- Install MetaMask browser extension
- Refresh page after installation

**Problem:** "Wrong network"
- Switch to Arbitrum in MetaMask
- App will prompt to add Arbitrum automatically

### Audio Issues
**Problem:** "Microphone access denied"
- Check browser permissions (Settings → Privacy → Microphone)
- Reload page and allow access

**Problem:** "No audio from participants"
- Check participant hasn't muted themselves
- Verify speaker volume is up
- Check browser console for WebRTC errors

### Meeting Visibility
**Problem:** "Meeting not visible in other browsers"
- Verify `VITE_MEETING_SCHEDULER_CONTRACT` is set
- Check if contracts are deployed
- Fallback: localStorage mode (same browser only)

### P2P Connection Issues
**Problem:** "Participants not appearing"
- Ensure Gun.js relay is running
- Check `VITE_GUN_RELAY_URL` configuration
- Verify using different wallets (not same wallet in multiple tabs)

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture & how it works
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🔗 Links

- **Documentation:** [GitHub Repository](https://github.com/yourusername/community-chats)
- **Arbitrum:** https://arbitrum.io
- **ArWeave:** https://arweave.org
- **Gun.js:** https://gun.eco
- **Livepeer:** https://livepeer.org
- **ENS:** https://ens.domains

---

**Built with ❤️ for the decentralized web**

Version 1.0.0 | Production Ready ✅
