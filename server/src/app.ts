/**
 * Express Application Configuration
 * Main app setup with middleware
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/v1';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.etherscan.io", "https://api.polygonscan.com", "https://api.bscscan.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Request logging
  app.use(requestLogger);

  // API routes
  app.use('/api/v1', apiRoutes);

  // Root route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'AI Smart Contract Risk Analyzer API',
        version: '2.0.0',
        status: 'online',
        documentation: '/api/v1/health',
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
