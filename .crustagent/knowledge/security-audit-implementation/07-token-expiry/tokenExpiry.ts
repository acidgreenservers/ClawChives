/**
 * Token Expiry Management
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Implement token TTL (time-to-live) with configurable expiration
 * Location: src/utils/tokenExpiry.js (new file)
 * Dependencies: None (native JavaScript Date)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Calculate token expiry date based on TTL option
 *
 * @param {string} ttl - TTL option: "30d", "60d", "90d", "never", or ISO date string
 * @returns {string|null} ISO 8601 expiry date, or null for "never"
 */
export function calculateExpiry(ttl) {
  if (!ttl || ttl === "never") {
    return null; // Token never expires
  }

  const now = Date.now();

  // Parse TTL format: "30d", "60d", "90d"
  if (ttl.endsWith("d")) {
    const days = parseInt(ttl.slice(0, -1), 10);
    if (isNaN(days) || days <= 0) {
      throw new Error(`Invalid TTL format: ${ttl}`);
    }
    return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
  }

  // Custom date (ISO 8601 format)
  const customDate = new Date(ttl);
  if (isNaN(customDate.getTime())) {
    throw new Error(`Invalid custom date: ${ttl}`);
  }

  // Ensure custom date is in the future
  if (customDate.getTime() <= now) {
    throw new Error("Custom expiry date must be in the future");
  }

  return customDate.toISOString();
}

/**
 * Check if token has expired
 *
 * @param {string|null} expiresAt - ISO 8601 expiry date, or null
 * @returns {boolean} True if expired, false otherwise
 */
export function checkTokenExpiry(expiresAt) {
  if (!expiresAt) {
    return false; // Token never expires
  }

  return new Date(expiresAt) < new Date(); // Expired?
}

/**
 * Get remaining time until token expiry
 *
 * @param {string|null} expiresAt - ISO 8601 expiry date
 * @returns {Object} { days, hours, minutes, expired }
 */
export function getTimeUntilExpiry(expiresAt) {
  if (!expiresAt) {
    return { days: Infinity, hours: Infinity, minutes: Infinity, expired: false };
  }

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  return { days, hours, minutes, expired: false };
}

/**
 * Format expiry date for display
 *
 * @param {string|null} expiresAt - ISO 8601 expiry date
 * @returns {string} Human-readable expiry description
 */
export function formatExpiry(expiresAt) {
  if (!expiresAt) {
    return "Never expires";
  }

  const { days, hours, expired } = getTimeUntilExpiry(expiresAt);

  if (expired) {
    return "Expired";
  }

  if (days > 30) {
    return `Expires in ${Math.floor(days / 30)} month(s)`;
  }

  if (days > 0) {
    return `Expires in ${days} day(s)`;
  }

  return `Expires in ${hours} hour(s)`;
}

/**
 * Clean up expired tokens from database
 *
 * @param {Database} db - SQLite database instance
 * @returns {number} Number of tokens deleted
 */
