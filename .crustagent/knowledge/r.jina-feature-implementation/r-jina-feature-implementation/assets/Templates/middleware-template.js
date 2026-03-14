/**
 * r.jina.ai Middleware Template
 * 
 * This template demonstrates how to implement middleware
 * for human-only permission checking and rate limiting
 * for r.jina.ai proxy functionality in ClawChives.
 * 
 * Copy this template into your middleware directory
 * and adapt it to your specific needs.
 */

import { audit } from '../utils/auditLogger.js';
import { db } from '../services/database.js';

/**
 * Human-Only Permission Middleware
 * 
 * Ensures that only human users (not agents) can access
 * r.jina.ai proxy endpoints for security reasons.
 */
export function requireHuman(req, res, next) {
  // Check if the request is from a human user
  if (req.keyType !== 'human') {
    audit.log('HUMAN_ONLY_ACCESS_DENIED', {
      actor: req.userUuid || req.apiKey,
      actor_type: req.keyType,
      action: 'access_rjina_proxy',
      outcome: 'failure',
      resource: 'r.jina.proxy',
      details: { 
        reason: 'Agent access denied - r.jina.ai proxy is human-only',
        endpoint: req.path 
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    return res.status(403).json({
      success: false,
      error: 'Access denied: r.jina.ai proxy functionality is restricted to human users only'
    });
  }
  
  // Log successful human access
  audit.log('HUMAN_ONLY_ACCESS_GRANTED', {
    actor: req.userUuid,
    actor_type: 'human',
    action: 'access_rjina_proxy',
    outcome: 'success',
    resource: 'r.jina.proxy',
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  });
  
  next();
}

/**
 * r.jina.ai Rate Limiting Middleware
 * 
 * Implements rate limiting specifically for r.jina.ai endpoints
 * with user-specific limits and caching considerations.
 */
export function createRJinaRateLimiter() {
  const rateLimits = new Map();
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // Cleanup expired rate limit entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimits.entries()) {
      if (now > data.windowEnd) {
        rateLimits.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  
  return async (req, res, next) => {
    const userUuid = req.userUuid;
    const endpoint = req.path;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const windowStart = now - windowMs;
    
    // Get user configuration for rate limits
    let rateLimit = 100; // Default limit
    try {
      const config = await getUserProxyConfig(userUuid);
      rateLimit = config.rate_limit || 100;
    } catch (error) {
      console.warn('[r.jina] Failed to get user config for rate limiting:', error);
    }
    
    const key = `${userUuid}:${endpoint}`;
    let userData = rateLimits.get(key);
    
    // Initialize or reset rate limit window
    if (!userData || now > userData.windowEnd) {
      userData = {
        requests: 0,
        windowStart: now,
        windowEnd: now + windowMs,
        resetTime: now + windowMs
      };
      rateLimits.set(key, userData);
    }
    
    // Check if rate limit exceeded
    if (userData.requests >= rateLimit) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      
      audit.log('RJINA_RATE_LIMIT_EXCEEDED', {
        actor: userUuid,
        actor_type: req.keyType,
        action: 'rate_limit_check',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { 
          requests: userData.requests,
          limit: rateLimit,
          retryAfter: retryAfter,
          endpoint: endpoint 
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for r.jina.ai proxy',
        details: {
          limit: rateLimit,
          remaining: 0,
          retryAfter: retryAfter,
          windowMs: windowMs
        }
      });
    }
    
    // Increment request count
    userData.requests++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit,
      'X-RateLimit-Remaining': Math.max(0, rateLimit - userData.requests),
      'X-RateLimit-Reset': Math.ceil(userData.resetTime / 1000),
      'X-RateLimit-Window': windowMs
    });
    
    next();
  };
}

/**
 * r.jina.ai Cache Middleware
 * 
 * Handles caching of r.jina.ai proxy responses
 * to improve performance and reduce API calls.
 */
export function rJinaCacheMiddleware(options = {}) {
  const {
    ttl = 60 * 60 * 1000, // 1 hour default
    enabled = true,
    skipMethods = ['POST', 'PUT', 'DELETE']
  } = options;
  
  return async (req, res, next) => {
    // Skip caching for certain methods
    if (skipMethods.includes(req.method)) {
      return next();
    }
    
    // Skip caching if disabled
    if (!enabled) {
      return next();
    }
    
    // Only cache GET requests to r.jina.ai endpoints
    if (req.method !== 'GET' || !req.path.includes('/api/proxy/r.jina')) {
      return next();
    }
    
    const url = req.query.url;
    if (!url) {
      return next();
    }
    
    try {
      // Check cache
      const cached = await getCachedContent(url);
      
      if (cached) {
        audit.log('RJINA_CACHE_HIT', {
          actor: req.userUuid,
          actor_type: req.keyType,
          action: 'cache_check',
          outcome: 'success',
          resource: 'r.jina.proxy',
          details: { 
            url: url,
            cached: true,
            responseTime: cached.responseTime 
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        
        return res.json({
          success: true,
          data: {
            url: url,
            content: cached.content,
            cached: true,
            cachedAt: cached.cachedAt,
            responseTime: cached.responseTime
          }
        });
      }
      
      // Store original send function
      const originalSend = res.send;
      
      // Override send to cache the response
      res.send = function(body) {
        try {
          const response = JSON.parse(body);
          
          if (response.success && response.data && response.data.content) {
            cacheContent(url, response.data.content, response.data.responseTime || 0)
              .catch(error => {
                console.warn('[r.jina] Failed to cache response:', error);
              });
          }
        } catch (error) {
          console.warn('[r.jina] Failed to parse response for caching:', error);
        }
        
        // Call original send
        originalSend.call(this, body);
      };
      
      next();
      
    } catch (error) {
      console.error('[r.jina] Cache middleware error:', error);
      next();
    }
  };
}

/**
 * r.jina.ai Proxy Validation Middleware
 * 
 * Validates requests to r.jina.ai proxy endpoints
 * and ensures proper configuration.
 */
export function rJinaValidationMiddleware() {
  return async (req, res, next) => {
    try {
      // Check if proxy is enabled for this user
      const config = await getUserProxyConfig(req.userUuid);
      
      if (!config.proxy_enabled) {
        return res.status(403).json({
          success: false,
          error: 'r.jina.ai proxy is disabled for your account'
        });
      }
      
      // Validate URL parameter
      if (req.method === 'POST' && req.body && req.body.url) {
        try {
          new URL(req.body.url);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid URL provided',
            details: { url: req.body.url }
          });
        }
      }
      
      // Validate options if provided
      if (req.body && req.body.options) {
        const options = req.body.options;
        
        if (options.format && !['text', 'markdown', 'html'].includes(options.format)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid format option',
            details: { validFormats: ['text', 'markdown', 'html'] }
          });
        }
      }
      
      next();
      
    } catch (error) {
      console.error('[r.jina] Validation middleware error:', error);
      
      audit.log('RJINA_VALIDATION_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'validation',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { error: error.message },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  };
}

/**
 * r.jina.ai Audit Logging Middleware
 * 
 * Logs all r.jina.ai proxy requests for monitoring
 * and debugging purposes.
 */
export function rJinaAuditMiddleware() {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Determine outcome based on status code
      const outcome = statusCode >= 200 && statusCode < 300 ? 'success' : 'failure';
      
      // Log the request
      audit.log('RJINA_PROXY_REQUEST', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: req.method.toLowerCase(),
        outcome: outcome,
        resource: 'r.jina.proxy',
        details: {
          path: req.path,
          method: req.method,
          statusCode: statusCode,
          responseTime: responseTime,
          userAgent: req.headers['user-agent'],
          url: req.body?.url || req.query?.url || null
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      // Call original end
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Helper Functions
 */

/**
 * Get user proxy configuration
 */
async function getUserProxyConfig(userUuid) {
  const rows = db.prepare(`
    SELECT setting_key, setting_value 
    FROM rjina_proxy_config 
    WHERE user_uuid = ?
  `).all(userUuid);
  
  const config = {
    proxy_enabled: true,
    cache_enabled: true,
    rate_limit: 100
  };
  
  for (const row of rows) {
    config[row.setting_key] = row.setting_value === 'true' ? true : 
                              row.setting_value === 'false' ? false : 
                              isNaN(row.setting_value) ? row.setting_value : parseInt(row.setting_value);
  }
  
  return config;
}

/**
 * Get cached content
 */
async function getCachedContent(url) {
  const row = db.prepare(`
    SELECT content, response_time, cached_at
    FROM rjina_proxy_cache 
    WHERE original_url = ? AND expires_at > datetime('now')
  `).get(url);
  
  if (row) {
    return {
      content: row.content,
      responseTime: row.response_time,
      cachedAt: row.cached_at
    };
  }
  
  return null;
}

/**
 * Cache content
 */
async function cacheContent(url, content, responseTime) {
  const contentHash = await hashContent(content);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString(); // 1 hour
  
  db.prepare(`
    INSERT OR REPLACE INTO rjina_proxy_cache (id, original_url, jina_url, content, content_hash, response_time, cached_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${url}_${Date.now()}`,
    url,
    `https://r.jina.ai/http://${url}`,
    content,
    contentHash,
    responseTime,
    now,
    expiresAt
  );
}

/**
 * Simple content hashing function
 */
async function hashContent(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Usage Examples
 */

// Example 1: Basic human-only middleware
// app.use('/api/proxy/r.jina', requireHuman);

// Example 2: Rate limiting middleware
// const rJinaRateLimiter = createRJinaRateLimiter();
// app.use('/api/proxy/r.jina', rJinaRateLimiter);

// Example 3: Combined middleware stack
// app.use('/api/proxy/r.jina', [
//   requireAuth,
//   requireHuman,
//   rJinaValidationMiddleware(),
//   rJinaRateLimiter,
//   rJinaAuditMiddleware()
// ]);

// Example 4: With caching
// app.use('/api/proxy/r.jina/status', [
//   requireAuth,
//   requireHuman,
//   rJinaCacheMiddleware({ ttl: 5 * 60 * 1000 }) // 5 minutes cache for status
// ]);

// Example 5: Specific endpoint middleware
// app.post('/api/proxy/r.jina', [
//   requireAuth,
//   requireHuman,
//   rJinaValidationMiddleware(),
//   rJinaRateLimiter,
//   rJinaAuditMiddleware(),
//   async (req, res) => {
//     // Your route handler here
//   }
// ]);

export {
  requireHuman,
  createRJinaRateLimiter,
  rJinaCacheMiddleware,
  rJinaValidationMiddleware,
  rJinaAuditMiddleware
};
