/**
 * API Routes v1
 * All API endpoint routes
 */

import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyze.controller';
import { HealthController } from '../controllers/health.controller';
import { ValidatorMiddleware } from '../middleware/validator';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  analyzeRequestSchema,
  paginationSchema,
} from '../utils/validation-schemas';

const router = Router();

// Health routes (no rate limiting)
router.get('/health', HealthController.check);
router.get('/chains', HealthController.getChains);

// Analysis routes (with rate limiting)
router.post(
  '/analyze',
  rateLimiter,
  ValidatorMiddleware.body(analyzeRequestSchema),
  AnalyzeController.analyze
);

router.post(
  '/analyze/quick-check',
  rateLimiter,
  AnalyzeController.quickCheck
);

router.get(
  '/analyze/:id',
  rateLimiter,
  AnalyzeController.getAnalysis
);

export default router;
