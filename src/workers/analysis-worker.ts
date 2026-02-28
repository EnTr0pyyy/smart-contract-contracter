// ── Types ──────────────────────────────────────────────────────────────────
interface Vulnerability {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  recommendation: string;
}

interface AnalysisResults {
  securityScore: number;
  vulnerabilities: Vulnerability[];
  timestamp: string;
  contractSize: number;
}

// ── Pattern detection logic ────────────────────────────────────────────────
function detectPatterns(code: string): Vulnerability[] {
  const findings: Vulnerability[] = [];
  if (code.includes("function mint(")) {
    if (!/function mint\([^)]*\)[^{]*onlyOwner/s.test(code)) {
      findings.push({ title: "Unlimited Minting Without Access Control", severity: "Critical",
        description: "The mint() function lacks owner protection. Any address can mint unlimited tokens.",
        recommendation: "Add onlyOwner modifier and implement supply limits." });
    }
  }
  if (code.includes("delegatecall")) {
    findings.push({ title: "Dangerous delegatecall Usage", severity: "High",
      description: "Delegatecall can lead to arbitrary code execution if not properly validated.",
      recommendation: "Use safe proxy patterns like EIP-1967 or avoid delegatecall entirely." });
  }
  if (code.includes("selfdestruct")) {
    findings.push({ title: "Selfdestruct Function Present", severity: "Critical",
      description: "Selfdestruct permanently destroys the contract.",
      recommendation: "Remove selfdestruct. Use pause flags for contract suspension instead." });
  }
  if (code.includes("function setFee(") && !code.match(/function setFee\([^)]*\)[^{]*onlyOwner/s)) {
    findings.push({ title: "Unprotected Fee Function", severity: "High",
      description: "Fee adjustment lacks owner protection.",
      recommendation: "Add onlyOwner modifier or use immutable fee constants." });
  }
  if (!code.includes("modifier onlyOwner")) {
    findings.push({ title: "Missing Access Control Pattern", severity: "Medium",
      description: "No onlyOwner modifier found.",
      recommendation: "Implement proper access control modifiers for sensitive operations." });
  }
  return findings;
}

self.onmessage = (e) => {
  const { code } = e.data;
  
  try {
    const patterns = detectPatterns(code);
    
    let score = 100;
    score -= patterns.filter(p => p.severity === "Critical").length * 25;
    score -= patterns.filter(p => p.severity === "High").length * 15;
    score -= patterns.filter(p => p.severity === "Medium").length * 8;
    score = Math.max(0, score);

    const results: AnalysisResults = {
      securityScore: score,
      vulnerabilities: patterns.sort((a, b) =>
        ({ Critical: 0, High: 1, Medium: 2, Low: 3 } as any)[a.severity] - ({ Critical: 0, High: 1, Medium: 2, Low: 3 } as any)[b.severity]),
      timestamp: new Date().toLocaleTimeString(),
      contractSize: code.split("\n").length,
    };

    self.postMessage({ type: 'RESULTS', results });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: "Analysis worker failed" });
  }
};
