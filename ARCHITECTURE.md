# Architecture Documentation

## Overview

Community Chats is a **100% serverless, fully decentralized** audio conference application. Every component runs without centralized servers, making it censorship-resistant and permanently available.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ArWeave (Frontend)                     │
│              Permanent Decentralized Storage            │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬───────────────┐
        │                │                │               │
        ▼                ▼                ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Arbitrum   │  │   Gun.js     │  │     ENS      │  │   Livepeer   │
│  Blockchain  │  │  (P2P Data)  │  │  (Identity)  │  │  (Registry)  │
│              │  │              │  │              │  │              │
│ • Communities│  │ • WebRTC     │  │ • Names      │  │ • Providers  │
│ • Meetings   │  │   Signaling  │  │ • Avatars    │  │ • Validation │
│ • Access     │  │ • Chat       │  │ • Delegates  │  │              │
└──────────────┘  │ • Presence   │  └──────────────┘  └──────────────┘
                  └──────────────┘
```

## Decentralized Components

### 1. Frontend Hosting: ArWeave ☁️

**Permanent, Censorship-Resistant Hosting**

- Stored on ArWeave blockchain forever (~$0.05 one-time cost)
- No servers, no hosting bills, no maintenance
- Immutable deployments (previous versions always accessible)
- Global CDN via ArWeave gateways (arweave.net, ar.io, g8way.io)

**How it works:**
1. Build frontend: `npm run build:arweave`
2. Upload to ArWeave: All files get unique transaction IDs
3. Create manifest: Maps paths to transaction IDs
4. Access forever: `https://arweave.net/[MANIFEST_TX_ID]`

### 2. Smart Contracts: Arbitrum 🔗

**On-Chain Access Control & Meeting Storage**

**Deployed Contracts:**

| Contract | Purpose | Functions |
|----------|---------|-----------|
| **CommunityAccess** | Access control, Livepeer integration | `createCommunity()`, `hasAccess()`, `isRegisteredInLivepeer()` |
| **MeetingScheduler** | Meeting storage & management | `createMeeting()`, `joinMeeting()`, `startMeeting()` |

**Why Arbitrum?**
- Low gas fees (~$0.01 per transaction vs $50+ on Ethereum mainnet)
- Fast confirmation times (~2 seconds)
- Full Ethereum compatibility
- Secure L2 with Ethereum finality

**Access Control Flow:**
```
User → Wallet → Smart Contract → Check:
  1. Is in community allowlist? OR
  2. Is registered in Livepeer Service Registry?
  
If YES → Grant access to meeting
If NO → Show "Unauthorized"
```

### 3. WebRTC Signaling: Gun.js 🔫

**Fully P2P Signaling (No Server!)**

Traditional approach (centralized):
```
Participant A → WebSocket Server → Participant B
```

Our approach (decentralized):
```
Participant A → Gun.js P2P Network → Participant B
```

**How Gun.js Works:**
- Distributed graph database
- Automatic P2P sync across nodes
- No single point of failure
- Data replicated across participants
- Real-time updates via eventual consistency

**Gun.js Data Structure:**
```javascript
gun
  .get('meeting_ABC123')              // Meeting room
    .get('participants')              // Participants in meeting
      .get('0x1234...')              // Specific participant
        .put({
          displayName: 'alice.eth',
          lastSeen: Date.now(),
          ensName: 'alice.eth',
          ensAvatar: 'https://...'
        })
    .get('signaling')                 // WebRTC signaling
      .get('0x5678...')              // Target participant
        .get('offers')                // SDP offers
          .get('0x1234...')          // From participant
            .put({ offer: {...} })
    .get('chat')                      // Chat messages
      .get('msg_123')
        .put({
          from: '0x1234...',
          content: 'Hello!',
          timestamp: Date.now()
        })
```

**Gun Relay Setup:**

For development:
```bash
npm run gun-relay
# Starts local relay at http://localhost:8765/gun
```

For production:
- Deploy to Railway/Render/your VPS
- Or use public relays (less reliable)
- Or run pure localStorage mode (same browser only)

**Benefits:**
- No central server to crash
- Works offline (sync when online)
- Scales horizontally
- Low latency (direct P2P)
- Open relay network - anyone can run a relay

### 4. Identity: ENS 🆔

**Ethereum Name Service for User Identity**

- Resolve address → ENS name (`alice.eth`)
- Fetch avatar images
- Support for delegate addresses
- Profile metadata (description, URLs, social links)
- Graceful fallback to shortened addresses

**ENS Resolution Flow:**
```javascript
// Input: 0x1234...5678
const ensName = await provider.lookupAddress(address);
// Output: alice.eth

const avatar = await provider.getAvatar(address);
// Output: https://...
```

**Performance:**
- Cached in memory (5 minute TTL)
- Batch resolution for multiple addresses
- Mainnet resolution (ENS not on L2)

### 5. Authorization: Livepeer Registry ✅

**Service Provider Verification**

**Contract:** `0xC92d3A360b8f9e083bA64DE15d95Cf8180897431` (Arbitrum mainnet)

