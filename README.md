# 🚀 FRC Token Faucet DApp

**Status**: Production Ready ✅ | **Version**: 1.0.0 | **Network**: Sepolia Testnet

Complete blockchain DApp for ERC-20 token distribution with 24-hour cooldown, 100 FRC lifetime limit, MetaMask integration, and Docker support.

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Install dependencies
npm install && cd frontend && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit: PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

# 3. Test & Deploy
npm run test
npm run deploy

# 4. Update .env with deployed addresses
# VITE_TOKEN_ADDRESS=0x...
# VITE_FAUCET_ADDRESS=0x...

# 5. Run application
docker compose up
# Access: http://localhost:3000
```

---

## ✨ Features

### Smart Contracts (Solidity 0.8.20)
- ✅ ERC-20 token with 1M max supply
- ✅ 5 FRC per claim, 24-hour cooldown per address
- ✅ 100 FRC lifetime limit per address
- ✅ Admin pause/unpause functionality
- ✅ ReentrancyGuard protection
- ✅ 100+ comprehensive tests

### Frontend (React + Vite)
- ✅ MetaMask wallet integration (EIP-1193)
- ✅ Real-time balance display
- ✅ Cooldown countdown timer
- ✅ Professional dark theme, responsive design
- ✅ Clear error messages

### Evaluation Interface
```javascript
await window.__EVAL__.connectWallet()              // → "0x..."
await window.__EVAL__.requestTokens()              // → "0xtxhash"
await window.__EVAL__.getBalance("0x...")          // → "5000000000000000000"
await window.__EVAL__.canClaim("0x...")            // → true/false
await window.__EVAL__.getRemainingAllowance("0x...")// → "95000000000000000000"
await window.__EVAL__.getContractAddresses()       // → {token, faucet}
await window.__EVAL__.getFaucetConfig()            // → {faucetAmount, cooldown, maxClaim}
```

---

## 📦 Installation

### Requirements
- Node.js 18+, npm 8+
- MetaMask browser extension
- Sepolia testnet ETH (free from faucet.sepolia.dev)
- Infura/Alchemy API key (free)

### Setup .env File
```env
# Blockchain
PRIVATE_KEY=your_key_without_0x
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ETHERSCAN_API_KEY=your_api_key

# Frontend (set after deployment)
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
VITE_TOKEN_ADDRESS=0x...
VITE_FAUCET_ADDRESS=0x...
```

---

## 📝 Smart Contracts

### Token.sol (ERC-20)
```solidity
MAX_SUPPLY = 1,000,000 FRC (18 decimals)
Functions: mint(), setMinter(), balanceOf(), transfer(), approve()
```

### TokenFaucet.sol
```solidity
FAUCET_AMOUNT = 5 FRC per claim
COOLDOWN_TIME = 24 hours
MAX_CLAIM_AMOUNT = 100 FRC lifetime

Functions:
- requestTokens()          // Claim 5 FRC
- canClaim(address)        // Check eligibility
- remainingAllowance(addr) // Get remaining amount
- getTimeUntilNextClaim()  // Seconds until next claim
- setPaused(bool)          // Admin pause (owner only)
```

---

## 🎨 Frontend

### Components
- **App.jsx**: Main React component with wallet connection and claim UI
- **App.css**: Professional styling (dark theme, responsive)
- **wallet.js**: MetaMask integration utilities
- **contracts.js**: Contract interaction layer (ethers.js wrapper)
- **eval.js**: window.__EVAL__ interface for testing

### Usage
1. Click "Connect Wallet" → Approve in MetaMask
2. Click "Request Tokens" → Sign transaction
3. Wait 24 hours for next claim

---

## 🚀 Deployment

```bash
# Deploy contracts to Sepolia
npm run deploy
# Outputs: tokenAddress, faucetAddress

# Update .env with deployed addresses
VITE_TOKEN_ADDRESS=0x...
VITE_FAUCET_ADDRESS=0x...

# Build frontend
cd frontend && npm run build && cd ..

# Run with Docker
docker compose up

# Verify on Etherscan
# https://sepolia.etherscan.io/address/TOKEN_ADDRESS
# https://sepolia.etherscan.io/address/FAUCET_ADDRESS
```

---

## 🧪 Testing

```bash
npm run test              # Run 100+ tests
REPORT_GAS=true npm run test  # With gas reporting
npm run coverage          # Coverage report
```

### Development
```bash
# Terminal 1: Local blockchain
npm run node

# Terminal 2: Frontend dev server
cd frontend && npm run dev
# Access: http://localhost:5173
```

### Production
```bash
docker compose up
# Access: http://localhost:3000
# Health: http://localhost:3000/health
```

---

## 📁 Project Structure

```
FRC Token/
├── contracts/
│   ├── Token.sol
│   ├── TokenFaucet.sol
│   └── test/TokenFaucet.test.js (100+ tests)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── utils/
│   │       ├── wallet.js
│   │       ├── contracts.js
│   │       └── eval.js
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── scripts/deploy.js
├── hardhat.config.js
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MetaMask won't connect | Install extension, switch to Sepolia, refresh |
| "Insufficient funds" | Get Sepolia ETH from faucet.sepolia.dev |
| "Wrong network" | Switch MetaMask to Sepolia testnet |
| Port 3000 in use | Change port in docker-compose.yml |
| Build fails | `npm cache clean --force && npm install` |
| Node error | Use Node 18+ (`node --version`) |

---

## 🔒 Security

- ✅ ReentrancyGuard on transfers
- ✅ OnlyOwner access control
- ✅ Input validation
- ✅ Overflow protection (Solidity 0.8+)
- ✅ No private keys in frontend
- ✅ EIP-1193 compliant wallet

---

## ❓ FAQ

**Q: Can I change the faucet amounts?**
A: Yes, edit constants in TokenFaucet.sol and redeploy.

**Q: How much does deployment cost?**
A: Sepolia testnet = FREE | Mainnet = $2-20 (gas fees)

**Q: What's the daily/lifetime limit?**
A: 5 FRC per claim (24h cooldown), 100 FRC lifetime

**Q: Can I deploy to mainnet?**
A: Yes, update hardhat.config.js and .env with mainnet RPC

**Q: How do I verify contracts on Etherscan?**
A: Deployment script does it automatically (if ETHERSCAN_API_KEY set)

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Smart Contracts | 2 |
| Test Cases | 100+ |
| Total Files | 22+ |
| Lines of Code | 3,850+ |
| Setup Time | ~5 minutes |
| Deployment Time | ~5 minutes |

---

## 📚 Resources

- [Solidity Docs](https://docs.soliditylang.org/)
- [Hardhat Docs](https://hardhat.org/docs)
- [Ethers.js Docs](https://docs.ethers.org/)
- [React Docs](https://react.dev/)
- [Sepolia Faucet](https://faucet.sepolia.dev)

---

**Version**: 1.0.0 | **Status**: Production Ready ✅ | **Network**: Sepolia
Built with: Solidity, React, Hardhat, Docker
