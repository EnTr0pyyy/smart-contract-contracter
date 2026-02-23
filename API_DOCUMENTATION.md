# AI Smart Contract Risk Analyzer - Production Implementation

## 🎯 Project Overview

This is a production-grade, full-stack web application that analyzes smart contracts for security risks using on-device AI and blockchain integrations.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│  - RunAnywhere SDK (On-device AI)                           │
│  - Authentication UI                                         │
│  - Contract Analysis Interface                              │
│  - User Dashboard                                            │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼───────────────────────────────────────┐
│                  Backend API (Node.js + Express)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware Layer                                      │   │
│  │  - JWT Authentication                                 │   │
│  │  - API Key Authentication                            │   │
│  │  - Rate Limiting (Tier-based)                        │   │
│  │  - Request Validation                                │   │
│  │  - Error Handling                                    │   │
│  │  - Audit Logging                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Services Layer                                        │   │
│  │  - AI Analysis Service (On-device + Cloud)           │   │
│  │  - Etherscan Integration Service                     │   │
│  │  - Static Analysis Service                           │   │
│  │  - PDF Generation Service                            │   │
│  │  - Caching Service                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┴──────────────┐
          │                            │
┌─────────▼─────────┐    ┌────────────▼──────────┐
│   PostgreSQL      │    │   Redis Cache         │
│   Database        │    │   - Contract Data     │
│   - Users         │    │   - Analysis Results  │
│   - Analyses      │    │   - Rate Limits       │
│   - API Usage     │    └───────────────────────┘
│   - Audit Logs    │
└───────────────────┘
```

## 🔐 Authentication & Authorization

### Authentication Methods

1. **JWT Bearer Token** (For Web App)
   ```
   Authorization: Bearer <jwt_token>
   ```

2. **API Key** (For Enterprise Integration)
   ```
   X-API-Key: <api_key>
   ```

### User Tiers

- **FREE**: 10 requests per 15 minutes
- **PRO**: 100 requests per 15 minutes
- **ENTERPRISE**: 1000 requests per 15 minutes + API key access

## 📡 API Endpoints

### Base URL
```
Development: http://localhost:3001/api/v1
Production: https://api.contractanalyzer.com/api/v1
```

### Authentication Endpoints

#### POST /api/v1/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "FREE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "timestamp": "2024-02-19T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### POST /api/v1/auth/login
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "tier": "PRO"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/v1/auth/refresh
Refresh JWT token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/v1/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "PRO",
    "apiKey": "sk_live_abc123...",
    "createdAt": "2024-01-01T00:00:00Z",
    "stats": {
      "totalAnalyses": 45,
      "remainingQuota": 55
    }
  }
}
```

### Contract Analysis Endpoints

#### POST /api/v1/analyze
Analyze a smart contract (code or address).

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body (Option 1 - Source Code):**
```json
{
  "code": "pragma solidity ^0.8.0;\n\ncontract MyToken { ... }",
  "mode": "BEGINNER",
  "chain": "ethereum"
}
```

