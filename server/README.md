# AI Smart Contract Risk Analyzer - Backend API

Production-grade backend service for deterministic smart contract risk analysis.

## 🎯 Features

- **Deterministic Risk Detection** - Rule-based analysis (NO AI in detection phase)
- **Multi-Chain Support** - Ethereum, Polygon, BSC
- **AI-Powered Explanations** - Safe, sandboxed AI for human-readable summaries
- **Redis Caching** - High-performance caching layer
- **Rate Limiting** - Tier-based protection
- **Type-Safe** - Full TypeScript implementation

## 🏗️ Architecture

```
Layer 1: Contract Acquisition → Fetch from blockchain explorers
Layer 2: Risk Detection      → Deterministic pattern matching (6 detectors, 18 risk types)
Layer 3: AI Explanation      → Translate findings to human language
```

## 📋 Prerequisites

- Node.js 18+
- Redis 6+
- PostgreSQL 14+ (optional, for user accounts)
- API Keys for blockchain explorers

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ETHERSCAN_API_KEY=your-key
REDIS_URL=redis://localhost:6379

# Optional
POLYGONSCAN_API_KEY=your-key
BSCSCAN_API_KEY=your-key
OPENAI_API_KEY=your-key  # For AI explanations
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
redis-server
```

### 4. Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3001`

## 📡 API Endpoints

### Health Check
```bash
GET /api/v1/health
```

### Analyze Contract
```bash
POST /api/v1/analyze
Content-Type: application/json

{
  "input": "0x1234... OR pragma solidity ^0.8.0; contract ...",
  "chain": "ethereum",
  "mode": "BEGINNER"
}
```

### Get Supported Chains
```bash
GET /api/v1/chains
```

## 🧪 Testing

### Test with Sample Contracts

```bash
curl -X POST http://localhost:3001/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "input": "pragma solidity ^0.8.0; contract Test { address public owner; modifier onlyOwner() { require(msg.sender == owner); _; } function mint(uint256 amount) public onlyOwner { } }",
    "chain": "ethereum",
    "mode": "BEGINNER"
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123",
    "risk_score": 5.0,
    "classification": "MODERATE",
    "confidence": 95,
    "risks": [
      {
        "type": "OWNER_RESTRICTED_MINTING",
        "severity": "HIGH",
        "weight": 2.0,
        "code_snippet": "function mint(uint256 amount) public onlyOwner",
        "line_number": 1,
        "beginner_explanation": "Only the owner can create new tokens...",
        "developer_explanation": "Mint function restricted with onlyOwner modifier...",
        "mitigation": "Consider decentralized minting or timelock"
      }
    ],
    "beginner_summary": "This contract has moderate risk...",
    "developer_summary": "Analysis detected centralized minting...",
    "metadata": {
      "chain": "ethereum",
      "lines_of_code": 5,
      "processing_time_ms": 1234
    }
  }
}
```

## 🔍 Risk Detection Details

### Detectors (6)

1. **MintingDetector**
   - Unlimited minting (CRITICAL - 3.0)
   - Owner-restricted minting (HIGH - 2.0)

2. **FundControlDetector**
   - Withdrawal functions (CRITICAL - 3.0)
   - Emergency withdrawal (CRITICAL - 3.5)
   - Balance manipulation (HIGH - 2.5)

3. **OwnershipDetector**
   - Centralized ownership (HIGH - 2.0)
   - Pausable contract (MEDIUM - 1.5)
   - Ownership transfer (MEDIUM - 1.0)

4. **UpgradeDetector**
   - Delegatecall usage (HIGH - 2.5)
   - UUPS proxy (MEDIUM - 1.5)
   - Transparent proxy (MEDIUM - 1.5)

5. **DangerousFunctionsDetector**
   - Selfdestruct (CRITICAL - 4.0)
   - tx.origin usage (HIGH - 2.0)
   - Unchecked calls (MEDIUM - 1.5)

6. **EconomicDetector**
   - Adjustable fees (HIGH - 2.0)
   - Blacklist modification (MEDIUM - 1.5)
   - Whitelist modification (MEDIUM - 1.0)
   - Max TX limit (LOW - 0.5)

### Risk Score Formula

```
risk_score = min(10, Σ(weight_i for all detected risks))
```

### Classification

