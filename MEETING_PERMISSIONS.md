# Meeting Permissions & Access Control

## Smart Contract Permissions

The `MeetingScheduler` contract enforces these rules:

### Host-Only Actions

```solidity
require(msg.sender == meeting.host, "Only host can change status");
```

**Only the host can:**
- ✅ Change meeting status (Scheduled → Live → Ended)
- ✅ Update meeting details (title, description, time)
- ✅ Delete/cancel meeting

**Everyone can:**
- ✅ View meetings (if they fetch from contract)
- ✅ Join as participant (`joinMeeting()`)
- ✅ See participant list

---

## Fixed: Non-Host Join Flow

### The Bug

**Before:**
```typescript
// EVERYONE tried to start the meeting
await calendarService.startMeeting(meeting.id); // ❌ Fails for non-hosts!
await calendarService.joinMeeting(meeting.id);
```

**Error:**
```
Only host can change status
```

### The Fix

**After:**
```typescript
const isHost = user?.address.toLowerCase() === meeting.hostAddress.toLowerCase();

if (isContractMode) {
  // Only host changes status to Live
  if (isHost) {
    await calendarService.startMeeting(meeting.id);
  }
  
  // Everyone registers as participant
  await calendarService.joinMeeting(meeting.id);
}

navigate(`/meeting/${meeting.id}`);
```

---

## Join Flow by User Type

### Host Joins Meeting

1. Click "Join" button
2. Check: `isHost = true`
3. Call `startMeeting()` ← Changes status to "Live" on-chain
4. Call `joinMeeting()` ← Registers as participant
5. Navigate to meeting page
6. **MetaMask popup: 2 transactions**

### Participant Joins Meeting

1. Click "Join" button
2. Check: `isHost = false`
3. ~~Skip `startMeeting()`~~ ← Not allowed for non-hosts
4. Call `joinMeeting()` ← Registers as participant
5. Navigate to meeting page
6. **MetaMask popup: 1 transaction**

---

## Meeting Status Flow

```
┌──────────┐  Host clicks     ┌──────┐  Host ends    ┌───────┐
│Scheduled │  "Join" button   │ Live │  meeting      │ Ended │
│          ├─────────────────>│      ├──────────────>│       │
└──────────┘                  └──────┘               └───────┘
     ↑                                                    │
     │                                                    │
     └────────────────────────────────────────────────────┘
              Only host can transition states
```

**Participants:**
- Can join at any status
- Can't change status
- Can only register themselves via `joinMeeting()`

---

## Gas Costs (Arbitrum Testnet)

| Action | Who Can Do It | Gas Cost |
|--------|---------------|----------|
| Create meeting | Anyone | ~$0.01 |
| Update meeting | Host only | ~$0.005 |
| Change status (start) | Host only | ~$0.003 |
| Join meeting | Anyone | ~$0.003 |
| Delete meeting | Host only | ~$0.002 |

Very affordable on Arbitrum!

---

## Testing Scenarios

### Test 1: Host Creates & Starts

**Browser 1 (Host - Address A):**
1. Create meeting → Transaction confirms
2. Click "Join" → 2 MetaMask popups:
   - Change status to "Live"
   - Register as participant
3. Meeting shows "Live" status

### Test 2: Participant Joins

**Browser 2 (Participant - Address B):**
1. See meeting in calendar (fetched from blockchain)
2. Click "Join" → 1 MetaMask popup:
   - Register as participant
3. Enters meeting
4. See both participants

**No error!** ✅

### Test 3: Non-Host Tries to End Meeting

If a participant tries to end the meeting:
```
❌ Error: Only host can change status
```

Only the host can transition from Live → Ended.

---

## Access Control (Future Enhancement)

Currently, the smart contract doesn't enforce access control on `joinMeeting()`. Anyone can join any meeting!

### To Add Access Control

Modify `MeetingScheduler.sol`:

```solidity
// In joinMeeting function
function joinMeeting(uint256 meetingId) external {
    require(meetingId < meetingCount, "Meeting does not exist");
    Meeting storage meeting = meetings[meetingId];
    
    // ADD: Check community access
    require(
        communityAccess.hasAccess(meeting.communityId, msg.sender),
        "Not authorized to join this meeting"
    );
    
    // Rest of function...
}
```

This would require:
1. Storing reference to CommunityAccess contract
2. Passing it in constructor
3. Redeploying contract

For now, access control is handled **off-chain** (frontend checks before displaying meetings).

---

## Current Implementation

### ✅ What's Enforced On-Chain

- Host-only status changes
- Host-only meeting updates
- Host-only deletions
- Participant registration

### ⚠️ What's Enforced Off-Chain (Frontend)

- Meeting visibility (filter by community)
- Join button availability
- Community access checks

**Recommendation**: Add on-chain access control to `joinMeeting()` for stronger security.

---

## Summary

✅ **Fixed the bug**: Non-hosts can now join meetings without errors  
✅ **Host permissions**: Only host can change meeting status  
✅ **Participant permissions**: Anyone can register as participant  
⚠️ **Access control**: Currently frontend-only, should add to contract

Test it now - non-hosts should be able to join meetings successfully!