**Request Body (Option 2 - Contract Address):**
```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "chain": "ethereum",
  "mode": "DEVELOPER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123",
    "overallScore": 7.2,
    "confidence": 85,
    "status": "COMPLETED",
    "categories": [
      {
        "name": "Administrative Controls",
        "score": 8,
        "weight": 0.25,
        "findings": [
          "Owner can pause contract at any time",
          "Single owner address controls all administrative functions"
        ],
        "impact": "Owner has unrestricted control over contract operations",
        "severity": "HIGH"
      },
      {
        "name": "Fund Safety",
        "score": 9,
        "weight": 0.30,
        "findings": [
          "Emergency withdrawal function allows owner to drain all funds",
          "No timelock on withdrawal functions"
        ],
        "impact": "User funds can be withdrawn by owner without notice",
        "severity": "CRITICAL"
      },
      {
        "name": "Upgrade Mechanisms",
        "score": 5,
        "weight": 0.20,
        "findings": [
          "Contract uses delegatecall for upgrade logic"
        ],
        "impact": "Contract logic can be changed by upgrading implementation",
        "severity": "MEDIUM"
      },
      {
        "name": "Economic Manipulation",
        "score": 7,
        "weight": 0.15,
        "findings": [
          "Mint function has no maximum supply cap",
          "Owner can mint unlimited tokens"
        ],
        "impact": "Token supply can be inflated arbitrarily",
        "severity": "HIGH"
      },
      {
        "name": "Access Controls",
        "score": 6,
        "weight": 0.10,
        "findings": [
          "Single modifier for access control",
          "No role-based permissions"
        ],
        "impact": "Limited flexibility in permission management",
        "severity": "MEDIUM"
      }
    ],
    "summary": "This contract exhibits high-risk characteristics including centralized owner control, unlimited minting capabilities, and unrestricted fund withdrawal. Users should exercise extreme caution.",
    "recommendations": [
      "Implement multi-signature wallet for administrative functions",
      "Add maximum supply cap to prevent unlimited minting",
      "Implement timelock for withdrawal functions",
      "Consider using OpenZeppelin's AccessControl for role-based permissions"
    ],
    "metadata": {
      "linesOfCode": 234,
      "complexity": "MEDIUM",
      "compilerVersion": "0.8.19",
      "processingTimeMs": 4532
    },
    "createdAt": "2024-02-19T10:00:00Z"
  },
  "meta": {
    "timestamp": "2024-02-19T10:00:05Z",
    "requestId": "req_xyz789",
    "processingTime": 4532
  }
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 847
```

#### GET /api/v1/analyze/:id
Retrieve a previous analysis result.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Same structure as POST /api/v1/analyze response
  }
}
```

#### GET /api/v1/analyze
List user's analysis history.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "analysis_abc123",
        "contractAddress": "0x1234...",
        "overallScore": 7.2,
        "chain": "ethereum",
        "createdAt": "2024-02-19T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### Comparison Endpoints

#### POST /api/v1/compare
Compare two contracts.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "analysisAId": "analysis_abc123",
  "analysisBId": "analysis_def456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "comparison_xyz789",
    "analysisA": {
      "id": "analysis_abc123",
      "overallScore": 7.2,
      "contractAddress": "0x1234..."
    },
    "analysisB": {
      "id": "analysis_def456",
      "overallScore": 3.5,
      "contractAddress": "0x5678..."
    },
    "differences": {
      "scoreΔ": -3.7,
      "categoryDifferences": [
        {
          "category": "Fund Safety",
          "scoreΔ": -5,
          "description": "Contract A has significantly worse fund safety controls"
        }
      ],
      "summary": "Contract B is considerably safer with better fund controls and less centralization"
    }
  }
}
```

### Report Endpoints

#### GET /api/v1/report/:id/pdf
Generate and download PDF report for analysis.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="contract-analysis-abc123.pdf"

<PDF binary data>
```

### Utility Endpoints

#### GET /api/v1/health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-02-19T10:00:00Z",
    "uptime": 86400,
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "ai": "ready"
    }
  }
}
```

#### GET /api/v1/chains
Get list of supported blockchain networks.

