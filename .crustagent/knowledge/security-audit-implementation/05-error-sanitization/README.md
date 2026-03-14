# 05: Error Sanitization (Information Disclosure Prevention)

[![Priority](https://img.shields.io/badge/Priority-High-orange)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-3%20hours-blue)](#)

---

## Why This Matters

**Problem:** Without error sanitization, error messages leak:
- **Database schema** - "UNIQUE constraint failed: users.username" reveals table/column names
- **File paths** - "/app/server.js:450" reveals internal structure
- **Stack traces** - Full call stack exposes code organization
- **SQL queries** - "INSERT INTO bookmarks (...)" shows schema
- **Environment details** - Node version, library versions, internal IPs

**Impact:** Attackers use leaked information to craft targeted attacks. Stack traces = roadmap for exploitation.

**Solution:** Sanitize errors in production, show details only in development.

---

## What This Implements

### Error Sanitization Matrix

| Environment | Error Type | Response | Details Logged |
|-------------|-----------|----------|----------------|
| **Production** | Validation error | Generic message | Full details to console |
| **Production** | Database error | "Database error occurred" | SQL query + stack trace to logs |
| **Production** | Internal error | "Internal server error" | Full error + stack trace to logs |
| **Development** | Any error | Full details + stack | Full details to console |

### Before vs After

**BEFORE (Insecure - Information Disclosure):**
```javascript
app.post("/api/bookmarks", (req, res) => {
  try {
    db.prepare("INSERT INTO bookmarks ...").run(...);
  } catch (error) {
    // ⚠️ LEAKS: Full error, database schema, file paths
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Client sees:
// {
//   "error": "UNIQUE constraint failed: bookmarks.id",
//   "stack": "Error: UNIQUE constraint failed...\n    at /app/server.js:812:45\n    at ..."
// }
```

**AFTER (Secure - Sanitized Errors):**
```javascript
import { sanitizeError, errorHandler } from "./src/middleware/errorHandler.js";

app.post("/api/bookmarks", (req, res) => {
  try {
    db.prepare("INSERT INTO bookmarks ...").run(...);
  } catch (error) {
    throw error; // Let errorHandler middleware handle it
  }
});

// Add global error handler
app.use(errorHandler);

// Client sees (production):
// { "success": false, "error": "Database error occurred" }

// Server logs:
// ERROR: Database constraint violation
// Query: INSERT INTO bookmarks (id, url, ...) VALUES (?, ?, ...)
// Details: UNIQUE constraint failed: bookmarks.id
// Stack: Error: UNIQUE constraint...\n    at /app/server.js:812:45
```

---

## How It Works

### Error Handling Flow

```
Route Handler → Error Occurs → Error Handler Middleware
  ├─ Catch error (try/catch or throw)
  ├─ Pass to errorHandler(err, req, res, next)
  ├─ Check environment (production vs dev)
  ├─ Production: Sanitize error, log details
  └─ Development: Return full error for debugging

Error Handler Middleware (last middleware in chain):
  ├─ Classify error type (validation, database, auth, internal)
  ├─ Log full details to console/file
  ├─ Sanitize error for client response
  ├─ Return appropriate HTTP status code
  └─ Include request ID for tracing (optional)
```

### Error Types and Responses

**1. Validation Errors (400 Bad Request)**
- **Production:** "Invalid input provided"
- **Development:** Full Zod validation issues
- **Log:** Validation failures with request details

**2. Database Errors (500 Internal Server Error)**
- **Production:** "Database error occurred"
- **Development:** Full SQLite error + query
- **Log:** SQL query, error message, stack trace

**3. Authentication Errors (401 Unauthorized)**
- **Production:** "Authentication failed"
- **Development:** "Invalid token format" or "Token expired"
- **Log:** Auth attempt details (IP, timestamp, token prefix)

**4. Authorization Errors (403 Forbidden)**
- **Production:** "Access denied"
- **Development:** "Missing 'write' permission"
- **Log:** Permission check details

**5. Not Found Errors (404 Not Found)**
- **Production:** "Resource not found"
- **Development:** Same (no sensitive info)
- **Log:** Resource type + ID

**6. Internal Errors (500 Internal Server Error)**
- **Production:** "Internal server error"
- **Development:** Full error + stack trace
- **Log:** Full error, stack, request details

---

## Security Rationale

### Attack Scenarios Prevented

**Schema Enumeration (Blocked):**
```
Attacker tries to create bookmark with existing ID:
  POST /api/bookmarks { "id": "existing-id", ... }

Without sanitization:
  Response: "UNIQUE constraint failed: bookmarks.id"
  Attacker learns: Table is "bookmarks", column is "id", constraint is UNIQUE

With sanitization:
  Response: "Database error occurred"
  Attacker learns: Nothing useful
  Logs show: Full error for debugging
```

**Path Disclosure (Blocked):**
```
Attacker triggers error to reveal paths:
  POST /api/bookmarks { "url": null }

Without sanitization:
  "TypeError: Cannot read property 'length' of null\n    at /app/server.js:812:45"
  Attacker learns: Server runs at /app/, server.js is entry point, line 812 is vulnerable

With sanitization:
  "Internal server error"
  Logs show: Full stack trace for debugging
```

**Technology Fingerprinting (Blocked):**
```
Attacker examines error messages:

Without sanitization:
  "better-sqlite3: SQLITE_CONSTRAINT: UNIQUE constraint failed"
  "express@4.18.2: Cannot set headers after they are sent"
  Attacker learns: Using better-sqlite3, Express 4.18.2

With sanitization:
  "Database error occurred"
  "Internal server error"
  Attacker learns: Nothing about tech stack
```

### OWASP Top 10 Coverage
- ✅ **A05:2021 – Security Misconfiguration** - Proper error handling is security configuration
- ✅ **A04:2021 – Insecure Design** - Error disclosure is insecure by design
- ✅ **A01:2021 – Broken Access Control** - Error messages can leak access control logic

---

## Implementation

See [errorHandler.ts](./errorHandler.ts) for full implementation.

### Quick Overview

**1. Create error handler middleware (src/middleware/errorHandler.js):**
```javascript
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";

  // Log full error details (always)
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(`ERROR: ${err.message}`);
  console.error(`Path: ${req.method} ${req.path}`);
  console.error(`Stack: ${err.stack}`);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Sanitize error for client
  const sanitized = sanitizeError(err, isProduction);
  res.status(sanitized.status).json(sanitized.response);
}
```

**2. Add to server.js (LAST middleware, after all routes):**
```javascript
import { errorHandler } from "./src/middleware/errorHandler.js";

// ... all routes ...

// Global error handler (must be last)
app.use(errorHandler);
```

**3. Use in routes:**
```javascript
app.post("/api/bookmarks", requireAuth, async (req, res, next) => {
  try {
    // Route logic
    const result = db.prepare("INSERT INTO bookmarks ...").run(...);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    next(error); // Pass to errorHandler
  }
});
```

---

## Testing

### Manual Verification

**Test 1: Database error (UNIQUE constraint)**
```bash
# Create bookmark
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test","id":"abc123"}'

# Try to create same ID again
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test2","id":"abc123"}'

# Production response:
# { "success": false, "error": "Database error occurred" }

# Server logs should show:
# ERROR: UNIQUE constraint failed: bookmarks.id
# Query: INSERT INTO bookmarks ...
# Stack: Error: ...
```

**Test 2: Internal server error**
```bash
# Trigger error by accessing undefined property
# (Modify route temporarily to throw error)

curl http://localhost:4242/api/test-error

# Production response:
# { "success": false, "error": "Internal server error" }

# Development response:
# {
#   "success": false,
#   "error": "Cannot read property 'foo' of undefined",
#   "stack": "TypeError: Cannot read property...\n    at ..."
# }
```

**Test 3: Validation error**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"not-a-url","title":"Test"}'

# Response (both prod and dev):
# {
#   "success": false,
#   "error": "Validation failed",
#   "issues": [{ "path": "url", "message": "Invalid URL" }]
# }
# (Validation errors are safe to show)
```

### Automated Tests

Create `tests/security/error-sanitization.test.js`:
```javascript
describe('Error Sanitization', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  it('should sanitize database errors in production', async () => {
    // Trigger UNIQUE constraint error
    const res = await request(app)
      .post('/api/bookmarks')
      .send({ /* duplicate ID */ });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Database error occurred');
    expect(res.body.stack).toBeUndefined();
    expect(res.body.error).not.toContain('UNIQUE');
    expect(res.body.error).not.toContain('bookmarks');
  });

  it('should show full errors in development', async () => {
    process.env.NODE_ENV = 'development';

    const res = await request(app)
      .post('/api/bookmarks')
      .send({ /* trigger error */ });

    expect(res.body.error).toBeDefined();
    expect(res.body.stack).toBeDefined(); // Stack trace included
  });

  it('should not leak file paths in production', async () => {
    const res = await request(app)
      .get('/api/trigger-error'); // Test route

    expect(res.body.error).not.toContain('/app/');
    expect(res.body.error).not.toContain('server.js');
    expect(res.body.error).not.toContain('.js:');
  });
});
```

---

## Configuration Options

### Error Logging Levels

```javascript
const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

