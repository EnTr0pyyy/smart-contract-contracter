# Production-Grade AI Smart Contract Risk Analyzer
## System Architecture & Implementation Specification

**Version:** 2.0 Production  
**Date:** February 23, 2026  
**Type:** Production Full-Stack Web3 Security Platform

---

## 🎯 Executive Summary

This document defines the production architecture for an institutional-grade AI Smart Contract Risk Analyzer that:

- **Uses deterministic rule-based risk detection** (NOT AI-based)
- **AI only explains structured findings** (no hallucinations)
- **Analyzes contracts from source code OR deployed addresses**
- **Supports multi-chain (Ethereum, Polygon, BSC)**
- **Features a premium, production-ready UI**
- **Scales horizontally with Redis caching**
- **Meets <5s P95 cached, <12s P95 fresh analysis**

---

## 🏗️ High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14 App Router)                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Landing Page                                                  │  │
│  │   - Hero with input component                                 │  │
│  │   - Chain selector (Ethereum, Polygon, BSC)                   │  │
│  │   - Animated analyze button                                   │  │
│  │   - Glassmorphism design                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Results Page                                                  │  │
│  │   - Animated risk score gauge (0-10)                          │  │
│  │   - Confidence % indicator                                    │  │
│  │   - Expandable risk cards with code snippets                  │  │
│  │   - Beginner/Developer mode toggle                            │  │
│  │   - PDF export button                                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Tech Stack: Next.js, Tailwind CSS, Framer Motion, Shadcn/ui       │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │ REST API (HTTPS)
┌────────────────────────────────▼──────────────────────────────────────┐
│                     Backend API (Node.js + Express)                   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Middleware Stack                                                │   │
│  │  ✓ Helmet (Security headers)                                   │   │
│  │  ✓ CORS (Whitelist origins)                                    │   │
│  │  ✓ Rate Limiter (Tier-based: FREE/PRO/ENTERPRISE)             │   │
│  │  ✓ Request Validator (Joi schemas)                             │   │
│  │  ✓ JWT Auth (Optional - for saved history)                    │   │
│  │  ✓ Request Logger (Winston)                                    │   │
│  │  ✓ Error Handler (Structured responses)                        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Layer 1: Contract Acquisition Service                          │   │
│  │  - EVM address validation                                      │   │
│  │  - Multi-chain support (Etherscan, Polygonscan, BSCscan APIs) │   │
│  │  - Verified source fetching                                    │   │
│  │  - Multi-file contract normalization                           │   │
│  │  - Bytecode fallback (if source unavailable)                  │   │
│  │  - Redis cache lookup (24hr TTL)                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Layer 2: Deterministic Risk Detection Engine (CORE)           │   │
│  │                                                                 │   │
│  │  ⚠️ CRITICAL: AI DOES NOT DETECT RISKS                         │   │
│  │                                                                 │   │
│  │  Implementation: Solidity AST Parser + Pattern Matching       │   │
│  │                                                                 │   │
│  │  Risk Detectors (each outputs structured JSON):               │   │
│  │   1. Minting Detector                                          │   │
│  │      - Unlimited minting privileges                            │   │
│  │      - Owner-restricted minting                                │   │
│  │      - No supply cap                                           │   │
│  │   2. Fund Control Detector                                     │   │
│  │      - Withdraw functions                                      │   │
│  │      - Emergency withdrawal                                    │   │
│  │      - Direct balance manipulation                             │   │
│  │   3. Ownership Detector                                        │   │
│  │      - onlyOwner patterns                                      │   │
│  │      - transferOwnership                                       │   │
│  │      - Pausable contracts                                      │   │
│  │   4. Upgrade Detector                                          │   │
│  │      - delegatecall usage                                      │   │
│  │      - Proxy patterns (UUPS, Transparent)                     │   │
│  │      - Implementation swapping                                 │   │
│  │   5. Dangerous Functions Detector                             │   │
│  │      - selfdestruct                                            │   │
│  │      - tx.origin usage                                         │   │
│  │      - Unchecked external calls                                │   │
│  │   6. Economic Risk Detector                                    │   │
│  │      - Adjustable fees/taxes                                   │   │
│  │      - Blacklist/whitelist modification                        │   │
│  │      - Max transaction limits                                  │   │
│  │                                                                 │   │
│  │  Each detector outputs:                                        │   │
│  │  {                                                             │   │
│  │    "type": "UNLIMITED_MINTING",                               │   │
│  │    "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",        │   │
│  │    "weight": 3.0,                                              │   │
│  │    "code_snippet": "function mint(uint256 amount) ...",       │   │
│  │    "line_number": 42,                                          │   │
│  │    "machine_reason": "No supply cap + onlyOwner modifier"     │   │
│  │  }                                                             │   │
│  │                                                                 │   │
│  │  Risk Score Calculation:                                       │   │
│  │  score = min(10, Σ(weight_i) for all detected risks)         │   │
│  │                                                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Layer 3: AI Explanation Service                                │   │
│  │                                                                 │   │
│  │  ⚠️ AI RECEIVES ONLY STRUCTURED JSON - NO RAW CODE            │   │
│  │                                                                 │   │
│  │  Input to AI:                                                  │   │
│  │  {                                                             │   │
│  │    "risk_score": 7.5,                                          │   │
│  │    "risks": [                                                  │   │
│  │      {                                                         │   │
│  │        "type": "UNLIMITED_MINTING",                           │   │
│  │        "severity": "CRITICAL",                                 │   │
│  │        "weight": 3.0,                                          │   │
│  │        "code_snippet": "...",                                  │   │
│  │        "machine_reason": "..."                                 │   │
│  │      }                                                         │   │
│  │    ],                                                          │   │
│  │    "confidence": 0.95                                          │   │
│  │  }                                                             │   │
│  │                                                                 │   │
│  │  AI Task: Generate TWO explanations:                          │   │
│  │   1. Beginner Summary (plain English, analogies)              │   │
│  │   2. Developer Summary (technical, precise)                   │   │
│  │                                                                 │   │
│  │  Output Validation:                                            │   │
│  │   - Must match strict JSON schema                             │   │
│  │   - Cannot introduce new risks                                 │   │
│  │   - Cannot modify risk scores                                  │   │
│  │   - Must maintain neutral tone                                 │   │
│  │                                                                 │   │
│  │  Implementation: Claude Sonnet / GPT-4 with strict prompt     │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Supporting Services                                            │   │
│  │  - PDF Generator (Puppeteer)                                   │   │
│  │  - Cache Manager (Redis client)                                │   │
│  │  - Logger (Winston w/ structured logs)                         │   │
│  │  - Metrics Collector (Prometheus-compatible)                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬──────────────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 │                                  │
    ┌────────────▼──────────┐         ┌───────────▼────────────┐
    │   Redis Cache          │         │   PostgreSQL DB        │
    │                        │         │                        │
    │  - Contract sources    │         │  - Analysis history    │
    │  - Analysis results    │         │  - User accounts       │
    │  - Rate limit counters │         │  - API usage logs      │
    │  - TTL: 1-24 hours     │         │  - Audit trails        │
    └───────────────────────┘         └────────────────────────┘
