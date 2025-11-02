# Etherscan API v2 Integration for Arbitrum

## Overview

We use **Etherscan API v2** with chainId support to access Arbitrum blockchain data. This is the modern approach that replaced separate Arbiscan endpoints.

## API Endpoints

### Etherscan v2 Unified Endpoint

```
https://api.etherscan.io/v2/api
```

All chains use this single endpoint with the `chainid` parameter.

### Supported Chain IDs

| Network | Chain ID | Description |
|---------|----------|-------------|
| Ethereum Mainnet | 1 | Ethereum L1 |
| Sepolia Testnet | 11155111 | Ethereum testnet |
| **Arbitrum One** | **42161** | Arbitrum mainnet |
| **Arbitrum Sepolia** | **421614** | Arbitrum testnet |

---

## Getting API Key

### Step 1: Create Etherscan Account

1. Go to https://etherscan.io
2. Sign up for free account
3. Verify email

### Step 2: Generate API Key

1. Go to https://etherscan.io/myapikey
2. Click "Add" to create new API key
3. Name it: "Community Chats"
4. Copy the API key

### Step 3: Configure

Add to `.env` files:

**Root `.env`:**
```bash
ETHERSCAN_API_KEY=your_api_key_here
```

**Frontend `.env`:**
```bash
VITE_ETHERSCAN_API_KEY=your_api_key_here
```

---

## Usage Examples

### Query Arbitrum Transactions

```typescript
import { arbiscanTestnet } from '@/services/arbiscan';

// Get transactions for an address
const txs = await arbiscanTestnet.getTransactions(
  '0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995' // Meeting contract
);

console.log(`Found ${txs.length} transactions`);
txs.forEach(tx => {
  console.log(`${tx.hash}: ${tx.functionName}`);
});
```

### Get Contract Information

```typescript
// Get ABI
const abi = await arbiscanTestnet.getContractABI(
  '0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995'
);
const parsedABI = JSON.parse(abi);

// Get source code
const source = await arbiscanTestnet.getContractSource(
  '0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995'
);
console.log('Contract:', source.ContractName);
console.log('Compiler:', source.CompilerVersion);
```

### Query Event Logs

```typescript
// Get all MeetingCreated events
const logs = await arbiscanTestnet.getLogs(
  '0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995'
);

// Filter by event signature
const meetingCreatedSignature = '0x...'; // keccak256("MeetingCreated(...)")
const meetingEvents = logs.filter(log => 
  log.topics[0] === meetingCreatedSignature
);
```

### Check Balance

```typescript
const balance = await arbiscanTestnet.getBalance(
  '0xaCC5b0beeC714EdaeAf66a3758654Dc68f137E3a'
);
console.log('Balance:', ethers.formatEther(balance), 'ETH');
```

---

## API Request Format

### Old (Deprecated Arbiscan)

```
❌ https://api.arbiscan.io/api?module=account&action=txlist&address=0x...
```

### New (Etherscan v2 with chainId)

```
✅ https://api.etherscan.io/v2/api?chainid=421614&module=account&action=txlist&address=0x...
```

**Key difference**: Added `chainid` parameter!

---

## Example API Calls

### Get Arbitrum Sepolia Transactions

```bash
curl "https://api.etherscan.io/v2/api?chainid=421614&module=account&action=txlist&address=0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995&apikey=YourApiKey"
```

### Get Arbitrum One Balance

```bash
curl "https://api.etherscan.io/v2/api?chainid=42161&module=account&action=balance&address=0x...&tag=latest&apikey=YourApiKey"
```

### Get Contract ABI

```bash
curl "https://api.etherscan.io/v2/api?chainid=421614&module=contract&action=getabi&address=0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995&apikey=YourApiKey"
```

---

## Rate Limits

**Free Plan:**
- 5 requests/second
- 100,000 requests/day

**Paid Plans:**
- Higher rate limits
- Priority support
- More requests per day

See: https://docs.etherscan.io/etherscan-v2/

---

## Frontend Integration

### Display Meeting History

```typescript
import { arbiscanTestnet } from '@/services/arbiscan';
import { useEffect, useState } from 'react';

function MeetingHistory({ contractAddress }: { contractAddress: string }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const txs = await arbiscanTestnet.getTransactions(contractAddress);
      
      // Filter for createMeeting calls
      const meetingCreations = txs.filter(tx => 
        tx.functionName?.includes('createMeeting')
      );
      
      setTransactions(meetingCreations);
    }
    
    fetchHistory();
  }, [contractAddress]);

  return (
    <div>
      <h3>Meetings Created: {transactions.length}</h3>
      {transactions.map(tx => (
        <div key={tx.hash}>
          <a href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}>
            {tx.hash.slice(0, 10)}...
          </a>
        </div>
      ))}
    </div>
  );
}
```

### Show User's Meeting Participation

```typescript
async function getUserMeetings(userAddress: string) {
  const txs = await arbiscanTestnet.getTransactions(userAddress);
  
  const meetingContract = '0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995';
  
  // Filter transactions to meeting contract
  const meetingTxs = txs.filter(tx => 
    tx.to?.toLowerCase() === meetingContract.toLowerCase()
  );

  return meetingTxs.map(tx => ({
    hash: tx.hash,
    timestamp: new Date(Number(tx.timeStamp) * 1000),
    action: tx.functionName,
    gasUsed: tx.gasUsed,
  }));
}
```

---

## Configuration Summary

### Environment Variables

**Root `.env`:**
```bash
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Frontend `.env`:**
```bash
VITE_ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Hardhat Config

Etherscan verification is already configured:

```typescript
etherscan: {
  apiKey: {
    arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    arbitrumTestnet: process.env.ARBISCAN_API_KEY || "",
  },
}
```

**Note**: You can use the same Etherscan API key for both!

---

## Verify Deployed Contracts

```bash
# After deployment
npx hardhat verify --network arbitrumTestnet 0x68902a04Bb2d9DF647Abb00F78D00c0fc1Ca3995
```

This publishes your source code on Arbiscan for transparency.

---

## Troubleshooting

### "Invalid API Key"

- Verify key is correct
- Check it's set in both .env files
- Try regenerating on Etherscan

### "Rate limit exceeded"

- Free tier: 5 req/sec
- Add delays between requests
- Consider paid plan

### "No transactions found"

- Contract might be new
- Check chainId is correct (421614 for Sepolia)
- Verify contract address

---

## Resources

- [Etherscan API v2 Docs](https://docs.etherscan.io/etherscan-v2/)
- [Arbitrum on Etherscan](https://docs.etherscan.io/etherscan-v2/getting-started/supported-chains)
- [API Key Management](https://etherscan.io/myapikey)

---

## Summary

✅ **Migrated from Arbiscan to Etherscan v2**  
✅ **Added chainId parameter to all requests**  
✅ **Supports Arbitrum mainnet & testnet**  
✅ **Full API coverage**: transactions, contracts, events, verification  
✅ **Ready to use in frontend**

Get your Etherscan API key and start querying Arbitrum data! 🔍

