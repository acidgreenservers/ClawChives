# 04: Input Validation (Zod Schema Enforcement)

[![Priority](https://img.shields.io/badge/Priority-Critical-red)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Medium-yellow)](#)
[![Time](https://img.shields.io/badge/Time-6%20hours-blue)](#)

---

## Why This Matters

**Problem:** Without input validation, attackers can:
- **SQL Injection** - Inject malicious SQL via bookmark URLs or titles
- **XSS** - Store malicious scripts in bookmark descriptions
- **DoS** - Send massive payloads (100MB JSON) to crash server
- **Type confusion** - Send `starred: "true"` instead of `true`, breaking logic
- **Path traversal** - Create folders named `../../etc/passwd`

**Impact:** Server crashes, database corruption, stored XSS, or complete compromise.

**Solution:** Validate **all** user input at API boundaries with strict schemas.

---

## What This Implements

### Validation Coverage

| Endpoint | Fields Validated | Attack Prevented |
|----------|------------------|------------------|
| `POST /api/auth/register` | uuid, username, keyHash | Type confusion, oversized inputs |
| `POST /api/bookmarks` | url, title, description, tags, folderId | XSS, SQL injection, invalid URLs |
| `POST /api/folders` | name, parentId, color | Path traversal, color injection |
| `POST /api/agent-keys` | name, description, permissions, rateLimit | Privilege escalation, DoS |
| `PUT /api/bookmarks/:id` | All optional fields | Partial update attacks |
| `DELETE /api/*` | ID format validation | Type confusion |

### Zod Schema Benefits

**Why Zod over manual validation?**
```javascript
// ❌ BEFORE: Manual validation (error-prone)
if (!req.body.url || typeof req.body.url !== 'string') {
  return res.status(400).json({ error: "Invalid URL" });
}
if (req.body.url.length > 2000) {
  return res.status(400).json({ error: "URL too long" });
}
if (!req.body.url.match(/^https?:\/\//)) {
  return res.status(400).json({ error: "URL must be HTTP(S)" });
}
// Easy to miss edge cases!

// ✅ AFTER: Zod schema (declarative, type-safe)
const bookmarkSchema = z.object({
  url: z.string().url().max(2000).regex(/^https?:\/\//),
});
// Validates all cases, generates TypeScript types
```

---

## How It Works

### Validation Flow

```
Request → Zod Schema → Route Handler
  ├─ Parse request body
  ├─ Run through Zod schema
  ├─ ✅ Valid: Continue to handler with typed data
  └─ ❌ Invalid: Return 400 with detailed error

Example:
  POST /api/bookmarks
  Body: { url: "not-a-url", starred: "yes" }

  Zod validation:
    - url: Invalid (not a URL) → error.issues[0]
    - starred: Invalid (expected boolean, got string) → error.issues[1]

  Response: 400 Bad Request
  {
    "success": false,
    "error": "Validation failed",
    "issues": [
      { "path": ["url"], "message": "Invalid URL format" },
      { "path": ["starred"], "message": "Expected boolean, got string" }
    ]
  }
```

### Middleware Pattern

**Reusable validation middleware:**
```javascript
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        issues: result.error.issues,
      });
    }

    req.validatedBody = result.data; // Typed data
    next();
  };
}

// Use in routes
app.post("/api/bookmarks", validateBody(bookmarkSchema), (req, res) => {
  const { url, title } = req.validatedBody; // Type-safe!
  // ...
});
```

---

## Security Rationale

### Attack Scenarios Prevented

**SQL Injection (Blocked by URL/String Validation):**
```javascript
// Attack attempt
POST /api/bookmarks
{
  "url": "https://example.com'; DROP TABLE bookmarks; --",
  "title": "Malicious"
}

Without validation:
  db.prepare("INSERT INTO bookmarks (url) VALUES (?)").run(url);
  // If prepared statements fail, could be vulnerable

With validation:
  bookmarkSchema.parse(body);
  // url validated as proper URL format
  // Even if SQL injection possible, URL regex rejects it
```

**XSS via Stored Payload (Blocked by Length Limits):**
```javascript
// Attack attempt
POST /api/bookmarks
{
  "url": "https://evil.com",
  "description": "<script>alert(document.cookie)</script>".repeat(10000)
}

Without validation:
  Stores 100KB+ of scripts, crashes browser on render

With validation:
  description: z.string().max(1000)
  // Rejected: String must contain at most 1000 character(s)
```

**DoS via Large Payload (Blocked by Schema Limits):**
```javascript
// Attack attempt
POST /api/bookmarks
{
  "tags": ["tag1", "tag2", ...] // 100,000 tags
}

Without validation:
  JSON parsing succeeds, crashes during tag processing

With validation:
  tags: z.array(z.string()).max(50)
  // Rejected: Array must contain at most 50 element(s)
```

**Type Confusion Attack (Blocked by Type Checking):**
```javascript
// Attack attempt
PUT /api/bookmarks/abc123
{
  "starred": "true" // String instead of boolean
}

Without validation:
  if (req.body.starred) { ... } // "true" is truthy!
  db.prepare("UPDATE bookmarks SET starred = ?").run(req.body.starred);
  // Stores string "true" in INTEGER column → SQLite error

With validation:
  starred: z.boolean()
  // Rejected: Expected boolean, received string
```

### OWASP Top 10 Coverage
- ✅ **A03:2021 – Injection** - Input validation prevents SQL/NoSQL/Command injection
- ✅ **A04:2021 – Insecure Design** - Schema validation is secure-by-design
- ✅ **A05:2021 – Security Misconfiguration** - Enforced validation prevents misconfiguration

---

## Implementation

See [validation.ts](./validation.ts) for full schemas and middleware.

### Quick Overview

**1. Install Zod:**
```bash
npm install zod
```

**2. Create validation schemas (src/validation/schemas.js):**
```javascript
import { z } from "zod";

export const registerSchema = z.object({
  uuid: z.string().uuid(),
  username: z.string().min(3).max(50),
  keyHash: z.string().length(64), // SHA-256 hex
});

export const bookmarkSchema = z.object({
  url: z.string().url().max(2000),
  title: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  // ... more fields
});
```

**3. Create validation middleware (src/middleware/validate.js):**
```javascript
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        issues: result.error.issues,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
```

**4. Apply to routes (server.js):**
```javascript
import { validateBody } from "./src/middleware/validate.js";
import { registerSchema, bookmarkSchema } from "./src/validation/schemas.js";

app.post("/api/auth/register", validateBody(registerSchema), (req, res) => {
  const { uuid, username, keyHash } = req.validatedBody;
  // ...
});

app.post("/api/bookmarks", requireAuth, validateBody(bookmarkSchema), (req, res) => {
  const { url, title, description } = req.validatedBody;
  // ...
});
```

---

## Testing

### Manual Verification

**Test 1: Valid input (should succeed)**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Example Site",
    "description": "A test bookmark"
  }'

# Expected: 201 Created
```

**Test 2: Invalid URL (should fail)**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "not-a-valid-url",
    "title": "Example"
  }'

# Expected: 400 Bad Request
# {
#   "success": false,
#   "error": "Validation failed",
#   "issues": [
#     { "path": ["url"], "message": "Invalid URL" }
#   ]
# }
```

**Test 3: Missing required field**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
  # Missing "title"

# Expected: 400 Bad Request
# { "issues": [{ "path": ["title"], "message": "Required" }] }
```

**Test 4: String too long**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://example.com\",
    \"title\": \"$(printf 'A%.0s' {1..600})\"
  }"
  # 600 character title (max: 500)

# Expected: 400 Bad Request
# { "issues": [{ "path": ["title"], "message": "String must contain at most 500 character(s)" }] }
```

**Test 5: Type mismatch**
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Test",
    "starred": "yes"
  }'
  # starred should be boolean, not string

# Expected: 400 Bad Request
# { "issues": [{ "path": ["starred"], "message": "Expected boolean, received string" }] }
```

### Automated Tests

Create `tests/validation/schemas.test.js`:
```javascript
import { registerSchema, bookmarkSchema } from '../../src/validation/schemas.js';

describe('Input Validation', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const data = {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        keyHash: 'a'.repeat(64),
      };
      expect(() => registerSchema.parse(data)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const data = {
        uuid: 'not-a-uuid',
        username: 'testuser',
        keyHash: 'a'.repeat(64),
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });

    it('should reject username too short', () => {
      const data = {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        username: 'ab', // Min 3 chars
        keyHash: 'a'.repeat(64),
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });
  });

  describe('bookmarkSchema', () => {
    it('should accept valid bookmark', () => {
      const data = {
        url: 'https://example.com',
        title: 'Example',
        description: 'Test bookmark',
      };
      expect(() => bookmarkSchema.parse(data)).not.toThrow();
    });

    it('should reject invalid URL', () => {
      const data = {
        url: 'not-a-url',
        title: 'Example',
      };
      expect(() => bookmarkSchema.parse(data)).toThrow();
    });

    it('should reject title too long', () => {
      const data = {
        url: 'https://example.com',
        title: 'A'.repeat(600), // Max 500
      };
      expect(() => bookmarkSchema.parse(data)).toThrow();
    });
  });
});
```

---

## Configuration Options

### Custom Error Messages

```javascript
const bookmarkSchema = z.object({
  url: z.string()
    .url({ message: "Please provide a valid URL starting with http:// or https://" })
    .max(2000, { message: "URL cannot exceed 2000 characters" }),

  title: z.string()
    .min(1, { message: "Title is required" })
    .max(500, { message: "Title cannot exceed 500 characters" }),
});
```

### Conditional Validation

```javascript
const agentKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
    move: z.boolean(),
  }),
  // Rate limit required if write permission enabled
  rateLimit: z.number().int().min(1).optional(),
}).refine(
  (data) => {
    if (data.permissions.write && !data.rateLimit) {
      return false; // Require rate limit for write access
    }
    return true;
  },
  {
    message: "Rate limit is required when write permission is enabled",
    path: ["rateLimit"],
  }
);
```

### Transform and Sanitize

```javascript
const bookmarkSchema = z.object({
  // Trim whitespace automatically
  title: z.string().trim().min(1).max(500),

  // Convert to lowercase
  tags: z.array(z.string().toLowerCase()).max(50),

  // Parse color hex code
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),

  // Coerce number strings to numbers
  starred: z.coerce.boolean(), // "true" → true, "1" → true
});
```

---

## Common Issues & Troubleshooting

### Issue: Validation passes but database insert fails
**Symptom:** Zod validation succeeds, but SQLite throws UNIQUE constraint error.

**Solution:** Add database-level checks to schema:
```javascript
const registerSchema = z.object({
  username: z.string().min(3).max(50).refine(
    async (username) => {
      const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
      return !exists;
    },
    { message: "Username already exists" }
  ),
});
```

### Issue: Error messages expose sensitive info
**Symptom:** Validation error leaks database schema or internal paths.

**Solution:** Use custom error messages (see Configuration Options above).

### Issue: Performance hit on large payloads
**Symptom:** Validation takes 100ms+ for large arrays.

**Solution:** Add express.json() size limit **before** validation:
```javascript
app.use(express.json({ limit: "1mb" })); // Reject payloads > 1MB
// Then Zod validation runs only on reasonable-sized data
```

### Issue: Regex validation too strict
**Symptom:** Valid URLs rejected by URL regex.

**Solution:** Use Zod's built-in `.url()` instead of custom regex:
```javascript
// ❌ WRONG: Custom regex misses edge cases
url: z.string().regex(/^https?:\/\/.+/)

