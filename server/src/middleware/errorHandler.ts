/**
 * Global Error Handler Middleware
 * Catches and formats all errors
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import config from '../config';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (req as any).id || 'unknown',
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'development' 
        ? err.message 
        : 'An unexpected error occurred',
      details: config.nodeEnv === 'development' 
        ? { stack: err.stack } 
        : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id || 'unknown',
    },
  });
};
