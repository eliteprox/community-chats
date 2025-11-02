# Meeting Scheduler Smart Contract Deployment Guide

This guide will help you deploy and integrate the MeetingScheduler smart contract on Arbitrum.

## Overview

The MeetingScheduler contract stores all meeting data on-chain on Arbitrum, replacing the previous localStorage implementation. This enables:

- **Decentralized Storage**: All meetings are stored on Arbitrum blockchain
- **Shared Access**: Everyone can see and join the same meetings
- **Persistent Data**: Meetings persist across devices and browsers
- **On-Chain Verification**: Meeting creation and participation is verifiable on-chain
- **Low Gas Fees**: Arbitrum's L2 solution keeps transaction costs minimal

## Contract Features

- ✅ Create, update, and delete meetings
- ✅ Join meetings as a participant (on-chain registration)
- ✅ Change meeting status (scheduled → live → ended)
- ✅ Query meetings by community, host, or all upcoming
- ✅ Track participants for each meeting
- ✅ Event emission for indexing

## Deployment Steps

### 1. Prerequisites

Make sure you have:
- Node.js and npm installed
- A wallet with ETH on Arbitrum (or Arbitrum Sepolia testnet)
- Private key exported in your environment

### 2. Set Up Environment

Create a `.env` file in the project root:

```bash
# Arbitrum Mainnet
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_here
ARBISCAN_API_KEY=your_arbiscan_api_key

# Arbitrum Sepolia Testnet (for testing)
ARBITRUM_TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

This will compile both `CommunityAccess.sol` and `MeetingScheduler.sol`.

### 4. Deploy to Arbitrum

#### Deploy to Testnet (Arbitrum Sepolia)

```bash
npx hardhat run scripts/deploy.ts --network arbitrumTestnet
```

#### Deploy to Mainnet (Arbitrum One)

```bash
npx hardhat run scripts/deploy.ts --network arbitrum
```

### 5. Save Contract Addresses

The deployment script will output:

```
✅ CommunityAccess deployed to: 0x...
✅ MeetingScheduler deployed to: 0x...

📝 Add these to your .env file:
COMMUNITY_ACCESS_CONTRACT=0x...
MEETING_SCHEDULER_CONTRACT=0x...

VITE_COMMUNITY_ACCESS_CONTRACT=0x...
VITE_MEETING_SCHEDULER_CONTRACT=0x...
```

### 6. Configure Frontend

Add the contract addresses to your environment files:

**`.env` (root)**
```bash
MEETING_SCHEDULER_CONTRACT=0x...
```

**`frontend/.env`** (or `.env.local`)
```bash
VITE_MEETING_SCHEDULER_CONTRACT=0x...
```

### 7. Verify Contracts on Arbiscan (Optional but Recommended)

```bash
npx hardhat verify --network arbitrum <MEETING_SCHEDULER_ADDRESS>
npx hardhat verify --network arbitrum <COMMUNITY_ACCESS_ADDRESS>
```

## Usage

### Frontend Integration

The frontend will automatically detect if the contract is configured:

1. **Contract Mode**: When `VITE_MEETING_SCHEDULER_CONTRACT` is set, meetings are stored on-chain
2. **LocalStorage Mode**: If not configured, falls back to localStorage (development mode)

### Creating Meetings

When a user creates a meeting:
1. Frontend calls `calendarService.createMeeting()`
2. If contract mode is enabled, it calls the smart contract
3. Transaction is sent to Arbitrum
4. Meeting is stored on-chain with a unique ID
5. User receives confirmation

### Joining Meetings

When a user joins a meeting:
1. User clicks "Join" on a meeting
2. Frontend calls `calendarService.joinMeeting()`
3. Transaction registers the user as a participant on-chain
4. User is added to the meeting's participant list

## Contract Architecture

### MeetingScheduler.sol

Main contract for managing meetings:

```solidity
struct Meeting {
    uint256 id;
    uint256 communityId;
    string title;
    string description;
    uint256 scheduledTime;
    uint256 duration;
    address host;
    string whipUrl;
    string rtmpUrl;
    bool isRecording;
    MeetingStatus status;
    uint256 createdAt;
    address[] participants;
}

enum MeetingStatus {
    Scheduled,
    Live,
    Ended,
    Cancelled
}
```

### Key Functions

- `createMeeting()`: Create a new meeting
- `updateMeeting()`: Update meeting details (host only)
- `changeMeetingStatus()`: Change meeting status (host only)
- `deleteMeeting()`: Cancel a meeting (host or owner only)
- `joinMeeting()`: Register as a participant
- `getMeeting()`: Get meeting details
- `getCommunityMeetings()`: Get all meetings for a community
- `getUpcomingCommunityMeetings()`: Get upcoming meetings

## Gas Costs (Approximate)

On Arbitrum:

- **Create Meeting**: ~0.0001 - 0.0003 ETH
- **Update Meeting**: ~0.0001 - 0.0002 ETH
- **Join Meeting**: ~0.00005 - 0.0001 ETH
- **Change Status**: ~0.00005 - 0.0001 ETH

*Note: Costs vary based on network congestion and data size*

## Development Mode

During development, you can work without deploying the contract:

1. Don't set `VITE_MEETING_SCHEDULER_CONTRACT` in your frontend env
2. Meetings will be stored in localStorage
3. Perfect for testing UI without blockchain transactions

## Troubleshooting

### Contract Not Detected

- Ensure `VITE_MEETING_SCHEDULER_CONTRACT` is set in frontend environment
- Restart the frontend dev server after adding env variables
- Check browser console for "Meeting contract mode enabled" or "Using localStorage mode"

### Transaction Failures

- Ensure you have enough ETH for gas on Arbitrum
- Check that meeting time is in the future
- Verify you're connected to the correct network (Arbitrum)
- Try increasing gas limit if needed

### Network Issues

- Verify RPC URL is correct
- Check Arbitrum network status
- Ensure MetaMask is connected to Arbitrum network

## Future Enhancements

Potential improvements:

- [ ] Add access control integration with CommunityAccess contract
- [ ] Implement meeting NFT badges for participants
- [ ] Add recurring meeting support on-chain
- [ ] Implement meeting recording storage references (IPFS/Arweave)
- [ ] Add governance for meeting moderation
- [ ] Support for paid/token-gated meetings

## Support

For issues or questions:
- Check the contract on Arbiscan
- Review transaction logs for errors
- Consult Arbitrum documentation
- Open an issue in the repository

## License

MIT License

