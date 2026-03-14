# 02: Rate Limiting

[![Priority](https://img.shields.io/badge/Priority-Critical-red)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Medium-yellow)](#)
[![Time](https://img.shields.io/badge/Time-4%20hours-blue)](#)

---

## Why This Matters

**Problem:** Without rate limiting, attackers can:
- **Brute-force authentication** - Try thousands of username/password combinations
- **DDoS the API** - Overwhelm server with requests, making it unavailable
- **Enumerate users** - Test if usernames exist by spamming registration
- **Abuse agent keys** - Exhaust resources with unlimited API calls

**Impact:** Server becomes slow or unavailable, attackers can compromise accounts.

**Solution:** Limit requests per IP/user within time windows.

---

## What This Implements

### Three Rate Limiters

| Limiter | Scope | Limit | Window | Applied To |
|---------|-------|-------|--------|------------|
| `authLimiter` | IP + username | 5 attempts | 15 minutes | `/api/auth/register`, `/api/auth/token` |
| `apiLimiter` | IP address | 100 requests | 1 minute | All `/api/*` routes |
| `agentKeyRateLimiter` | Agent key | Per-key config | 1 minute | Routes when using agent keys |

### Why These Limits?

**authLimiter (5/15min):**
- Prevents brute-force attacks on login/registration
- IP + username combo allows same user from different IPs
- 5 attempts is enough for typos, not enough for brute-force

**apiLimiter (100/min):**
- General DoS protection
- Generous enough for legitimate use (1.6 req/sec)
- Prevents server overload from single client

**agentKeyRateLimiter (database-driven):**
- Enforces `rate_limit` field from `agent_keys` table
- Per-key customization (some agents need 10/min, others 1000/min)
- Currently stored but not enforced - this fixes it!

---

## How It Works

### express-rate-limit Mechanism

```
Request Flow with Rate Limiting:
  ├─ Request arrives
  ├─ Extract key (IP, username, or API key)
  ├─ Check in-memory store: requests[key] count
  ├─ If count < max → allow, increment count
  ├─ If count >= max → return 429 "Too Many Requests"
  └─ After window expires → reset count
```

### Storage
- **In-memory** (default) - Fast, resets on server restart
- **Redis** (production) - Persistent across restarts, shared between servers
- **No database** - Designed for high performance

### Headers Added
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1678901234
Retry-After: 900  (seconds until reset)
```

---

## Security Rationale

### Attack Scenarios Prevented

**Brute-Force Attack (Blocked by authLimiter):**
```
Attacker tries 1000 passwords:
  Request 1-5: Allowed, password checked
  Request 6+: 429 Too Many Requests
  Result: Max 5 passwords tested per 15 min (288/day vs 1000s/sec)
```

**DDoS Attack (Blocked by apiLimiter):**
```
Attacker floods /api/bookmarks:
  Request 1-100: Allowed (within 1 min window)
  Request 101+: 429 Too Many Requests
  Result: Server handles max 100 req/min per IP (sustainable load)
```

**Agent Key Abuse (Blocked by agentKeyRateLimiter):**
```
Agent configured with rate_limit=10 tries 100 requests:
  Request 1-10: Allowed
  Request 11+: 429 "Agent key rate limit exceeded: 10 requests/minute"
  Result: Agent must respect configured limit
```

### OWASP Top 10 Coverage
- ✅ **A07:2021 – Identification and Authentication Failures** - Rate limiting prevents brute-force
- ✅ **A04:2021 – Insecure Design** - Lack of rate limiting is insecure design

---

## Implementation

See [rateLimiter.ts](./rateLimiter.ts) for full implementation.

### Quick Overview

**1. Install dependency:**
```bash
npm install express-rate-limit
```

**2. Create middleware file:**
`src/middleware/rateLimiter.js` with three limiters

**3. Apply to routes:**
```javascript
import { authLimiter, apiLimiter, agentKeyRateLimiter } from "./src/middleware/rateLimiter.js";

app.post("/api/auth/register", authLimiter, ...);
app.post("/api/auth/token", authLimiter, ...);
app.use("/api", apiLimiter);
// agentKeyRateLimiter in requireAuth middleware
```

---

## Testing

### Manual Verification

**Test 1: Auth rate limiting**
```bash
# Try to register 6 times quickly
for i in {1..6}; do
  curl -X POST http://localhost:4242/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"uuid":"test","username":"user'$i'","keyHash":"abc123"}' \
    -w "\nHTTP %{http_code}\n"
  sleep 0.5
done

# Expected:
# Requests 1-5: HTTP 201 or 409
# Request 6: HTTP 429 "Too many authentication attempts"
```

**Test 2: API rate limiting**
```bash
# Spam /api/health 150 times
for i in {1..150}; do
  curl -s http://localhost:4242/api/health -w "%{http_code} " &
done
wait

# Expected: First ~100 return 200, rest return 429
```

**Test 3: Agent key rate limiting**
```bash
# Create agent key with rate_limit=5
# Then make 10 requests with that key

for i in {1..10}; do
  curl http://localhost:4242/api/bookmarks \
    -H "Authorization: Bearer ag-your-key-here" \
    -w "\nHTTP %{http_code}\n"
done

# Expected: First 5 succeed, rest return 429 "Agent key rate limit exceeded"
```

### Automated Tests

Create `tests/security/rate-limiting.test.js`:
```javascript
describe('Rate Limiting', () => {
  test('should block after 5 failed auth attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/token').send({});
    }

    // 6th attempt should be rate limited
    const res = await request(app).post('/api/auth/token').send({});
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Too many authentication attempts');
  });

  test('should include Retry-After header', async () => {
    // ... spam requests ...
    const res = await request(app).post('/api/auth/token').send({});
    expect(res.headers['retry-after']).toBeDefined();
  });
});
```

---

## Configuration Options

### Tuning Limits

**More strict (higher security):**
```javascript
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Only 3 attempts per 15 min (instead of 5)
});
```

**More lenient (better UX):**
```javascript
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min window (instead of 15)
  max: 10, // 10 attempts
});
```

### Environment Variables

Make limits configurable:
```javascript
const authRateLimit = parseInt(process.env.AUTH_RATE_LIMIT || "5");
const authRateWindow = parseInt(process.env.AUTH_RATE_WINDOW || String(15 * 60 * 1000));

