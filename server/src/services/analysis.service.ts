import { TextGeneration } from '@runanywhere/web-llamacpp';
import { AnalysisResult, RiskCategory } from '../types';
import { ApiError } from '../utils/ApiError';
import config from '../config';

const RISK_ANALYSIS_PROMPT = `You are an expert smart contract security analyzer. Analyze the provided Solidity code for security vulnerabilities and risks.

Focus on these key risk categories with their weights:
1. Administrative Controls (weight: 0.25) - onlyOwner patterns, centralized control, pause mechanisms
2. Fund Safety (weight: 0.30) - withdrawal functions, fund locking, emergency withdrawals  
3. Upgrade Mechanisms (weight: 0.20) - proxy patterns, delegatecall usage, upgrade capabilities
4. Economic Manipulation (weight: 0.15) - fee manipulation, unlimited minting, supply controls
5. Access Controls (weight: 0.10) - permission systems, role management, modifier usage

Provide your analysis in this exact JSON format (no markdown, no extra text):
{
  "categories": [
    {
      "name": "Administrative Controls",
      "score": <number 0-10>,
      "weight": 0.25,
      "findings": ["<specific finding with line reference if possible>"],
      "impact": "<what could happen if exploited>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>"
    },
    {
      "name": "Fund Safety",
      "score": <number 0-10>,
      "weight": 0.30,
      "findings": ["<specific finding>"],
      "impact": "<impact description>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>"
    },
    {
      "name": "Upgrade Mechanisms",
      "score": <number 0-10>,
      "weight": 0.20,
      "findings": ["<specific finding>"],
      "impact": "<impact description>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>"
    },
    {
      "name": "Economic Manipulation",
      "score": <number 0-10>,
      "weight": 0.15,
      "findings": ["<specific finding>"],
      "impact": "<impact description>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>"
    },
    {
      "name": "Access Controls",
      "score": <number 0-10>,
      "weight": 0.10,
      "findings": ["<specific finding>"],
      "impact": "<impact description>",
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>"
    }
  ],
  "summary": "<plain English summary of main risks in 2-3 sentences>",
  "recommendations": ["<actionable recommendation>", "<actionable recommendation>"],
  "confidence": <number 0-100>,
  "metadata": {
    "linesOfCode": <number>,
    "complexity": <LOW|MEDIUM|HIGH>
  }
}

Score 0-2: Very Low Risk, 3-4: Low Risk, 5-6: Moderate Risk, 7-8: High Risk, 9-10: Very High Risk.
Confidence: How certain you are about the analysis (higher = more certain).

Contract to analyze:
`;