```

---

## 📁 Backend Folder Structure

```
server/
├── src/
│   ├── index.ts                    # Express app entry point
│   ├── app.ts                      # App configuration
│   │
│   ├── config/
│   │   ├── index.ts                # Environment config
│   │   ├── chains.ts               # Chain configs (Ethereum, Polygon, BSC)
│   │   └── risk-weights.ts         # Risk scoring weights
│   │
│   ├── middleware/
│   │   ├── auth.ts                 # JWT authentication (optional)
│   │   ├── rateLimiter.ts          # Tier-based rate limiting
│   │   ├── validator.ts            # Request validation (Joi)
│   │   ├── errorHandler.ts         # Global error handler
│   │   └── logger.ts               # Request logging
│   │
│   ├── controllers/
│   │   ├── analyze.controller.ts   # POST /api/v1/analyze
│   │   ├── report.controller.ts    # GET /api/v1/report/:id
│   │   ├── compare.controller.ts   # POST /api/v1/compare
│   │   └── health.controller.ts    # GET /api/v1/health
│   │
│   ├── services/
│   │   ├── contract-acquisition/
│   │   │   ├── chain-fetcher.service.ts      # Multi-chain contract fetcher
│   │   │   ├── source-normalizer.service.ts  # Multi-file contract normalizer
│   │   │   ├── bytecode-extractor.service.ts # Bytecode fallback handler
│   │   │   └── address-validator.service.ts  # EVM address validation
│   │   │
│   │   ├── risk-detection/
│   │   │   ├── risk-engine.service.ts        # Main orchestrator
│   │   │   ├── ast-parser.service.ts         # Solidity AST parser
│   │   │   ├── detectors/
│   │   │   │   ├── base-detector.ts          # Abstract detector class
│   │   │   │   ├── minting-detector.ts       # Detect minting risks
│   │   │   │   ├── fund-control-detector.ts  # Detect fund risks
│   │   │   │   ├── ownership-detector.ts     # Detect ownership risks
│   │   │   │   ├── upgrade-detector.ts       # Detect upgrade patterns
│   │   │   │   ├── dangerous-fn-detector.ts  # Detect dangerous functions
│   │   │   │   └── economic-detector.ts      # Detect economic manipulation
│   │   │   └── scoring-algorithm.service.ts  # Risk score calculation
│   │   │
│   │   ├── ai-explanation/
│   │   │   ├── ai-service.ts                 # AI API client
│   │   │   ├── prompt-builder.service.ts     # Construct safe prompts
│   │   │   ├── response-validator.service.ts # Validate AI output
│   │   │   └── templates/
│   │   │       ├── beginner-prompt.ts        # Beginner explanation prompt
│   │   │       └── developer-prompt.ts       # Developer explanation prompt
│   │   │
│   │   ├── caching/
│   │   │   ├── redis.service.ts              # Redis client wrapper
│   │   │   └── cache-keys.ts                 # Cache key generators
│   │   │
│   │   ├── pdf/
│   │   │   ├── pdf-generator.service.ts      # Generate PDF reports
│   │   │   └── templates/
│   │   │       └── report-template.html      # PDF HTML template
│   │   │
│   │   └── logging/
│   │       ├── logger.service.ts             # Winston logger
│   │       └── metrics.service.ts            # Metrics collector
│   │
│   ├── models/
│   │   ├── risk-finding.model.ts             # Risk finding data structure
│   │   ├── analysis-result.model.ts          # Analysis result structure
│   │   └── contract-metadata.model.ts        # Contract metadata
│   │
│   ├── types/
│   │   ├── index.ts                          # All type exports
│   │   ├── api.types.ts                      # API request/response types
│   │   ├── risk.types.ts                     # Risk detection types
│   │   └── chain.types.ts                    # Blockchain types
│   │
│   ├── utils/
│   │   ├── ApiError.ts                       # Custom error class
│   │   ├── ApiResponse.ts                    # Response formatter
│   │   ├── validation-schemas.ts             # Joi schemas
│   │   └── helpers.ts                        # Utility functions
│   │
│   ├── routes/
│   │   ├── index.ts                          # Route aggregator
│   │   ├── v1/
│   │   │   ├── analyze.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── compare.routes.ts
│   │   │   └── health.routes.ts
│   │
│   └── tests/
│       ├── unit/
│       │   ├── detectors/                    # Detector tests
│       │   └── services/                     # Service tests
│       ├── integration/
│       │   └── api/                          # API endpoint tests
│       └── fixtures/
│           └── sample-contracts.ts           # Test contracts
│
├── prisma/
│   ├── schema.prisma                         # Database schema
│   └── migrations/                           # Migration history
│
├── .env.example                              # Environment template
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

