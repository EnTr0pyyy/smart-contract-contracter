/**
 * Risk Detection Types
 * Production-grade type definitions for deterministic risk analysis
 */

export enum RiskType {
  // Minting Risks
  UNLIMITED_MINTING = 'UNLIMITED_MINTING',
  OWNER_RESTRICTED_MINTING = 'OWNER_RESTRICTED_MINTING',
  
  // Fund Control Risks
  WITHDRAW_FUNCTION = 'WITHDRAW_FUNCTION',
  EMERGENCY_WITHDRAWAL = 'EMERGENCY_WITHDRAWAL',
  BALANCE_MANIPULATION = 'BALANCE_MANIPULATION',
  
  // Ownership Risks
  CENTRALIZED_OWNERSHIP = 'CENTRALIZED_OWNERSHIP',
  PAUSABLE_CONTRACT = 'PAUSABLE_CONTRACT',
  OWNERSHIP_TRANSFER = 'OWNERSHIP_TRANSFER',
  
  // Upgrade Risks
  DELEGATECALL_USAGE = 'DELEGATECALL_USAGE',
  UUPS_PROXY = 'UUPS_PROXY',
  TRANSPARENT_PROXY = 'TRANSPARENT_PROXY',
  
  // Dangerous Functions
  SELFDESTRUCT = 'SELFDESTRUCT',
  TX_ORIGIN = 'TX_ORIGIN',
  UNCHECKED_CALL = 'UNCHECKED_CALL',
  
  // Economic Manipulation
  ADJUSTABLE_FEES = 'ADJUSTABLE_FEES',
  BLACKLIST_MODIFICATION = 'BLACKLIST_MODIFICATION',
  MAX_TX_LIMIT = 'MAX_TX_LIMIT',
  WHITELIST_MODIFICATION = 'WHITELIST_MODIFICATION',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskClassification {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export interface RiskFinding {
  type: RiskType;
  severity: Severity;
  weight: number;
  code_snippet: string;
  line_number: number;
  machine_reason: string;
  function_name?: string;
  modifier_name?: string;
}

export interface RiskDetectionResult {
  findings: RiskFinding[];
  risk_score: number;
  classification: RiskClassification;
  confidence: number;
  metadata: {
    total_functions: number;
    successfully_parsed: number;
    patterns_checked: number;
    patterns_matched: number;
  };
}

export interface RiskExplanation {
  type: RiskType;
  beginner: string;
  developer: string;
  why_it_matters: string;
  mitigation: string;
}

export interface AIExplanationInput {
  risk_score: number;
  risks: RiskFinding[];
  confidence: number;
}

export interface AIExplanationOutput {
  beginner_summary: string;
  developer_summary: string;
  risk_explanations: RiskExplanation[];
}

export interface CompleteAnalysisResult {
  id: string;
  risk_score: number;
  classification: RiskClassification;
  confidence: number;
  risks: RiskFinding[];
  beginner_summary: string;
  developer_summary: string;
  risk_explanations: RiskExplanation[];
  metadata: {
    contract_address?: string;
    chain: string;
    compiler_version?: string;
    is_verified: boolean;
    lines_of_code: number;
    processing_time_ms: number;
  };
  cached: boolean;
  analyzed_at: string;
}

// Risk weight configuration
export const RISK_WEIGHTS: Record<RiskType, { weight: number; severity: Severity }> = {
  // Minting Risks
  [RiskType.UNLIMITED_MINTING]: { weight: 3.0, severity: Severity.CRITICAL },
  [RiskType.OWNER_RESTRICTED_MINTING]: { weight: 2.0, severity: Severity.HIGH },
  
  // Fund Control Risks
  [RiskType.WITHDRAW_FUNCTION]: { weight: 3.0, severity: Severity.CRITICAL },
  [RiskType.EMERGENCY_WITHDRAWAL]: { weight: 3.5, severity: Severity.CRITICAL },
  [RiskType.BALANCE_MANIPULATION]: { weight: 2.5, severity: Severity.HIGH },
  
  // Ownership Risks
  [RiskType.CENTRALIZED_OWNERSHIP]: { weight: 2.0, severity: Severity.HIGH },
  [RiskType.PAUSABLE_CONTRACT]: { weight: 1.5, severity: Severity.MEDIUM },
  [RiskType.OWNERSHIP_TRANSFER]: { weight: 1.0, severity: Severity.MEDIUM },
  
  // Upgrade Risks
  [RiskType.DELEGATECALL_USAGE]: { weight: 2.5, severity: Severity.HIGH },
  [RiskType.UUPS_PROXY]: { weight: 1.5, severity: Severity.MEDIUM },
  [RiskType.TRANSPARENT_PROXY]: { weight: 1.5, severity: Severity.MEDIUM },
  
  // Dangerous Functions
  [RiskType.SELFDESTRUCT]: { weight: 4.0, severity: Severity.CRITICAL },
  [RiskType.TX_ORIGIN]: { weight: 2.0, severity: Severity.HIGH },
  [RiskType.UNCHECKED_CALL]: { weight: 1.5, severity: Severity.MEDIUM },
  
  // Economic Manipulation
  [RiskType.ADJUSTABLE_FEES]: { weight: 2.0, severity: Severity.HIGH },
  [RiskType.BLACKLIST_MODIFICATION]: { weight: 1.5, severity: Severity.MEDIUM },
  [RiskType.MAX_TX_LIMIT]: { weight: 0.5, severity: Severity.LOW },
  [RiskType.WHITELIST_MODIFICATION]: { weight: 1.0, severity: Severity.MEDIUM },
};

export function classifyRiskScore(score: number): RiskClassification {
  if (score <= 2.0) return RiskClassification.VERY_LOW;
  if (score <= 4.0) return RiskClassification.LOW;
  if (score <= 6.0) return RiskClassification.MODERATE;
  if (score <= 8.0) return RiskClassification.HIGH;
  return RiskClassification.VERY_HIGH;
}

export function getRiskColor(classification: RiskClassification): string {
  const colors = {
    [RiskClassification.VERY_LOW]: '#10b981',
    [RiskClassification.LOW]: '#84cc16',
    [RiskClassification.MODERATE]: '#eab308',
    [RiskClassification.HIGH]: '#f97316',
    [RiskClassification.VERY_HIGH]: '#ef4444',
  };
  return colors[classification];
}
