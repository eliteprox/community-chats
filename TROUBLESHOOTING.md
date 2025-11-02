# Troubleshooting Guide

## Common Issues and Solutions

### Issue: Seeing Myself Twice in Participants List

**Cause**: Local participant was being added both manually and via Gun.js signaling callback.

**Fix**: ✅ Already fixed - we now filter out self in the participant joined callback.

**Verification**:
```javascript
// Check browser console for this log:
"Ignoring self in participant joined event"
```

---

### Issue: Participants Don't Auto-Update

**Cause**: Gun.js `.on()` callbacks were triggering for all data, including initial state.

**Fix**: ✅ Already fixed - we now track seen participants and only trigger on new ones.

**Verification**:
```javascript
// In browser console, you should see:
"Gun.js: New participant detected: 0x..."  // Only for new participants
"Gun.js: Participant left: 0x..."          // When someone leaves
```

---

### Issue: No Audio from Other Participants

**Symptoms**:
- See participant in list
- No audio playing
- WebRTC connection state shows "connected"

**Possible Causes**:

1. **Remote stream not added to audio mixer**

Check console for:
```javascript
"Received remote stream from: 0x..."
```

If missing, WebRTC track event didn't fire.

2. **Browser audio policy**

Some browsers block audio until user interaction.

**Solution**:
```javascript
// In Meeting.tsx, resume audio context
const audioContext = audioMixer.getAudioContext();
if (audioContext?.state === 'suspended') {
  await audioContext.resume();
}
```

3. **Microphone permissions**

Check that remote participant granted mic access.

---

### Issue: WebRTC Connection Fails

**Symptoms**:
```javascript
"Connection state with 0x...: failed"
```

**Possible Causes**:

1. **Firewall/NAT blocking**

**Solution**: Add TURN servers in `webrtc.ts`:

```typescript
private iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { 
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];
```

2. **Gun.js signaling not syncing**

Check console for:
```javascript
"✅ Connected to decentralized signaling via Gun.js"
```

If missing, Gun relay peers may be down.

**Solution**: Add your own Gun relay or use local peer:

```typescript
this.gun = Gun({
  peers: ['http://localhost:8765/gun'], // Your own relay
  localStorage: true, // Enable local cache
});
```

---

### Issue: Gun.js Not Connecting

**Symptoms**:
- No "Connected to decentralized signaling" message
- No participants appearing
- Console errors about Gun

**Solutions**:

1. **Check Gun relay availability**

Test in browser console:
```javascript
fetch('https://gun-manhattan.herokuapp.com/gun')
  .then(r => console.log('Gun relay OK:', r.status))
  .catch(e => console.error('Gun relay down:', e));
```

2. **Use alternative Gun relays**

Edit `decentralized-signaling.ts`:
```typescript
this.gun = Gun({
  peers: [
    'https://gun-us.herokuapp.com/gun',
    'https://gun-eu.herokuapp.com/gun',
    'https://yourown-gun-relay.com/gun', // Add your own!
  ]
});
```

3. **Run local Gun relay**

```bash
npm install gun
node -e "require('gun')({port: 8765, web: require('http').createServer().listen(8765)})"
```

Then use: `http://localhost:8765/gun`

---

### Issue: XMTP Chat Not Working

**Symptoms**:
- "Chat unavailable" message
- No chat messages sending/receiving

**Possible Causes**:

1. **XMTP client initialization failed**

Check console for errors. XMTP requires the user to sign a message.

2. **Recipient hasn't enabled XMTP**

XMTP requires both parties to have initialized XMTP at least once.

**Solutions**:

1. **Check if address can receive XMTP**:
```javascript
const canMsg = await xmtpService.canMessage(recipientAddress);
console.log('Can message:', canMsg);
```

2. **Fallback to Gun.js chat**:

We can implement a simple chat using Gun.js as fallback:

```typescript
// In meeting room
this.gun.get(`meeting_${meetingId}`)
  .get('chat')
  .get(messageId)
  .put({
    from: userAddress,
    content: message,
    timestamp: Date.now()
  });
```

---

### Issue: High Audio Latency

**Symptoms**:
- Noticeable delay between speaking and hearing
- Echo/feedback issues

**Solutions**:

1. **Enable echo cancellation** (already enabled by default)

2. **Reduce audio buffer size**:

```typescript
const audioContext = new AudioContext({
  sampleRate: 48000,
  latencyHint: 'interactive', // Use 'playback' for better quality but higher latency
});
```

3. **Check network quality**:
```javascript
// Get WebRTC stats
const stats = await peerConnection.getStats();
stats.forEach(stat => {
  if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
    console.log('RTT:', stat.currentRoundTripTime);
  }
});
```

---

### Issue: Speaking Detection Not Working

**Symptoms**:
- No visual indicator when speaking
- No speaking animation