export function errorHandler(err, req, res, next) {
  const level = getErrorLevel(err);

  if (level === LOG_LEVELS.ERROR) {
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(`[WARN] ${err.message}`);
  }

  // ...
}

function getErrorLevel(err) {
  if (err.status === 400) return LOG_LEVELS.WARN; // Client errors
  if (err.status === 404) return LOG_LEVELS.INFO; // Not found
  return LOG_LEVELS.ERROR; // Server errors
}
```

### Custom Error Classes

```javascript
export class ValidationError extends Error {
  constructor(message, issues) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.issues = issues;
  }
}

export class DatabaseError extends Error {
  constructor(message, query) {
    super(message);
    this.name = "DatabaseError";
    this.status = 500;
    this.query = query;
  }
}

// Use in routes
throw new ValidationError("Invalid input", zodError.issues);
throw new DatabaseError("Constraint violation", sqlQuery);
```

### Structured Logging (JSON)

```javascript
export function logError(err, req) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: "error",
    message: err.message,
    stack: err.stack,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
  };

  console.error(JSON.stringify(errorLog));
}
```

---

## Common Issues & Troubleshooting

### Issue: Errors still leak in production
**Symptom:** Full stack traces visible in production responses.

**Solution:** Verify `NODE_ENV=production` is set:
```bash
echo $NODE_ENV  # Should output "production"
```

### Issue: Can't debug production errors
**Symptom:** Errors sanitized, but logs aren't captured.

**Solution:** Use a logging service (Winston, Pino) or log to file:
```javascript
import fs from "fs";