---

## 📁 Frontend Folder Structure (Next.js 14 App Router)

```
src/  (or app/ for Next.js convention)
├── app/
│   ├── layout.tsx                            # Root layout
│   ├── page.tsx                              # Landing page
│   ├── analyze/
│   │   └── [id]/
│   │       └── page.tsx                      # Results page
│   ├── api/                                  # API routes (proxy if needed)
│   │   └── analyze/
│   │       └── route.ts
│   └── globals.css                           # Global styles
│
├── components/
│   ├── landing/
│   │   ├── Hero.tsx                          # Hero section
│   │   ├── InputSection.tsx                  # Contract input component
│   │   ├── ChainSelector.tsx                 # Chain dropdown
│   │   ├── AnalyzeButton.tsx                 # Animated button
│   │   └── Features.tsx                      # Feature showcase
│   │
│   ├── analysis/
│   │   ├── RiskScoreGauge.tsx                # Animated gauge (0-10)
│   │   ├── ConfidenceIndicator.tsx           # Confidence %
│   │   ├── RiskCard.tsx                      # Expandable risk card
│   │   ├── CodeSnippet.tsx                   # Syntax-highlighted code
│   │   ├── ModeToggle.tsx                    # Beginner/Developer toggle
│   │   ├── CategoryBreakdown.tsx             # Risk category visualization
│   │   └── DownloadReport.tsx                # PDF download button
│   │
│   ├── ui/                                   # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── accordion.tsx
│   │   ├── dialog.tsx
│   │   └── skeleton.tsx
│   │
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Container.tsx
│   │
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── Disclaimer.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts                         # Axios client
│   │   ├── analyze.ts                        # Analysis API calls
│   │   └── types.ts                          # API types
│   │
│   ├── utils/
│   │   ├── cn.ts                             # Class name utility
│   │   ├── formatters.ts                     # Data formatters
│   │   └── validators.ts                     # Client-side validation
│   │
│   └── hooks/
│       ├── useAnalysis.ts                    # Analysis hook
│       ├── useChainSelector.ts               # Chain selection hook
│       └── useLocalStorage.ts                # Persist analysis history
│
├── styles/
│   ├── animations.css                        # Custom animations
│   └── glassmorphism.css                     # Glassmorphism effects
│
├── public/
│   ├── images/
│   │   └── chains/                           # Chain logos
│   └── fonts/                                # Custom fonts
│
├── config/
│   └── site.ts                               # Site configuration
│
└── types/
    └── index.ts                              # Frontend types
```