export const authLimiter = rateLimit({
  windowMs: authRateWindow,
  max: authRateLimit,
  // ...
});
```

### Production: Use Redis

For multi-server deployments or persistent limits:
```javascript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
});
```

---

## Common Issues & Troubleshooting

### Issue: Rate limit resets on server restart
**Symptom:** Server restarts, attackers can try again.

**Solution:** Use Redis store (see above) for persistent rate limiting.

### Issue: Legitimate users locked out
**Symptom:** Users behind NAT/proxy share IP, all get rate limited together.

**Solution:** Use IP + username combo (already implemented):
```javascript
keyGenerator: (req) => `${req.ip}_${req.body?.username || ""}`,
```

### Issue: localhost testing hits rate limit
**Symptom:** All dev requests come from ::1, hit limit quickly.

**Solution:** Disable in development or increase limits:
```javascript
if (process.env.NODE_ENV !== 'production') {
  return (req, res, next) => next(); // Skip rate limiting in dev
}
```

### Issue: Agent key rate limiter memory leak
**Symptom:** Map grows indefinitely as new agent keys created.

**Solution:** Implement LRU cache or periodic cleanup:
```javascript
const limiters = new Map();
const MAX_LIMITERS = 1000;

if (limiters.size > MAX_LIMITERS) {
  const firstKey = limiters.keys().next().value;
  limiters.delete(firstKey);
}
```

---

## Integration with Existing Code

### Before (server.js):
```javascript
app.post("/api/auth/register", (req, res) => { /* ... */ });
app.post("/api/auth/token", (req, res) => { /* ... */ });
```

### After:
```javascript
import { authLimiter, apiLimiter } from "./src/middleware/rateLimiter.js";

// Apply general API rate limiting
app.use("/api", apiLimiter);

// Apply strict auth rate limiting
app.post("/api/auth/register", authLimiter, (req, res) => { /* ... */ });
app.post("/api/auth/token", authLimiter, (req, res) => { /* ... */ });
```

**Files modified:**
- [server.js](../../server.js) - Import and apply limiters
- [package.json](../../package.json) - Add `express-rate-limit` dependency
- **New file:** `src/middleware/rateLimiter.js`

**No breaking changes:** Legitimate users won't hit limits during normal use.

---

## Next Steps

1. ✅ Review this README
2. ✅ Review [rateLimiter.ts](./rateLimiter.ts)
3. ⬜ Implement `src/middleware/rateLimiter.js`
4. ⬜ Apply to server.js routes
5. ⬜ Test with manual spam attacks
6. ⬜ Monitor rate limit headers in responses
7. ⬜ Proceed to [03-cors-hardening](../03-cors-hardening/README.md)

---

## References

- [express-rate-limit Documentation](https://express-rate-limit.mintlify.app/)
- [OWASP: Denial of Service](https://owasp.org/www-community/attacks/Denial_of_Service)
- [OWASP: Brute Force Attack](https://owasp.org/www-community/attacks/Brute_force_attack)
