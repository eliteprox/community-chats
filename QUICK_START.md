# Quick Start Guide

## Test the App Right Now (5 minutes)

### Step 1: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies  
cd frontend && npm install && cd ..
```

### Step 2: Start Gun.js Relay (Terminal 1)

```bash
npm run gun-relay
```

You should see:
```
🚀 Gun.js Relay Server Started
Port: 8765
WebSocket URL: ws://localhost:8765/gun
```

Keep this running!

### Step 3: Configure Gun Relay (Optional but Recommended)

```bash
# Create frontend/.env if it doesn't exist
echo "VITE_GUN_RELAY_URL=http://localhost:8765/gun" > frontend/.env
```

### Step 4: Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open: http://localhost:3001

### Step 5: Test with 2 Users

**Browser 1 (Chrome)**:
1. Open http://localhost:3001
2. Click "Connect Wallet"
3. Connect MetaMask with Wallet A
4. Click "Calendar" → "Schedule Meeting"
5. Fill in details and click "Schedule"
6. Join the meeting
7. Allow microphone access
8. You should see yourself in participants (1)

**Browser 2 (Firefox or Incognito)**:
1. Open http://localhost:3001
2. Connect with different wallet (Wallet B)
3. Go to Calendar
4. Click "Join" on the same meeting
5. Allow microphone
6. **Both browsers should now show "Participants (2)"**

### Expected Results

✅ Browser 1 sees: You + Other participant  
✅ Browser 2 sees: You + Other participant  
✅ Toast notification: "alice.eth joined" (or address)  
✅ Audio indicator when speaking  
✅ Real-time participant updates

---

## Without Gun Relay (localStorage only)

If you don't run the Gun relay:

1. Works in **same browser, different tabs**
2. ❌ Won't work across **different browsers**
3. ❌ Won't work across **different computers**

**For production**, you need a Gun relay server (takes 5 min to deploy to Railway/Render - see GUN_RELAY.md).

---

## Troubleshooting

### "Seeing myself twice"
✅ **Fixed** - We filter out self in callbacks now

### "Other participants not showing"
- Check Gun relay is running (Terminal 1)
- Check `VITE_GUN_RELAY_URL` in frontend/.env
- Check browser console for "Gun.js initialized with relay"
- Verify using **different wallets** in each browser

### "Buffer is not defined"
✅ **Fixed** - Polyfills added in main.tsx

### "WebSocket connection failed"
- Gun relay not running → Start with `npm run gun-relay`
- Wrong URL in .env → Check `VITE_GUN_RELAY_URL`
- Firewall blocking port 8765 → Check firewall settings

---

## Console Logs to Look For

### Success (with relay):
```
🔫 Gun.js initialized with relay: http://localhost:8765/gun
✅ Connected to decentralized signaling via Gun.js
✅ WebRTC initialized (fully decentralized via Gun.js)
Gun.js: New participant detected: 0x...
```

### Success (without relay):
```
🔫 Gun.js initialized in localStorage-only mode
   Run "npm run gun-relay" for better multi-user support
✅ WebRTC initialized (fully decentralized via Gun.js)
```

---

## Full Production Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Deploying Gun relay to cloud
- Deploying contracts to Arbitrum mainnet
- Deploying frontend to ArWeave
- Custom domain setup

---

## Next Steps

1. ✅ Test audio works between 2 participants
2. ✅ Test chat (click "Show Chat" button)
3. ✅ Test mute/unmute
4. ✅ Test streaming to WHIP/RTMP (if configured)
5. 📝 Deploy to production (see DEPLOYMENT.md)

---

## Support

Having issues? Check:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [frontend/FIXES.md](./frontend/FIXES.md)
- [GUN_RELAY.md](./GUN_RELAY.md)
- Browser console for errors
- Gun relay server logs

Enjoy your fully decentralized audio conference app! 🎉

