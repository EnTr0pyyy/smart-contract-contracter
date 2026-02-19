# AI Smart Contract Risk Analyzer

A privacy-first, on-device AI-powered smart contract security analyzer built with RunAnywhere SDK.

## 🔒 Key Features

- **🤖 On-Device AI Analysis**: Uses Liquid AI LFM2 model running locally in your browser
- **🛡️ Privacy-First**: All analysis happens locally - your contract code never leaves your device
- **📊 Risk Scoring**: Provides 0-10 risk scores with detailed explanations
- **👥 Beginner-Friendly**: Translates technical security risks into plain English
- **⚡ Offline Capable**: Works without internet connection after initial model download
- **🆓 Free to Use**: No API costs or usage limits

## 🎯 What It Analyzes

The AI examines smart contracts for these key risk categories:

1. **Administrative Controls**: Centralized owner powers, onlyOwner patterns
2. **Fund Safety**: Withdrawal functions, fund locking mechanisms  
3. **Upgrade Mechanisms**: Proxy patterns, upgrade capabilities
4. **Economic Manipulation**: Fee manipulation, unlimited minting
5. **Access Controls**: Permission systems, role management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Modern browser with WebAssembly support (Chrome 96+, Edge 96+)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First Time Usage

1. Open the application in your browser (http://localhost:5174)
2. The AI model (~250MB) will download automatically on first use
3. Once loaded, analysis works completely offline
4. Navigate to the "🔒 Security" tab to start analyzing contracts

## 📝 How to Use

### Quick Start with Sample Contracts

1. Click "📝 Load Vulnerable Sample" to see a high-risk contract analysis
2. Click "✅ Load Safe Sample" to see a low-risk contract analysis  
3. Click "🔍 Analyze Contract" to run the AI analysis

### Analyze Your Own Contracts

1. **Paste Solidity Code**: Copy/paste your smart contract source code into the text area
2. **Contract Address**: Enter an Ethereum contract address (0x...) - *Note: Etherscan integration coming soon*
3. **Upload File**: Drag & drop .sol files - *Coming soon*
4. Click "🔍 Analyze Contract" to start analysis

### Understanding Results

- **Risk Score**: 0-10 scale with color coding (Green = Low Risk, Red = High Risk)
- **Confidence**: How certain the AI is about its analysis
- **Category Breakdown**: Specific scores for each risk category
- **Findings**: Specific vulnerabilities or issues found
- **Impact**: What could happen if the risks are exploited
- **Recommendations**: Actionable advice for users

## 🛠️ Technical Architecture

### Frontend Stack
- **React 19**: Modern UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

### AI Engine
- **RunAnywhere Web SDK**: On-device AI inference
- **Liquid AI LFM2 350M**: Lightweight language model optimized for browser
- **WebAssembly**: High-performance WASM runtime via llama.cpp
- **OPFS Storage**: Persistent model caching across sessions

### Privacy & Security
- **Zero Server Calls**: All analysis happens client-side
- **No Data Collection**: No telemetry or usage tracking  
- **Local Storage Only**: Models cached in browser's sandboxed storage
- **Content Security Policy**: Strict CSP headers prevent XSS

## ⚠️ Important Disclaimers

This tool is designed for educational purposes and preliminary security assessment. It should **NOT** be considered a substitute for professional security audits.

**Limitations:**
- AI analysis may produce false positives or miss sophisticated vulnerabilities
- Not equivalent to comprehensive manual security audits
- Should not be the sole basis for investment or interaction decisions
- Always seek professional auditing for contracts handling significant funds

## 🏗️ Development

### Project Structure

```
src/
├── components/
│   ├── ContractAnalyzer.tsx    # Main analysis component
│   ├── ChatTab.tsx             # Original chat interface
│   ├── VisionTab.tsx           # Vision AI interface  
│   └── VoiceTab.tsx            # Voice AI interface
├── hooks/
│   └── useModelLoader.ts       # Model loading logic
├── styles/
│   └── index.css               # Global styles
└── runanywhere.ts              # SDK configuration
```

### Key Dependencies

```json
{
  "@runanywhere/web": "0.1.0-beta.8",
  "@runanywhere/web-llamacpp": "0.1.0-beta.8", 
  "@runanywhere/web-onnx": "0.1.0-beta.8",
  "react": "^19.0.0"
}
```

### Adding New Analysis Features

1. **Extend Risk Categories**: Add new categories to the `RiskCategory` interface
2. **Improve Prompts**: Modify `RISK_ANALYSIS_PROMPT` for better AI analysis  
3. **Add Static Analysis**: Combine AI with traditional pattern matching
4. **UI Enhancements**: Add visualizations, code highlighting, etc.

## 🚧 Roadmap

### Phase 1 (Hackathon MVP) ✅
- [x] Basic contract input interface
- [x] AI-powered risk analysis  
- [x] Risk scoring and categorization
- [x] Beginner-friendly explanations
- [x] Sample vulnerable/safe contracts

### Phase 2 (Post-Hackathon)
- [ ] Etherscan integration for contract fetching
- [ ] Code syntax highlighting with risk annotations
- [ ] Contract comparison tools
- [ ] PDF report generation
- [ ] Beginner vs Developer modes

### Phase 3 (Future)
- [ ] Multi-chain support (Polygon, Arbitrum, etc.)
- [ ] Browser extension for one-click analysis
- [ ] Community vulnerability pattern database
- [ ] Integration with DeFi platforms and wallets

## 🤝 Contributing

This project was created for a hackathon but welcomes contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **RunAnywhere AI** for the incredible on-device AI SDK
- **Liquid AI** for the efficient LFM2 language model  
- **Web3 Security Community** for vulnerability pattern research
- **Hackathon Organizers** for the opportunity to build this tool

---

**Built with ❤️ for the Web3 security community**

*Making smart contract security accessible to everyone, privately and for free.*