# Real-Time Debugging Guide

## Issues Fixed ✅

### 1. Duplicate Participant Entry

**Problem**: User appeared twice in participants list

**Root Cause**:
- Local user added manually: `addParticipant(localParticipant)`
- Gun.js also triggered `onParticipantJoined` for self when announcing presence

**Solution**:
```typescript
// Filter out self in callback
webrtcService.setOnParticipantJoined(async (participant) => {
  if (participant.address.toLowerCase() === user.address.toLowerCase()) {
    console.log('Ignoring self in participant joined event');
    return; // ← Skip self
  }
  addParticipant(participant);
});
```

**Verification**:
Open browser console and join a meeting. You should see:
```
Ignoring self in participant joined event
```

And only ONE entry for yourself in the participants list.

---

### 2. Participants Not Auto-Updating

**Problem**: When someone joined/left, the UI didn't update

**Root Cause**:
Gun.js `.map().on()` triggers for ALL data, including initial state, causing:
- Every participant triggered callback multiple times
- No distinction between "new join" and "existing participant"
- State updates happened but with same data (no visual change)

**Solution**:
```typescript
private listenForParticipants(): void {
  const seenParticipants = new Set<string>(); // ← Track seen participants
  
  this.meetingRef.get('participants').map().on((data: any, participantId: string) => {
    // Skip self
    if (participantId === this.participantId) return;
    
    const isActive = data.lastSeen && (Date.now() - data.lastSeen < 30000);
    
    if (isActive && !seenParticipants.has(participantId)) {
      seenParticipants.add(participantId); // ← Mark as seen
      this.onParticipantJoinedCallback(participant); // ← Trigger only once
    }
  });
}
```

**Verification**:
Open two browser windows/tabs with different wallets:

Window 1:
```
✅ Connected to P2P network
```

Window 2 (joins later):
```
✅ Connected to P2P network
```

Window 1 should show:
```
Gun.js: New participant detected: 0x...
New participant joined: { address: "0x..." }
alice.eth joined  // Toast notification
```

---

## Testing Real-Time Updates

### Test Case 1: Single User Join

1. **Open browser window 1**
   - Connect wallet A
   - Join meeting
   - Should see: "Participants (1)" with your address

2. **Open browser window 2** (different wallet!)
   - Connect wallet B
   - Join same meeting
   - Should see: "Participants (2)" - yourself + wallet A

3. **Window 1 should update**:
   - Counter changes to "Participants (2)"
   - Wallet B appears in list
   - Toast: "0x... joined" or "alice.eth joined" (if ENS)

### Test Case 2: Multiple Joins

1. Browser 1: Join meeting
2. Browser 2: Join meeting (should see participant count: 2)
3. Browser 3: Join meeting (should see participant count: 3)

Each browser should show all participants with ENS names/avatars.

### Test Case 3: Participant Leaves

1. Browser 1, 2, 3 in meeting (3 participants)
2. Close browser 2 or click "Leave Meeting"
3. After ~10-30 seconds:
   - Browser 1 and 3 show "Participants (2)"
   - Browser 2's entry disappears
   - Toast: "alice.eth left"

**Note**: Gun.js uses heartbeats every 10s, so leaving detection may take up to 30s.

---

## Browser Console Debugging

### Expected Console Logs on Join

```javascript
// Audio initialization
Audio initialized

// XMTP initialization
Initializing XMTP client...
✅ XMTP client initialized
✅ XMTP chat initialized

// WebRTC & Gun.js
✅ Connected to decentralized signaling via Gun.js
Ignoring self in participant joined event
✅ WebRTC initialized (fully decentralized via Gun.js)

// Toast notification
🎉 Connected to P2P network
```

### When Another User Joins

```javascript
// In Gun.js signaling
Gun.js: New participant detected: 0x4908...54ab

// In WebRTC service
New participant joined: {
  address: "0x4908...54ab",
  displayName: "alice.eth",
  ensName: "alice.eth",
  ...
}

// Fetching ENS
Received remote stream from: 0x4908...54ab

// Toast notification
✅ alice.eth joined
```

### When User Leaves

After 30s of inactivity:

```javascript
Gun.js: Participant left: 0x4908...54ab
Participant left: 0x4908...54ab
alice.eth left
```

---

## Common Console Errors

### Error: "Failed to initialize P2P connections"

**Cause**: Gun.js connection failed

**Check**:
```javascript
// Test Gun.js connectivity
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun']
});
gun.get('test').put({ hello: 'world' });
gun.get('test').on(data => console.log('Gun test:', data));
```

**Solution**: Add fallback Gun relays or run your own.

---

### Error: "XMTP initialization failed"

**Cause**: User denied signature request or XMTP network issue

**Check**:
- Did MetaMask pop up asking to sign?
- Did you click "Sign"?
- Check XMTP network status: https://status.xmtp.network

**Workaround**: Chat is optional, audio will still work.

---

### Warning: "Participant already exists"

**Cause**: Gun.js callback triggered twice for same participant

**This is normal** if Gun relays are syncing. The `seenParticipants` Set prevents duplicates.

---

## Debugging Tools

### React DevTools

Install: https://react.dev/learn/react-developer-tools