**Solution**:

Check audio levels in console:
```javascript
setInterval(() => {
  const level = audioMixer.getParticipantLevel(participantId);
  console.log('Audio level:', level);
}, 1000);
```

If level is always 0:
- Check microphone not muted
- Verify audio track is enabled
- Check browser permissions

---

### Issue: Gun.js Data Not Syncing

**Debug Steps**:

1. **Check Gun.js connection**:
```javascript
gun.on('hi', peer => {
  console.log('Connected to Gun peer:', peer);
});
```

2. **Verify data is being written**:
```javascript
gun.get('test').put({ hello: 'world' });
gun.get('test').on(data => {
  console.log('Test data:', data);
});
```

3. **Check localStorage is allowed**:

Gun uses localStorage for caching. Check browser settings.

4. **Try with localStorage enabled**:
```typescript
this.gun = Gun({
  peers: [...],
  localStorage: true, // Enable caching
  radisk: true,       // Enable indexing
});
```

---

### Issue: Participants List Not Updating

**Cause**: State not triggering re-render

**Debug**:
```javascript
// Add logging to store
addParticipant: (participant) => {
  console.log('Adding participant to store:', participant);
  set((state) => ({
    participants: [...state.participants, participant],
  }));
},
```

**Check**:
1. Is `addParticipant` being called? (check console)
2. Is Zustand store updating? (use React DevTools)
3. Is component re-rendering? (add console.log in component)

---

### Issue: WebRTC Offer/Answer Exchange Failing

**Symptoms**:
```javascript
"Connection state: failed"
"ICE connection state: failed"
```

**Debug Gun.js Signaling**:

```typescript
// In decentralized-signaling.ts, add logging:
sendOffer(participantId: string, offer: RTCSessionDescriptionInit): void {
  console.log('Sending offer to:', participantId, offer);
  this.meetingRef
    .get('signaling')
    .get(participantId)
    .get('offers')
    .get(this.participantId)
    .put({ offer, timestamp: Date.now() });
}
```

Check if offers/answers are being received on the other end.

---

### Issue: Multiple Browser Tabs Show Same User Multiple Times

**Cause**: Each tab creates a separate Gun.js session with same participant ID.

**Solution**: Add tab ID to participant ID:

```typescript
const tabId = sessionStorage.getItem('tabId') || Math.random().toString(36);
sessionStorage.setItem('tabId', tabId);

const participantId = `${user.address}_${tabId}`;
```

---

### Development Debugging

**Enable verbose logging**:

```typescript
// In decentralized-signaling.ts
Gun.log.off = false; // Enable Gun.js logs

// In webrtc.ts
peerConnection.addEventListener('iceconnectionstatechange', () => {
  console.log('ICE state:', peerConnection.iceConnectionState);
});

peerConnection.addEventListener('connectionstatechange', () => {
  console.log('Connection state:', peerConnection.connectionState);
});
```

**Check all service states**:

```javascript
// Add to Meeting.tsx
useEffect(() => {
  const debugInterval = setInterval(() => {
    console.log('=== DEBUG INFO ===');
    console.log('Participants:', participants.length);
    console.log('Peer connections:', webrtcService.getPeerConnections().size);
    console.log('Audio streams:', audioMixer.getParticipants());
    console.log('Is streaming:', isStreaming);
  }, 5000);

  return () => clearInterval(debugInterval);
}, [participants]);
```

---

### Browser Console Checklist

When joining a meeting, you should see:

```
✅ Audio initialized
✅ XMTP chat initialized
✅ Connected to decentralized signaling via Gun.js
✅ WebRTC initialized (fully decentralized via Gun.js)
🎉 Connected to P2P network
```

For each new participant:
```
Gun.js: New participant detected: 0x...
New participant joined: { address: "0x...", ... }
Received remote stream from: 0x...
```

If you don't see these, check which step is failing.

---

### Production Issues

**Gun.js relay peers down**:
- Deploy your own Gun relay
- Use multiple backup peers
- Enable localStorage caching

**XMTP network slow**:
- Expected on first use (identity creation)
- Subsequent messages should be fast
- Check XMTP network status

**ArWeave gateway slow**:
- Use alternative gateway (ar.io, g8way.io)
- Enable browser caching
- Consider IPFS mirror

---

### Getting Help

If still having issues:

1. **Check browser console** for errors
2. **Open browser DevTools** → Network tab → check WebSocket/XHR
3. **Test with 2 different browsers** (not just 2 tabs)
4. **Verify wallet addresses** are different
5. **Check network connectivity**

**Report issues with**:
- Browser console logs
- Network tab screenshot
- Steps to reproduce
- Browser version
- Number of participants

---

### Quick Reset

If everything is broken, try a fresh start:

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then reconnect wallet and rejoin meeting.

