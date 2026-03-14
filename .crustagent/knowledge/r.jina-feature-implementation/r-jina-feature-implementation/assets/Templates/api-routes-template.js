/**
 * r.jina.ai Proxy API Routes Template
 * 
 * This template demonstrates how to implement the new API routes
 * for r.jina.ai proxy functionality in ClawChives.
 * 
 * Copy this template into your server.js or routes directory
 * and adapt it to your specific needs.
 */

import express from 'express';
import cors from 'cors';
import { requireAuth, requireHuman } from '../middleware/permissionChecker.js';
import { rJinaProxyRateLimit, rJinaStatusRateLimit } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { audit } from '../utils/auditLogger.js';
import { db } from '../services/database.js';

const router = express.Router();

// Import CORS configuration
import { rJinaProxyCorsConfig, rJinaStatusCorsConfig } from '../config/corsConfig.js';

/**
 * r.jina.ai Proxy Routes
 * 
 * All routes require authentication and human-only access
 * for security and rate limiting purposes.
 */

// Apply CORS and rate limiting to all r.jina routes
router.use('/api/proxy/r.jina', cors(rJinaProxyCorsConfig));
router.use('/api/proxy/r.jina/status', cors(rJinaStatusCorsConfig));

/**
 * GET /api/proxy/r.jina/status
 * 
 * Get r.jina.ai proxy status and health information
 * 
 * @returns {Object} Proxy status information
 */
router.get('/api/proxy/r.jina/status', 
  rJinaStatusRateLimit,
  requireAuth,
  requireHuman,
  async (req, res) => {
    try {
      // Check if proxy is enabled for this user
      const config = await getUserProxyConfig(req.userUuid);
      
      if (!config.proxy_enabled) {
        return res.status(403).json({
          success: false,
          error: 'r.jina.ai proxy is disabled for your account'
        });
      }

      // Test proxy connection
      const testResult = await testProxyConnection();
      
      // Get usage statistics
      const stats = await getProxyStats(req.userUuid);
      
      // Get cache statistics
      const cacheStats = await getCacheStats();
      
      const response = {
        success: true,
        data: {
          enabled: true,
          status: testResult.success ? 'online' : 'offline',
          message: testResult.success ? 'Proxy is working correctly' : testResult.error,
          responseTime: testResult.responseTime,
          lastCheck: new Date().toISOString(),
          usage: stats,
          cache: cacheStats,
          limits: {
            rateLimit: config.rate_limit || 100,
            cacheEnabled: config.cache_enabled || true
          }
        }
      };
      
      res.json(response);
      
      // Log the status check
      audit.log('PROXY_STATUS_CHECKED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'status_check',
        outcome: 'success',
        resource: 'r.jina.proxy',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
    } catch (error) {
      console.error('[r.jina] Status check failed:', error);
      
      audit.log('PROXY_STATUS_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'status_check',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { error: error.message },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get proxy status'
      });
    }
  }
);

/**
 * POST /api/proxy/r.jina
 * 
 * Process a URL through r.jina.ai proxy
 * 
 * @body {Object} { url: string, options?: Object }
 * @returns {Object} Processed content
 */
