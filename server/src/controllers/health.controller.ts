/**
 * Health Controller
 * System health and status checks
 */

import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/caching/redis.service';
import config from '../config';

export class HealthController {
  /**
   * GET /api/v1/health
   * System health check
   */
  static async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      // Check Redis connection
      const redisStatus = cacheService.isConnected() ? 'connected' : 'disconnected';

      // Calculate uptime
      const uptime = process.uptime();

      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime),
          version: '2.0.0',
          services: {
            redis: redisStatus,
            ai: 'ready', // Would check actual AI service in production
          },
          performance: {
            responseTime: Date.now() - startTime,
            memoryUsage: process.memoryUsage(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chains
   * Get supported blockchain networks
   */
  static async getChains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chains = [
        {
          id: 'ethereum',
          name: 'Ethereum Mainnet',
          explorerUrl: 'https://etherscan.io',
          enabled: !!config.etherscanApiKey,
        },
        {
          id: 'polygon',
          name: 'Polygon',
          explorerUrl: 'https://polygonscan.com',
          enabled: !!config.polygonscanApiKey,
        },
        {
          id: 'bsc',
          name: 'Binance Smart Chain',
          explorerUrl: 'https://bscscan.com',
          enabled: !!config.bscscanApiKey,
        },
      ];

      res.json({
        success: true,
        data: { chains },
      });
    } catch (error) {
      next(error);
    }
  }
}
