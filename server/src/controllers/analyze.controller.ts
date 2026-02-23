/**
 * Analyze Controller
 * Handles contract analysis requests
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RiskEngineService } from '../services/risk-detection/risk-engine.service';
import { AIExplanationService } from '../services/ai-explanation/ai-service';
import { EtherscanService } from '../services/etherscan.service';
import cacheService from '../services/caching/redis.service';
import { CacheKeys } from '../services/caching/cache-keys';
import { ApiError } from '../utils/ApiError';
import { RiskFinding } from '../types/risk.types';

export class AnalyzeController {
  /**
   * POST /api/v1/analyze
   * Analyze a smart contract
   */
  static async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      const { input, chain, mode } = req.body;

      // 1. Determine if input is address or source code
      const isAddress = EtherscanService.isValidAddress(input);

      let sourceCode: string;
      let contractAddress: string | undefined;
      let isVerified = false;
      let compilerVersion: string | undefined;

      if (isAddress) {
        contractAddress = input.toLowerCase();

        // Check cache for analysis result
        const cacheKey = CacheKeys.analysisResult(contractAddress, chain);
        const cachedResult = await cacheService.get(cacheKey);

        if (cachedResult) {
          res.json({
            success: true,
            data: {
              ...cachedResult,
              cached: true,
            },
          });
          return;
        }

        // Fetch from blockchain explorer
        try {
          const contractData = await EtherscanService.fetchContractSource(
            contractAddress,
            chain
          );
          sourceCode = contractData.sourceCode;
          isVerified = contractData.isVerified;
          compilerVersion = contractData.compilerVersion;

          // Cache source code
          const sourceCacheKey = CacheKeys.contractSource(contractAddress, chain);
          await cacheService.set(sourceCacheKey, contractData, 86400); // 24 hours
        } catch (error) {
          throw new ApiError(
            400,
            'CONTRACT_FETCH_FAILED',
            `Failed to fetch contract from ${chain}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        // Direct source code input
        sourceCode = input;
        
        // Check cache by code hash
        const codeHash = CacheKeys.hashCode(sourceCode);
        const cacheKey = CacheKeys.codeAnalysis(codeHash);
        const cachedResult = await cacheService.get(cacheKey);

        if (cachedResult) {
          res.json({
            success: true,
            data: {
              ...cachedResult,
              cached: true,
            },
          });
          return;
        }
      }

      // 2. Validate contract size
      RiskEngineService.validateSize(sourceCode);

      // 3. Run deterministic risk detection
      console.log('Starting risk detection...');
      const detectionResult = await RiskEngineService.analyze(sourceCode);
      console.log(`Risk detection complete: ${detectionResult.findings.length} risks found`);

      // 4. Generate AI explanations
      console.log('Generating AI explanations...');
      let explanations;
      try {
        explanations = await AIExplanationService.generateExplanations({
          risk_score: detectionResult.risk_score,
          risks: detectionResult.findings,
          confidence: detectionResult.confidence,
        });
      } catch (error) {
        console.error('AI explanation failed, using fallback:', error);
        // Use fallback if AI fails
        explanations = (AIExplanationService as any).generateFallbackExplanations({
          risk_score: detectionResult.risk_score,
          risks: detectionResult.findings,
          confidence: detectionResult.confidence,
        });
      }

      // 5. Build complete result
      const analysisId = uuidv4();
      const processingTime = Date.now() - startTime;

      const risks = detectionResult.findings.map((finding: RiskFinding, index: number) => ({
        type: finding.type,
        severity: finding.severity,
        weight: finding.weight,
        code_snippet: finding.code_snippet,
        line_number: finding.line_number,
        machine_reason: finding.machine_reason,
        function_name: finding.function_name,
        modifier_name: finding.modifier_name,
        beginner_explanation: explanations.risk_explanations[index]?.beginner || 'Explanation unavailable',
        developer_explanation: explanations.risk_explanations[index]?.developer || finding.machine_reason,
        why_it_matters: explanations.risk_explanations[index]?.why_it_matters || 'This may affect contract safety',
        mitigation: explanations.risk_explanations[index]?.mitigation || 'Review this pattern carefully',
      }));

      const metadata = RiskEngineService.getContractMetadata(sourceCode);

      const result = {
        id: analysisId,
        risk_score: detectionResult.risk_score,
        classification: detectionResult.classification,
        confidence: Math.round(detectionResult.confidence * 100),
        risks,
        beginner_summary: explanations.beginner_summary,
        developer_summary: explanations.developer_summary,
        metadata: {
          contract_address: contractAddress,
          chain,
          is_verified: isVerified,
          compiler_version: compilerVersion || metadata.compiler_version,
          lines_of_code: metadata.lines_of_code,
          total_functions: metadata.total_functions,
          processing_time_ms: processingTime,
        },
        cached: false,
        analyzed_at: new Date().toISOString(),
      };

      // 6. Cache result
      if (contractAddress) {
        const cacheKey = CacheKeys.analysisResult(contractAddress, chain);
        await cacheService.set(cacheKey, result, 3600); // 1 hour
      } else {
        const codeHash = CacheKeys.hashCode(sourceCode);
        const cacheKey = CacheKeys.codeAnalysis(codeHash);
        await cacheService.set(cacheKey, result, 3600); // 1 hour
      }

      // 7. Return response
      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: (req as any).id,
          processingTime,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analyze/:id
   * Get analysis by ID (from database if needed)
   */
  static async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // For now, return not found
      // In production, this would query the database
      throw new ApiError(404, 'NOT_FOUND', 'Analysis not found');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/analyze/quick-check
   * Quick validation without full analysis
   */
  static async quickCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { input } = req.body;

      const result = await RiskEngineService.quickCheck(input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
