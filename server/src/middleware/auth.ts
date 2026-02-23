import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { UserPayload } from '../types';
import { ApiError } from '../utils/ApiError';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: UserPayload;
}

/**
 * Middleware to verify JWT token from Authorization header
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as UserPayload;
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, tier: true }
      });

      if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        tier: user.tier as 'FREE' | 'PRO' | 'ENTERPRISE'
      };

      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Token has expired');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'INVALID_TOKEN', 'Invalid token');
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as UserPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, tier: true }
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          tier: user.tier as 'FREE' | 'PRO' | 'ENTERPRISE'
        };
      }
    } catch (err) {
      // Silently fail for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify API key from X-API-Key header
 */
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Missing API key');
    }

    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, email: true, tier: true }
    });

    if (!user) {
      throw new ApiError(401, 'INVALID_API_KEY', 'Invalid API key');
    }

    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier as 'FREE' | 'PRO' | 'ENTERPRISE'
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require specific user tier
 */
export const requireTier = (minTier: 'FREE' | 'PRO' | 'ENTERPRISE') => {
  const tierLevels = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const userTierLevel = tierLevels[req.user.tier];
    const requiredTierLevel = tierLevels[minTier];

    if (userTierLevel < requiredTierLevel) {
      throw new ApiError(403, 'FORBIDDEN', `This endpoint requires ${minTier} tier or higher`);
    }

    next();
  };
};
