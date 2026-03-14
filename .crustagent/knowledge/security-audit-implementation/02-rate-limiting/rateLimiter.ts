/**
 * Rate Limiting Middleware
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Prevent brute-force attacks, DoS, and agent key abuse
 * Location: src/middleware/rateLimiter.js (new file)
 * Dependencies: express-rate-limit@^7.0.0
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import rateLimit from "express-rate-limit";

// ──────────────────────────────────────────────────────────────────────────────
// 1. AUTH RATE LIMITER (Brute-Force Protection)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Strict rate limiter for authentication endpoints
 *
 * @description Prevents brute-force attacks on /api/auth/register and /api/auth/token
 * @limit 5 attempts per 15-minute window
 * @keyGenerator IP address + username combo (allows same user from different IPs)
 *
 * Applied to:
 * - POST /api/auth/register
 * - POST /api/auth/token
 */
export const authLimiter = rateLimit({
  // Time window: 15 minutes
  windowMs: 15 * 60 * 1000,

  // Max requests per window: 5 attempts
  max: 5,

  // Error message when limit exceeded
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },

  // Standard rate limit headers
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers

  // Key generator: Use IP + username combo
  // This allows same user from different IPs (home + office)
  // but blocks brute-force from single IP
  keyGenerator: (req) => {
    const username = req.body?.username || "";
    return `${req.ip}_${username}`;
  },

  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many authentication attempts. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000), // Seconds until reset
    });
  },

  // Skip failed requests (only count successful ones)
  // Set to false to count all attempts (recommended for auth)
  skipFailedRequests: false,

  // Skip successful requests (only count failed ones)
  // Set to true to only limit failed login attempts
  skipSuccessfulRequests: false,
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. GENERAL API RATE LIMITER (DoS Protection)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * General API rate limiter for all endpoints
 *
 * @description Prevents DoS attacks by limiting requests per IP
 * @limit 100 requests per 1-minute window
 * @keyGenerator IP address
 *
 * Applied to:
 * - All /api/* routes (applied early in middleware chain)
 */
