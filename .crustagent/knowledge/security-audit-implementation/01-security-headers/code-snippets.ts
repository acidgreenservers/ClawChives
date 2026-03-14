/**
 * Security Headers Implementation (Helmet.js)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Add HTTP security headers to prevent XSS, clickjacking, MIME sniffing
 * Location: server.js (line 138, after express.json())
 * Dependencies: helmet@^8.0.0
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────────
// STEP 1: Install Dependency
// ──────────────────────────────────────────────────────────────────────────────

/*
  Terminal command:

  npm install helmet

  Or add to package.json dependencies:
  {
    "dependencies": {
      "helmet": "^8.0.0"
    }
  }
*/

// ──────────────────────────────────────────────────────────────────────────────
// STEP 2: Import Helmet in server.js
// ──────────────────────────────────────────────────────────────────────────────

// Add this import at the top of server.js (after line 26, with other imports)
import helmet from "helmet";

// ──────────────────────────────────────────────────────────────────────────────
// STEP 3: Configure Helmet Middleware
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Helmet middleware configuration
 *
 * @description Adds security headers to all HTTP responses
 * @location server.js line 138 (after app.use(express.json()))
 *
 * Headers configured:
 * - Content-Security-Policy (CSP) - XSS protection
 * - Strict-Transport-Security (HSTS) - Force HTTPS
 * - X-Frame-Options - Clickjacking protection
 * - X-Content-Type-Options - MIME sniffing protection
 * - Referrer-Policy - Control referrer information
 */

// Add this middleware in server.js after line 138 (after express.json())
app.use(helmet({
  /**
   * Content Security Policy
   * ───────────────────────────────────────────────────────────────────────
   * Defines allowed sources for scripts, styles, images, etc.
   * Prevents XSS by blocking unauthorized inline scripts and external sources
   */
  contentSecurityPolicy: {
    directives: {
      // Default policy: only allow resources from same origin
      defaultSrc: ["'self'"],

      // Scripts: allow same origin + inline scripts (Vite requires unsafe-inline)
      // Note: unsafe-inline is needed for Vite builds; consider removing for pure backend
      scriptSrc: ["'self'", "'unsafe-inline'"],

      // Styles: allow same origin + inline styles (Tailwind uses inline)
      styleSrc: ["'self'", "'unsafe-inline'"],

      // Images: allow same origin, data URIs, and HTTPS images
      // data: needed for favicon, https: allows external bookmark favicons
      imgSrc: ["'self'", "data:", "https:"],

      // AJAX/WebSocket: only allow same origin
      connectSrc: ["'self'"],

      // Fonts: only same origin
      fontSrc: ["'self'"],

      // Embedded objects (Flash, Java): block all
      objectSrc: ["'none'"],

      // Media (audio/video): only same origin
      mediaSrc: ["'self'"],

      // Frames/iframes: block all (prevents clickjacking)
      frameSrc: ["'none'"],
    },
  },

  /**
   * HTTP Strict Transport Security (HSTS)
   * ───────────────────────────────────────────────────────────────────────
   * Forces browsers to only use HTTPS for 1 year
   * Prevents downgrade attacks and cookie hijacking
   */
  hsts: {
    // Enforce HTTPS for 31536000 seconds (1 year)
    maxAge: 31536000,

    // Apply to all subdomains
    includeSubDomains: true,

    // Submit to browser HSTS preload list (optional)
    // Warning: Requires commitment to HTTPS, hard to undo
    preload: true,
  },

  /**
   * Referrer Policy
   * ───────────────────────────────────────────────────────────────────────
   * Controls how much referrer information is sent with requests
   */
  referrerPolicy: {
    // Send full URL for same-origin, origin only for cross-origin HTTPS
    policy: "strict-origin-when-cross-origin",
  },

  /**
   * Other headers enabled by default (configured implicitly):
   * ───────────────────────────────────────────────────────────────────────
   * - X-Frame-Options: DENY (prevents clickjacking)
   * - X-Content-Type-Options: nosniff (prevents MIME sniffing)
   * - X-XSS-Protection: 1; mode=block (legacy XSS protection for old browsers)
   * - X-Download-Options: noopen (IE8 download protection)
   * - X-Permitted-Cross-Domain-Policies: none (Flash/PDF cross-domain)
   */
}));

// ──────────────────────────────────────────────────────────────────────────────
// STEP 4: Environment-Specific Configuration (Optional)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Advanced: Different configs for development vs production
 *
 * Development needs looser CSP for hot module reload (HMR)
 * Production should be stricter
 */

