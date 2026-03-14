/**
 * Error Handler Middleware (Information Disclosure Prevention)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Sanitize errors in production, prevent information disclosure
 * Location: src/middleware/errorHandler.js (new file)
 * Dependencies: None (Express only)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────────
// ERROR SANITIZATION HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize error for client response
 *
 * @param {Error} error - Original error object
 * @param {boolean} isProduction - Is NODE_ENV === "production"
 * @returns {Object} Sanitized error response
 */
export function sanitizeError(error, isProduction = true) {
  // Development: Return full error details for debugging
  if (!isProduction) {
    return {
      status: error.status || 500,
      response: {
        success: false,
        error: error.message,
        stack: error.stack,
        details: error.details || undefined,
      },
    };
  }

  // Production: Sanitize based on error type
  return {
    status: error.status || 500,
    response: {
      success: false,
      error: getSafeErrorMessage(error),
    },
  };
}

/**
 * Get safe error message for production
 *
 * @param {Error} error - Error object
 * @returns {string} Safe error message (no internal details)
 */
function getSafeErrorMessage(error) {
  // Validation errors (from Zod) - Safe to show
  if (error.name === "ZodError" || error.status === 400) {
    return error.message || "Validation failed";
  }

  // Authentication errors - Generic message
  if (error.status === 401) {
    return "Authentication failed";
  }

  // Authorization errors - Generic message
  if (error.status === 403) {
    return "Access denied";
  }

  // Not found - Safe to show
  if (error.status === 404) {
    return "Resource not found";
  }

  // Database errors - Generic message
  if (isDatabaseError(error)) {
    return "Database error occurred";
  }

  // Default: Generic internal server error
  return "Internal server error";
}

/**
 * Check if error is database-related
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if database error
 */
function isDatabaseError(error) {
  const message = error.message.toLowerCase();

  return (
    message.includes("sqlite") ||
    message.includes("constraint") ||
    message.includes("unique") ||
    message.includes("foreign key") ||
    message.includes("not null") ||
    message.includes("database")
  );
}

/**
 * Sanitize database error
 * Removes SQL queries, table names, column names
 *
 * @param {Error} error - Database error
 * @returns {string} Sanitized error message
 */
export function sanitizeDatabaseError(error) {
  const message = error.message;

  // Remove table/column names
  // "UNIQUE constraint failed: bookmarks.id" → "Database constraint error"
  if (message.includes("constraint failed")) {
    return "Database constraint error";
  }

  // Remove SQL keywords
  if (message.includes("FOREIGN KEY")) {
    return "Foreign key constraint violation";
  }

  if (message.includes("NOT NULL")) {
    return "Required field missing";
  }

  // Generic database error
  return "Database error occurred";
}

// ──────────────────────────────────────────────────────────────────────────────
// ERROR LOGGING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Log error with full details (server-side only)
 *
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
export function logError(error, req) {
  const timestamp = new Date().toISOString();
  const isProduction = process.env.NODE_ENV === "production";

  // Log format: structured for easy parsing
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(`❌ ERROR [${timestamp}]`);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Error details
  console.error(`Type:     ${error.name || "Error"}`);
  console.error(`Message:  ${error.message}`);
  console.error(`Status:   ${error.status || 500}`);

  // Request details
  console.error(`\nRequest:`);
  console.error(`  Method: ${req.method}`);
  console.error(`  Path:   ${req.path}`);
  console.error(`  IP:     ${req.ip}`);
  console.error(`  Agent:  ${req.get("user-agent")?.substring(0, 80) || "Unknown"}`);

  // Database error details
  if (isDatabaseError(error)) {
    console.error(`\nDatabase Error:`);
    console.error(`  Details: ${error.message}`);

    // Log SQL query if available (from custom database error)
    if (error.query) {
      console.error(`  Query:   ${error.query}`);
    }
  }

  // Stack trace (always log, even in production)
  console.error(`\nStack Trace:`);
  console.error(error.stack);

  // Additional context
  if (error.details) {
    console.error(`\nAdditional Details:`);
    console.error(JSON.stringify(error.details, null, 2));
  }

  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPRESS ERROR HANDLER MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Global error handler middleware
 *
 * MUST be added as LAST middleware in server.js (after all routes)
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";

  // Log full error details (always, even in production)
  logError(err, req);

  // Sanitize error for client response
  const { status, response } = sanitizeError(err, isProduction);

  // Send response
  res.status(status).json(response);
}

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOM ERROR CLASSES (Optional)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.issues = issues;
  }
}

