/**
 * Risk Scoring Algorithm Service
 * Calculates deterministic risk scores from findings
 */

import { RiskFinding, RiskDetectionResult, RiskClassification, classifyRiskScore } from '../../types/risk.types';

export class ScoringAlgorithmService {
  /**
   * Calculate risk score from findings
   * Formula: risk_score = min(10, Σ(weight_i))
   */
  static calculateRiskScore(findings: RiskFinding[]): number {
    const totalWeight = findings.reduce((sum, finding) => sum + finding.weight, 0);
    return Math.min(10, Math.round(totalWeight * 10) / 10); // Round to 1 decimal
  }

  /**
   * Calculate confidence score
   * Based on parsing success and pattern matching
   */
  static calculateConfidence(
    totalFunctions: number,
    successfullyParsed: number,
    patternsChecked: number,
    patternsMatched: number
  ): number {
    if (totalFunctions === 0 || patternsChecked === 0) {
      return 0.5; // Default medium confidence
    }

    // Weighted confidence calculation
    const parsingConfidence = successfullyParsed / totalFunctions;
    const patternConfidence = patternsMatched / patternsChecked;
    const astCompleteness = Math.min(1.0, successfullyParsed / Math.max(5, totalFunctions));

    const confidence = (
      parsingConfidence * 0.4 +
      patternConfidence * 0.3 +
      astCompleteness * 0.3
    );

    return Math.round(confidence * 100) / 100; // Round to 2 decimals
  }

  /**
   * Build complete risk detection result
   */
  static buildResult(
    findings: RiskFinding[],
    metadata: {
      total_functions: number;
      successfully_parsed: number;
      patterns_checked: number;
      patterns_matched: number;
    }
  ): RiskDetectionResult {
    const riskScore = this.calculateRiskScore(findings);
    const classification = classifyRiskScore(riskScore);
    const confidence = this.calculateConfidence(
      metadata.total_functions,
      metadata.successfully_parsed,
      metadata.patterns_checked,
      metadata.patterns_matched
    );

    return {
      findings,
      risk_score: riskScore,
      classification,
      confidence,
      metadata,
    };
  }

  /**
   * Sort findings by severity
   */
  static sortBySeverity(findings: RiskFinding[]): RiskFinding[] {
    const severityOrder = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    return [...findings].sort((a, b) => {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Group findings by severity
   */
  static groupBySeverity(findings: RiskFinding[]): Record<string, RiskFinding[]> {
    return findings.reduce((groups, finding) => {
      const severity = finding.severity;
      if (!groups[severity]) {
        groups[severity] = [];
      }
      groups[severity].push(finding);
      return groups;
    }, {} as Record<string, RiskFinding[]>);
  }

  /**
   * Get risk summary statistics
   */
  static getSummaryStats(findings: RiskFinding[]): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_weight: number;
  } {
    const grouped = this.groupBySeverity(findings);
    
    return {
      total: findings.length,
      critical: (grouped.CRITICAL || []).length,
      high: (grouped.HIGH || []).length,
      medium: (grouped.MEDIUM || []).length,
      low: (grouped.LOW || []).length,
      total_weight: findings.reduce((sum, f) => sum + f.weight, 0),
    };
  }
}