// ✅ CORRECT: Zod's built-in URL validator
url: z.string().url()
```

### Issue: Optional fields not working
**Symptom:** Zod requires field even with `.optional()`.

**Solution:** Use `.optional()` or provide default:
```javascript
description: z.string().max(1000).optional() // Can be undefined
description: z.string().max(1000).default("") // Defaults to empty string
```

---

## Integration with Existing Code

### Before (server.js line 800+):
```javascript
app.post("/api/bookmarks", requireAuth, (req, res) => {
  const { url, title, description } = req.body;
  // No validation - accepts any input!

  const id = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO bookmarks (id, url, title, ...) VALUES (?, ?, ?, ...)")
    .run(id, url, title, ...);
});
```

### After:
```javascript
import { validateBody } from "./src/middleware/validate.js";
import { bookmarkSchema } from "./src/validation/schemas.js";

app.post("/api/bookmarks", requireAuth, validateBody(bookmarkSchema), (req, res) => {
  // req.validatedBody is type-safe and sanitized
  const { url, title, description } = req.validatedBody;

  const id = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO bookmarks (id, url, title, ...) VALUES (?, ?, ?, ...)")
    .run(id, url, title, ...);
});
```

**Files modified:**
- [server.js](../../server.js) - Add validation middleware to all POST/PUT routes
- **New file:** `src/validation/schemas.js` - Zod schemas for all endpoints
- **New file:** `src/middleware/validate.js` - Validation middleware helper
- [package.json](../../package.json) - Add `zod` dependency

**Breaking changes:**
- ⚠️ API clients must send properly typed data (e.g., `starred: true` not `"true"`)
- ⚠️ Oversized inputs will be rejected (previously accepted)

---

## Next Steps

1. ✅ Review this README
2. ✅ Review [validation.ts](./validation.ts)
3. ⬜ Install Zod: `npm install zod`
4. ⬜ Create `src/validation/schemas.js` with all schemas
5. ⬜ Create `src/middleware/validate.js` with middleware
6. ⬜ Apply validation to all POST/PUT/DELETE routes
7. ⬜ Test with valid and invalid inputs
8. ⬜ Verify error messages are user-friendly
9. ⬜ Proceed to [05-error-sanitization](../05-error-sanitization/README.md)

---

## References

- [Zod Documentation](https://zod.dev/)
- [OWASP: Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP: Mass Assignment](https://owasp.org/www-community/vulnerabilities/Mass_Assignment)
- [MDN: Data Validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)