**Response:**
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "id": "ethereum",
        "name": "Ethereum Mainnet",
        "explorerUrl": "https://etherscan.io"
      },
      {
        "id": "polygon",
        "name": "Polygon",
        "explorerUrl": "https://polygonscan.com"
      },
      {
        "id": "bsc",
        "name": "Binance Smart Chain",
        "explorerUrl": "https://bscscan.com"
      },
      {
        "id": "arbitrum",
        "name": "Arbitrum",
        "explorerUrl": "https://arbiscan.io"
      }
    ]
  }
}
```

### Admin Endpoints (Enterprise Tier Only)

#### GET /api/v1/admin/stats
Get system-wide statistics.

**Headers:**
```
Authorization: Bearer <jwt_token>
X-API-Key: <enterprise_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAnalyses": 12450,
    "totalUsers": 1250,
    "analysesToday": 234,
    "averageScore": 5.7,
    "topRisks": [
      {"category": "Fund Safety", "count": 450},
      {"category": "Administrative Controls", "count": 380}
    ]
  }
}
```

## 🔒 Security Features

### 1. Rate Limiting
- IP-based rate limiting for anonymous users
- User-based rate limiting for authenticated users
- Tier-based limits (FREE, PRO, ENTERPRISE)
- Rate limit headers in every response

### 2. Input Validation
- Contract size limits (max 1MB)
- Address format validation
- SQL injection prevention
- XSS protection

### 3. Authentication Security
- Password hashing with bcrypt (12 rounds)
- JWT with expiration
- Refresh token rotation
- API key generation for enterprise

### 4. Audit Logging
- All API requests logged
- User actions tracked
- IP address and user agent captured
- Exportable audit trails

### 5. Data Protection
- HTTPS only in production
- CORS configuration
- Helmet.js security headers
- Environment variable protection

## 📊 Database Schema

### Users
```
id, email, password, name, apiKey, tier, createdAt, updatedAt, lastLoginAt
```

### Analysis
```
id, userId, contractAddress, contractCode, chain, overallScore, confidence,
summary, categories (JSON), findings (JSON), recommendations (JSON),
metadata (JSON), analysisMode, status, processingTimeMs, createdAt
```

### Comparison
```
id, analysisAId, analysisBId, differences (JSON), createdAt
```

### ContractCache
```
id, contractAddress, chain, sourceCode, abi (JSON), compilerVersion,
isVerified, fetchedAt, expiresAt
```

### RateLimit
```
id, identifier, endpoint, requestCount, windowStart, expiresAt
```

### ApiUsage
```
id, userId, endpoint, method, statusCode, responseTimeMs, timestamp,
ipAddress, userAgent
```

### AuditLog
```
id, userId, action, resource, resourceId, details (JSON), ipAddress,
userAgent, timestamp
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (optional, for caching)

### Backend Setup

1. **Install dependencies:**
```bash
cd server
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database:**
```bash
# Create PostgreSQL database
createdb contract_analyzer

# Run migrations
npm run migrate

# Generate Prisma client
npm run generate
```

4. **Start server:**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Frontend Setup

The frontend is already set up in the root directory. Update it to connect to the API:

1. **Create API client:**
```bash
cd ..
# Frontend files are already in src/
```

2. **Update environment:**
```bash
# Add to .env or vite config
VITE_API_URL=http://localhost:3001/api/v1
```

## 📝 Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  },
  "meta": {
    "timestamp": "2024-02-19T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error
- `CONTRACT_NOT_VERIFIED` (400): Contract not verified on blockchain
- `ANALYSIS_FAILED` (500): AI analysis failed

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

## 📦 Deployment

### Docker
```bash
# Build image
docker build -t contract-analyzer-api .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  contract-analyzer-api
```

### Kubernetes
```yaml
# See deployment.yaml for full configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: contract-analyzer-api
spec:
  replicas: 3
  ...
```

## 📈 Monitoring

- Health check: `GET /api/v1/health`
- Metrics endpoint: `GET /api/v1/metrics` (Enterprise)
- Error tracking: Sentry integration
- Performance: Response time tracking
- Audit logs: All API calls logged

## 🎯 Next Steps

1. Install backend dependencies
2. Set up PostgreSQL database
3. Configure environment variables
4. Run database migrations
5. Start the API server
6. Test endpoints with Postman/curl
7. Integrate frontend with API
8. Deploy to production

---

**Status**: ✅ Ready for Development
**Estimated Setup Time**: 30-45 minutes
**Production Ready**: Yes (with proper configuration)
