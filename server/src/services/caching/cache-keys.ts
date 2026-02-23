/**
 * Cache Key Generators
 * Consistent cache key generation
 */

export class CacheKeys {
  private static readonly PREFIX = 'contract_analyzer';
  private static readonly VERSION = 'v2';

  /**
   * Generate cache key for contract source
   */
  static contractSource(address: string, chain: string): string {
    return `${this.PREFIX}:source:${chain}:${address.toLowerCase()}:${this.VERSION}`;
  }

  /**
   * Generate cache key for analysis result
   */
  static analysisResult(address: string, chain: string): string {
    return `${this.PREFIX}:analysis:${chain}:${address.toLowerCase()}:${this.VERSION}`;
  }

  /**
   * Generate cache key for code hash analysis
   */
  static codeAnalysis(codeHash: string): string {
    return `${this.PREFIX}:code:${codeHash}:${this.VERSION}`;
  }

  /**
   * Generate cache key for rate limiting
   */
  static rateLimit(identifier: string, endpoint: string, window: number): string {
    return `${this.PREFIX}:ratelimit:${identifier}:${endpoint}:${window}`;
  }

  /**
   * Generate cache key for API usage
   */
  static apiUsage(userId: string, date: string): string {
    return `${this.PREFIX}:usage:${userId}:${date}`;
  }

  /**
   * Calculate hash for source code
   */
  static hashCode(code: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
  }
}
