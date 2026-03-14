/**
 * CORS Configuration (Deny-by-Default Security)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Enforce strict CORS policy to prevent cross-origin attacks
 * Location: src/config/corsConfig.js (new file)
 * Dependencies: cors (already installed)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────────
// HARDENED CORS CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get CORS configuration for Express
 *
 * @returns {Object} CORS configuration object
 *
 * Security model:
 * - Deny-by-default: Only allow explicitly configured origins
 * - Production: Requires CORS_ORIGIN environment variable (throws if missing)
 * - Development: Defaults to http://localhost:5173 (Vite) and :3000 (CRA)
 * - Credentials: Enabled (allows Authorization header and cookies)
 */
export function getCorsConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = !isProduction;

  // ────────────────────────────────────────────────────────────────────────────
  // DEVELOPMENT: Permissive for local testing
  // ────────────────────────────────────────────────────────────────────────────

  if (isDevelopment) {
    console.log("🔧 CORS: Development mode - allowing localhost origins");

    return {
      // Allow common local development ports
      origin: [
        "http://localhost:5173", // Vite default
        "http://localhost:3000", // Create React App default
        "http://localhost:4242", // ClawChives API (for testing)
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
      ],

      // Allow credentials (Authorization header, cookies)
      credentials: true,

      // Allowed methods
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

      // Allowed headers
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
      ],

      // Expose headers to client
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],

      // Cache preflight response for 1 hour
      maxAge: 3600,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRODUCTION: Strict origin enforcement
  // ────────────────────────────────────────────────────────────────────────────

  const corsOrigin = process.env.CORS_ORIGIN;

  // FATAL: Reject startup if CORS_ORIGIN not set
  if (!corsOrigin) {
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("🚨 FATAL ERROR: CORS_ORIGIN environment variable not set");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    console.error("ClawChives requires explicit CORS origin configuration in production.");
    console.error("");
    console.error("Examples:");
    console.error("  Single origin:   CORS_ORIGIN=https://clawchives.yoursite.com");
    console.error("  Multiple origins: CORS_ORIGIN=https://app1.com,https://app2.com");
    console.error("");
    console.error("Set this in your .env file or Docker environment variables.");
    console.error("═══════════════════════════════════════════════════════════════");

    // Exit immediately - do not start server without CORS configured
    process.exit(1);
  }

  // Parse CORS_ORIGIN (supports comma-separated list)
  const allowedOrigins = corsOrigin.split(",").map((origin) => origin.trim());

  console.log("🔒 CORS: Production mode - strict origin enforcement");
  console.log(`✅ Allowed origins: ${allowedOrigins.join(", ")}`);

  return {
    // Origin validation function
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      // These don't have Origin header and aren't subject to CORS
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowlist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Reject request - CORS error in browser
        console.warn(`⚠️ CORS: Rejected request from origin: ${origin}`);
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },

    // Allow credentials
    credentials: true,

    // Allowed methods
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    // Allowed headers
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],

    // Expose rate limit headers
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],

    // Cache preflight for 24 hours in production
    maxAge: 86400,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE: Simple string-based origin (no mobile app support)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Simpler CORS config - doesn't allow requests with no origin
 * Use this if you only support browser-based clients
 */