Check Zustand store state:
1. Open React DevTools
2. Find any component
3. Look at hooks → `useStore`
4. Inspect `participants` array
5. Verify it matches UI

### Network Tab

1. Open DevTools → Network
2. Filter: WS (WebSocket)
3. Should see Gun.js connections to relay peers
4. Click on connection → Messages tab
5. See real-time Gun.js sync messages

### Gun.js DevTools

Enable Gun.js logging:

```typescript
// In decentralized-signaling.ts constructor
this.gun = Gun({
  peers: [...],
  localStorage: false,
  radisk: false,
});

// Add after creation
(this.gun as any).on('hi', (peer: any) => {
  console.log('🔫 Gun connected to peer:', peer);
});

(this.gun as any).on('bye', (peer: any) => {
  console.log('👋 Gun disconnected from peer:', peer);
});
```

---

## Performance Monitoring

### Check WebRTC Stats

```typescript
// Add to Meeting.tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const connections = webrtcService.getPeerConnections();
    
    for (const [id, pc] of connections) {
      const stats = await pc.getStats();
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          console.log(`Audio from ${id}:`, {
            packetsLost: stat.packetsLost,
            jitter: stat.jitter,
            bytesReceived: stat.bytesReceived,
          });
        }
      });
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### Check Gun.js Sync Status

```typescript
// Monitor Gun.js syncing
this.gun.on('create', (at: any) => {
  console.log('Gun: Data created', at);
});

this.gun.on('hi', (peer: any) => {
  console.log('Gun: Peer connected', peer);
});
```

---

## Testing Checklist

### Before Testing

- [ ] Two different wallets (or use MetaMask + Brave wallet)
- [ ] Two browser windows (or different browsers entirely)
- [ ] Microphone permissions granted in both
- [ ] Not using same wallet in both windows

### During Test

- [ ] Both users connect wallet
- [ ] Both join same meeting
- [ ] Each sees the other in participants (2 total)
- [ ] No duplicates
- [ ] Audio works bidirectionally
- [ ] Chat messages send/receive (if XMTP works)
- [ ] Speaking indicators show when talking
- [ ] Leave meeting in one browser → other sees participant count decrease

### Expected Results

| Action | Window 1 | Window 2 |
|--------|----------|----------|
| W1 joins | 1 participant (self) | - |
| W2 joins | 2 participants | 2 participants |
| W1 speaks | Speaking animation on W1 | Speaking animation on W1 in W2's list |
| W2 sends chat | Sees own message | Message appears in W1 |
| W1 leaves | - | 1 participant (self only) |

---

## Known Limitations

### Gun.js

- **Heartbeat delay**: 10s heartbeat means leave detection can take up to 30s
- **Relay dependency**: Needs at least one Gun relay accessible
- **Data persistence**: Temporary (not permanent blockchain storage)

### XMTP

- **First-time setup**: Requires signature to create XMTP identity
- **Group chat**: Currently limited, full group chat coming in future XMTP versions
- **Network dependency**: Requires XMTP network availability

### WebRTC

- **NAT traversal**: May need TURN servers in restrictive networks
- **Browser compatibility**: Best in Chrome/Edge, limited in Safari
- **Participant limit**: Mesh topology scales to ~10 participants

---

## Advanced Debugging

### Enable All Logging

```typescript
// Meeting.tsx - add to useEffect
console.log('=== MEETING DEBUG INFO ===');
console.log('Meeting ID:', meetingId);
console.log('User:', user);
console.log('Participants:', participants);
console.log('Is authenticated:', isAuthenticated);
console.log('Audio enabled:', isAudioEnabled);
console.log('Is muted:', isMuted);
console.log('Is streaming:', isStreaming);
console.log('========================');
```

### Monitor State Changes

```typescript
useEffect(() => {
  console.log('Participants updated:', participants);
}, [participants]);

useEffect(() => {
  console.log('Meeting changed:', currentMeeting);
}, [currentMeeting]);
```

### Test Gun.js Directly

Open browser console:

```javascript
// Test Gun.js connectivity
const Gun = require('gun');
const gun = Gun({ peers: ['https://gun-manhattan.herokuapp.com/gun'] });

// Write data
gun.get('test').put({ message: 'Hello from console', time: Date.now() });

// Read data (should sync across tabs!)
gun.get('test').on(data => {
  console.log('Gun data:', data);
});
```

Open another browser tab, run same code. Data should sync!

---

## Quick Fixes

### Reset Everything

```javascript
// Browser console
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('gun');
location.reload();
```

### Force Reconnect to Gun

```javascript
// In decentralized-signaling.ts
disconnect();
await connect(meetingId, participantId, participantData);
```

### Manually Refresh Participants

```javascript
// Add a refresh button in UI
const refreshParticipants = () => {
  setParticipants([]);
  // Gun.js will re-populate from network
};
```

---

## Support

Still having issues? Check:

1. **Browser console** for errors (F12)
2. **Network tab** for Gun.js WebSocket connections
3. **React DevTools** for state inspection
4. **TROUBLESHOOTING.md** for detailed solutions

**Report bugs with**:
- Browser console screenshot
- Network tab showing Gun.js connections
- Steps to reproduce
- How many users affected