- 0.0 - 2.0: Very Low Risk (Green)
- 2.1 - 4.0: Low Risk (Light Green)
- 4.1 - 6.0: Moderate Risk (Yellow)
- 6.1 - 8.0: High Risk (Orange)
- 8.1 - 10.0: Very High Risk (Red)

## 🔐 Security Features

- **No Code Execution** - Never runs user-submitted code
- **Rate Limiting** - Redis-based rate limiting
- **Input Validation** - Joi schema validation
- **Size Limits** - Max 1MB contract size
- **Helmet.js** - Security headers
- **CORS** - Configurable origins
- **AI Safety** - AI cannot detect new risks or modify scores

## 📦 Project Structure

```
server/
├── src/
│   ├── index.ts                     # Entry point
│   ├── app.ts                       # Express app setup
│   ├── config/
│   │   └── index.ts                 # Configuration
│   ├── controllers/
│   │   ├── analyze.controller.ts    # Analysis endpoints
│   │   └── health.controller.ts     # Health checks
│   ├── middleware/
│   │   ├── errorHandler.ts          # Error handling
│   │   ├── logger.ts                # Request logging
│   │   ├── rateLimiter.ts           # Rate limiting
│   │   └── validator.ts             # Input validation
│   ├── services/
│   │   ├── risk-detection/
│   │   │   ├── risk-engine.service.ts        # Main orchestrator
│   │   │   ├── ast-parser.service.ts         # Solidity parser
│   │   │   ├── scoring-algorithm.service.ts  # Risk scoring
│   │   │   └── detectors/
│   │   │       ├── base-detector.ts
│   │   │       ├── minting-detector.ts
│   │   │       ├── fund-control-detector.ts
│   │   │       ├── ownership-detector.ts
│   │   │       ├── upgrade-detector.ts
│   │   │       ├── dangerous-fn-detector.ts
│   │   │       └── economic-detector.ts
│   │   ├── ai-explanation/
│   │   │   └── ai-service.ts        # AI explanation layer
│   │   ├── caching/
│   │   │   ├── redis.service.ts     # Redis client
│   │   │   └── cache-keys.ts        # Key generators
│   │   └── etherscan.service.ts     # Blockchain APIs
│   ├── routes/
│   │   └── v1/
│   │       └── index.ts             # API routes
│   ├── types/
│   │   └── risk.types.ts            # Type definitions
│   ├── utils/
│   │   ├── ApiError.ts              # Error class
│   │   └── validation-schemas.ts    # Joi schemas
│   └── tests/
│       └── fixtures/
│           └── sample-contracts.ts  # Test contracts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Performance

- **P95 Cached**: < 5s
- **P95 Fresh**: < 12s
- **Redis Cache Hit Rate**: > 80%
- **Concurrent Users**: 100+

## 🚢 Deployment

### Docker

```bash
docker build -t contract-analyzer-api .
docker run -p 3001:3001 --env-file .env contract-analyzer-api
```

### Production

1. Set `NODE_ENV=production`
2. Use process manager (PM2):
   ```bash
   npm run build
   pm2 start dist/index.js --name contract-analyzer-api
   ```

## 📝 Environment Variables

See `.env.example` for full list. Key variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Authentication secret
- `ETHERSCAN_API_KEY` - Ethereum explorer
- `POLYGONSCAN_API_KEY` - Polygon explorer
- `BSCSCAN_API_KEY` - BSC explorer
- `OPENAI_API_KEY` - AI service (optional)
- `ENABLE_CACHING` - Enable/disable Redis

## 🐛 Troubleshooting

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### API Key Errors

```bash
# Test Etherscan API
curl "https://api.etherscan.io/api?module=contract&action=getsourcecode&address=0x...&apikey=YOUR_KEY"
```

### Port Already in Use

```bash
# Change PORT in .env
PORT=3002
```

## 📚 Documentation

- [Production Architecture](../PRODUCTION_ARCHITECTURE.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [API Documentation](../API_DOCUMENTATION.md)

## 🤝 Contributing

This is a production-grade implementation. Follow these guidelines:

1. All risk detection MUST be deterministic
2. AI MUST NOT detect risks
3. Every finding MUST include code reference
4. Add tests for new detectors
5. Update documentation

## 📄 License

MIT

---

**Status**: ✅ Production Ready  
**Version**: 2.0.0  
**Last Updated**: February 23, 2026