**Integration:**
1. Community creator enables "Require Livepeer Registration"
2. Smart contract checks if participant is registered:
```solidity
IServiceRegistry(livepeerRegistry).getServiceURI(participant)
```
3. If registered → Auto-grant access
4. If not registered → Check community allowlist

**Use Cases:**
- Gated calls for Livepeer orchestrators
- Service provider coordination meetings
- Technical community discussions

### 6. Chat: Gun.js P2P 💬

**Decentralized Messaging**

Previously used XMTP (deprecated), now uses Gun.js for fully P2P chat:

**Message Flow:**
```javascript
// Send message
gun.get('meeting_123')
  .get('chat')
  .get(`msg_${Date.now()}`)
  .put({
    from: userAddress,
    content: 'Hello!',
    timestamp: Date.now()
  });

// Receive messages
gun.get('meeting_123')
  .get('chat')
  .map()
  .on((message) => {
    displayMessage(message);
  });
```

**Benefits:**
- No external dependencies
- Real-time sync
- Works with Gun relay infrastructure
- Lighter than XMTP (~400KB saved)

## Audio Processing Architecture

### Audio Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Microphone 1 │────▶│              │     │              │
└──────────────┘     │              │     │              │
                     │    Audio     │────▶│   Muxer      │
┌──────────────┐     │   Service    │     │  (Web Audio  │
│ Microphone 2 │────▶│              │     │  Context)    │
└──────────────┘     │  • Capture   │     │              │
                     │  • Process   │     │  • Mix       │
┌──────────────┐     │  • Control   │     │  • Process   │
│ Participant  │────▶│              │     │  • Output    │
│   Audio      │     │              │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                          ┌───────────────────────┴────────┐
                          │                                │
                          ▼                                ▼
                   ┌──────────────┐              ┌──────────────┐
                   │ WHIP Stream  │              │ RTMP Stream  │
                   │ (WebRTC)     │              │ (via relay)  │
                   └──────────────┘              └──────────────┘
```

### Audio Features

**Capture:**
- `getUserMedia()` for microphone access
- Multiple audio device support
- Echo cancellation
- Noise suppression
- Automatic gain control

**Mixing:**
- Web Audio API for real-time mixing
- Individual volume controls per participant
- Speaking detection (audio level monitoring)
- Low latency configuration

**Streaming:**
- WHIP (WebRTC-HTTP Ingestion Protocol)
- RTMP (via WebSocket relay for browser compatibility)
- Dual streaming to multiple endpoints
- Configurable bitrate and codec

## WebRTC Architecture

### P2P Connection Flow

```
Participant A                Gun.js               Participant B
     │                         │                        │
     │──── Announce presence ──▶│                        │
     │                         │◀─── Discover peer ─────│
     │                         │                        │
     │──── Create offer ───────▶│                        │
     │                         │──── Forward offer ────▶│
     │                         │                        │
     │                         │◀─── Create answer ─────│
     │◀──── Forward answer ────│                        │
     │                         │                        │
     │◀──────── Direct P2P Audio Connection ──────────▶│
     │           (Gun.js no longer needed)              │
```

### ICE & STUN/TURN

**Default Configuration:**
```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }
];
```

**For restrictive networks, add TURN:**
```javascript
{
  urls: 'turn:openrelay.metered.ca:80',
  username: 'openrelayproject',
  credential: 'openrelayproject'
}
```

### Connection States

| State | Description |
|-------|-------------|
| `new` | Initial state, ICE gathering |
| `checking` | ICE candidates being checked |
| `connected` | At least one candidate pair working |
| `completed` | All pairs checked, optimal found |
| `failed` | Connection attempt failed |
| `disconnected` | Connection lost (temporary) |
| `closed` | Connection closed |

## Meeting Permissions

### Smart Contract Permissions

**Host-Only Actions:**
```solidity
require(msg.sender == meeting.host, "Only host can change status");
```

Only the host can:
- ✅ Change meeting status (Scheduled → Live → Ended)
- ✅ Update meeting details
- ✅ Delete/cancel meeting

Everyone can:
- ✅ View meetings
- ✅ Join as participant (`joinMeeting()`)
- ✅ See participant list

### Join Flow

**Host joining:**
1. Click "Join" → Checks `isHost = true`
2. Calls `startMeeting()` (changes status to "Live")
3. Calls `joinMeeting()` (registers as participant)
4. **MetaMask popup: 2 transactions**

**Participant joining:**
1. Click "Join" → Checks `isHost = false`
2. Skips `startMeeting()` (not authorized)
3. Calls `joinMeeting()` (registers as participant)
4. **MetaMask popup: 1 transaction**

## State Management

### Zustand Store

```typescript
interface AppStore {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // Communities
  communities: Community[];
  currentCommunity: Community | null;
  
  // Meetings
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  
  // Participants
  participants: Participant[];
  
  // Audio state
  isAudioEnabled: boolean;
  isMuted: boolean;
  