const isDevelopment = process.env.NODE_ENV !== "production";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      // In dev: allow eval for Vite HMR
      // In prod: strict policy
      scriptSrc: isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'", "'unsafe-inline'"],

      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Only enable HSTS in production
  hsts: isDevelopment ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
}));

// ──────────────────────────────────────────────────────────────────────────────
// COMPLETE INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Full server.js middleware chain with helmet integrated
 *
 * Order matters! Helmet should be early in the chain but after body parsers.
 */

// Existing imports (server.js lines 26-32)
import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

// ✅ ADD: Import helmet
import helmet from "helmet";

const app = express();

// Existing middleware (server.js line 138)
app.use(express.json({ limit: "10mb" }));

// ✅ ADD: Security headers middleware (INSERT HERE, before CORS)
const isDevelopment = process.env.NODE_ENV !== "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: isDevelopment ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Existing CORS middleware (server.js line 139)
app.use(cors({ /* existing config */ }));

// ... rest of middleware and routes ...

// ──────────────────────────────────────────────────────────────────────────────
// VERIFICATION HELPER
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Optional: Add debug endpoint to verify headers
 *
 * Usage: curl http://localhost:4242/api/debug/headers
 *
 * Response will show all security headers being sent
 */

app.get("/api/debug/headers", (req, res) => {
  res.json({
    message: "Security headers are active. Check response headers in Network tab.",
    hint: "Look for Content-Security-Policy, Strict-Transport-Security, X-Frame-Options",
    environment: process.env.NODE_ENV || "development",
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TESTING SNIPPETS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test 1: Check headers with curl
 * ────────────────────────────────────────────────────────────────────────
 *
 * Terminal command:
 * curl -I http://localhost:4242/api/health
 *
 * Expected output:
 * Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
 * Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
 * X-Frame-Options: DENY
 * X-Content-Type-Options: nosniff
 * Referrer-Policy: strict-origin-when-cross-origin
 */

/**
 * Test 2: Verify CSP blocks external scripts
 * ────────────────────────────────────────────────────────────────────────
 *
 * Browser console:
 * const script = document.createElement('script');
 * script.src = 'https://evil.com/steal.js';
 * document.body.appendChild(script);
 *
 * Expected: CSP violation error in console
 * "Refused to load the script 'https://evil.com/steal.js' because it violates
 *  the following Content Security Policy directive: 'script-src 'self' 'unsafe-inline''"
 */

/**
 * Test 3: Verify X-Frame-Options blocks iframes
 * ────────────────────────────────────────────────────────────────────────
 *
 * Create test.html:
 * <iframe src="http://localhost:4242"></iframe>
 *
 * Expected: Error in browser console
 * "Refused to display 'http://localhost:4242/' in a frame because it set
 *  'X-Frame-Options' to 'deny'."
 */

/**
 * Test 4: Automated test with supertest
 * ────────────────────────────────────────────────────────────────────────
 *
 * Create tests/security/headers.test.js:
 */

import request from 'supertest';
import app from '../../server.js';

describe('Security Headers', () => {
  test('should set Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('should set Strict-Transport-Security header in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  test('should set X-Frame-Options to DENY', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  test('should set X-Content-Type-Options to nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should set Referrer-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: Vite HMR stops working
 * Solution: Add 'unsafe-eval' to scriptSrc in development
 *
 * scriptSrc: process.env.NODE_ENV !== 'production'
 *   ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
 *   : ["'self'", "'unsafe-inline'"]
 */

/**
 * Issue: External images (bookmark favicons) don't load
 * Solution: Already handled with imgSrc: ["'self'", "data:", "https:"]
 *
 * If still broken, check browser console for CSP violations and adjust imgSrc
 */

/**
 * Issue: HSTS locks out HTTP localhost
 * Solution: Only enable HSTS in production, not development
 *
 * hsts: process.env.NODE_ENV === 'production' ? { ... } : false
 *
 * If already locked out, clear HSTS cache:
 * Chrome: chrome://net-internals/#hsts → Delete domain "localhost"
 */

/**
 * Issue: Inline styles break (Tailwind classes don't apply)
 * Solution: Already handled with styleSrc: ["'self'", "'unsafe-inline'"]
 *
 * Note: unsafe-inline weakens CSP but is required for CSS-in-JS and Tailwind
 */
