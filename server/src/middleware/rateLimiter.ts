import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { ApiError } from '../utils/ApiError';
import cacheService from '../services/caching/redis.service';
import { CacheKeys } from '../services/caching/cache-keys';

interface AuthRequest extends Request {
  user?: {
    id: string;
    tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  };
}

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

    const windowSeconds = Math.floor(limits.windowMs / 1000);
    const cacheKey = CacheKeys.rateLimit(identifier, endpoint, Date.now());

    // Increment counter in Redis
    const count = await cacheService.incr(cacheKey, windowSeconds);

    // Set rate limit headers
    const remaining = Math.max(0, limits.maxRequests - count);
    const ttl = await cacheService.ttl(cacheKey);
    
    res.setHeader('X-RateLimit-Limit', limits.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', ttl.toString());

    // Check if limit exceeded
    if (count > limits.maxRequests) {
      throw new ApiError(
        429,
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded. Try again in ${ttl} seconds.`,
        { resetAfter: ttl }
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
