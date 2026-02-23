import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import config from '../config';
import { AuthRequest } from './auth';
import { RateLimitError } from '../utils/ApiError';

const prisma = new PrismaClient();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const getTierLimits = (tier?: 'FREE' | 'PRO' | 'ENTERPRISE'): RateLimitConfig => {
  switch (tier) {
    case 'ENTERPRISE':
      return {
        windowMs: config.rateLimitWindowMs,
        maxRequests: config.rateLimitMaxRequestsEnterprise,
      };
    case 'PRO':
      return {
        windowMs: config.rateLimitWindowMs,
        maxRequests: config.rateLimitMaxRequestsPro,
      };
    case 'FREE':
    default:
      return {
        windowMs: config.rateLimitWindowMs,
        maxRequests: config.rateLimitMaxRequestsFree,
      };
  }
};

const getIdentifier = (req: AuthRequest): string => {
  if (req.user) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
};

export const rateLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = getIdentifier(req);
    const endpoint = `${req.method}:${req.path}`;
    const tier = req.user?.tier;
    const limits = getTierLimits(tier);

    const now = new Date();
    const windowStart = new Date(now.getTime() - limits.windowMs);

    // Check existing rate limit record
    let rateLimit = await prisma.rateLimit.findUnique({
      where: {
        identifier_endpoint: {
          identifier,
          endpoint,
        },
      },
    });

    if (rateLimit) {
      // Check if window has expired
      if (rateLimit.expiresAt < now) {
        // Reset the counter
        rateLimit = await prisma.rateLimit.update({
          where: {
            identifier_endpoint: {
              identifier,
              endpoint,
            },
          },
          data: {
            requestCount: 1,
            windowStart: now,
            expiresAt: new Date(now.getTime() + limits.windowMs),
          },
        });
      } else if (rateLimit.requestCount >= limits.maxRequests) {
        // Rate limit exceeded
        const resetTime = Math.ceil((rateLimit.expiresAt.getTime() - now.getTime()) / 1000);
        
        res.setHeader('X-RateLimit-Limit', limits.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', resetTime.toString());
        
        throw new RateLimitError(`Rate limit exceeded. Try again in ${resetTime} seconds.`);
      } else {
        // Increment counter
        rateLimit = await prisma.rateLimit.update({
          where: {
            identifier_endpoint: {
              identifier,
              endpoint,
            },
          },
          data: {
            requestCount: {
              increment: 1,
            },
          },
        });
      }
    } else {
      // Create new rate limit record
      rateLimit = await prisma.rateLimit.create({
        data: {
          identifier,
          endpoint,
          requestCount: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + limits.windowMs),
        },
      });
    }

    // Set rate limit headers
    const remaining = Math.max(0, limits.maxRequests - rateLimit.requestCount);
    const resetTime = Math.ceil((rateLimit.expiresAt.getTime() - now.getTime()) / 1000);
    
    res.setHeader('X-RateLimit-Limit', limits.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup expired rate limit records (should be run periodically)
 */
export const cleanupExpiredRateLimits = async (): Promise<number> => {
  const result = await prisma.rateLimit.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  
  return result.count;
};
