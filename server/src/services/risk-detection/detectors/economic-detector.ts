/**
 * Economic Manipulation Risk Detector
 * Detects economic risks like fee manipulation, blacklists, etc.
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class EconomicDetector extends BaseDetector {
  get name(): string {
    return 'EconomicDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Check for adjustable fees
    const feeRisks = this.detectAdjustableFees(context);
    findings.push(...feeRisks);

    // Check for blacklist modification
    const blacklistRisk = this.detectBlacklistModification(context);
    if (blacklistRisk) {
      findings.push(blacklistRisk);
    }

    // Check for whitelist modification
    const whitelistRisk = this.detectWhitelistModification(context);
    if (whitelistRisk) {
      findings.push(whitelistRisk);
    }

    // Check for max transaction limit
    const maxTxRisk = this.detectMaxTxLimit(context);
    if (maxTxRisk) {
      findings.push(maxTxRisk);
    }

    return findings;
  }

  /**
   * Detect adjustable fees/taxes (HIGH)
   */
  private detectAdjustableFees(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Find fee-setting functions
    const feePatterns = [
      /setFee/i,
      /setTax/i,
      /updateFee/i,
      /changeFee/i,
      /setRate/i,
    ];

    for (const pattern of feePatterns) {
      const functions = this.findFunctionsMatching(context, pattern);
      
      for (const func of functions) {
        // Check if it's owner-only
        if (this.hasModifier(func, 'onlyOwner') || this.hasModifier(func, 'onlyRole')) {
          findings.push(
            this.createFinding(
              RiskType.ADJUSTABLE_FEES,
              func.fullSignature,
              func.startLine,
              'Owner can modify fees/taxes at any time. No caps or timelocks detected. Users may face unexpected costs.',
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
   * Detect blacklist modification (MEDIUM)
   */
  private detectBlacklistModification(context: DetectionContext): RiskFinding | null {
    // Check for blacklist variable
    const hasBlacklist = this.hasVariable(context, 'blacklist') ||
                        this.hasVariable(context, 'blacklisted') ||
                        this.hasVariable(context, '_blacklist') ||
                        context.code.includes('mapping') && context.code.includes('blacklist');

    if (!hasBlacklist) {
      return null;
    }

    // Find blacklist modification functions
    const blacklistFunctions = this.findFunctionsMatching(context, /blacklist/i);
    const addFunction = blacklistFunctions.find(f => 
      f.name.toLowerCase().includes('add') || f.name.toLowerCase().includes('set')
    );

    if (addFunction && this.hasModifier(addFunction, 'onlyOwner')) {
      return this.createFinding(
        RiskType.BLACKLIST_MODIFICATION,
        addFunction.fullSignature,
        addFunction.startLine,
        'Owner can blacklist addresses, preventing them from transferring tokens or interacting with contract.',
        addFunction.name,
        addFunction.modifiers.join(', ')
      );
    }

    return null;
  }

  /**
   * Detect whitelist modification (MEDIUM)
   */
  private detectWhitelistModification(context: DetectionContext): RiskFinding | null {
    // Check for whitelist variable
    const hasWhitelist = this.hasVariable(context, 'whitelist') ||
                        this.hasVariable(context, 'whitelisted') ||
                        this.hasVariable(context, '_whitelist') ||
                        context.code.includes('mapping') && context.code.includes('whitelist');

    if (!hasWhitelist) {
      return null;
    }

    // Find whitelist modification functions
    const whitelistFunctions = this.findFunctionsMatching(context, /whitelist/i);
    const addFunction = whitelistFunctions.find(f => 
      f.name.toLowerCase().includes('add') || f.name.toLowerCase().includes('set')
    );

    if (addFunction && this.hasModifier(addFunction, 'onlyOwner')) {
      return this.createFinding(
        RiskType.WHITELIST_MODIFICATION,
        addFunction.fullSignature,
        addFunction.startLine,
        'Owner controls whitelist access. Can restrict who can interact with contract.',
        addFunction.name,
        addFunction.modifiers.join(', ')
      );
    }

    return null;
  }

  /**
   * Detect max transaction limit (LOW)
   */
  private detectMaxTxLimit(context: DetectionContext): RiskFinding | null {
    // Check for max transaction variables
    const hasMaxTx = this.hasVariable(context, 'maxTransactionAmount') ||
                    this.hasVariable(context, 'maxTxAmount') ||
                    this.hasVariable(context, '_maxTxAmount') ||
                    this.hasVariable(context, 'maxTx');

    if (!hasMaxTx) {
      return null;
    }

    // Find setter functions
    const setterFunctions = this.findFunctionsMatching(context, /setMax.*Amount|setMaxTx/i);
    const setterFunc = setterFunctions[0];

    if (setterFunc && this.hasModifier(setterFunc, 'onlyOwner')) {
      return this.createFinding(
        RiskType.MAX_TX_LIMIT,
        setterFunc.fullSignature,
        setterFunc.startLine,
        'Owner can modify maximum transaction amount, potentially restricting user transactions.',
        setterFunc.name,
        setterFunc.modifiers.join(', ')
      );
    }

    return null;
  }
}
