import { useState, useCallback, useRef } from 'react';
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

interface RiskCategory {
  name: string;
  score: number;
  findings: string[];
  impact: string;
}

interface AnalysisResult {
  overallScore: number;
  confidence: number;
  categories: RiskCategory[];
  summary: string;
  recommendations: string[];
}

const RISK_ANALYSIS_PROMPT = `You are an expert smart contract security analyzer. Analyze the provided Solidity code for security vulnerabilities and risks. 

Focus on these key risk categories:
1. Administrative Controls (onlyOwner patterns, centralized control)
2. Fund Safety (withdrawal functions, fund locking mechanisms)
3. Upgrade Mechanisms (proxy patterns, upgrade capabilities)
4. Economic Manipulation (fee manipulation, minting controls)
5. Access Controls (permission systems, role management)

Provide your analysis in this exact JSON format (no markdown, no extra text):
{
  "overallScore": <number 0-10>,
  "confidence": <number 0-100>,
  "categories": [
    {
      "name": "Administrative Controls",
      "score": <number 0-10>,
      "findings": ["<specific finding>", "<specific finding>"],
      "impact": "<what could happen if exploited>"
    },
    {
      "name": "Fund Safety", 
      "score": <number 0-10>,
      "findings": ["<specific finding>"],
      "impact": "<impact description>"
    },
    {
      "name": "Upgrade Mechanisms",
      "score": <number 0-10>, 
      "findings": ["<specific finding>"],
      "impact": "<impact description>"
    },
    {
      "name": "Economic Manipulation",
      "score": <number 0-10>,
      "findings": ["<specific finding>"],
      "impact": "<impact description>"
    },
    {
      "name": "Access Controls",
      "score": <number 0-10>,
      "findings": ["<specific finding>"],
      "impact": "<impact description>"
    }
  ],
  "summary": "<plain English summary of main risks>",
  "recommendations": ["<actionable recommendation>", "<actionable recommendation>"]
}

Score 0-2: Very Low Risk, 3-4: Low Risk, 5-6: Moderate Risk, 7-8: High Risk, 9-10: Very High Risk.

Contract to analyze:`;

