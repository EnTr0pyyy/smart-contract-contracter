/**
 * Risk Detection Engine
 * Main orchestrator for deterministic risk analysis
 * 
 * CRITICAL: This engine does NOT use AI for risk detection.
 * AI is only used later to explain already-detected risks.
 */

import { ASTParserService } from './ast-parser.service';
import { ScoringAlgorithmService } from './scoring-algorithm.service';
import { RiskDetectionResult, RiskFinding } from '../../types/risk.types';

// Import all detectors
import { BaseDetector } from './detectors/base-detector';
import { MintingDetector } from './detectors/minting-detector';
import { FundControlDetector } from './detectors/fund-control-detector';
import { OwnershipDetector } from './detectors/ownership-detector';
import { UpgradeDetector } from './detectors/upgrade-detector';
import { DangerousFunctionsDetector } from './detectors/dangerous-fn-detector';
import { EconomicDetector } from './detectors/economic-detector';

export class RiskEngineService {
  private static detectors: BaseDetector[] = [
    new MintingDetector(),
    new FundControlDetector(),
    new OwnershipDetector(),
    new UpgradeDetector(),
    new DangerousFunctionsDetector(),
    new EconomicDetector(),
  ];

  /**
   * Analyze contract for security risks
   * This is a deterministic, rule-based analysis (NO AI)
   */
  static async analyze(contractCode: string): Promise<RiskDetectionResult> {
    // Validate input
    if (!ASTParserService.isValidSolidity(contractCode)) {
      throw new Error('Invalid Solidity code');
    }

    // Parse contract into analyzable structure
    const context = ASTParserService.parse(contractCode);

    // Run all detectors
    const allFindings: RiskFinding[] = [];
    let patternsChecked = 0;
    let patternsMatched = 0;

    for (const detector of this.detectors) {
      try {
        const findings = detector.detect(context);
        allFindings.push(...findings);
        
        // Update pattern statistics
        patternsChecked += this.getPatternCount(detector.name);
        patternsMatched += findings.length;
      } catch (error) {
        console.error(`Error in detector ${detector.name}:`, error);
        // Continue with other detectors
      }
    }

    // Sort findings by severity
    const sortedFindings = ScoringAlgorithmService.sortBySeverity(allFindings);

    // Build result with scoring
    const result = ScoringAlgorithmService.buildResult(sortedFindings, {
      total_functions: context.functions.length,
      successfully_parsed: context.functions.length,
      patterns_checked: patternsChecked,
      patterns_matched: patternsMatched,
    });

    return result;
  }

  /**
   * Get estimated pattern count for a detector
   */
  private static getPatternCount(detectorName: string): number {
    const counts: Record<string, number> = {
      MintingDetector: 2,
      FundControlDetector: 6,
      OwnershipDetector: 3,
      UpgradeDetector: 3,
      DangerousFunctionsDetector: 3,
      EconomicDetector: 4,
    };
    return counts[detectorName] || 1;
  }

  /**
   * Validate contract code size
   */
  static validateSize(code: string, maxSizeBytes: number = 1048576): void {
    const sizeBytes = Buffer.byteLength(code, 'utf8');
    if (sizeBytes > maxSizeBytes) {
      throw new Error(`Contract exceeds maximum size of ${maxSizeBytes} bytes`);
    }
  }

  /**
   * Get metadata about contract
   */
  static getContractMetadata(code: string): {
    compiler_version: string | null;
    lines_of_code: number;
    total_functions: number;
  } {
    const context = ASTParserService.parse(code);
    return {
      compiler_version: ASTParserService.extractCompilerVersion(code),
      lines_of_code: ASTParserService.countLinesOfCode(code),
      total_functions: context.functions.length,
    };
  }

  /**
   * Quick validation check (without full analysis)
   */
  static async quickCheck(code: string): Promise<{
    is_valid: boolean;
    has_risks: boolean;
    estimated_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    try {
      // Quick pattern checks without full parsing
      const dangerousPatterns = [
        'selfdestruct',
        'delegatecall',
        'tx.origin',
      ];

      const hasCritical = dangerousPatterns.some(pattern => 
        code.includes(pattern)
      );

      const hasOwnerControl = /onlyOwner/.test(code);
      const hasMinting = /function\s+mint/i.test(code);

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (hasCritical) {
        riskLevel = 'HIGH';
      } else if (hasOwnerControl && hasMinting) {
        riskLevel = 'MEDIUM';
      }

      return {
        is_valid: ASTParserService.isValidSolidity(code),
        has_risks: hasCritical || hasOwnerControl,
        estimated_risk_level: riskLevel,
      };
    } catch (error) {
      return {
        is_valid: false,
        has_risks: false,
        estimated_risk_level: 'LOW',
      };
    }
  }
}