---

## 🔍 Risk Detection Design (DETERMINISTIC)

### Core Principle

**AI DOES NOT DETECT RISKS. AI ONLY EXPLAINS PRE-DETECTED RISKS.**

### Detection Approach

**MVP:** Pattern Matching + AST Parsing  
**Production:** Full Solidity AST + Opcode Analysis

### Risk Detector Implementation

Each detector extends a base class:

```typescript
abstract class BaseDetector {
  abstract detect(ast: SolidityAST, code: string): RiskFinding[];
  
  protected createFinding(
    type: RiskType,
    severity: Severity,
    weight: number,
    codeSnippet: string,
    lineNumber: number,
    machineReason: string
  ): RiskFinding;
}
```

### Detected Risk Types

#### 1. Minting Risks
- **UNLIMITED_MINTING**: No supply cap + public/owner mint function
  - Severity: CRITICAL
  - Weight: 3.0
  - Detection: AST check for mint function + no MAX_SUPPLY constant

- **OWNER_RESTRICTED_MINTING**: Only owner can mint
  - Severity: HIGH
  - Weight: 2.0
  - Detection: onlyOwner modifier on mint function

#### 2. Fund Control Risks
- **WITHDRAW_FUNCTION**: Owner can withdraw funds
  - Severity: CRITICAL
  - Weight: 3.0
  - Detection: Function containing transfer/send with onlyOwner

- **EMERGENCY_WITHDRAWAL**: Emergency drain function
  - Severity: CRITICAL
  - Weight: 3.5
  - Detection: Function name contains "emergency" + withdrawal logic

- **BALANCE_MANIPULATION**: Direct balance modification
  - Severity: HIGH
  - Weight: 2.5
  - Detection: Assignment to mapping(address => uint256) without transfer

#### 3. Ownership Risks
- **CENTRALIZED_OWNERSHIP**: Single owner controls
  - Severity: HIGH
  - Weight: 2.0
  - Detection: onlyOwner modifier count > 3