export function ContractAnalyzer() {
  const loader = useModelLoader(ModelCategory.Language);
  const [contractInput, setContractInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  
  const sampleVulnerableContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableToken {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public totalSupply;
    
    constructor() {
        owner = msg.sender;
        totalSupply = 1000000 * 10**18;
        balances[owner] = totalSupply;
    }
    
    // Dangerous: Owner can mint unlimited tokens
    function mint(address to, uint256 amount) public {
        require(msg.sender == owner, "Only owner");
        balances[to] += amount;
        totalSupply += amount;
    }
    
    // Dangerous: Owner can drain all funds
    function emergencyWithdraw() public {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
    
    // Dangerous: Owner can freeze any account
    mapping(address => bool) public frozenAccounts;
    
    function freezeAccount(address target) public {
        require(msg.sender == owner, "Only owner");
        frozenAccounts[target] = true;
    }
    
    // Dangerous: Hidden backdoor function
    function backdoor(address target, uint256 amount) public {
        require(msg.sender == owner, "Only owner");
        balances[target] = 0;
        balances[owner] += amount;
    }
    
    function transfer(address to, uint256 amount) public {
        require(!frozenAccounts[msg.sender], "Account frozen");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}`;

  const sampleSafeContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    
    uint256 public constant totalSupply = 1000000 * 10**18;
    string public constant name = "SafeToken";
    string public constant symbol = "SAFE";
    uint8 public constant decimals = 18;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Approve to zero address");
        
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}`;

  const analyzeContract = useCallback(async () => {
    const code = contractInput.trim();
    if (!code || analyzing) return;

    // Ensure model is loaded
    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const prompt = `${RISK_ANALYSIS_PROMPT}\n\n${code}`;
      
      const { stream, result: resultPromise, cancel } = await TextGeneration.generateStream(prompt, {
        maxTokens: 2048,
        temperature: 0.1, // Low temperature for more consistent analysis
      });
      cancelRef.current = cancel;

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
      }

      const result = await resultPromise;
      const responseText = result.text || accumulated;

      // Parse JSON response
      try {
        // Find JSON in response (remove any extra text before/after)
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        const jsonStr = responseText.slice(jsonStart, jsonEnd);
        
        const parsedResult = JSON.parse(jsonStr) as AnalysisResult;
        setAnalysisResult(parsedResult);
      } catch (parseError) {
        console.error('Failed to parse analysis result:', responseText);
        setError('Failed to parse analysis result. The AI response may be malformed.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Analysis failed: ${msg}`);
    } finally {
      cancelRef.current = null;
      setAnalyzing(false);
    }
  }, [contractInput, analyzing, loader]);

  const handleCancel = () => {
    cancelRef.current?.();
  };

  const getRiskColor = (score: number): string => {
    if (score <= 2) return 'var(--success)';
    if (score <= 4) return 'var(--success-light)';
    if (score <= 6) return 'var(--warning)';
    if (score <= 8) return 'var(--warning-dark)';
    return 'var(--danger)';
  };

  const getRiskLabel = (score: number): string => {
    if (score <= 2) return 'Very Low Risk';
    if (score <= 4) return 'Low Risk';
    if (score <= 6) return 'Moderate Risk';
    if (score <= 8) return 'High Risk';
    return 'Very High Risk';
  };

  return (
    <div className="tab-panel contract-analyzer">
      <ModelBanner
        state={loader.state}
        progress={loader.progress}
        error={loader.error}
        onLoad={loader.ensure}
        label="Smart Contract Analyzer"
      />

      <div className="analyzer-input">
        <h3>📋 Smart Contract Input</h3>
        <div className="input-section">
          <textarea
            className="contract-input"
            placeholder="Paste your Solidity smart contract code here or enter a contract address (0x...)..."
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
            disabled={analyzing}
            rows={12}
          />
          <div className="input-actions">
            {analyzing ? (
              <button className="btn btn-danger" onClick={handleCancel}>
                🛑 Cancel Analysis
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={analyzeContract}
                disabled={!contractInput.trim() || loader.state !== 'ready'}
              >
                🔍 Analyze Contract
              </button>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setContractInput('');
                setAnalysisResult(null);
                setError(null);
              }}
              disabled={analyzing}
            >
              🗑️ Clear
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setContractInput(sampleVulnerableContract)}
              disabled={analyzing}
            >
              📝 Load Vulnerable Sample
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setContractInput(sampleSafeContract)}
              disabled={analyzing}
            >
              ✅ Load Safe Sample
            </button>
          </div>
        </div>
      </div>

      {analyzing && (
        <div className="analysis-loading">
          <div className="spinner" />
          <h3>🤖 Analyzing Contract...</h3>
          <p>AI is reviewing your smart contract for security risks</p>
        </div>
      )}

      {error && (
        <div className="analysis-error">
          <h3>❌ Analysis Error</h3>
          <p className="error-text">{error}</p>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <div className="overall-score">
            <h3>🎯 Overall Risk Score</h3>
            <div className="score-display">
              <div 
                className="score-circle"
                style={{ backgroundColor: getRiskColor(analysisResult.overallScore) }}
              >
                <span className="score-number">{analysisResult.overallScore.toFixed(1)}</span>
                <span className="score-max">/10</span>
              </div>
              <div className="score-info">
                <div className="risk-label" style={{ color: getRiskColor(analysisResult.overallScore) }}>
                  {getRiskLabel(analysisResult.overallScore)}
                </div>
                <div className="confidence">
                  Confidence: {analysisResult.confidence}%
                </div>
              </div>
            </div>
          </div>

          <div className="risk-categories">
            <h3>📊 Risk Breakdown</h3>
            {analysisResult.categories.map((category, index) => (
              <div key={index} className="risk-category">
                <div className="category-header">
                  <h4>{category.name}</h4>
                  <div className="category-score" style={{ color: getRiskColor(category.score) }}>
                    {category.score}/10
                  </div>
                </div>
                
                {category.findings.length > 0 && (
                  <div className="findings">
                    <h5>🔍 Findings:</h5>
                    <ul>
                      {category.findings.map((finding, idx) => (
                        <li key={idx}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {category.impact && (
                  <div className="impact">
                    <h5>⚠️ Potential Impact:</h5>
                    <p>{category.impact}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="summary-section">
            <h3>📝 Summary</h3>
            <div className="summary-content">
              <p>{analysisResult.summary}</p>
            </div>
          </div>

          {analysisResult.recommendations.length > 0 && (
            <div className="recommendations">
              <h3>💡 Recommendations</h3>
              <ul>
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="disclaimer">
            <h4>⚠️ Important Disclaimer</h4>
            <p>
              This analysis is performed by AI and should not be considered a substitute for professional security audits. 
              Always conduct thorough due diligence and consider professional auditing services before interacting with smart contracts, 
              especially those involving significant funds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}