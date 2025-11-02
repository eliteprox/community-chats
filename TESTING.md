# Testing On-Chain Meetings

## ✅ Setup Complete!

**Deployed Contracts:**
- CommunityAccess: `0xD55A365C1Af320EC05E6F9d577F2fB6a04ad2F0f`
- MeetingScheduler: `0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995`
- Network: Arbitrum Sepolia Testnet

**Gun.js Relay:** `http://localhost:8765/gun`

---

## How to Test

### 1. Restart Dev Server

```bash
cd frontend
npm run dev
```

### 2. Verify On-Chain Mode

When you open the Calendar page, you should see:

```
Meeting Calendar [On-Chain] ← This badge means contract mode is active!
```

In browser console:
```
✅ Meeting contract mode enabled
```

### 3. Create a Meeting

1. Go to Calendar
2. Click "Schedule Meeting"
3. Fill in details
4. Click "Schedule"

**You'll see a MetaMask popup** asking to confirm the transaction!

In console:
```
Creating meeting on Arbitrum...
Transaction sent: 0x...
Waiting for confirmation...
Meeting created on-chain: meeting ID 0
```

### 4. Test Cross-Browser Visibility

**Browser 1 (where you created the meeting):**
- Meeting appears immediately in calendar

**Browser 2 (different wallet, same or different computer):**
1. Connect wallet
2. Go to Calendar
3. **Meeting should appear!** (fetched from blockchain)

---

## Expected Behavior

### Before (localStorage):
- ❌ Meeting only in creating browser
- ❌ Other browsers don't see it
- ❌ Lost if you clear browser data

### After (on-chain):
- ✅ Meeting stored on Arbitrum blockchain
- ✅ Visible in all browsers that fetch from contract
- ✅ Permanent (can't be lost)
- ✅ Verifiable on blockchain

---

## Verify On Arbiscan

Your meetings are now on the blockchain!

View contract: https://sepolia.arbiscan.io/address/0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995

You can see:
- Contract code
- All transactions (meeting creations)
- Events emitted
- Current state

---

## Gas Costs (Arbitrum Testnet)

- Create meeting: ~$0.01 USD
- Update meeting: ~$0.005 USD  
- Join meeting: ~$0.003 USD

Very cheap on Arbitrum!

---

## Troubleshooting

### Still using localStorage?

Check console for:
```
📝 Using localStorage mode (contract not configured)
```

This means .env wasn't loaded. Make sure:
1. `.env` file exists in `frontend/` directory
2. Dev server was restarted after creating .env
3. Variable is `VITE_MEETING_SCHEDULER_CONTRACT` (with VITE_ prefix)

### "Contract not configured" error

```bash
# Check if env var is loaded
cd frontend
npm run dev

# In browser console:
console.log(import.meta.env.VITE_MEETING_SCHEDULER_CONTRACT)
// Should show: 0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995
```

### MetaMask not popping up

- Make sure you're on Arbitrum Sepolia network
- Check you have testnet ETH
- Try disconnecting and reconnecting wallet

---

## Next Steps

### 1. Test Creating Meetings
- Schedule a meeting
- Confirm transaction in MetaMask
- Check it appears on blockchain

### 2. Test Cross-Browser Access
- Open different browser
- Connect different wallet
- Verify meeting appears in calendar

### 3. Test Meeting Access Control
Currently, meetings are visible to everyone but access control should check:
- Community membership
- Livepeer registration

To add access control filtering, see the previous suggestions about calling `hasAccess()` before displaying meetings.

---

## Production Deployment

When ready for mainnet:

```bash
# Deploy to Arbitrum One
npm run compile
npx hardhat run scripts/deploy-meeting-scheduler.ts --network arbitrum

# Update frontend/.env with mainnet address
VITE_MEETING_SCHEDULER_CONTRACT=0x...
VITE_ENABLE_TESTNET=false
```

Meetings will then be on Arbitrum mainnet permanently!

