/**
 * Minting Risk Detector
 * Detects minting-related security risks
 */

import { BaseDetector, DetectionContext } from './base-detector';
import { RiskFinding, RiskType } from '../../../types/risk.types';

export class MintingDetector extends BaseDetector {
  get name(): string {
    return 'MintingDetector';
  }

  detect(context: DetectionContext): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Find mint functions
    const mintFunctions = this.findFunctionsMatching(context, /mint/i);

    for (const func of mintFunctions) {
      // Check for unlimited minting (no supply cap)
      const unlimitedMintingRisk = this.checkUnlimitedMinting(context, func);
      if (unlimitedMintingRisk) {
        findings.push(unlimitedMintingRisk);
      }

      // Check for owner-restricted minting
      const ownerMintingRisk = this.checkOwnerRestrictedMinting(context, func);
      if (ownerMintingRisk) {
        findings.push(ownerMintingRisk);
      }
    }

    return findings;
  }

  /**
   * Check for unlimited minting (CRITICAL)
   * Detection: mint function exists without MAX_SUPPLY constant
   */
  private checkUnlimitedMinting(context: DetectionContext, func: FunctionInfo): RiskFinding | null {
    // Check if there's a MAX_SUPPLY or cap constant
    const hasSupplyCap = this.hasConstant(context, 'MAX_SUPPLY') || 
                         this.hasConstant(context, 'CAP') ||
                         this.hasConstant(context, 'TOTAL_SUPPLY') ||
                         this.hasVariable(context, 'maxSupply') ||
                         this.hasVariable(context, 'cap');

    // Check if mint function has supply check
    const hasSupplyCheck = func.body.includes('totalSupply') &&
                          (func.body.includes('require') || func.body.includes('if'));

    // If no supply cap and no supply check, it's unlimited minting
    if (!hasSupplyCap && !hasSupplyCheck) {
      return this.createFinding(
        RiskType.UNLIMITED_MINTING,
        func.fullSignature,
        func.startLine,
        'Mint function exists without MAX_SUPPLY constant or supply check. Owner can mint unlimited tokens.',
        func.name
      );
    }

    return null;
  }

  /**
   * Check for owner-restricted minting (HIGH)
   * Detection: mint function with onlyOwner or similar modifier
   */
  private checkOwnerRestrictedMinting(context: DetectionContext, func: FunctionInfo): RiskFinding | null {
    // Check for owner-only modifiers
    const hasOwnerModifier = this.hasModifier(func, 'onlyOwner') ||
                            this.hasModifier(func, 'onlyRole') ||
                            this.hasModifier(func, 'onlyMinter');

    // Check for msg.sender == owner in function body
    const hasOwnerCheck = func.body.includes('msg.sender') && 
                         (func.body.includes('owner') || func.body.includes('_owner'));

    if (hasOwnerModifier || hasOwnerCheck) {
      return this.createFinding(
        RiskType.OWNER_RESTRICTED_MINTING,
        func.fullSignature,
        func.startLine,
        'Minting is restricted to owner/privileged address. Centralized control over token supply.',
        func.name,
        func.modifiers.join(', ')
      );
    }

    return null;
  }
}