export const apiLimiter = rateLimit({
  // Time window: 1 minute
  windowMs: 1 * 60 * 1000,

  // Max requests per window: 100 requests
  // This is ~1.6 requests/second - generous for legitimate use
  max: 100,

  // Error message
  message: {
    success: false,
    error: "Rate limit exceeded. Please slow down.",
  },

  // Standard headers
  standardHeaders: true,
  legacyHeaders: false,

  // Key generator: Use IP address only
  keyGenerator: (req) => req.ip,

  // Custom handler
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many requests. Please try again in a moment.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. AGENT KEY RATE LIMITER (Per-Key Limit Enforcement)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Agent key-specific rate limiter
 *
 * @description Enforces rate_limit field from agent_keys table
 * @limit Per-key configurable (from database)
 * @keyGenerator Agent API key
 *
 * Applied to:
 * - All routes when authenticated with agent key (inside requireAuth middleware)
 *
 * Note: Currently agent_keys.rate_limit is stored but not enforced - this fixes it!
 */
export function agentKeyRateLimiter(db) {
  // In-memory map to store rate limiters for each agent key
  // Key: agent API key (ag-...)
  // Value: rate limiter middleware instance
  const limiters = new Map();

  return (req, res, next) => {
    // Only apply to agent keys, skip for human and API tokens
    if (req.keyType !== "agent") {
      return next();
    }

    // Get agent key rate limit from database
    const agentKey = db
      .prepare("SELECT rate_limit FROM agent_keys WHERE api_key = ?")
      .get(req.apiKey);

    // If no rate limit set, allow unlimited (backward compatible)
    if (!agentKey?.rate_limit) {
      return next();
    }

    // Create or get limiter for this specific agent key
    if (!limiters.has(req.apiKey)) {
      limiters.set(
        req.apiKey,
        rateLimit({
          // Time window: 1 minute
          windowMs: 60 * 1000,

          // Max requests: from database
          max: agentKey.rate_limit,

          // Error message with specific limit
          message: {
            success: false,
            error: `Agent key rate limit exceeded: ${agentKey.rate_limit} requests/minute`,
          },

          // Key generator: use the agent key itself
          keyGenerator: () => req.apiKey,

          standardHeaders: true,
          legacyHeaders: false,

          // Custom handler with agent-specific messaging
          handler: (req, res) => {
            res.status(429).json({
              success: false,
              error: `Agent key rate limit exceeded: ${agentKey.rate_limit} requests/minute`,
              limit: agentKey.rate_limit,
              retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
            });
          },
        })
      );
    }

    // Apply the limiter for this agent key
    return limiters.get(req.apiKey)(req, res, next);
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * How to use these limiters in server.js
 */

// Import the limiters
// import { authLimiter, apiLimiter, agentKeyRateLimiter } from "./src/middleware/rateLimiter.js";

// Apply general API rate limiting to all /api routes
// Place this early in middleware chain (after express.json(), helmet, before routes)
// app.use("/api", apiLimiter);

// Apply strict auth rate limiting to auth endpoints
// app.post("/api/auth/register", authLimiter, (req, res) => { /* ... */ });
// app.post("/api/auth/token", authLimiter, (req, res) => { /* ... */ });

// Apply agent key rate limiting in requireAuth middleware (after line 254)
// const agentRateLimiter = agentKeyRateLimiter(db);
//
// function requireAuth(req, res, next) {
//   // ... existing auth logic ...
//
//   // After successful auth, before next()
//   agentRateLimiter(req, res, next);
// }

// ──────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT-BASED CONFIGURATION (Optional)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Advanced: Make rate limits configurable via environment variables
 */

const AUTH_RATE_LIMIT = parseInt(process.env.AUTH_RATE_LIMIT || "5");
const AUTH_RATE_WINDOW = parseInt(process.env.AUTH_RATE_WINDOW || String(15 * 60 * 1000));
const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || "100");
const API_RATE_WINDOW = parseInt(process.env.API_RATE_WINDOW || String(60 * 1000));

export const configurableAuthLimiter = rateLimit({
  windowMs: AUTH_RATE_WINDOW,
  max: AUTH_RATE_LIMIT,
  message: {
    success: false,
    error: `Too many authentication attempts. Please try again in ${AUTH_RATE_WINDOW / 60000} minutes.`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.body?.username || ""}`,
});

export const configurableApiLimiter = rateLimit({
  windowMs: API_RATE_WINDOW,
  max: API_RATE_LIMIT,
  message: { success: false, error: "Rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────────────
// PRODUCTION: REDIS STORE (Optional)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * For production deployments with multiple servers or persistent rate limiting
 *
 * Install: npm install rate-limit-redis redis
 */

// import RedisStore from 'rate-limit-redis';
// import { createClient } from 'redis';

// const redisClient = createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379',
// });
// await redisClient.connect();

// export const persistentAuthLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   store: new RedisStore({
//     client: redisClient,
//     prefix: 'rl:auth:', // Redis key prefix
//   }),
//   // ... rest of config
// });

// ──────────────────────────────────────────────────────────────────────────────
// TESTING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test auth rate limiting with curl:
 *
 * for i in {1..6}; do
 *   curl -X POST http://localhost:4242/api/auth/register \
 *     -H "Content-Type: application/json" \
 *     -d '{"uuid":"test","username":"user'$i'","keyHash":"abc"}' \
 *     -w "\nHTTP %{http_code}\n"
 * done
 *
 * Expected: First 5 succeed or fail with 409, 6th returns 429
 */

/**
 * Test API rate limiting with curl:
 *
 * for i in {1..150}; do
 *   curl -s http://localhost:4242/api/health -w "%{http_code} " &
 * done; wait
 *
 * Expected: First ~100 return 200, rest return 429
 */

/**
 * Check rate limit headers:
 *
 * curl -I http://localhost:4242/api/health
 *
 * Expected headers:
 * RateLimit-Limit: 100
 * RateLimit-Remaining: 99
 * RateLimit-Reset: 1678901234
 */
