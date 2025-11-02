# Gun.js Configuration & Relay Setup

## Current Configuration: Pure P2P Mode ✅

The app is configured to work **without any relay servers** using Gun.js in pure P2P mode with localStorage.

### How It Works

```typescript
Gun({
  peers: [],              // No relays needed!
  localStorage: true,     // Store data locally
  radisk: true,          // Enable indexing
});
```

**Benefits**:
- ✅ No dependency on external servers
- ✅ Works offline
- ✅ Data persists in browser
- ✅ Participants sync when they connect
- ✅ 100% decentralized

**How Participants Find Each Other**:
1. Both participants join the same meeting ID
2. Gun.js stores meeting data in localStorage
3. When participants refresh or rejoin, they see the same data
4. WebRTC establishes direct P2P connections
5. Audio flows peer-to-peer (no Gun.js needed after connection)

### Limitations of Pure P2P Mode

- Participants must be in the meeting simultaneously to discover each other
- No "participant list" when joining an empty meeting
- Refreshing the page clears the participant list
- Works best for scheduled meetings where everyone joins at once

---

## Option 1: Run Your Own Gun Relay (Recommended for Production)

### Quick Setup with Docker

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  gun-relay:
    image: gundb/gun
    ports:
      - "8765:8765"
    restart: unless-stopped
    environment:
      - PORT=8765
EOF

# Start relay
docker-compose up -d

# Your relay is now at: http://localhost:8765/gun
```

### Without Docker

```bash
# Install Gun globally
npm install -g gun

# Start relay server
gun --port 8765
```

Or create a simple relay:

```javascript
// gun-relay.js
const Gun = require('gun');
const http = require('http');

const server = http.createServer();
const gun = Gun({ web: server });

server.listen(8765, () => {
  console.log('Gun relay running on port 8765');
});
```

Run it:
```bash
node gun-relay.js
```

### Deploy Gun Relay

**Railway.app** (Free):
```bash
# 1. Create gun-relay.js
# 2. Create package.json with gun dependency
# 3. Push to GitHub
# 4. Connect Railway
# 5. Deploy
```

**Render.com**:
```bash
# 1. Create Web Service
# 2. Point to gun-relay code
# 3. Start command: node gun-relay.js
```

**Your Own VPS**:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Gun
npm install gun

# Run with PM2
npm install -g pm2
pm2 start gun-relay.js
pm2 save
pm2 startup
```

### Update Frontend to Use Your Relay

```typescript
// In decentralized-signaling.ts
this.gun = Gun({
  peers: [
    'http://localhost:8765/gun',        // Local development
    'https://your-relay.railway.app/gun', // Production
  ],
  localStorage: true,
  radisk: true,
});
```

---

## Option 2: Use Alternative Public Gun Relays

Some public Gun relays that may be more reliable:

```typescript
this.gun = Gun({
  peers: [
    'https://gun-matrix.herokuapp.com/gun',
    'https://gunjs.herokuapp.com/gun',
    'https://e2eec.herokuapp.com/gun',
  ],
  localStorage: true,
  radisk: true,
});
```

**Note**: Public relays may go down at any time. Running your own is recommended for production.

---

## Option 3: Hybrid Mode (Best for Production)

Use both localStorage and relays:

```typescript
this.gun = Gun({
  peers: [
    'https://your-relay.com/gun',       // Your primary relay
    'https://backup-relay.com/gun',     // Backup relay
  ],
  localStorage: true,  // Works even if relays are down!
  radisk: true,
});
```

**Benefits**:
- Works offline (localStorage)
- Syncs across participants when online (relays)
- Resilient to relay failures
- Best of both worlds

---

## Testing Without Relays

### Same Browser, Different Tabs

Gun.js with localStorage will sync across tabs automatically:

1. Tab 1: Join meeting → localStorage updated
2. Tab 2: Join meeting → Reads from same localStorage
3. ❌ **Problem**: Same wallet address - can't test P2P properly

### Different Browsers on Same Computer

1. Chrome: Join with wallet A
2. Firefox: Join with wallet B
3. ✅ **Works**: Different localStorage, WebRTC P2P established
4. Both see each other via WebRTC (not Gun.js)

### Different Computers (True P2P Test)

Without relays:
- Participants won't discover each other automatically
- Need WebRTC to connect first
- **Chicken and egg problem**: Need Gun to exchange WebRTC signaling

**Solution**: Use at least one Gun relay or run your own.

---

## Recommended Setup for Each Use Case

### Development (Local Testing)

```typescript
Gun({
  peers: [],           // No relays
  localStorage: true,  // Works in same browser
  radisk: true,
});
```

**Test with**: Different browsers on same computer

### Staging/Testing

```typescript
Gun({
  peers: ['http://localhost:8765/gun'], // Your local relay
  localStorage: true,
  radisk: true,
});
```

**Test with**: Multiple computers

### Production

```typescript
Gun({
  peers: [
    'https://gun.your-domain.com/gun',        // Your primary relay
    'https://gun-backup.your-domain.com/gun', // Backup relay
    'https://community-relay.net/gun',        // Community relay
  ],
  localStorage: true,  // Fallback if all relays down
  radisk: true,
});
```

---

## Alternative: Use OrbitDB Instead

If Gun.js relays are unreliable, consider **OrbitDB** (IPFS-based):

```bash
npm install orbit-db ipfs-core
```

**Benefits**:
- Built on IPFS (more mature network)
- Better relay infrastructure
- Strong consistency guarantees

**Tradeoffs**:
- Slightly heavier bundle
- More complex setup
- May be overkill for this use case

---

## Quick Fix: Run Local Gun Relay Now

```bash
# In a new terminal
npx gun --port 8765
```

Then update `decentralized-signaling.ts`:

```typescript
this.gun = Gun({
  peers: ['http://localhost:8765/gun'],
  localStorage: true,
  radisk: true,
});
```

Restart dev server and test!

---

## Testing Current Setup (No Relays)

The current config works for:
- ✅ Single user testing
- ✅ Multiple tabs in same browser
- ✅ Refreshing and rejoining
- ⚠️ Multiple users require WebRTC connection first

**For now**, participants will:
1. Show up via localStorage if same browser
2. Connect via WebRTC P2P for audio
3. Not see each other's presence via Gun (without relay)

**To enable real-time presence**, you need at least one Gun relay server.

---

## Recommended Action

For immediate testing:

```bash
# Terminal 1: Run local Gun relay
npm install -g gun
gun --port 8765

# Terminal 2: Update code to use it
# Then restart dev server
```

For production: Deploy your own Gun relay to Railway/Render (5 minutes setup).