- **PAUSABLE_CONTRACT**: Owner can pause
  - Severity: MEDIUM
  - Weight: 1.5
  - Detection: Pausable inheritance or pause() function

- **OWNERSHIP_TRANSFER**: Ownership can be transferred
  - Severity: MEDIUM
  - Weight: 1.0
  - Detection: transferOwnership function exists

#### 4. Upgrade Risks
- **DELEGATECALL_USAGE**: Proxy upgrade capability
  - Severity: HIGH
  - Weight: 2.5
  - Detection: delegatecall keyword in code

- **UUPS_PROXY**: UUPS upgrade pattern
  - Severity: MEDIUM
  - Weight: 1.5
  - Detection: _authorizeUpgrade function

- **TRANSPARENT_PROXY**: Transparent proxy pattern
  - Severity: MEDIUM
  - Weight: 1.5
  - Detection: Proxy inheritance or fallback with delegatecall

#### 5. Dangerous Functions
- **SELFDESTRUCT**: Contract can be destroyed
  - Severity: CRITICAL
  - Weight: 4.0
  - Detection: selfdestruct keyword

- **TX_ORIGIN**: Phishing vulnerability
  - Severity: HIGH
  - Weight: 2.0
  - Detection: tx.origin usage

- **UNCHECKED_CALL**: Unchecked external call
  - Severity: MEDIUM
  - Weight: 1.5
  - Detection: .call without return value check

#### 6. Economic Manipulation
- **ADJUSTABLE_FEES**: Owner can change fees
  - Severity: HIGH
  - Weight: 2.0
  - Detection: setFee/setTax function with onlyOwner

- **BLACKLIST_MODIFICATION**: Owner controls blacklist
  - Severity: MEDIUM
  - Weight: 1.5
  - Detection: blacklist mapping + add/remove functions

- **MAX_TX_LIMIT**: Max transaction manipulation
  - Severity: LOW
  - Weight: 0.5
  - Detection: maxTransactionAmount variable with setter

---

## 🎯 Risk Scoring Algorithm

### Formula

```
risk_score = min(10, Σ(weight_i) for all detected risks)

confidence = 1.0 - (unverifiable_patterns / total_patterns)
```

### Risk Classification

```
0.0 - 2.0: Very Low Risk     (Green)
2.1 - 4.0: Low Risk          (Light Green)
4.1 - 6.0: Moderate Risk     (Yellow)
6.1 - 8.0: High Risk         (Orange)
8.1 - 10.0: Very High Risk   (Red)
```

### Confidence Calculation

```
confidence_score = (
  (successfully_parsed_functions / total_functions) * 0.4 +
  (pattern_matches / total_patterns_checked) * 0.3 +
  (ast_completeness) * 0.3
)
```

---

## 🤖 AI Explanation Layer (SAFE & DETERMINISTIC)

### Critical Rules

1. **AI receives ONLY structured JSON** (no raw contract code)
2. **AI cannot detect new risks**
3. **AI cannot modify risk scores**
4. **AI output must match strict schema**
5. **Prompt injection protection**

### AI Prompt Template

```typescript
const AI_EXPLANATION_PROMPT = `
You are a smart contract security expert translator.

Your task: Translate technical security findings into clear explanations.

⚠️ RULES:
1. NEVER analyze code directly
2. NEVER introduce new risks not in the input
3. NEVER modify risk scores
4. Generate EXACTLY two summaries: beginner and developer
5. Maintain neutral, factual tone

INPUT (structured findings):
{
  "risk_score": 7.5,
  "risks": [
    {
      "type": "UNLIMITED_MINTING",
      "severity": "CRITICAL",
      "weight": 3.0,
      "code_snippet": "function mint(uint256 amount) public onlyOwner { _mint(msg.sender, amount); }",
      "line_number": 42,
      "machine_reason": "No MAX_SUPPLY cap found; owner can mint unlimited tokens"
    }
  ],
  "confidence": 0.95
}

