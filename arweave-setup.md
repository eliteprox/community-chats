# ArWeave Deployment Setup

This guide will help you deploy the Community Chats application to ArWeave for fully decentralized hosting.

## Prerequisites

1. **ArWeave Wallet**
   - Create an ArWeave wallet at https://arweave.app
   - Download the wallet keyfile (JSON file)
   - Fund your wallet with AR tokens (needed for storage)

2. **AR Tokens**
   - You need AR tokens to pay for permanent storage
   - For testing: Get free testnet tokens from https://faucet.arweave.net
   - For production: Purchase AR tokens from exchanges

## Setup Instructions

### 1. Install ArWeave Package

```bash
npm install --save-dev arweave
```

### 2. Configure Wallet

Place your ArWeave wallet keyfile in a secure location:

```bash
# Save your wallet file (keep it secure!)
mv ~/Downloads/arweave-keyfile.json ./arweave-wallet.json

# Make sure it's in .gitignore (already configured)
cat .gitignore | grep arweave-wallet.json
```

Set the wallet path in your `.env` file:

```bash
echo "ARWEAVE_WALLET_PATH=./arweave-wallet.json" >> .env
```

### 3. Build the Frontend

Build the frontend specifically for ArWeave deployment:

```bash
cd frontend
npm run build:arweave
```

This creates an optimized build with:
- Relative paths instead of absolute
- All assets bundled
- Service worker for offline support

### 4. Deploy to ArWeave

Run the deployment script:

```bash
npm run deploy:arweave
```

The script will:
1. Load your wallet
2. Check your AR balance
3. Upload all build files to ArWeave
4. Create a manifest file
5. Output the deployment URL

### 5. Access Your App

After deployment, your app will be available at:

```
https://arweave.net/[MANIFEST_TX_ID]
```

The deployment script will save this information to `arweave-deployment.json`.

## Cost Estimation

ArWeave charges based on the size of data stored:

- Current rate: ~$5-10 per GB for permanent storage
- Typical app size: 1-5 MB
- Expected cost: $0.01 - $0.05 per deployment

Check current prices: https://arweavefees.com

## Deployment Process

### What Gets Uploaded

The deployment script uploads:
- `index.html` (entry point)
- JavaScript bundles
- CSS files
- Images and fonts
- JSON configuration files
- Manifest file (maps URLs to transaction IDs)

### Transaction IDs

Each file uploaded to ArWeave gets a unique transaction ID (TX ID):
- Files are immutable - cannot be changed after upload
- Each update creates new transactions
- Old versions remain accessible forever

### Manifest File

The manifest maps file paths to transaction IDs:

```json
{
  "manifest": "arweave/paths",
  "version": "0.1.0",
  "index": {
    "path": "index.html"
  },
  "paths": {
    "index.html": { "id": "abc123..." },
    "assets/main.js": { "id": "def456..." }
  }
}
```

## Custom Domain (Optional)

### Option 1: ArNS (ArWeave Name Service)

ArNS allows you to register human-readable names:

1. Go to https://arns.app
2. Register a name (e.g., `community-chats`)
3. Point it to your manifest TX ID
4. Access at: `https://community-chats.arweave.dev`

### Option 2: Traditional DNS

Configure DNS to point to ArWeave gateway:

```
CNAME: your-domain.com -> arweave.net
```

Then use path-based routing:
```
https://your-domain.com/[MANIFEST_TX_ID]
```

### Option 3: Permaweb Gateway

Use a custom gateway service:
- https://arweave.net/[TX_ID]
- https://ar.io/[TX_ID]
- https://g8way.io/[TX_ID]

## Updating Your App

To deploy updates:

1. Make your changes
2. Build again: `npm run build:arweave`
3. Deploy: `npm run deploy:arweave`
4. Get new manifest TX ID
5. Update your domain/links

**Note:** Previous versions remain accessible at their original TX IDs.

## Troubleshooting

### "Wallet not found" Error

Make sure:
- Wallet file exists at the specified path
- `ARWEAVE_WALLET_PATH` is set correctly in `.env`
- Wallet file is valid JSON

### "Insufficient balance" Error

- Check balance: https://viewblock.io/arweave/address/[YOUR_ADDRESS]
- Get more AR tokens from an exchange
- For testing, use ArWeave faucet

### "Upload failed" Error

Common causes:
- Network issues (retry deployment)
- Rate limiting (script includes delays)
- Invalid file format

### Files Not Loading

- Wait 5-10 minutes for confirmation
- Check transaction status on ViewBlock
- Verify manifest was uploaded correctly
- Try different ArWeave gateway

## Security Best Practices

1. **Wallet Security**
   - Never commit wallet file to git
   - Store wallet backup securely
   - Use separate wallet for deployments

2. **Environment Variables**
   - Keep `.env` in `.gitignore`
   - Use different wallets for dev/prod
   - Rotate wallets if compromised

3. **Smart Contract Addresses**
   - Verify contract addresses before deployment
   - Use environment-specific configs
   - Test on testnet first

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to ArWeave

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: cd frontend && npm run build:arweave
      
      - name: Deploy to ArWeave
        env:
          ARWEAVE_WALLET: ${{ secrets.ARWEAVE_WALLET }}
        run: |
          echo "$ARWEAVE_WALLET" > arweave-wallet.json
          npm run deploy:arweave
```

Store your wallet in GitHub Secrets as `ARWEAVE_WALLET`.

## Additional Resources

- [ArWeave Documentation](https://docs.arweave.org)
- [Arweave.js SDK](https://github.com/ArweaveTeam/arweave-js)
- [ArWeave Yellow Paper](https://www.arweave.org/yellow-paper.pdf)
- [Community Discord](https://discord.gg/arweave)
- [ArWeave Fees Calculator](https://arweavefees.com)

## Support

For issues specific to ArWeave deployment:
1. Check transaction status on ViewBlock
2. Join ArWeave Discord for community help
3. Review ArWeave documentation
4. Open an issue in this repository