export function logError(err, req) {
  const logEntry = `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`;
  fs.appendFileSync("/var/log/clawchives-errors.log", logEntry);
}
```

### Issue: Some errors bypass error handler
**Symptom:** Errors shown as HTML instead of JSON.

**Solution:** Ensure error handler is LAST middleware:
```javascript
// Routes
app.get("/api/bookmarks", ...);
app.post("/api/bookmarks", ...);

// Error handler MUST be after all routes
app.use(errorHandler);
```

### Issue: Validation errors show full Zod schemas
**Symptom:** Zod error includes entire schema definition.

**Solution:** Map Zod errors to simple messages (already in validation.ts):
```javascript
const issues = result.error.issues.map((issue) => ({
  path: issue.path.join("."),
  message: issue.message, // Only message, not schema
}));
```

---

## Integration with Existing Code

### Before (server.js - various catch blocks):
```javascript
app.post("/api/bookmarks", (req, res) => {
  try {
    // ...
  } catch (error) {
    res.status(500).json({ error: error.message }); // ⚠️ Information leak
  }
});
```

### After:
```javascript
import { errorHandler } from "./src/middleware/errorHandler.js";

app.post("/api/bookmarks", async (req, res, next) => {
  try {
    // ...
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Add global error handler (LAST middleware, line 1100+)
app.use(errorHandler);
```

**Files modified:**
- [server.js](../../server.js) - Remove inline error handling, add global errorHandler
- **New file:** `src/middleware/errorHandler.js` - Error sanitization logic

**Breaking changes:**
- ⚠️ Production errors no longer include stack traces (this is the goal)
- ⚠️ Clients must handle generic error messages

---

## Next Steps

1. ✅ Review this README
2. ✅ Review [errorHandler.ts](./errorHandler.ts)
3. ⬜ Create `src/middleware/errorHandler.js`
4. ⬜ Replace inline try/catch error responses with `next(error)`
5. ⬜ Add `app.use(errorHandler)` as LAST middleware
6. ⬜ Test in production mode (NODE_ENV=production)
7. ⬜ Verify errors are sanitized but still logged
8. ⬜ Proceed to [06-audit-logging](../06-audit-logging/README.md)

---

## References

- [OWASP: Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)