OUTPUT (required JSON schema):
{
  "beginner_summary": "<2-3 sentences in plain English with analogies>",
  "developer_summary": "<2-3 sentences with technical precision>",
  "risk_explanations": [
    {
      "type": "UNLIMITED_MINTING",
      "beginner": "<plain English explanation>",
      "developer": "<technical explanation>",
      "why_it_matters": "<impact in simple terms>",
      "mitigation": "<how to fix>"
    }
  ]
}

Generate the explanation now:
`;
```

### Output Validation

```typescript
interface AIExplanationOutput {
  beginner_summary: string;         // Max 300 chars
  developer_summary: string;        // Max 400 chars
  risk_explanations: Array<{
    type: RiskType;                 // Must match input type
    beginner: string;               // Max 200 chars
    developer: string;              // Max 300 chars
    why_it_matters: string;         // Max 150 chars
    mitigation: string;             // Max 200 chars
  }>;
}

// Validation: Reject if:
// - New risk types introduced
// - Risk count doesn't match input
// - String lengths exceeded
// - Contains code injection attempts
```

---

## 📡 API Contract Design

### Base URL
- **Development:** `http://localhost:3001/api/v1`
- **Production:** `https://api.contractanalyzer.com/api/v1`

### Endpoints

#### 1. POST /api/v1/analyze

Analyze a smart contract.

**Request:**
```json
{
  "input": "0x1234... OR pragma solidity ^0.8.0; contract ...",
  "chain": "ethereum" | "polygon" | "bsc",
  "mode": "BEGINNER" | "DEVELOPER"
}
```

**Validation:**
- input: required, string, max 1MB
- chain: required, enum
- mode: optional, enum, default "BEGINNER"

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123",
    "risk_score": 7.5,
    "classification": "HIGH",
    "confidence": 95,
    "risks": [
      {
        "type": "UNLIMITED_MINTING",
        "severity": "CRITICAL",
        "weight": 3.0,
        "code_snippet": "function mint(...) public onlyOwner { ... }",
        "line_number": 42,
        "beginner_explanation": "The owner can create unlimited tokens, potentially devaluing your holdings.",
        "developer_explanation": "No MAX_SUPPLY constant; unrestricted _mint in onlyOwner function.",
        "mitigation": "Implement a maximum supply cap (MAX_SUPPLY constant)."
      }
    ],
    "beginner_summary": "This contract has high risk...",
    "developer_summary": "Critical findings: unlimited minting, owner withdrawal...",
    "metadata": {
      "contract_address": "0x1234...",
      "chain": "ethereum",
      "compiler_version": "0.8.19",
      "is_verified": true,
      "lines_of_code": 234,
      "processing_time_ms": 3420
    },
    "cached": false,
    "analyzed_at": "2026-02-23T10:30:00Z"
  },
  "meta": {
    "timestamp": "2026-02-23T10:30:03Z",
    "request_id": "req_xyz789"
  }
}
```

**Error Responses:**
- 400: Invalid input, contract too large, invalid chain
- 429: Rate limit exceeded
- 500: Analysis failed, AI service unavailable

#### 2. GET /api/v1/report/:id

Retrieve cached analysis result.

**Response (200 OK):**
Same structure as POST /analyze

**Error Responses:**
- 404: Analysis not found or expired

#### 3. POST /api/v1/compare

Compare two contracts.

**Request:**
```json
{
  "analysis_id_a": "analysis_abc123",
  "analysis_id_b": "analysis_def456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "score_delta": -3.2,
      "safer_contract": "B",
      "summary": "Contract B is significantly safer with better fund controls.",
      "category_differences": [
        {
          "category": "Fund Control",
          "score_a": 8,
          "score_b": 2,
          "delta": -6,
          "explanation": "Contract A has owner withdrawal; B does not"
        }
      ]
    }
  }
}
```

#### 4. GET /api/v1/health

Health check (no auth required).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "uptime_seconds": 86400,
    "services": {
      "database": "connected",
      "redis": "connected",
      "ai_service": "ready"
    },
    "timestamp": "2026-02-23T10:30:00Z"
  }
}
```

---

## 🗄️ Database Schema

### PostgreSQL (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?
  name          String?
  tier          Tier     @default(FREE)
  apiKey        String?  @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  analyses      Analysis[]
  
  @@index([email])
}

