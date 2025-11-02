# Keystore Deployment Guide

## Why Use Keystore?

**Keystore** (encrypted JSON wallet) is more secure than storing private keys in `.env`:

| Method | Security | Pros | Cons |
|--------|----------|------|------|
| **Private Key** | ⚠️ Low | Simple, fast | Plain text in .env file |
| **Keystore** | ✅ High | Encrypted, password-protected | Requires password input |
| **Hardware Wallet** | ✅✅ Highest | Private key never leaves device | More complex setup |

For production deployments, **always use keystore or hardware wallet**.

---

## Creating a Keystore

### Option 1: Use Our Tool

```bash
npm run create-keystore
```

Follow the prompts:
```
🔐 Keystore Creation Tool
========================

Enter your private key (with 0x prefix): 0x...
Enter a strong password: ********
Confirm password: ********
Output path (default: ./keystore.json): 

✅ Keystore created at ./keystore.json
   Address: 0x...
```

### Option 2: From MetaMask

1. Open MetaMask
2. Click account menu → Account details
3. Click "Export Private Key"
4. Enter MetaMask password
5. Copy private key
6. Run: `npm run create-keystore`
7. Paste private key

### Option 3: Using ethers CLI

```bash
npx ethers-wallet create keystore.json
```

---

## Configuring Deployments

### 1. Update .env

```bash
# Use keystore (recommended)
KEYSTORE_PATH=./keystore.json
KEYSTORE_PASSWORD=your_strong_password

# Or use private key (not recommended for production)
# PRIVATE_KEY=0x...
```

### 2. Verify Keystore Location

```bash
ls -la keystore.json
# Should show: -rw------- (permissions 600)

# If not, secure it:
chmod 600 keystore.json
```

### 3. Test Deployment

```bash
npm run deploy:arbitrum-testnet
```

You'll see:
```
✅ Using keystore file for deployment
Deploying with account: 0x...
Account balance: 0.049 ETH
```

---

## Security Best Practices

### ✅ DO

- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Store keystore outside git repository (already in .gitignore)
- Use different wallets for dev/staging/production
- Back up keystore file securely (encrypted cloud storage, hardware backup)
- Use hardware wallet for mainnet deployments with large funds

### ❌ DON'T

- Commit keystore to git (already in .gitignore)
- Use same wallet for testing and production
- Share keystore file
- Store password in plain text
- Use weak passwords

---

## Deployment Methods Comparison

### Method 1: Keystore (Current Implementation)

```bash
# .env
KEYSTORE_PATH=./keystore.json
KEYSTORE_PASSWORD=your_password

# Deploy
npm run deploy:arbitrum
```

**Security**: ✅ Good  
**Convenience**: ✅ Good  
**Recommended for**: Production deployments

### Method 2: Private Key

```bash
# .env
PRIVATE_KEY=0x...

# Deploy
npm run deploy:arbitrum
```

**Security**: ⚠️ Medium  
**Convenience**: ✅ Excellent  
**Recommended for**: Local testing only

### Method 3: Hardware Wallet (Ledger/Trezor)

Requires Hardhat Ledger plugin:

```bash
npm install --save-dev @nomicfoundation/hardhat-ledger
```

**Security**: ✅✅ Excellent  
**Convenience**: ⚠️ Requires device  
**Recommended for**: High-value mainnet deployments

---

## Password Management

### Option 1: Environment Variable

```bash
# .env
KEYSTORE_PASSWORD=your_password
```

**Pro**: Automated deployments  
**Con**: Password in file

### Option 2: Interactive Prompt

```bash
# .env
KEYSTORE_PATH=./keystore.json
# Don't set KEYSTORE_PASSWORD

# Deploy
npm run deploy:arbitrum
# Will prompt: 🔐 Enter keystore password:
```

**Pro**: Password not stored  
**Con**: Can't automate

### Option 3: CI/CD Secrets

For GitHub Actions, Railway, etc.:

```yaml
# .github/workflows/deploy.yml
env:
  KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
```

Store in repository secrets (encrypted).

---

## Rotating Wallets

### When to Rotate

- Compromised key
- Lost password
- Team member leaves
- Quarterly security practice

### How to Rotate

1. **Create new keystore**:
   ```bash
   npm run create-keystore
   # Output: keystore-new.json
   ```

2. **Fund new wallet**:
   ```bash
   # Send ETH to new address
   ```

3. **Transfer contract ownership**:
   ```bash
   # Use Hardhat console or write script
   await contract.transferOwnership(newAddress);
   ```

4. **Update .env**:
   ```bash
   KEYSTORE_PATH=./keystore-new.json
   ```

5. **Archive old keystore**:
   ```bash
   mv keystore.json keystore-old-$(date +%Y%m%d).json
   # Store securely offline
   ```

---

## Troubleshooting

### "Failed to decrypt keystore"

**Cause**: Wrong password

**Solution**:
- Verify password
- Check KEYSTORE_PASSWORD in .env
- Try interactive prompt mode

### "Keystore file not found"

**Cause**: Wrong path

**Solution**:
```bash
# Check path
echo $KEYSTORE_PATH
ls -la ./keystore.json

# Update .env
KEYSTORE_PATH=./keystore.json
```

### "Insufficient funds for gas"

**Cause**: Wallet has no ETH

**Solution**:
```bash
# Check balance
cast balance 0x... --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Get testnet ETH
# Arbitrum Sepolia faucet: https://faucet.quicknode.com/arbitrum/sepolia
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy Contracts

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Create keystore from secret
        run: echo "${{ secrets.KEYSTORE_JSON }}" > keystore.json
      
      - name: Deploy contracts
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          ARBITRUM_RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
        run: npm run deploy:arbitrum
```

Store in GitHub Secrets:
- `KEYSTORE_JSON`: Contents of keystore.json
- `KEYSTORE_PASSWORD`: Your password
- `ARBITRUM_RPC_URL`: RPC endpoint

---

## Additional Resources

- [Ethers.js Wallet Documentation](https://docs.ethers.org/v6/api/wallet/)
- [Hardhat Network Configuration](https://hardhat.org/hardhat-runner/docs/config)
- [Arbitrum Deployment Guide](https://docs.arbitrum.io/for-devs/quickstart-solidity-hardhat)

---

## Quick Reference

```bash
# Create keystore
npm run create-keystore

# Deploy with keystore
KEYSTORE_PATH=./keystore.json npm run deploy:arbitrum

# Deploy with password prompt
KEYSTORE_PATH=./keystore.json npm run deploy:arbitrum
# (Don't set KEYSTORE_PASSWORD - will prompt)

# Deploy with private key (testing only)
PRIVATE_KEY=0x... npm run deploy:local
```

