/**
 * Base Detector Abstract Class
 * All risk detectors extend this class
 */

import { RiskFinding, RiskType, Severity, RISK_WEIGHTS } from '../../types/risk.types';

export interface DetectionContext {
  code: string;
  lines: string[];
  functions: FunctionInfo[];
  modifiers: ModifierInfo[];
  variables: VariableInfo[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  visibility: string;
  modifiers: string[];
  body: string;
  fullSignature: string;
}

export interface ModifierInfo {
  name: string;
  lineNumber: number;
  body: string;
}

export interface VariableInfo {
  name: string;
  type: string;
  visibility: string;
  lineNumber: number;
  isConstant: boolean;
}

export abstract class BaseDetector {
  /**
   * Detect risks in the contract
   * @param context - Parsed contract context
   * @returns Array of risk findings
   */
  abstract detect(context: DetectionContext): RiskFinding[];

  /**
   * Get detector name
   */
  abstract get name(): string;

  /**
   * Create a risk finding
   */
  protected createFinding(
    type: RiskType,
    codeSnippet: string,
    lineNumber: number,
    machineReason: string,
    functionName?: string,
    modifierName?: string
  ): RiskFinding {
    const config = RISK_WEIGHTS[type];
    
    return {
      type,
      severity: config.severity,
      weight: config.weight,
      code_snippet: this.cleanCodeSnippet(codeSnippet),
      line_number: lineNumber,
      machine_reason: machineReason,
      function_name: functionName,
      modifier_name: modifierName,
    };
  }

  /**
   * Check if a function has a specific modifier
   */
  protected hasModifier(func: FunctionInfo, modifierName: string): boolean {
    return func.modifiers.some(mod => 
      mod.toLowerCase().includes(modifierName.toLowerCase())
    );
  }

  /**
   * Check if a function contains specific code patterns
   */
  protected containsPattern(code: string, pattern: RegExp): boolean {
    return pattern.test(code);
  }

  /**
   * Extract code snippet with context
   */
  protected extractCodeSnippet(lines: string[], startLine: number, contextLines: number = 2): string {
    const start = Math.max(0, startLine - contextLines);
    const end = Math.min(lines.length, startLine + contextLines + 1);
    return lines.slice(start, end).join('\n').trim();
  }

  /**
   * Clean code snippet for display
   */
  protected cleanCodeSnippet(snippet: string): string {
    // Remove excess whitespace
    return snippet.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .substring(0, 500); // Limit length
  }

  /**
   * Find function by name
   */
  protected findFunction(context: DetectionContext, name: string): FunctionInfo | undefined {
    return context.functions.find(f => 
      f.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Find functions matching a pattern
   */
  protected findFunctionsMatching(context: DetectionContext, pattern: RegExp): FunctionInfo[] {
    return context.functions.filter(f => pattern.test(f.name));
  }

  /**
   * Check if variable exists
   */
  protected hasVariable(context: DetectionContext, name: string): boolean {
    return context.variables.some(v => 
      v.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Check if a constant exists
   */
  protected hasConstant(context: DetectionContext, name: string): boolean {
    return context.variables.some(v => 
      v.name.toLowerCase() === name.toLowerCase() && v.isConstant
    );
  }

  /**
   * Count occurrences of a pattern in code
   */
  protected countPattern(code: string, pattern: RegExp): number {
    const matches = code.match(new RegExp(pattern, 'g'));
    return matches ? matches.length : 0;
  }

  /**
   * Get line number of first occurrence
   */
  protected getLineNumber(lines: string[], pattern: RegExp): number {
    const index = lines.findIndex(line => pattern.test(line));
    return index !== -1 ? index + 1 : 0;
  }
}