enum Tier {
  FREE
  PRO
  ENTERPRISE
}

model Analysis {
  id                String   @id @default(cuid())
  userId            String?
  contractAddress   String?
  chain             String
  riskScore         Float
  confidence        Int
  risks             Json     // Array of risk findings
  beginnerSummary   String   @db.Text
  developerSummary  String   @db.Text
  metadata          Json     // Contract metadata
  cached            Boolean  @default(false)
  processingTimeMs  Int
  createdAt         DateTime @default(now())
  
  user              User?    @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@index([contractAddress, chain])
}

model ContractCache {
  id                String   @id @default(cuid())
  contractAddress   String
  chain             String
  sourceCode        String   @db.Text
  abi               Json?
  compilerVersion   String?
  isVerified        Boolean
  fetchedAt         DateTime @default(now())
  expiresAt         DateTime
  
  @@unique([contractAddress, chain])
  @@index([expiresAt])
}

model RateLimit {
  id          String   @id @default(cuid())
  identifier  String   // IP or user ID
  endpoint    String
  count       Int
  windowStart DateTime
  expiresAt   DateTime
  
  @@unique([identifier, endpoint, windowStart])
  @@index([expiresAt])
}

model ApiUsage {
  id              String   @id @default(cuid())
  userId          String?
  endpoint        String
  method          String
  statusCode      Int
  responseTimeMs  Int
  ipAddress       String
  userAgent       String?
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([createdAt])
}
```

---

## 💾 Caching Strategy

### Redis Cache Layers

#### 1. Contract Source Cache
```
Key: contract:source:{chain}:{address}
TTL: 24 hours
Value: {
  source_code: string,
  abi: object,
  compiler_version: string,
  is_verified: boolean,
  fetched_at: timestamp
}
```

#### 2. Analysis Result Cache
```
Key: analysis:result:{chain}:{address}:v2
TTL: 1 hour
Value: Complete analysis result JSON
```

#### 3. Rate Limit Cache
```
Key: ratelimit:{tier}:{identifier}:{window}
TTL: 15 minutes
Value: request_count (integer)
```

### Cache Invalidation

- Contract source: Never invalidate (immutable blockchain)
- Analysis result: Invalidate when detection engine version changes
- Rate limits: Auto-expire

---

## ⚡ Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| P95 Cached | < 5s | From request to response |
| P95 Fresh | < 12s | Including blockchain fetch |
| P99 Fresh | < 20s | Including AI explanation |
| Concurrent Users | 100+ | Without degradation |
| Redis Hit Rate | > 80% | For repeated addresses |
| Database Queries | < 5 per request | Optimized joins |

### Optimization Strategies

1. **Contract Fetching**: Parallel blockchain API calls
2. **Risk Detection**: Cache AST parse results
3. **AI Calls**: Batch multiple explanations
4. **Database**: Connection pooling (max 20)
5. **Scaling**: Horizontal with load balancer

---

## 🔒 Security Measures

### Input Validation
- Max contract size: 1MB
- Address format: Strict EVM regex
- SQL injection: Prisma parameterized queries
- XSS: Sanitize all user inputs

### AI Safety
- **No raw code to AI**: Only structured JSON
- **Prompt injection protection**: Validate JSON structure
- **Output validation**: Strict schema enforcement
- **Sandboxing**: Never execute user code

### Rate Limiting
- FREE: 10 req / 15 min
- PRO: 100 req / 15 min
- ENTERPRISE: 1000 req / 15 min

### Security Headers (Helmet.js)
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.etherscan.io"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})
```

---

## 🎨 UI Design Specifications

### Design System

**Color Palette:**
```css
/* Background */
--bg-primary: #0a0a0f;
--bg-secondary: #1a1a2e;
--bg-card: rgba(26, 26, 46, 0.6); /* Glassmorphism */

/* Risk Colors */
--risk-very-low: #10b981;   /* Green */
--risk-low: #84cc16;        /* Light Green */
--risk-moderate: #eab308;   /* Yellow */
--risk-high: #f97316;       /* Orange */
--risk-critical: #ef4444;   /* Red */

/* Accent */
--accent-primary: #6366f1;  /* Indigo */
--accent-secondary: #8b5cf6; /* Purple */

/* Text */
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
--text-muted: #6b7280;
```

