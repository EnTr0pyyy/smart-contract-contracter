/**
 * Ownership Risk Detector
 * Detects centralized ownership and control risks
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class OwnershipDetector extends BaseDetector {
  get name(): string {
    return 'OwnershipDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Check for centralized ownership
    const centralizedRisk = this.detectCentralizedOwnership(context);
    if (centralizedRisk) {
      findings.push(centralizedRisk);
    }

    // Check for pausable contract
    const pausableRisk = this.detectPausableContract(context);
    if (pausableRisk) {
      findings.push(pausableRisk);
    }

    // Check for ownership transfer
    const transferRisk = this.detectOwnershipTransfer(context);
    if (transferRisk) {
      findings.push(transferRisk);
    }

    return findings;
  }

  /**
   * Detect centralized ownership (HIGH)
   * Detection: Multiple onlyOwner modifiers (>3) indicating centralized control
   */
  private detectCentralizedOwnership(context: DetectionContext): RiskFinding | null {
    const onlyOwnerFunctions = context.functions.filter(func =>
      this.hasModifier(func, 'onlyOwner') || 
      this.hasModifier(func, 'onlyRole') ||
      func.body.includes('require(msg.sender == owner')
    );

    // If more than 3 owner-only functions, it's centralized
    if (onlyOwnerFunctions.length >= 3) {
      const functionNames = onlyOwnerFunctions.map(f => f.name).join(', ');
      const firstFunction = onlyOwnerFunctions[0];

      return this.createFinding(
        RiskType.CENTRALIZED_OWNERSHIP,
        `${onlyOwnerFunctions.length} owner-controlled functions: ${functionNames}`,
        firstFunction.startLine,
        `Contract has ${onlyOwnerFunctions.length} owner-only functions, indicating high centralization. Single address controls critical operations.`,
        functionNames
      );
    }

    return null;
  }

  /**
   * Detect pausable contract (MEDIUM)
   * Detection: pause()/unpause() functions or Pausable inheritance
   */
  private detectPausableContract(context: DetectionContext): RiskFinding | null {
    // Check for pause function
    const pauseFunction = this.findFunction(context, 'pause');
    const unpauseFunction = this.findFunction(context, 'unpause');

    // Check for Pausable inheritance
    const hasPausableInheritance = context.code.includes('Pausable') ||
                                  context.code.includes('is Pausable');

    // Check for whenNotPaused modifier
    const hasWhenNotPaused = context.modifiers.some(m => m.name === 'whenNotPaused') ||
                            context.functions.some(f => this.hasModifier(f, 'whenNotPaused'));

    if (pauseFunction || unpauseFunction || hasPausableInheritance || hasWhenNotPaused) {
      const line = pauseFunction?.startLine || unpauseFunction?.startLine || 1;
      const funcName = pauseFunction?.name || unpauseFunction?.name || 'pause mechanism';

      return this.createFinding(
        RiskType.PAUSABLE_CONTRACT,
        pauseFunction?.fullSignature || 'Pausable inheritance detected',
        line,
        'Contract can be paused by owner, freezing user operations. No timelock or safeguards detected.',
        funcName
      );
    }

    return null;
  }

  /**
   * Detect ownership transfer (MEDIUM)
   * Detection: transferOwnership function
   */
  private detectOwnershipTransfer(context: DetectionContext): RiskFinding | null {
    const transferFunction = this.findFunction(context, 'transferOwnership') ||
                            this.findFunctionsMatching(context, /transferOwnership/i)[0];

    if (transferFunction) {
      // Check if it has 2-step transfer (safer)
      const has2StepTransfer = context.code.includes('acceptOwnership') ||
                              context.code.includes('claimOwnership');

      if (!has2StepTransfer) {
        return this.createFinding(
          RiskType.OWNERSHIP_TRANSFER,
          transferFunction.fullSignature,
          transferFunction.startLine,
          'Single-step ownership transfer detected. No 2-step transfer protection against accidental transfers.',
          transferFunction.name
        );
      }
    }

    return null;
  }
}
