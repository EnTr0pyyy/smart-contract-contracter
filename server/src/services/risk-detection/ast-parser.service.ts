/**
 * Solidity AST Parser Service
 * Parses Solidity code into analyzable structures
 */

import { DetectionContext, FunctionInfo, ModifierInfo, VariableInfo } from './detectors/base-detector';

export class ASTParserService {
  /**
   * Parse Solidity code into detection context
   */
  static parse(code: string): DetectionContext {
    const lines = code.split('\n');
    
    return {
      code,
      lines,
      functions: this.extractFunctions(code, lines),
      modifiers: this.extractModifiers(code, lines),
      variables: this.extractVariables(code, lines),
    };
  }

  /**
   * Extract function information
   */
  private static extractFunctions(code: string, lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    // Regex to match function declarations
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(public|external|internal|private)?\s*(view|pure|payable)?\s*([\w\s,]*)\s*(?:returns\s*\([^)]*\))?\s*\{/gi;
    
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const visibility = match[2] || 'public';
      const startIndex = match.index;
      
      // Find line number
      const startLine = code.substring(0, startIndex).split('\n').length;
      
      // Extract modifiers (between visibility and returns/opening brace)
      const modifiersStr = match[4] || '';
      const modifiers = modifiersStr
        .split(/\s+/)
        .filter(m => m && !['returns', 'return', '{'].includes(m));
      
      // Find function body
      const bodyStart = code.indexOf('{', startIndex);
      const bodyEnd = this.findMatchingBrace(code, bodyStart);
      const body = code.substring(bodyStart + 1, bodyEnd);
      const endLine = code.substring(0, bodyEnd).split('\n').length;
      
      // Get full signature
      const fullSignature = lines.slice(startLine - 1, Math.min(startLine + 2, lines.length))
        .join('\n')
        .trim();
      
      functions.push({
        name: functionName,
        startLine,
        endLine,
        visibility,
        modifiers,
        body,
        fullSignature,
      });
    }
    
    return functions;
  }

  /**
   * Extract modifier information
   */
  private static extractModifiers(code: string, lines: string[]): ModifierInfo[] {
    const modifiers: ModifierInfo[] = [];
    
    // Regex to match modifier declarations
    const modifierRegex = /modifier\s+(\w+)\s*(?:\([^)]*\))?\s*\{/gi;
    
    let match;
    while ((match = modifierRegex.exec(code)) !== null) {
      const modifierName = match[1];
      const startIndex = match.index;
      const lineNumber = code.substring(0, startIndex).split('\n').length;
      
      // Find modifier body
      const bodyStart = code.indexOf('{', startIndex);
      const bodyEnd = this.findMatchingBrace(code, bodyStart);
      const body = code.substring(bodyStart + 1, bodyEnd);
      
      modifiers.push({
        name: modifierName,
        lineNumber,
        body,
      });
    }
    
    return modifiers;
  }

  /**
   * Extract variable information
   */
  private static extractVariables(code: string, lines: string[]): VariableInfo[] {
    const variables: VariableInfo[] = [];
    
    // Regex for state variables (simplified)
    const patterns = [
      // Simple variables: uint256 public myVar;
      /^\s*(uint\d*|int\d*|address|bool|string|bytes\d*)\s+(public|private|internal)?\s*(constant)?\s+(\w+)\s*(?:=|;)/gim,
      // Mappings: mapping(address => uint256) public balances;
      /^\s*mapping\s*\([^)]+\)\s+(public|private|internal)?\s+(\w+)\s*;/gim,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        
        // Extract based on capture groups
        let type, visibility, isConstant, name;
        
        if (match[0].includes('mapping')) {
          visibility = match[1] || 'internal';
          name = match[2];
          type = 'mapping';
          isConstant = false;
        } else {
          type = match[1];
          visibility = match[2] || 'internal';
          isConstant = match[3] === 'constant';
          name = match[4];
        }
        
        variables.push({
          name,
          type,
          visibility,
          lineNumber,
          isConstant,
        });
      }
    }
    
    return variables;
  }

  /**
   * Find matching closing brace
   */
  private static findMatchingBrace(code: string, openIndex: number): number {
    let depth = 1;
    let index = openIndex + 1;
    
    while (index < code.length && depth > 0) {
      if (code[index] === '{') {
        depth++;
      } else if (code[index] === '}') {
        depth--;
      }
      index++;
    }
    
    return depth === 0 ? index - 1 : code.length;
  }

  /**
   * Validate if code is valid Solidity
   */
  static isValidSolidity(code: string): boolean {
    const solidityKeywords = [
      'pragma solidity',
      'contract ',
      'interface ',
      'library ',
    ];
    
    return solidityKeywords.some(keyword => 
      code.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract compiler version
   */
  static extractCompilerVersion(code: string): string | null {
    const match = code.match(/pragma\s+solidity\s+([^;]+);/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Count lines of code (excluding comments and whitespace)
   */
  static countLinesOfCode(code: string): number {
    const lines = code.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('//') && 
             !trimmed.startsWith('/*') &&
             !trimmed.startsWith('*');
    }).length;
  }
}
