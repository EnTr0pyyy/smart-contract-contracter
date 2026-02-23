/**
 * Upgrade Risk Detector
 * Detects proxy patterns and upgrade mechanisms
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class UpgradeDetector extends BaseDetector {
  get name(): string {
    return 'UpgradeDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Check for delegatecall usage
    const delegatecallRisks = this.detectDelegatecall(context);
    findings.push(...delegatecallRisks);

    // Check for UUPS proxy
    const uupsRisk = this.detectUUPSProxy(context);
    if (uupsRisk) {
      findings.push(uupsRisk);
    }

    // Check for transparent proxy
    const transparentRisk = this.detectTransparentProxy(context);
    if (transparentRisk) {
      findings.push(transparentRisk);
    }

    return findings;
  }

  /**
   * Detect delegatecall usage (HIGH)
   */
  private detectDelegatecall(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];
    
    // Find all functions with delegatecall
    const functionsWithDelegatecall = context.functions.filter(func =>
      func.body.includes('delegatecall') || func.body.includes('.delegatecall(')
    );

    for (const func of functionsWithDelegatecall) {
      // Find exact line
      const lineIndex = context.lines.findIndex(line => 
        line.includes('delegatecall') && 
        context.lines.indexOf(line) >= func.startLine - 1 &&
        context.lines.indexOf(line) <= func.endLine - 1
      );

      findings.push(
        this.createFinding(
          RiskType.DELEGATECALL_USAGE,
          this.extractCodeSnippet(context.lines, lineIndex, 1),
          lineIndex + 1,
          'delegatecall allows executing arbitrary code in contract context. Can be used for proxy upgrades or attacks.',
          func.name
        )
      );
    }

    return findings;
  }

  /**
   * Detect UUPS proxy pattern (MEDIUM)
   */
  private detectUUPSProxy(context: DetectionContext): RiskFinding | null {
    // Check for _authorizeUpgrade function (UUPS pattern)
    const authorizeUpgrade = this.findFunction(context, '_authorizeUpgrade') ||
                            this.findFunctionsMatching(context, /_authorizeUpgrade/i)[0];

    // Check for UUPSUpgradeable inheritance
    const hasUUPSInheritance = context.code.includes('UUPSUpgradeable') ||
                              context.code.includes('is UUPSUpgradeable');

    if (authorizeUpgrade || hasUUPSInheritance) {
      const line = authorizeUpgrade?.startLine || 1;
      const snippet = authorizeUpgrade?.fullSignature || 'UUPSUpgradeable inheritance detected';

      return this.createFinding(
        RiskType.UUPS_PROXY,
        snippet,
        line,
        'UUPS (Universal Upgradeable Proxy Standard) pattern detected. Contract logic can be upgraded, changing behavior.',
        authorizeUpgrade?.name || 'UUPS pattern'
      );
    }

    return null;
  }

  /**
   * Detect transparent proxy pattern (MEDIUM)
   */
  private detectTransparentProxy(context: DetectionContext): RiskFinding | null {
    // Check for TransparentUpgradeableProxy inheritance
    const hasTransparentInheritance = context.code.includes('TransparentUpgradeableProxy') ||
                                     context.code.includes('is TransparentUpgradeableProxy');

    // Check for upgradeTo function
    const upgradeToFunction = this.findFunction(context, 'upgradeTo') ||
                             this.findFunctionsMatching(context, /upgradeTo/i)[0];

    // Check for implementation variable/function
    const hasImplementation = context.code.includes('_implementation') ||
                             context.functions.some(f => f.name === 'implementation');

    // Check for fallback with delegatecall
    const fallbackFunction = context.functions.find(f => f.name === 'fallback' || f.name === 'receive');
    const hasFallbackDelegatecall = fallbackFunction?.body.includes('delegatecall');

    if (hasTransparentInheritance || 
        (upgradeToFunction && hasImplementation) ||
        hasFallbackDelegatecall) {
      
      const line = upgradeToFunction?.startLine || 1;
      const snippet = upgradeToFunction?.fullSignature || 'Transparent proxy pattern detected';

      return this.createFinding(
        RiskType.TRANSPARENT_PROXY,
        snippet,
        line,
        'Transparent proxy pattern detected. Implementation contract can be swapped, completely changing contract behavior.',
        upgradeToFunction?.name || 'Transparent proxy'
      );
    }

    return null;
  }
}
