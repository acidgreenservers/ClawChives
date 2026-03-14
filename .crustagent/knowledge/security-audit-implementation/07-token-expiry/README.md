# 07: Token Expiry (API Token Time-To-Live)

[![Priority](https://img.shields.io/badge/Priority-High-orange)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Medium-yellow)](#)
[![Time](https://img.shields.io/badge/Time-5%20hours-blue)](#)

---

## Why This Matters

**Problem:** Currently, API tokens **never expire**:
- **Stolen tokens work forever** - Lost laptop = permanent access
- **No token rotation** - Same token used for years
- **Dormant accounts persist** - Ex-employee tokens still valid
- **Compliance violations** - Many standards require token expiration

**Impact:** Compromised tokens remain valid indefinitely. Attackers have unlimited time to abuse them.

**Solution:** Add `expires_at` column to `api_tokens`, enforce expiration, allow configurable TTL (30/60/90 days or custom).

---

## What This Implements

### Token Expiry System

| Component | Description |
|-----------|-------------|
| **Database Schema** | Add `expires_at` column to `api_tokens` table |
| **Token Issuance** | Calculate expiry date when creating API tokens |
| **Token Validation** | Check if token expired in `requireAuth` middleware |
| **Cleanup Job** | Delete expired tokens daily |
| **UI Component** | Dropdown in Settings to choose TTL (30/60/90 days, never, custom) |
| **Environment Config** | `TOKEN_TTL_DEFAULT=90d`, `TOKEN_TTL_OPTIONS=30d,60d,90d,never,custom` |

### Token TTL Options

| Option | Expiry | Use Case |
|--------|--------|----------|
| **30 days** | 30 days from issuance | High-security environments, frequent rotation |
| **60 days** | 60 days from issuance | Balanced security and UX |
| **90 days** | 90 days from issuance | Default, recommended for most users |
| **Never** | No expiration | Legacy support, not recommended |
| **Custom** | User-specified date | Special cases (demo accounts, temp access) |

### Migration Required

```sql
-- Add expires_at column to api_tokens table
ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;

-- Set default expiry for existing tokens (90 days from now)
UPDATE api_tokens
SET expires_at = datetime('now', '+90 days')
WHERE expires_at IS NULL;
```

---

## How It Works

### Token Lifecycle with Expiry

```
Token Issuance:
  ├─ User requests API token (POST /api/auth/token)
  ├─ Calculate expiry: current_time + TTL
  ├─ Store in database: INSERT INTO api_tokens (key, owner_key, expires_at) VALUES (...)
  └─ Return token to user

Token Validation:
  ├─ Request arrives with Authorization header
  ├─ Extract token from "Bearer <token>"
  ├─ Query database: SELECT * FROM api_tokens WHERE key = ?
  ├─ Check if token exists
  ├─ Check if token expired: expires_at < current_time
  ├─ ✅ If valid and not expired: Allow request
  └─ ❌ If expired: Return 401 "Token expired"

Cleanup Job (Daily):
  ├─ Run at 3am: DELETE FROM api_tokens WHERE expires_at < current_time
  └─ Log: "Deleted 15 expired tokens"
```

### Integration Points

**1. Database Schema (server.js line 60+):**
```sql
ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;
```

**2. Token Issuance (server.js line 750+):**
```javascript
const ttl = req.body.ttl || process.env.TOKEN_TTL_DEFAULT || "90d";
const expiresAt = calculateExpiry(ttl);

db.prepare(`
  INSERT INTO api_tokens (key, owner_key, owner_type, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(apiToken, ownerKey, ownerType, expiresAt, now);
```

**3. Token Validation (server.js line 254+):**
```javascript
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  const tokenData = db.prepare("SELECT * FROM api_tokens WHERE key = ?").get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (checkTokenExpiry(tokenData.expires_at)) {
    return res.status(401).json({ error: "Token expired" });
  }

  next();
}
```

**4. Cleanup Job (server.js line 1100+):**
```javascript
setInterval(() => {
  cleanupExpiredTokens(db);
}, 24 * 60 * 60 * 1000); // Run daily
```

---

## Security Rationale

### Attack Scenarios Mitigated

**Stolen Token Expiry:**
```
Day 1: Attacker steals API token (from logs, network intercept, etc.)
Day 30: Attacker tries to use token
Response: 401 "Token expired"

Without expiry:
  Token works forever, attacker has unlimited access

With expiry:
  Token expires after 30 days, attacker's window limited
```

**Dormant Account Cleanup:**
```
Scenario: Employee leaves company, forgets to revoke agent keys

Without expiry:
  Keys remain valid forever, ex-employee could access data

With expiry:
  Keys expire after 90 days, automatic revocation
```

**Compliance Requirement:**
```
SOC 2 / ISO 27001 requirement:
  "Access credentials must expire after a defined period"

Without expiry:
  ❌ Non-compliant

With expiry:
  ✅ Compliant (90-day default expiry)
```

### OWASP Top 10 Coverage
- ✅ **A07:2021 – Identification and Authentication Failures** - Token expiry limits attack window
- ✅ **A05:2021 – Security Misconfiguration** - Default expiry is secure configuration
- ✅ **A01:2021 – Broken Access Control** - Expired tokens can't access resources

---

## Implementation

See [tokenExpiry.ts](./tokenExpiry.ts) and [ui-component.tsx](./ui-component.tsx).

### Quick Overview

**1. Add expires_at column:**
```sql
ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;
```

**2. Create token expiry helper (src/utils/tokenExpiry.js):**
```javascript
export function calculateExpiry(ttl) {
  if (ttl === "never") return null;
  if (ttl === "30d") return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  if (ttl === "60d") return new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  if (ttl === "90d") return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  // Custom date
  return new Date(ttl).toISOString();
}

export function checkTokenExpiry(expiresAt) {
  if (!expiresAt) return false; // Never expires
  return new Date(expiresAt) < new Date(); // Expired?
}

export function cleanupExpiredTokens(db) {
  const result = db.prepare("DELETE FROM api_tokens WHERE expires_at < ?")
    .run(new Date().toISOString());
  console.log(`🗑️ Cleaned up ${result.changes} expired tokens`);
}
```

**3. Update token issuance route:**
```javascript
app.post("/api/auth/token", authLimiter, (req, res) => {
  const ttl = req.body.ttl || process.env.TOKEN_TTL_DEFAULT || "90d";
  const expiresAt = calculateExpiry(ttl);

  db.prepare(`
    INSERT INTO api_tokens (key, owner_key, owner_type, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(apiToken, ownerKey, ownerType, expiresAt, new Date().toISOString());

  res.json({ success: true, token: apiToken, expires_at: expiresAt });
});
```

**4. Add expiry check to requireAuth:**
```javascript
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const tokenData = db.prepare("SELECT * FROM api_tokens WHERE key = ?").get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (checkTokenExpiry(tokenData.expires_at)) {
    return res.status(401).json({ error: "Token expired. Please generate a new token." });
  }

  next();
}
```

---

## Testing

### Manual Tests

**Test 1: Create token with 30-day expiry**
```bash
curl -X POST http://localhost:4242/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"humanKey":"hu-your-key","ttl":"30d"}'

# Response:
# {
#   "success": true,
#   "token": "api-abc123...",
#   "expires_at": "2024-02-15T10:30:00Z"
# }
```

**Test 2: Verify token expiry enforcement**
```bash
# Manually set token expiry to past date
sqlite3 data/db.sqlite "UPDATE api_tokens SET expires_at = '2020-01-01T00:00:00Z' WHERE key = 'api-abc123...';"

# Try to use expired token
curl http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-abc123..."

# Expected: 401 "Token expired"
```

**Test 3: Cleanup expired tokens**
```bash
# Create expired token
sqlite3 data/db.sqlite "INSERT INTO api_tokens (key, owner_key, owner_type, expires_at, created_at) VALUES ('api-expired', 'hu-test', 'human', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z');"

# Run cleanup (call endpoint or wait for cron)
curl -X POST http://localhost:4242/api/admin/cleanup-tokens \
  -H "Authorization: Bearer api-admin-token"

# Verify deletion
sqlite3 data/db.sqlite "SELECT * FROM api_tokens WHERE key = 'api-expired';"
# Expected: No rows
```

---

## Configuration Options

### Environment Variables

```bash
# .env
TOKEN_TTL_DEFAULT=90d                          # Default expiry
TOKEN_TTL_OPTIONS=30d,60d,90d,never,custom     # Available options in UI
```

### Customizable in UI

See [ui-component.tsx](./ui-component.tsx) for React component:
```tsx
<select value={ttl} onChange={(e) => setTtl(e.target.value)}>
  <option value="30d">30 days</option>
  <option value="60d">60 days</option>
  <option value="90d">90 days (recommended)</option>
  <option value="never">Never (not recommended)</option>
  <option value="custom">Custom date...</option>
</select>
```

---

## Next Steps

1. ✅ Review [README.md](./README.md), [tokenExpiry.ts](./tokenExpiry.ts), [ui-component.tsx](./ui-component.tsx)
2. ⬜ Run database migration: `ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;`
3. ⬜ Create `src/utils/tokenExpiry.js`
4. ⬜ Update token issuance route to calculate expiry
5. ⬜ Update `requireAuth` to check expiry
6. ⬜ Add cleanup cron job
7. ⬜ Update UI to include TTL selector
8. ⬜ Proceed to [08-permissions](../08-permissions/README.md)

---

## References

- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NIST: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