export class AIAnalysisService {
  /**
   * Analyze smart contract using on-device AI
   */
  static async analyzeContract(contractCode: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Validate contract size
    if (contractCode.length > config.maxContractSizeBytes) {
      throw new ApiError(
        400,
        'CONTRACT_TOO_LARGE',
        `Contract exceeds maximum size of ${config.maxContractSizeBytes} bytes`
      );
    }

    // Basic contract validation
    if (!this.isValidSolidityCode(contractCode)) {
      throw new ApiError(400, 'INVALID_CONTRACT', 'Input does not appear to be valid Solidity code');
    }

    try {
      const prompt = `${RISK_ANALYSIS_PROMPT}\n\n${contractCode}`;

      // Generate analysis using LLM
      const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
        maxTokens: config.aiMaxTokens,
        temperature: config.aiTemperature,
      });

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
      }

      const result = await resultPromise;
      const responseText = result.text || accumulated;

      // Parse JSON response
      const parsedResult = this.parseAIResponse(responseText);

      // Calculate overall score using weighted average
      const overallScore = this.calculateOverallScore(parsedResult.categories);

      // Add metadata
      const metadata = {
        linesOfCode: contractCode.split('\n').length,
        complexity: this.estimateComplexity(contractCode),
        ...parsedResult.metadata,
      };

      const processingTime = Date.now() - startTime;

      return {
        overallScore,
        confidence: parsedResult.confidence,
        categories: parsedResult.categories,
        summary: parsedResult.summary,
        recommendations: parsedResult.recommendations,
        metadata: {
          ...metadata,
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        'ANALYSIS_FAILED',
        `Failed to analyze contract: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse AI response and validate structure
   */
  private static parseAIResponse(responseText: string): {
    categories: RiskCategory[];
    summary: string;
    recommendations: string[];
    confidence: number;
    metadata?: any;
  } {
    try {
      // Find JSON in response (remove any extra text before/after)
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON found in AI response');
      }

      const jsonStr = responseText.slice(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Missing or invalid categories');
      }

      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('Missing or invalid summary');
      }

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Missing or invalid recommendations');
      }

      // Validate each category
      const requiredCategories = [
        'Administrative Controls',
        'Fund Safety',
        'Upgrade Mechanisms',
        'Economic Manipulation',
        'Access Controls',
      ];

      for (const categoryName of requiredCategories) {
        const category = parsed.categories.find((c: any) => c.name === categoryName);
        if (!category) {
          throw new Error(`Missing required category: ${categoryName}`);
        }

        // Validate category structure
        if (typeof category.score !== 'number' || category.score < 0 || category.score > 10) {
          throw new Error(`Invalid score for category ${categoryName}`);
        }

        if (!Array.isArray(category.findings)) {
          throw new Error(`Invalid findings for category ${categoryName}`);
        }
      }

      return {
        categories: parsed.categories,
        summary: parsed.summary,
        recommendations: parsed.recommendations,
        confidence: parsed.confidence || 75, // Default confidence
        metadata: parsed.metadata,
      };
    } catch (error) {
      throw new ApiError(
        500,
        'PARSE_ERROR',
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate weighted overall score
   */
  private static calculateOverallScore(categories: RiskCategory[]): number {
    const weightedSum = categories.reduce((sum, category) => {
      return sum + category.score * category.weight;
    }, 0);

    return Math.round(weightedSum * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Basic validation that input looks like Solidity code
   */
  private static isValidSolidityCode(code: string): boolean {
    const solidityKeywords = [
      'pragma solidity',
      'contract ',
      'interface ',
      'library ',
      'function ',
    ];

    return solidityKeywords.some((keyword) => code.toLowerCase().includes(keyword));
  }

  /**
   * Estimate contract complexity
   */
  private static estimateComplexity(code: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lines = code.split('\n').length;
    const functions = (code.match(/function\s+\w+/g) || []).length;
    const modifiers = (code.match(/modifier\s+\w+/g) || []).length;

    const complexityScore = lines / 100 + functions * 2 + modifiers * 3;

    if (complexityScore < 5) return 'LOW';
    if (complexityScore < 15) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Combine AI analysis with static analysis
   */
  static async analyzeWithStaticChecks(contractCode: string): Promise<AnalysisResult> {
    const aiResult = await this.analyzeContract(contractCode);

    if (config.enableStaticAnalysis) {
      // Add static analysis findings
      const staticFindings = this.runStaticAnalysis(contractCode);

      // Merge findings into appropriate categories
      staticFindings.forEach((finding) => {
        const category = aiResult.categories.find((c) => c.name === finding.category);
        if (category && !category.findings.includes(finding.description)) {
          category.findings.push(finding.description);

          // Adjust score if static analysis found something AI missed
          if (finding.severity === 'HIGH' || finding.severity === 'CRITICAL') {
            category.score = Math.min(10, category.score + 1);
          }
        }
      });

      // Recalculate overall score
      aiResult.overallScore = this.calculateOverallScore(aiResult.categories);
    }

    return aiResult;
  }

  /**
   * Run static pattern-based analysis
   */
  private static runStaticAnalysis(
    code: string
  ): Array<{
    category: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    const findings: Array<{
      category: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }> = [];

    // Check for unlimited minting
    if (code.match(/function\s+mint\s*\([^)]*\)\s*public/i)) {
      findings.push({
        category: 'Economic Manipulation',
        description: 'Public mint function detected - verify access controls',
        severity: 'HIGH',
      });
    }

    // Check for selfdestruct
    if (code.includes('selfdestruct')) {
      findings.push({
        category: 'Administrative Controls',
        description: 'selfdestruct function detected - contract can be destroyed',
        severity: 'CRITICAL',
      });
    }

    // Check for delegatecall
    if (code.includes('delegatecall')) {
      findings.push({
        category: 'Upgrade Mechanisms',
        description: 'delegatecall detected - potential for proxy upgrade vulnerabilities',
        severity: 'HIGH',
      });
    }

    // Check for transfer/send without checks
    if (code.match(/\.transfer\(|\.send\(/)) {
      findings.push({
        category: 'Fund Safety',
        description: 'Direct transfer/send detected - verify proper error handling',
        severity: 'MEDIUM',
      });
    }

    // Check for tx.origin
    if (code.includes('tx.origin')) {
      findings.push({
        category: 'Access Controls',
        description: 'tx.origin usage detected - vulnerable to phishing attacks',
        severity: 'HIGH',
      });
    }

    // Check for unchecked external calls
    if (code.match(/\.call\{|\.call\(/)) {
      findings.push({
        category: 'Fund Safety',
        description: 'Low-level call detected - verify return value is checked',
        severity: 'MEDIUM',
      });
    }

    return findings;
  }
}