**Typography:**
```css
/* Headings */
--font-display: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'Fira Code', monospace;

/* Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
```

**Glassmorphism Effect:**
```css
.glass-card {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### Landing Page

**Hero Section:**
- Headline: "Analyze Any Smart Contract in Seconds"
- Subheadline: "Deterministic risk analysis. Multi-chain support. Production-grade security."
- Gradient text effect on headline
- Animated background gradient

**Input Component:**
- Tabbed interface: "Address" | "Source Code"
- Chain selector dropdown (Ethereum, Polygon, BSC logos)
- Animated analyze button with loading state
- Example addresses for quick demo

### Results Page

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Header with logo and back button]                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Risk Score Gauge (0-10) [Animated circular gauge]     │ │
│  │  Classification Badge: HIGH RISK                       │ │
│  │  Confidence: 95%                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Beginner/Developer Mode Toggle]                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Risk Card: UNLIMITED_MINTING [CRITICAL]              │ │
│  │  ▼ [Expandable]                                        │ │
│  │    - Beginner: "Owner can create unlimited tokens..."  │ │
│  │    - Code snippet: [Syntax highlighted]                │ │
│  │    - Mitigation: "Add MAX_SUPPLY constant"             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Additional risk cards...]                                 │
│                                                              │
│  [Download PDF Report button]                               │
│                                                              │
│  [Disclaimer]                                               │
└─────────────────────────────────────────────────────────────┘
```

**Animations (Framer Motion):**
```tsx
// Risk gauge animation
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 100 }}
>
  <CircularGauge value={riskScore} />
</motion.div>

// Risk cards stagger
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
  initial="hidden"
  animate="show"
>
  {risks.map(risk => <RiskCard key={risk.type} risk={risk} />)}
</motion.div>
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Days 1-2)
1. Set up Next.js 14 project structure
2. Configure Tailwind + Shadcn/ui
3. Set up Express backend + Prisma
4. Configure Redis connection
5. Implement basic landing page UI

### Phase 2: Core Backend (Days 3-5)
6. Build contract acquisition layer
   - Multi-chain fetchers
   - Source normalization
   - Bytecode fallback
7. Implement deterministic risk detectors
   - Minting detector
   - Fund control detector
   - Ownership detector
   - Upgrade detector
   - Dangerous functions detector
   - Economic detector
8. Build scoring algorithm
9. Implement Redis caching

### Phase 3: AI Integration (Days 6-7)
10. Build AI explanation service
11. Design safe prompt templates
12. Implement output validation
13. Test prompt injection protection

### Phase 4: API Layer (Days 8-9)
14. Build analyze endpoint
15. Implement rate limiting
16. Add request validation
17. Build report endpoint
18. Build compare endpoint
19. Build health endpoint

### Phase 5: Frontend (Days 10-12)
20. Build landing page
    - Hero section
    - Input component
    - Chain selector
    - Animations
21. Build results page
    - Risk gauge
    - Risk cards
    - Mode toggle
    - Code snippets
22. Implement API integration
23. Add loading states
24. Add error handling

### Phase 6: Polish (Days 13-14)
25. PDF report generation
26. Final UI polish
27. Performance optimization
28. Security hardening
29. End-to-end testing
30. Documentation

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Risk Detection Accuracy | > 95% |
| False Positive Rate | < 10% |
| P95 Response Time (Cached) | < 5s |
| P95 Response Time (Fresh) | < 12s |
| Redis Cache Hit Rate | > 80% |
| Uptime | 99.9% |
| User Satisfaction | 4.5+ / 5 |

---

## 🎯 Next Steps

1. Review and approve this architecture
2. Set up development environment
3. Initialize project repositories
4. Begin Phase 1 implementation
5. Weekly progress reviews

---

**Document Status:** ✅ Ready for Implementation  
**Estimated Total Development Time:** 14 days (2 weeks)  
**Team Size:** 2-3 developers  
**Production-Ready:** Yes
