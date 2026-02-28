import { useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

// @ts-ignore
import AnalysisWorker from '../workers/analysis-worker?worker';

// ── Icons (inline SVGs) ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, style = {} }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);
const ShieldIcon  = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const ZapIcon     = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const AlertIcon   = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />;
const CheckIcon   = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />;
const SparkIcon   = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.962 0L14.063 8.5A2 2 0 0115.5 9.937l6.135 1.582a.5.5 0 010 .962L15.5 14.063A2 2 0 0114.063 15.5l-1.582 6.135a.5.5 0 01-.962 0z" />;
const UploadIcon  = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const BrainIcon   = ({ size, style }: { size?: number; style?: React.CSSProperties }) => <Icon size={size} style={style} d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 013.32-3.97A2.5 2.5 0 019.5 2zM14.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 004.96-.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-3.32-3.97A2.5 2.5 0 0014.5 2z" />;

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

// ── Sample contracts ───────────────────────────────────────────────────────
const VULNERABLE = [
`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UnprotectedMinter {
  mapping(address => uint256) public balanceOf;
  uint256 public totalSupply;

  function mint(address to, uint256 amount) public {
    totalSupply += amount;
    balanceOf[to] += amount;
  }

  function transfer(address to, uint256 amount) public {
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
  }
}`,
`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SelfdestructContract {
  address public owner;
  mapping(address => uint256) public balances;

  constructor() { owner = msg.sender; }

  function mint(uint256 amount) public {
    balances[msg.sender] += amount;
  }

  function emergencyWithdraw() public {
    selfdestruct(payable(owner));
  }
}`
];

const SECURE = [
`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecureToken {
  mapping(address => uint256) public balanceOf;
  uint256 public totalSupply;
  address public immutable owner;
  uint256 public constant MAX_SUPPLY = 1000000 * 10 ** 18;

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
  }

  constructor() {
    owner = msg.sender;
    totalSupply = 100000 * 10 ** 18;
    balanceOf[msg.sender] = totalSupply;
  }

  function mint(address to, uint256 amount) public onlyOwner {
    require(totalSupply + amount <= MAX_SUPPLY, "Exceeds max");
    require(to != address(0), "Invalid address");
    totalSupply += amount;
    balanceOf[to] += amount;
  }

  function transfer(address to, uint256 amount) public {
    require(balanceOf[msg.sender] >= amount, "Insufficient");
    require(to != address(0), "Invalid address");
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
  }
}`
];

// ── Styling helpers ─────────────────────────────────────────────────────────
const sevColor = (s: string) => ({ Critical:"#FF3B3B", High:"#FF9D3B", Medium:"#FFD93B", Low:"#6BCB77" }[s]||"#4D96FF");
const sevBg    = (s: string) => ({ Critical:"rgba(255,59,59,.1)", High:"rgba(255,157,59,.1)", Medium:"rgba(255,217,59,.1)", Low:"rgba(107,203,119,.1)" }[s]||"rgba(77,150,255,.1)");
const scoreCol = (s: number) => s>=80?"#6BCB77":s>=60?"#FFD93B":s>=40?"#FF9D3B":"#FF3B3B";

export function SmartContractAuditor() {
  const [code, setCode] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new AnalysisWorker();
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // RunAnywhere SDK Loaders
  const llmLoader = useModelLoader(ModelCategory.Language);

  // AI state
  const [aiStream, setAiStream] = useState("");
  const [aiDone, setAiDone] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  
  const cancelRef = useRef<(() => void) | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setCode(ev.target?.result as string); setResults(null); setError(""); setAiDone(""); setAiStream(""); };
    r.onerror = () => setError("Failed to read file");
    r.readAsText(f);
  };

  const loadSample = (type: "vulnerable" | "secure") => {
    const pool = type === "vulnerable" ? VULNERABLE : SECURE;
    setCode(pool[Math.floor(Math.random() * pool.length)]);
    setResults(null); setError(""); setAiDone(""); setAiStream("");
  };

  // ── On-Device AI Deep Analysis ──────────────────────────────────────────────
  const runAIAnalysis = useCallback(async (contractCode: string, patternFindings: Vulnerability[]) => {
    // Ensure model is loaded
    if (llmLoader.state !== 'ready') {
      const ok = await llmLoader.ensure();
      if (!ok) return;
    }

    setAiLoading(true); setAiStream(""); setAiDone("");

    const issuesSummary = patternFindings.length === 0
      ? "No pattern-based vulnerabilities detected."
      : patternFindings.map(f=>`- [${f.severity}] ${f.title}: ${f.description}`).join("\n");

    const userPrompt = `Professional Smart Contract Auditor.
Scan for: Reentrancy, Access Control, Arithmetic Errors, and Logic Exploits.

Scanner found:
${issuesSummary}

Instructions:
1. Review the code.
2. Identify the most dangerous vulnerability missed.
3. Be brief and technical.

Format:
**Audit Summary:**
**Critical Risk:**
**Fix:**

Code:
\`\`\`solidity
${contractCode.slice(0, 1500)}
\`\`\``;

    try {
      // 30-second safety timeout
      const timeoutId = setTimeout(() => {
        if (cancelRef.current) {
          cancelRef.current();
          setAiDone("Analysis timed out after 30s. Displaying partial results.");
          setAiLoading(false);
        }
      }, 30000);

      const { stream, result: resultPromise, cancel } = await TextGeneration.generateStream(userPrompt, {
        maxTokens: 360,
        temperature: 0.1,
      });
      cancelRef.current = cancel;

      let accumulated = "";
      for await (const token of stream) {
        accumulated += token;
        setAiStream(accumulated);
      }

      clearTimeout(timeoutId);
      const finalResult = await resultPromise;
      setAiDone(finalResult.text || accumulated);
    } catch (err) {
      if ((err as any).name !== "AbortError") {
        setAiDone("AI analysis failed: " + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setAiLoading(false); setAiStream("");
    }
  }, [llmLoader]);

  // ── Main Analysis Trigger ──────────────────────────────────────────────────
  const analyzeContract = async () => {
    if (!code.trim()) { setError("Please enter or upload Solidity code"); return; }
    
    setAnalyzing(true); 
    setAnalysisProgress(0);
    setError(""); 
    setResults(null); 
    setAiDone(""); 
    setAiStream("");

    if (!workerRef.current) {
      workerRef.current = new AnalysisWorker();
    }

    // Progress simulation for UX
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    workerRef.current.onmessage = (e: MessageEvent) => {
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      if (e.data.type === 'RESULTS') {
        const analysisResults = e.data.results;
        setResults(analysisResults);
        setAnalyzing(false);
        
        // Skip AI Deep Analysis if score is 100 (Perfect)
        if (analysisResults.securityScore === 100) {
          setAiDone("**Perfect Score!** No known vulnerabilities detected. This contract follows established security patterns.");
          return;
        }

        // Trigger On-Device AI Deep Analysis
        runAIAnalysis(code, analysisResults.vulnerabilities);
      } else {
        setError("Analysis failed in worker thread.");
        setAnalyzing(false);
      }
    };

    workerRef.current.onerror = (err) => {
      clearInterval(progressInterval);
      setError("Worker error: " + err.message);
      setAnalyzing(false);
    };

    workerRef.current.postMessage({ code });
  };

  const aiText = aiLoading ? aiStream : aiDone;

  return (
    <div style={{
      background:"linear-gradient(135deg,#0a0a15 0%,#1a1a2e 50%,#0d0d1f 100%)",
      minHeight:"calc(100vh - 100px)",
      fontFamily:'"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color:"#e8e8e8", padding:"40px 20px 80px", overflow:"visible"
    }}>
      {/* RunAnywhere Loaders UI */}
      <div style={{maxWidth:"1200px", margin: "0 auto 20px"}}>
        <ModelBanner state={llmLoader.state} progress={llmLoader.progress} label="Deep Audit Engine" onLoad={llmLoader.ensure} />
      </div>

      <div style={{position:"fixed",top:"-20%",right:"-10%",width:"800px",height:"800px",
        background:"radial-gradient(circle,rgba(79,172,254,.08) 0%,transparent 70%)",
        borderRadius:"50%",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"-15%",left:"-5%",width:"600px",height:"600px",
        background:"radial-gradient(circle,rgba(107,203,119,.05) 0%,transparent 70%)",
        borderRadius:"50%",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:"1200px",margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:"48px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px", flexWrap: "wrap"}}>
            <ShieldIcon size={36} style={{color:"#4FAFFE"}}/>
            <h1 style={{fontSize:"clamp(24px, 5vw, 42px)",fontWeight:"800",margin:"0",
              background:"linear-gradient(135deg,#4FAFFE 0%,#00D4FF 100%)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Smart Contract Security Auditor
            </h1>
          </div>
          <div style={{display:"flex", alignItems:"center", gap: "12px", marginLeft: "12px"}}>
            <p style={{fontSize:"15px",color:"#888",margin:"0"}}>
              Detect vulnerabilities instantly using On-Device AI
            </p>
            <span style={{fontSize:"11px",background:"rgba(79,172,254,.12)",
              border:"1px solid rgba(79,172,254,.3)",color:"#4FAFFE",
              padding:"2px 10px",borderRadius:"20px",fontWeight:"600"}}>
              ⚡ RunAnywhere Optimized
            </span>
          </div>
        </div>

        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:"28px"}}>

          {/* LEFT — Input */}
          <div style={{background:"rgba(20,20,35,.7)",border:"1px solid rgba(79,172,254,.2)",
            borderRadius:"16px",padding:"28px",backdropFilter:"blur(10px)",
            display:"flex",flexDirection:"column",minHeight:"500px"}}>

            <h2 style={{fontSize:"18px",fontWeight:"700",color:"#4FAFFE",margin:"0 0 20px 0"}}>
              Contract Code
            </h2>

            <div style={{display:"flex",gap:"10px",marginBottom:"20px",flexWrap:"wrap"}}>
              <button onClick={()=>loadSample("vulnerable")} style={{
                padding:"8px 14px",background:"rgba(255,59,59,.12)",border:"1px solid rgba(255,59,59,.4)",
                color:"#FF9B9B",borderRadius:"8px",fontSize:"12px",fontWeight:"600",
                cursor:"pointer",transition:"all .3s ease",display:"flex",alignItems:"center",gap:"6px"}}>
                <SparkIcon size={13}/> Load Vulnerable
              </button>
              <button onClick={()=>loadSample("secure")} style={{
                padding:"8px 14px",background:"rgba(107,203,119,.12)",border:"1px solid rgba(107,203,119,.4)",
                color:"#9BFF9B",borderRadius:"8px",fontSize:"12px",fontWeight:"600",
                cursor:"pointer",transition:"all .3s ease",display:"flex",alignItems:"center",gap:"6px"}}>
                <SparkIcon size={13}/> Load Secure
              </button>
            </div>

            <div style={{border:"2px dashed rgba(79,172,254,.3)",borderRadius:"10px",padding:"20px",
              textAlign:"center",cursor:"pointer",marginBottom:"16px",
              background:"rgba(79,172,254,.05)",transition:"all .3s ease"}}
              onClick={()=>fileRef.current?.click()}>
              <UploadIcon size={24} style={{color:"#4FAFFE",margin:"0 auto 8px"}}/>
              <p style={{fontSize:"13px",color:"#999",margin:0}}>Click to upload .sol file</p>
              <input ref={fileRef} type="file" accept=".sol,.txt" onChange={handleFile} style={{display:"none"}}/>
            </div>

            <textarea value={code} onChange={e=>setCode(e.target.value)}
              placeholder="Paste Solidity code here…"
              style={{flex:1,background:"rgba(0,0,0,.4)",border:"1px solid rgba(79,172,254,.2)",
                borderRadius:"8px",padding:"12px",color:"#e8e8e8",
                fontFamily:'"Fira Code",monospace',fontSize:"12px",
                resize:"vertical",minHeight:"200px",marginBottom:"16px",outline:"none"}}/>

            {error && (
              <div style={{background:"rgba(255,59,59,.12)",border:"1px solid rgba(255,59,59,.4)",
                color:"#FF9B9B",padding:"12px",borderRadius:"8px",fontSize:"12px",marginBottom:"16px"}}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={analyzeContract} disabled={analyzing||!code.trim()} style={{
              padding:"14px 24px",border:"none",borderRadius:"10px",
              background:analyzing?"rgba(79,172,254,.3)":"linear-gradient(135deg,#4FAFFE 0%,#00D4FF 100%)",
              color:"#fff",fontWeight:"700",fontSize:"15px",
              cursor:analyzing?"not-allowed":"pointer",
              transition:"all .3s ease",opacity:analyzing?0.6:1,
              display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
              flexDirection: analyzing ? "column" : "row"}}>
              {analyzing ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spinner-sm" /> Running Security Engine...
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${analysisProgress}%`, height: '100%', background: '#fff', transition: 'width 0.2s' }} />
                  </div>
                </div>
              ) : (
                <><ZapIcon size={16}/> Run Security Audit</>
              )}
            </button>
          </div>

          {/* RIGHT — Results */}
          <div style={{background:"rgba(20,20,35,.7)",border:"1px solid rgba(79,172,254,.2)",
            borderRadius:"16px",padding:"28px",backdropFilter:"blur(10px)",minHeight:"400px",
            display:"flex",flexDirection:"column",justifyContent:"center"}}>
            {!results ? (
              <div style={{textAlign:"center",opacity:.5}}>
                <ShieldIcon size={56} style={{color:"#4FAFFE",margin:"0 auto 20px",opacity:.3}}/>
                <p style={{fontSize:"16px",margin:0,color:"#888"}}>
                  {code.trim()?"Click \"Analyze Contract\" to start scanning":"Paste or upload a Solidity contract"}
                </p>
              </div>
            ) : (
              <div>
                <div style={{
                  background:`linear-gradient(135deg,${scoreCol(results.securityScore)}20 0%,${scoreCol(results.securityScore)}08 100%)`, 
                  border:`2px solid ${scoreCol(results.securityScore)}`,
                  borderRadius:"12px",padding:"28px",marginBottom:"24px",textAlign:"center"}}>
                  <p style={{fontSize:"11px",color:"#999",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"1px",fontWeight:"600"}}>
                    Security Score
                  </p>
                  <div style={{fontSize:"56px",fontWeight:"900",color:scoreCol(results.securityScore),margin:"0 0 8px"}}>
                    {results.securityScore}<span style={{fontSize:"28px",color:"#666"}}>/100</span>
                  </div>
                  <p style={{fontSize:"12px",color:"#888",margin:"12px 0 0"}}>
                    {results.securityScore>=80&&"✓ Secure Contract"}
                    {results.securityScore>=60&&results.securityScore<80&&"⚠ Review Recommended"}
                    {results.securityScore>=40&&results.securityScore<60&&"⚠ Critical Issues Found"}
                    {results.securityScore<40&&"✕ High Risk Contract"}
                  </p>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"24px"}}>
                  {[{label:"Critical",color:"#FF3B3B",bg:"rgba(255,59,59,.1)",border:"rgba(255,59,59,.3)"},
                    {label:"High",color:"#FF9D3B",bg:"rgba(255,157,59,.1)",border:"rgba(255,157,59,.3)"}
                  ].map(({label,color,bg,border})=>(
                    <div key={label} style={{background:bg,border:`1px solid ${border}`,borderRadius:"8px",padding:"16px",textAlign:"center"}}>
                      <div style={{fontSize:"24px",fontWeight:"800",color}}>
                        {results.vulnerabilities.filter(v=>v.severity===label).length}
                      </div>
                      <div style={{fontSize:"10px",color:"#999",marginTop:"4px"}}>{label} Issues</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vulnerabilities List */}
        {results && results.vulnerabilities.length > 0 && (
          <div style={{marginTop:"28px"}}>
            <h2 style={{fontSize:"18px",fontWeight:"700",color:"#4FAFFE",marginBottom:"16px"}}>
              Detailed Findings
            </h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:"12px"}}>
              {results.vulnerabilities.map((v,i)=>(
                <div key={i} style={{background:sevBg(v.severity),border:`1.5px solid ${sevColor(v.severity)}`,
                  borderRadius:"12px",padding:"16px"}}>
                  <div style={{display:"flex",gap:"12px"}}>
                    <AlertIcon size={18} style={{color:sevColor(v.severity),flexShrink:0,marginTop:"2px"}}/>
                    <div>
                      <h3 style={{margin:"0 0 6px",fontSize:"14px",fontWeight:"700"}}>{v.title}</h3>
                      <p style={{fontSize:"12px",color:"#bbb",margin:"8px 0",lineHeight:"1.5"}}>{v.description}</p>
                      <p style={{fontSize:"12px",color:sevColor(v.severity),margin:0,fontWeight:"600"}}>💡 Recommendation: {v.recommendation}</p>   
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Deep Analysis Section */}
        {(aiLoading || aiDone) && results && (
          <div style={{marginTop:"28px", paddingBottom: "40px"}}>
            <h2 style={{fontSize:"18px",fontWeight:"700",color:"#4FAFFE",marginBottom:"16px",
              display:"flex",alignItems:"center",gap:"8px"}}>
              <BrainIcon size={18}/>
              On-Device Deep Audit
              {aiLoading && (
                <div style={{display: "flex", alignItems: "center", gap: "10px", marginLeft: "10px"}}>
                  <div className="spinner-sm" style={{borderColor: "#4FAFFE", borderTopColor: "transparent"}} />
                  <span className="shimmer-text">AI is thinking...</span>
                </div>
              )}
            </h2>
            <div style={{background:"rgba(20,20,35,.7)",border:"1px solid rgba(79,172,254,.25)",
              borderRadius:"12px",padding:"24px",backdropFilter:"blur(10px)",position:"relative",overflow:"hidden"}}>
              <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:"14px",
                lineHeight:"1.7",color:"#d0d0d0",fontFamily:"inherit",margin:0}}>
                {aiText}
                {aiLoading && <span className="cursor">|</span>}
              </pre>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
        .shimmer-text { font-size: 11px; color: #4FAFFE; font-weight: 400; background: rgba(79,172,254,.1); padding: 2px 8px; borderRadius: 20px; border: 1px solid rgba(79,172,254,.2); }
        .cursor { animation: blink 1s step-end infinite; color: #4FAFFE; font-weight: bold; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
