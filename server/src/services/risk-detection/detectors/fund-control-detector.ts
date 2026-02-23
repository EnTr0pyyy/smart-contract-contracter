/**
 * Fund Control Risk Detector
 * Detects risks related to fund withdrawal and balance manipulation
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class FundControlDetector extends BaseDetector {
  get name(): string {
    return 'FundControlDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Check for withdrawal functions
    const withdrawalRisks = this.detectWithdrawalFunctions(context);
    findings.push(...withdrawalRisks);

    // Check for emergency withdrawal
    const emergencyRisks = this.detectEmergencyWithdrawal(context);
    findings.push(...emergencyRisks);

    // Check for balance manipulation
    const balanceRisks = this.detectBalanceManipulation(context);
    findings.push(...balanceRisks);

    return findings;
  }

  /**
   * Detect withdrawal functions (CRITICAL)
   */
  private detectWithdrawalFunctions(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];
    
    // Find withdrawal-related functions
    const withdrawPatterns = [
      /withdraw/i,
      /claim/i,
      /rescue/i,
      /recover/i,
      /sweep/i,
    ];

    for (const pattern of withdrawPatterns) {
      const functions = this.findFunctionsMatching(context, pattern);
      
      for (const func of functions) {
        // Check if function transfers funds
        const transfersEther = func.body.includes('.transfer(') ||
                              func.body.includes('.send(') ||
                              func.body.includes('.call{value:') ||
                              func.body.includes('payable');

        const transfersTokens = func.body.includes('.transfer(') ||
                               func.body.includes('_transfer(') ||
                               func.body.includes('safeTransfer');

        if ((transfersEther || transfersTokens) && this.hasModifier(func, 'onlyOwner')) {
          findings.push(
            this.createFinding(
              RiskType.WITHDRAW_FUNCTION,
              func.fullSignature,
              func.startLine,
              'Owner-controlled withdrawal function detected. Owner can withdraw user funds at any time.',
              func.name,
              func.modifiers.join(', ')
            )
          );
        }
      }
    }

    return findings;
  }

  /**
   * Detect emergency withdrawal (CRITICAL)
   */
  private detectEmergencyWithdrawal(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];
    
    const emergencyFunctions = this.findFunctionsMatching(context, /emergency/i);
    
    for (const func of emergencyFunctions) {
      const transfersFunds = func.body.includes('transfer') ||
                            func.body.includes('send') ||
                            func.body.includes('call{value');

      if (transfersFunds) {
        findings.push(
          this.createFinding(
            RiskType.EMERGENCY_WITHDRAWAL,
            func.fullSignature,
            func.startLine,
            'Emergency withdrawal function allows draining all funds without timelock or safeguards.',
            func.name,
            func.modifiers.join(', ')
          )
        );
      }
    }

    return findings;
  }

  /**
   * Detect balance manipulation (HIGH)
   */
  private detectBalanceManipulation(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Look for direct balance assignments
    const balanceModifications = context.functions.filter(func => {
      // Check for direct mapping assignments like: balances[addr] = amount;
      const hasBalanceMapping = /balances?\[.*\]\s*=/.test(func.body) ||
                               /_balances?\[.*\]\s*=/.test(func.body);

      // Exclude constructors and transfer functions (legitimate uses)
      const isConstructor = func.name === 'constructor';
      const isTransferFunction = /transfer/i.test(func.name);

      return hasBalanceMapping && !isConstructor && !isTransferFunction;
    });

    for (const func of balanceModifications) {
      if (this.hasModifier(func, 'onlyOwner') || this.hasModifier(func, 'onlyRole')) {
        findings.push(
          this.createFinding(
            RiskType.BALANCE_MANIPULATION,
            func.fullSignature,
            func.startLine,
            'Direct balance manipulation detected. Privileged address can arbitrarily modify user balances.',
            func.name,
            func.modifiers.join(', ')
          )
        );
      }
    }

    return findings;
  }
}