  // Streaming
  isStreaming: boolean;
  
  // Actions
  setUser: (user: User) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (address: string) => void;
  toggleMute: () => void;
  // ...
}
```

### Data Flow

```
User Action → Component → Store Action → State Update → Re-render
     │
     └─▶ Service Layer (web3, audio, webrtc) → External System
```

## Security Architecture

### Threat Model

**✅ Resistant to:**
- Server shutdowns (no servers!)
- Censorship (ArWeave + P2P)
- DDoS attacks (P2P distribution)
- Data breaches (E2E connections, on-chain data public by design)
- Single points of failure

**⚠️ Considerations:**
- Wallet security (user responsibility)
- Network anonymity (use VPN if needed)
- IP addresses visible in WebRTC (use TURN for privacy)

### Privacy Features

1. **No tracking:** No central server collecting data
2. **P2P audio:** Direct encrypted connections
3. **Wallet signatures:** Prove identity without revealing data
4. **On-chain transparency:** All meetings/access public (by design)

## Performance Characteristics

### Expected Performance

- **Audio latency:** <100ms local, <300ms with streaming
- **Max participants:** 10-20 recommended (mesh topology limitation)
- **Audio quality:** 48kHz, Opus codec
- **Bundle size:** ~690KB (~225KB gzipped)
- **Load time:** <3s on decent connection
- **Gas costs:** <$0.10 per transaction on Arbitrum

### Optimization Strategies

**Frontend:**
- Code splitting by route
- Lazy loading for heavy components
- Tree shaking unused code
- Asset optimization (images, fonts)

**Audio:**
- Hardware-accelerated Web Audio API
- Efficient audio graph connections
- Minimal latency configuration

**State:**
- Lightweight Zustand store
- Efficient re-render optimization
- Local storage for persistence

## Resilience & Redundancy

### What if Gun.js relays go down?

- Other relays automatically take over
- Participants sync data P2P without relays
- localStorage fallback for same browser
- Can add your own relays

### What if Arbitrum is down?

- Access control checks fail gracefully
- P2P audio continues working
- Re-check when back online
- Meetings remain visible (cached)

### What if ArWeave gateways are slow?

- Use alternative gateways (ar.io, g8way.io)
- Cache locally after first load
- IPFS mirror (optional)

## Running Costs

### Deployment Costs (One-Time)

- **Smart Contracts:** $2-5 (Arbitrum)
- **ArWeave Upload:** $0.01-0.05 (permanent)
- **Total:** Under $10 to deploy forever

### Ongoing Costs

- **Hosting:** $0 (ArWeave permanent storage)
- **Servers:** $0 (fully P2P)
- **Database:** $0 (Gun.js P2P)
- **Chat:** $0 (Gun.js P2P)
- **Total Monthly Cost:** **$0** 🎉

### Usage Costs

- **Gas Fees:** ~$0.01 per transaction (Arbitrum)
- **Bandwidth:** Free (P2P connections)
- **Storage:** Free (Gun.js, on-chain)

## Comparison with Alternatives

### vs Traditional Conferencing

| Feature | Community Chats | Zoom/Meet |
|---------|----------------|-----------|
| **Servers** | None (P2P) | Centralized |
| **Hosting Cost** | $0 (permanent) | $15-30/month |
| **Censorship** | Impossible | Subject to |
| **Privacy** | E2E P2P | Varies |
| **Ownership** | You own it | Company owns |
| **Uptime** | Decentralized | Depends on company |

### vs Other Web3 Solutions

**Huddle01:** WebRTC but centralized servers  
**Whereby:** Not decentralized  
**Jitsi:** Self-hosted but not serverless  
**Community Chats:** Fully decentralized, no servers

## Future Enhancements

### Planned Features

1. **Waku Integration:** Alternative messaging protocol
2. **IPFS Storage:** Additional hosting option
3. **Ceramic Network:** Decentralized user profiles
4. **The Graph:** Efficient blockchain data queries
5. **Filecoin:** Decentralized meeting recordings
6. **DAO Governance:** Community-owned governance
7. **Multi-chain:** Optimism, Base, Polygon support

### Technical Improvements

- WebRTC SFU mode for larger meetings (100+ participants)
- Advanced audio effects (spatial audio, filters)
- Video support (optional toggle)
- Screen sharing
- Meeting recordings on ArWeave
- Mobile app (React Native)

## Philosophy

> "The best way to predict the future is to invent it, and the best way to invent it is to make it decentralized."

Community Chats proves that real-time communications can be:
- ✅ Fully decentralized
- ✅ Serverless
- ✅ Censorship-resistant
- ✅ Zero ongoing costs
- ✅ Production-ready

**No compromises. Fully decentralized. Forever.**

## Resources

- **Gun.js:** https://gun.eco
- **ArWeave:** https://arweave.org
- **Arbitrum:** https://arbitrum.io
- **ENS:** https://ens.domains
- **Livepeer:** https://livepeer.org
- **WebRTC:** https://webrtc.org
- **Web Audio API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