router.post('/api/proxy/r.jina',
  rJinaProxyRateLimit,
  requireAuth,
  requireHuman,
  validateBody({
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
      options: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['text', 'markdown', 'html'] },
          includeImages: { type: 'boolean' },
          includeLinks: { type: 'boolean' }
        }
      }
    }
  }),
  async (req, res) => {
    const { url, options = {} } = req.body;
    
    try {
      // Check if proxy is enabled for this user
      const config = await getUserProxyConfig(req.userUuid);
      
      if (!config.proxy_enabled) {
        return res.status(403).json({
          success: false,
          error: 'r.jina.ai proxy is disabled for your account'
        });
      }

      // Check rate limits
      const rateLimitStatus = await checkRateLimit(req.userUuid, '/api/proxy/r.jina');
      
      if (!rateLimitStatus.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: {
            retryAfter: rateLimitStatus.retryAfter
          }
        });
      }

      // Check cache first
      if (config.cache_enabled) {
        const cached = await getCachedContent(url);
        if (cached) {
          // Update rate limit counter for cache hit
          await updateRateLimit(req.userUuid, '/api/proxy/r.jina');
          
          audit.log('PROXY_CACHE_HIT', {
            actor: req.userUuid,
            actor_type: req.keyType,
            action: 'proxy_request',
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
      }

      // Process URL through r.jina.ai
      const startTime = Date.now();
      const result = await processUrlThroughJina(url, options);
      const responseTime = Date.now() - startTime;

      // Cache the result if enabled
      if (config.cache_enabled && result.success) {
        await cacheContent(url, result.content, responseTime);
      }

      // Update rate limit counter
      await updateRateLimit(req.userUuid, '/api/proxy/r.jina');

      // Log the successful request
      audit.log('PROXY_REQUEST_SUCCESS', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'proxy_request',
        outcome: 'success',
        resource: 'r.jina.proxy',
        details: { 
          url: url,
          cached: false,
          responseTime: responseTime,
          contentLength: result.content?.length || 0
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            url: url,
            content: result.content,
            cached: false,
            responseTime: responseTime
          }
        });
      } else {
        res.status(502).json({
          success: false,
          error: result.error || 'Failed to process URL through r.jina.ai'
        });
      }
      
    } catch (error) {
      console.error('[r.jina] Proxy request failed:', error);
      
      audit.log('PROXY_REQUEST_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'proxy_request',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { 
          url: url,
          error: error.message 
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/proxy/r.jina/test
 * 
 * Test r.jina.ai proxy connection
 * 
 * @returns {Object} Test result
 */
router.get('/api/proxy/r.jina/test',
  rJinaStatusRateLimit,
  requireAuth,
  requireHuman,
  async (req, res) => {
    try {
      const testUrl = 'https://example.com';
      const result = await processUrlThroughJina(testUrl, { format: 'text' });
      
      res.json({
        success: true,
        data: {
          testUrl: testUrl,
          success: result.success,
          error: result.error,
          responseTime: result.responseTime
        }
      });
      
      audit.log('PROXY_TEST_COMPLETED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'test_proxy',
        outcome: result.success ? 'success' : 'failure',
        resource: 'r.jina.proxy',
        details: { testUrl: testUrl, responseTime: result.responseTime },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
    } catch (error) {
      console.error('[r.jina] Proxy test failed:', error);
      
      audit.log('PROXY_TEST_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'test_proxy',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { error: error.message },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Proxy test failed'
      });
    }
  }
);

/**
 * POST /api/proxy/r.jina/config
 * 
 * Update r.jina.ai proxy configuration
 * 
 * @body {Object} { proxy_enabled?: boolean, cache_enabled?: boolean, rate_limit?: number }
 * @returns {Object} Updated configuration
 */
router.post('/api/proxy/r.jina/config',
  rJinaStatusRateLimit,
  requireAuth,
  requireHuman,
  validateBody({
    type: 'object',
    properties: {
      proxy_enabled: { type: 'boolean' },
      cache_enabled: { type: 'boolean' },
      rate_limit: { type: 'integer', minimum: 1, maximum: 1000 }
    }
  }),
  async (req, res) => {
    const { proxy_enabled, cache_enabled, rate_limit } = req.body;
    
    try {
      // Update configuration
      const config = await updateProxyConfig(req.userUuid, {
        proxy_enabled,
        cache_enabled,
        rate_limit
      });
      
      res.json({
        success: true,
        data: config
      });
      
      audit.log('PROXY_CONFIG_UPDATED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'update_config',
        outcome: 'success',
        resource: 'r.jina.proxy',
        details: { 
          proxy_enabled: proxy_enabled,
          cache_enabled: cache_enabled,
          rate_limit: rate_limit
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
    } catch (error) {
      console.error('[r.jina] Config update failed:', error);
      
      audit.log('PROXY_CONFIG_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'update_config',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { error: error.message },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }
);

/**
 * GET /api/proxy/r.jina/config
 * 
 * Get r.jina.ai proxy configuration
 * 
 * @returns {Object} Current configuration
 */
router.get('/api/proxy/r.jina/config',
  rJinaStatusRateLimit,
  requireAuth,
  requireHuman,
  async (req, res) => {
    try {
      const config = await getUserProxyConfig(req.userUuid);
      
      res.json({
        success: true,
        data: config
      });
      
    } catch (error) {
      console.error('[r.jina] Config fetch failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration'
      });
    }
  }
);

/**
 * DELETE /api/proxy/r.jina/cache
 * 
 * Clear r.jina.ai proxy cache
 * 
 * @returns {Object} Cache clear result
 */
router.delete('/api/proxy/r.jina/cache',
  rJinaStatusRateLimit,
  requireAuth,
  requireHuman,
  async (req, res) => {
    try {
      const result = await clearCache(req.userUuid);
      
      res.json({
        success: true,
        data: {
          cleared: result.cleared,
          message: result.message
        }
      });
      
      audit.log('PROXY_CACHE_CLEARED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'clear_cache',
        outcome: 'success',
        resource: 'r.jina.proxy',
        details: { cleared: result.cleared },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
    } catch (error) {
      console.error('[r.jina] Cache clear failed:', error);
      
      audit.log('PROXY_CACHE_CLEAR_FAILED', {
        actor: req.userUuid,
        actor_type: req.keyType,
        action: 'clear_cache',
        outcome: 'failure',
        resource: 'r.jina.proxy',
        details: { error: error.message },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  }
);

/**
 * Helper Functions
 */

/**
 * Test r.jina.ai proxy connection
 */
async function testProxyConnection() {
  try {
    const startTime = Date.now();
    const response = await fetch('https://r.jina.ai/http://example.com');
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        success: true,
        responseTime: responseTime
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

/**
 * Process URL through r.jina.ai
 */
async function processUrlThroughJina(url, options = {}) {
  try {
    const startTime = Date.now();
    const jinaUrl = `https://r.jina.ai/http://${url}`;
    
    const response = await fetch(jinaUrl);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const content = await response.text();
      return {
        success: true,
        content: content,
        responseTime: responseTime
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: responseTime
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

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
 * Update user proxy configuration
 */
async function updateProxyConfig(userUuid, updates) {
  const config = await getUserProxyConfig(userUuid);
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      config[key] = value;
      
      // Update database
      db.prepare(`
        INSERT OR REPLACE INTO rjina_proxy_config (id, user_uuid, setting_key, setting_value, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        `${userUuid}_${key}`,
        userUuid,
        key,
        value.toString(),
        new Date().toISOString()
      );
    }
  }
  
  return config;
}

/**
 * Check rate limits
 */
async function checkRateLimit(userUuid, endpoint) {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
  
  const row = db.prepare(`
    SELECT requests_count, window_end 
    FROM rjina_rate_limits 
    WHERE user_uuid = ? AND endpoint = ? AND window_end > ?
  `).get(userUuid, endpoint, now);
  
  if (!row) {
    // Create new rate limit entry
    db.prepare(`
      INSERT INTO rjina_rate_limits (id, user_uuid, endpoint, requests_count, window_start, window_end, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      `${userUuid}_${endpoint}_${Date.now()}`,
      userUuid,
      endpoint,
      windowStart,
      now,
      new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      now,
      now
    );
    
    return { allowed: true, remaining: 99 };
  }
  
  const config = await getUserProxyConfig(userUuid);
  const limit = config.rate_limit || 100;
  
  if (row.requests_count >= limit) {
    return { 
      allowed: false, 
      remaining: 0,
      retryAfter: Math.ceil((new Date(row.window_end) - new Date()) / 1000)
    };
  }
  
  return { allowed: true, remaining: limit - row.requests_count };
}

/**
 * Update rate limit counter
 */
async function updateRateLimit(userUuid, endpoint) {
  db.prepare(`
    UPDATE rjina_rate_limits 
    SET requests_count = requests_count + 1, updated_at = datetime('now')
    WHERE user_uuid = ? AND endpoint = ? AND window_end > datetime('now')
  `).run(userUuid, endpoint);
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  
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
 * Clear cache
 */
async function clearCache(userUuid) {
  // This is a simplified version - in reality you'd want to implement
  // user-specific cache clearing or admin-only cache clearing
  
  const result = db.prepare(`
    DELETE FROM rjina_proxy_cache 
    WHERE expires_at <= datetime('now')
  `).run();
  
  return {
    cleared: result.changes > 0,
    message: result.changes > 0 ? `Cleared ${result.changes} expired cache entries` : 'No expired cache entries found'
  };
}

/**
 * Get proxy statistics
 */
async function getProxyStats(userUuid) {
  const row = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests,
      AVG(response_time) as avg_response_time,
      MIN(created_at) as first_request,
      MAX(created_at) as last_request
    FROM rjina_proxy_logs 
    WHERE user_uuid = ?
  `).get(userUuid);
  
  return {
    totalRequests: row.total_requests || 0,
    successfulRequests: row.successful_requests || 0,
    failedRequests: row.failed_requests || 0,
    avgResponseTime: row.avg_response_time || 0,
    firstRequest: row.first_request,
    lastRequest: row.last_request
  };
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const row = db.prepare(`
    SELECT 
      COUNT(*) as total_cached,
      COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as valid_cached,
      COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_cached
    FROM rjina_proxy_cache
  `).get();
  
  return {
    totalCached: row.total_cached || 0,
    validCached: row.valid_cached || 0,
    expiredCached: row.expired_cached || 0
  };
}

/**
 * Simple content hashing function
 */
async function hashContent(content) {
  // Simple hash implementation - in production you'd want a proper hashing library
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

export default router;
