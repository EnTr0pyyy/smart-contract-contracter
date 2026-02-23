/**
 * Request Logger Middleware
 * Logs all incoming requests
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

export const requestLogger = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Log request
  console.log(`[${req.id}] ${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    console.log(`[${req.id}] ${res.statusCode} - ${duration}ms`);
  });

  next();
};