export function cleanupExpiredTokens(db) {
  const now = new Date().toISOString();

  const result = db.prepare(`
    DELETE FROM api_tokens
    WHERE expires_at IS NOT NULL
      AND expires_at < ?
  `).run(now);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} expired token(s)`);
  }

  return result.changes;
}

/**
 * Schedule daily cleanup job
 *
 * @param {Database} db - SQLite database instance
 * @returns {NodeJS.Timeout} Interval ID (for stopping job)
 */
export function scheduleTokenCleanup(db) {
  const DAILY_MS = 24 * 60 * 60 * 1000;

  // Run cleanup at 3am
  const now = new Date();
  const next3am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (now.getHours() >= 3 ? 1 : 0),
    3,
    0,
    0,
    0
  );
  const msUntil3am = next3am.getTime() - now.getTime();

  // Initial cleanup
  setTimeout(() => {
    cleanupExpiredTokens(db);

    // Then run daily
    setInterval(() => {
      cleanupExpiredTokens(db);
    }, DAILY_MS);
  }, msUntil3am);

  console.log(`⏰ Token cleanup scheduled for ${next3am.toISOString()}`);
}

/**
 * Extend token expiry (refresh TTL)
 *
 * @param {Database} db - SQLite database instance
 * @param {string} token - API token to extend
 * @param {string} ttl - New TTL (e.g., "90d")
 * @returns {string|null} New expiry date
 */
export function extendTokenExpiry(db, token, ttl = "90d") {
  const newExpiry = calculateExpiry(ttl);

  db.prepare(`
    UPDATE api_tokens
    SET expires_at = ?
    WHERE key = ?
  `).run(newExpiry, token);

  return newExpiry;
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Example: Token issuance with expiry
 */
/*
import { calculateExpiry } from "./src/utils/tokenExpiry.js";

app.post("/api/auth/token", authLimiter, (req, res) => {
  const { humanKey, ttl } = req.body;

  // Default TTL: 90 days
  const tokenTtl = ttl || process.env.TOKEN_TTL_DEFAULT || "90d";
  const expiresAt = calculateExpiry(tokenTtl);

  const apiToken = `api-${crypto.randomBytes(32).toString("hex")}`;

  db.prepare(`
    INSERT INTO api_tokens (key, owner_key, owner_type, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(apiToken, humanKey, "human", expiresAt, new Date().toISOString());

  res.status(201).json({
    success: true,
    token: apiToken,
    expires_at: expiresAt,
    ttl: tokenTtl,
  });
});
*/

/**
 * Example: Token validation with expiry check
 */
/*
import { checkTokenExpiry } from "./src/utils/tokenExpiry.js";

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const tokenData = db.prepare(`
    SELECT * FROM api_tokens WHERE key = ?
  `).get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // ✅ Check if token expired
  if (checkTokenExpiry(tokenData.expires_at)) {
    return res.status(401).json({
      error: "Token expired. Please generate a new token.",
      expired_at: tokenData.expires_at,
    });
  }

  // Token valid, continue
  req.apiKey = token;
  req.ownerKey = tokenData.owner_key;
  next();
}
*/

/**
 * Example: Start cleanup job on server startup
 */
/*
import { scheduleTokenCleanup } from "./src/utils/tokenExpiry.js";

// In server.js, after db initialization
scheduleTokenCleanup(db);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// ──────────────────────────────────────────────────────────────────────────────
// TESTING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test token expiry functions:
 */

/*
// Test calculateExpiry
console.log(calculateExpiry("30d"));  // ISO date 30 days from now
console.log(calculateExpiry("90d"));  // ISO date 90 days from now
console.log(calculateExpiry("never")); // null

// Test checkTokenExpiry
console.log(checkTokenExpiry(null)); // false (never expires)
console.log(checkTokenExpiry("2020-01-01T00:00:00Z")); // true (expired)
console.log(checkTokenExpiry("2030-01-01T00:00:00Z")); // false (future)

// Test getTimeUntilExpiry
const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
console.log(getTimeUntilExpiry(future)); // { days: 5, hours: 0, minutes: 0, expired: false }

// Test formatExpiry
console.log(formatExpiry(null)); // "Never expires"
console.log(formatExpiry("2020-01-01T00:00:00Z")); // "Expired"
console.log(formatExpiry(future)); // "Expires in 5 day(s)"
*/

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: Tokens expire immediately
 * Cause: expires_at set to past date or invalid TTL
 * Solution: Check calculateExpiry() logic, verify TTL format
 *
 * Issue: Cleanup job not running
 * Cause: scheduleTokenCleanup() not called on startup
 * Solution: Add to server.js after db initialization
 *
 * Issue: "Token expired" error for valid token
 * Cause: Server time vs database time mismatch
 * Solution: Use UTC consistently (new Date().toISOString())
 *
 * Issue: Custom date not working
 * Cause: Invalid date format
 * Solution: Use ISO 8601 format: "2024-12-31T23:59:59Z"
 */
