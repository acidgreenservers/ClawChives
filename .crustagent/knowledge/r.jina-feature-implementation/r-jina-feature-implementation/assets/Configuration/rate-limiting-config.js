/**
 * Rate Limiting Configuration for r.jina.ai Proxy Endpoints
 * 
 * This configuration demonstrates how to implement rate limiting
 * for the new r.jina.ai proxy endpoints in ClawChives.
 * 
 * Uses express-rate-limit for basic rate limiting
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configuration for r.jina.ai proxy endpoints
 * 
 * Limits:
 * - 100 requests per 15 minutes per IP
 * - Custom error message for rate limit exceeded
 * - Skip successful requests from the same IP for better UX
 */
export const rJinaProxyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many r.jina.ai requests from this IP, please try again later.',
    details: {
      retryAfter: 15 * 60 // seconds
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests to allow more attempts if they fail
  skipSuccessfulRequests: true,
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] r.jina.ai proxy rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      details: {
        retryAfter: Math.round(req.rateLimit.resetTime / 1000),
        currentRequests: req.rateLimit.current,
        maxRequests: req.rateLimit.limit
      }
    });
  }
});

/**
 * Stricter rate limiting for status endpoints
 * 
 * These endpoints are less resource-intensive but should still be rate limited
 */
export const rJinaStatusRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many status requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Per-user rate limiting configuration
 * 
 * This configuration uses user UUID for more granular rate limiting
 * when users are authenticated
 */
export const rJinaUserRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Allow more requests for authenticated users
    if (req.userUuid) {
      return 200; // Authenticated users can make 200 requests
    }
    return 50; // Unauthenticated users limited to 50 requests
  },
  message: (req) => {
    const limit = req.userUuid ? 200 : 50;
    return {
      success: false,
      error: `Rate limit exceeded. ${req.userUuid ? 'Authenticated' : 'Unauthenticated'} users are limited to ${limit} requests per 15 minutes.`
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user UUID as the key for rate limiting
  keyGenerator: (req) => {
    return req.userUuid || req.ip;
  }
});

/**
 * Dynamic rate limiting based on user permissions
 * 
 * Different user types get different rate limits
 */
export const rJinaDynamicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Check user permissions and set limits accordingly
    if (req.userUuid) {
      // In a real implementation, you would check the user's role/permissions
      // For now, we'll use a simple heuristic
      return 150; // Standard authenticated user
    }
    return 30; // Unauthenticated user
  },
  message: (req) => {
    const limit = req.userUuid ? 150 : 30;
    return {
      success: false,
      error: `Rate limit exceeded. Please try again in ${Math.ceil(req.rateLimit.windowMs / 60000)} minutes.`,
      details: {
        limit: limit,
        remaining: req.rateLimit.remaining
      }
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use a combination of IP and user UUID for better rate limiting
    return req.userUuid ? `user:${req.userUuid}` : `ip:${req.ip}`;
  }
});

/**
 * Agent-specific rate limiting
 * 
 * Different rate limits for different types of agents
 */
export const rJinaAgentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    // Different limits based on agent type
    if (req.keyType === 'agent') {
      return 1000; // Agents get higher limits
    }
    return 100; // Regular users
  },
  message: (req) => {
    const limit = req.keyType === 'agent' ? 1000 : 100;
    return {
      success: false,
      error: `Agent rate limit exceeded. ${req.keyType === 'agent' ? 'Agent' : 'User'} limit: ${limit} requests per hour.`
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use agent key or user UUID for rate limiting
    return req.apiKey || req.userUuid || req.ip;
  }
});

/**
 * Memory store configuration for rate limiting
 * 
 * Uses memory store by default, but can be configured for Redis
 */
export const rJinaMemoryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: 'memory', // Use memory store
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Redis-based rate limiting configuration
 * 
 * Use this configuration if you have Redis available
 * Requires: npm install rate-limiter-flexible
 */
export const rJinaRedisRateLimit = (redisClient) => {
  const { RateLimiterRedis } = require('rate-limiter-flexible');
  
  const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_jina',
    points: 100, // Number of requests
    duration: 900, // Per 15 seconds (900 seconds = 15 minutes)
    blockDuration: 60, // Block for 1 minute if limit exceeded
  });
  
  return async (req, res, next) => {
    try {
      await limiter.consume(req.userUuid || req.ip);
      next();
    } catch (rejRes) {
      const remainingPoints = rejRes?.remainingPoints || 0;
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        details: {
          remainingPoints,
          retryAfter: Math.round(rejRes.msBeforeNext / 1000)
        }
      });
    }
  };
};

/**
 * Rate limiting middleware factory
 * 
 * Creates rate limiting middleware with custom configuration
 */
export function createRateLimit(config = {}) {
  const defaultConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: 'Rate limit exceeded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...config
  };
  
  return rateLimit(defaultConfig);
}

/**
 * Rate limiting configuration for different environments
 */
export const getRateLimitConfig = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // Stricter limits in production
      message: {
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      }
    };
  }
  
  return {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // More lenient in development
    message: {
      success: false,
      error: 'Rate limit exceeded. Please try again later.'
    }
  };
};

/**
 * Apply rate limiting to specific routes
 * 
 * Usage example in your Express app:
 * 
 * import { rJinaProxyRateLimit, rJinaStatusRateLimit } from './rate-limiting-config.js';
 * 
 * // Apply to proxy endpoints
 * app.use('/api/proxy/r.jina', rJinaProxyRateLimit);
 * 
 * // Apply to status endpoints
 * app.use('/api/proxy/r.jina/status', rJinaStatusRateLimit);
 */

export default {
  rJinaProxyRateLimit,
  rJinaStatusRateLimit,
  rJinaUserRateLimit,
  rJinaDynamicRateLimit,
  rJinaAgentRateLimit,
  rJinaMemoryRateLimit,
  rJinaRedisRateLimit,
  createRateLimit,
  getRateLimitConfig
};