/**
 * Custom error for database operations
 */
export class DatabaseError extends Error {
  constructor(message, query = null) {
    super(message);
    this.name = "DatabaseError";
    this.status = 500;
    this.query = query;
  }
}

/**
 * Custom error for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    this.status = 401;
  }
}

/**
 * Custom error for authorization failures
 */
export class AuthorizationError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AuthorizationError";
    this.status = 403;
  }
}

/**
 * Custom error for not found resources
 */
export class NotFoundError extends Error {
  constructor(resource = "Resource") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * How to use in server.js:
 */

/*
import { errorHandler, DatabaseError, NotFoundError } from "./src/middleware/errorHandler.js";

// ────────────────────────────────────────────────────────────────────────────
// ROUTES (use try/catch + next(error))
// ────────────────────────────────────────────────────────────────────────────

app.post("/api/bookmarks", requireAuth, async (req, res, next) => {
  try {
    const { url, title } = req.validatedBody;

    const id = crypto.randomBytes(16).toString("hex");

    try {
      db.prepare("INSERT INTO bookmarks (id, url, title, ...) VALUES (?, ?, ?, ...)")
        .run(id, url, title, ...);
    } catch (dbError) {
      throw new DatabaseError(
        "Failed to create bookmark",
        `INSERT INTO bookmarks VALUES (${id}, ${url}, ...)`
      );
    }

    res.status(201).json({ success: true, id });
  } catch (error) {
    next(error); // Pass to errorHandler
  }
});

app.get("/api/bookmarks/:id", requireAuth, async (req, res, next) => {
  try {
    const bookmark = db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id);

    if (!bookmark) {
      throw new NotFoundError("Bookmark");
    }

    res.json({ success: true, data: bookmark });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER (MUST BE LAST MIDDLEWARE)
// ────────────────────────────────────────────────────────────────────────────

// All routes above...

// Error handler (after all routes, before app.listen)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// ──────────────────────────────────────────────────────────────────────────────
// TESTING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test error sanitization:
 */

/*
// Test route to trigger errors
app.get("/api/test-error/:type", (req, res, next) => {
  const { type } = req.params;

  switch (type) {
    case "database":
      next(new DatabaseError("UNIQUE constraint failed: bookmarks.id", "INSERT INTO bookmarks..."));
      break;

    case "auth":
      next(new AuthenticationError("Invalid token"));
      break;

    case "notfound":
      next(new NotFoundError("Bookmark"));
      break;

    case "internal":
      next(new Error("Something went wrong internally"));
      break;

    default:
      res.json({ message: "Use: /api/test-error/database|auth|notfound|internal" });
  }
});

// Test in production vs development:
// NODE_ENV=production node server.js
// curl http://localhost:4242/api/test-error/database
// Response: { "success": false, "error": "Database error occurred" }

// NODE_ENV=development node server.js
// curl http://localhost:4242/api/test-error/database
// Response: { "success": false, "error": "UNIQUE constraint failed...", "stack": "..." }
*/

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: Errors still show stack traces in production
 * Solution: Verify NODE_ENV=production is set:
 *   echo $NODE_ENV  # Should output "production"
 *
 * Issue: Error handler not catching errors
 * Solution: Ensure errorHandler is LAST middleware (after all routes)
 *
 * Issue: Some errors return HTML instead of JSON
 * Solution: Error handler must have 4 parameters (err, req, res, next)
 *
 * Issue: Can't debug production errors
 * Solution: Check server logs - full errors are logged with logError()
 */
