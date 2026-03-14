/**
 * HTTPS Redirect Middleware (Optional - Prefer nginx)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Redirect HTTP to HTTPS at application level
 * Location: src/middleware/httpsRedirect.js (new file)
 * Dependencies: None (Express only)
 *
 * NOTE: This is OPTIONAL. Prefer nginx/Caddy for HTTPS redirection.
 *       Only use if you cannot configure reverse proxy.
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Enforce HTTPS redirect middleware
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable HTTPS redirect (default: true in production)
 * @param {number} options.httpsPort - HTTPS port (default: 443)
 * @returns {Function} Express middleware
 */
export function enforceHTTPS(options = {}) {
  const {
    enabled = process.env.NODE_ENV === "production",
    httpsPort = 443,
  } = options;

  return (req, res, next) => {
    if (!enabled) {
      return next(); // Skip in development
    }

    // Check if request is already HTTPS
    const isHttps =
      req.secure ||
      req.headers["x-forwarded-proto"] === "https" ||
      req.connection.encrypted;

    if (!isHttps) {
      // Redirect to HTTPS
      const host = req.headers.host.split(":")[0]; // Remove port
      const redirectUrl = `https://${host}${httpsPort !== 443 ? `:${httpsPort}` : ""}${req.url}`;

      return res.redirect(301, redirectUrl);
    }

    next();
  };
}

/**
 * Check if behind reverse proxy
 */
export function behindProxy(req) {
  return !!(
    req.headers["x-forwarded-proto"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"]
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION (If Not Using nginx)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Add to server.js:
 */

/*
import { enforceHTTPS } from "./src/middleware/httpsRedirect.js";

// Enable trust proxy if behind nginx/Caddy
app.set("trust proxy", true);

// Enforce HTTPS (only in production)
app.use(enforceHTTPS({ enabled: process.env.NODE_ENV === "production" }));
*/