export function getSimpleCorsConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!process.env.CORS_ORIGIN) {
      console.error("🚨 FATAL: CORS_ORIGIN must be set in production");
      process.exit(1);
    }

    // Support multiple origins
    const allowedOrigins = process.env.CORS_ORIGIN.split(",").map((o) => o.trim());

    return {
      origin: allowedOrigins,
      credentials: true,
    };
  }

  // Development: allow localhost
  return {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * How to use in server.js (line 139):
 *
 * BEFORE:
 *   app.use(cors({ origin: "*" }));
 *
 * AFTER:
 *   import { getCorsConfig } from "./src/config/corsConfig.js";
 *   app.use(cors(getCorsConfig()));
 *
 * NOTE: Remove any existing CORS validation - getCorsConfig() handles it
 */

// ──────────────────────────────────────────────────────────────────────────────
// PRODUCTION DEPLOYMENT VALIDATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Add this to server.js BEFORE importing getCorsConfig (line 26+)
 *
 * This ensures CORS is configured before any middleware is applied
 */

// EXAMPLE: Add to top of server.js (after imports, before app creation)
/*
if (process.env.NODE_ENV === "production") {
  // Validate CORS_ORIGIN early
  if (!process.env.CORS_ORIGIN) {
    console.error("🚨 FATAL: CORS_ORIGIN environment variable must be set in production");
    console.error("Example: CORS_ORIGIN=https://clawchives.yoursite.com");
    process.exit(1);
  }

  // Validate format (must be valid URL)
  const origins = process.env.CORS_ORIGIN.split(",");
  for (const origin of origins) {
    try {
      new URL(origin.trim());
    } catch (e) {
      console.error(`🚨 FATAL: Invalid CORS_ORIGIN URL: ${origin}`);
      process.exit(1);
    }
  }

  console.log("✅ CORS origin validated:", process.env.CORS_ORIGIN);
}
*/

// ──────────────────────────────────────────────────────────────────────────────
// TESTING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test CORS configuration manually:
 *
 * 1. Test allowed origin:
 *    curl -X OPTIONS http://localhost:4242/api/health \
 *      -H "Origin: http://localhost:5173" \
 *      -H "Access-Control-Request-Method: GET" \
 *      -v
 *
 *    Expected: Access-Control-Allow-Origin: http://localhost:5173
 *
 * 2. Test rejected origin:
 *    curl -X OPTIONS http://localhost:4242/api/health \
 *      -H "Origin: http://evil.com" \
 *      -H "Access-Control-Request-Method: GET" \
 *      -v
 *
 *    Expected: No Access-Control-Allow-Origin header (CORS error)
 *
 * 3. Test credentials header:
 *    curl -I http://localhost:4242/api/health \
 *      -H "Origin: http://localhost:5173"
 *
 *    Expected: Access-Control-Allow-Credentials: true
 */

/**
 * Test in browser console:
 *
 * // From allowed origin (http://localhost:5173)
 * fetch('http://localhost:4242/api/health')
 *   .then(r => r.json())
 *   .then(console.log); // ✅ Should succeed
 *
 * // From disallowed origin (open http://evil.com in new tab)
 * fetch('http://localhost:4242/api/health')
 *   .then(r => r.json())
 *   .then(console.log); // ❌ Should fail with CORS error
 */

/**
 * Test production startup validation:
 *
 * # Try to start without CORS_ORIGIN
 * NODE_ENV=production node server.js
 * # Expected: Exits with error message
 *
 * # Start with CORS_ORIGIN
 * NODE_ENV=production CORS_ORIGIN=https://example.com node server.js
 * # Expected: Starts successfully
 */

// ──────────────────────────────────────────────────────────────────────────────
// DOCKER INTEGRATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Update docker-compose.yml to include CORS_ORIGIN:
 *
 * services:
 *   clawchives-api:
 *     environment:
 *       - NODE_ENV=production
 *       - CORS_ORIGIN=https://clawchives.yoursite.com
 *       # Or for multiple origins:
 *       # - CORS_ORIGIN=https://app1.com,https://app2.com
 */

/**
 * Update .env.example:
 *
 * # CORS Configuration
 * # Required in production, optional in development
 * # Single origin:
 * CORS_ORIGIN=http://localhost:5173
 *
 * # Multiple origins (comma-separated):
 * # CORS_ORIGIN=https://app1.com,https://app2.com,https://mobile.app3.com
 */

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: "CORS error" in browser but server returns 200 OK
 * Solution: CORS is browser-enforced. Server responds, but browser blocks
 *           the response. This is correct - verify origin matches CORS_ORIGIN.
 *
 * Issue: Preflight OPTIONS request returns 404
 * Solution: CORS middleware must be before route handlers:
 *           app.use(cors(...));  ← Before
 *           app.get('/api/...');  ← After
 *
 * Issue: "Access-Control-Allow-Origin is '*' but credentials mode is 'include'"
 * Solution: Cannot use wildcard with credentials. Use explicit origin.
 *
 * Issue: Mobile app requests blocked
 * Solution: Requests with no Origin header (mobile/native apps) are allowed
 *           by default in getCorsConfig(). If using getSimpleCorsConfig(),
 *           switch to getCorsConfig() which allows no-origin requests.
 *
 * Issue: Server won't start in production
 * Solution: This is intentional! Set CORS_ORIGIN in environment:
 *           CORS_ORIGIN=https://your-domain.com npm start
 */
