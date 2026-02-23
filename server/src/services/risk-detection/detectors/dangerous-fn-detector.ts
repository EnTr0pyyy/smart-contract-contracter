/**
 * Dangerous Functions Detector
 * Detects usage of dangerous Solidity functions
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class DangerousFunctionsDetector extends BaseDetector {
  get name(): string {
    return 'DangerousFunctionsDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Check for selfdestruct
    const selfdestructRisk = this.detectSelfdestruct(context);
    if (selfdestructRisk) {
      findings.push(selfdestructRisk);
    }

    // Check for tx.origin
    const txOriginRisks = this.detectTxOrigin(context);
    findings.push(...txOriginRisks);

    // Check for unchecked calls
    const uncheckedCallRisks = this.detectUncheckedCalls(context);
    findings.push(...uncheckedCallRisks);

    return findings;
  }

  /**
   * Detect selfdestruct (CRITICAL)
   */
  private detectSelfdestruct(context: DetectionContext): RiskFinding | null {
    if (!context.code.includes('selfdestruct')) {
      return null;
    }

    // Find the function containing selfdestruct
    const functionWithSelfdestruct = context.functions.find(func =>
      func.body.includes('selfdestruct')
    );

    if (functionWithSelfdestruct) {
      // Find exact line
      const lineIndex = context.lines.findIndex(line => 
        line.includes('selfdestruct') &&
        context.lines.indexOf(line) >= functionWithSelfdestruct.startLine - 1 &&
        context.lines.indexOf(line) <= functionWithSelfdestruct.endLine - 1
      );

      const snippet = this.extractCodeSnippet(context.lines, lineIndex, 1);

      return this.createFinding(
        RiskType.SELFDESTRUCT,
        snippet,
        lineIndex + 1,
        'selfdestruct allows complete contract destruction, permanently removing code and sending all funds to arbitrary address.',
        functionWithSelfdestruct.name
      );
    }

    return null;
  }

  /**
   * Detect tx.origin usage (HIGH)
   */
  private detectTxOrigin(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (!context.code.includes('tx.origin')) {
      return findings;
    }

    // Find all functions using tx.origin
    const functionsWithTxOrigin = context.functions.filter(func =>
      func.body.includes('tx.origin')
    );

    for (const func of functionsWithTxOrigin) {
      // Find exact line
      const lineIndex = context.lines.findIndex(line => 
        line.includes('tx.origin') &&
        context.lines.indexOf(line) >= func.startLine - 1 &&
        context.lines.indexOf(line) <= func.endLine - 1
      );

      const snippet = this.extractCodeSnippet(context.lines, lineIndex, 1);

      findings.push(
        this.createFinding(
          RiskType.TX_ORIGIN,
          snippet,
          lineIndex + 1,
          'tx.origin usage detected. Vulnerable to phishing attacks where malicious contracts trick users into authorizing transactions.',
          func.name
        )
      );
    }

    return findings;
  }

  /**
   * Detect unchecked external calls (MEDIUM)
   */
  private detectUncheckedCalls(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Pattern for low-level calls
    const callPattern = /\.call\{|\.call\(|\.staticcall\(|\.callcode\(/;

    const functionsWithCalls = context.functions.filter(func =>
      callPattern.test(func.body)
    );

    for (const func of functionsWithCalls) {
      // Check if return value is checked
      const lines = func.body.split('\n');
      let hasUncheckedCall = false;
      let uncheckedLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (callPattern.test(line)) {
          // Check if this line or next few lines check the return value
          const nextLines = lines.slice(i, Math.min(i + 3, lines.length)).join('\n');
          const isChecked = /require\(.*success|if\s*\(\s*success|success\s*==\s*true/.test(nextLines) ||
                           /\(bool\s+success/.test(line);

          if (!isChecked) {
            hasUncheckedCall = true;
            uncheckedLine = func.startLine + i;
            break;
          }
        }
      }

      if (hasUncheckedCall && uncheckedLine !== -1) {
        const snippet = this.extractCodeSnippet(context.lines, uncheckedLine - 1, 1);

        findings.push(
          this.createFinding(
            RiskType.UNCHECKED_CALL,
            snippet,
            uncheckedLine,
            'Low-level call without return value check. Silent failures can lead to unexpected behavior.',
            func.name
          )
        );
      }
    }

    return findings;
  }
}
