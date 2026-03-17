# ClawChives Security Audit Report

**Auditor:** CrustAgent©™ Security Adversary Mode
**Date:** 2026-03-16
**Branch:** fix/r.jina/appending/url-936957392
**Scope:** Full codebase — server.ts, src/server/db.ts, all API routes, auth flows, middleware, frontend
**Methodology:** OWASP Top 10 (2021), adversarial exploit-first analysis

---

## Executive Summary

ClawChives has a reasonably mature security posture for a self-hosted LAN application. The SQL injection surface is well-controlled through parameterized queries. The auth system has solid foundations. However, this audit uncovered **two Critical findings**, **four High findings**, and **six Medium findings** that require remediation before broader deployment. The most severe issues are a **SQL injection vector in the database encryption path**, a **broken export encryption scheme** that provides no real confidentiality, a **data isolation defect** in the `jina_conversions` schema, and a **CORS bypass** via null-origin requests across all deployment modes.

---

## Critical Issues

---

### CRIT-01: SQL Injection in SQLCipher Key Application via `db.pragma()`

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/db.ts` — Lines 28, 57–59
**Severity Score:** 9/10
**OWASP:** A03 Injection

**Vulnerability Description:**

The database encryption key is applied via string interpolation directly into a PRAGMA statement:

```typescript
db.pragma(`key = '${encryptionKey}'`);
```

And more critically, the migration path in `encryptExistingDatabase()` uses the key inside a raw `db.exec()` with string concatenation:

```typescript
plain.exec(`
  ATTACH DATABASE '${tempPath}' AS encrypted KEY '${key}';
  SELECT sqlcipher_export('encrypted');
  DETACH DATABASE encrypted;
`);
```

The single-quote validation at startup (line 19–21) is the only guard:

```typescript
if (encryptionKey && encryptionKey.includes("'")) {
  throw new Error('...');
}
```

**Attack Scenario:**

This validation is insufficient. An attacker who controls the `DB_ENCRYPTION_KEY` environment variable — for example, via a compromised `.env` file, a misconfigured Docker deployment, or a CI/CD secret injection — can inject SQLite PRAGMA or SQL syntax using characters other than single quotes.

Injection vectors that bypass the single-quote check:
- Null bytes: `\x00` can terminate the PRAGMA string in some SQLite builds
- Semicolons within the ATTACH string at line 58 could split statements in `exec()` multi-statement mode
- The `tempPath` value in the ATTACH statement is also derived from `DB_PATH` which itself comes from `DATA_DIR` — an environment variable. Path traversal characters in `DATA_DIR` could redirect the ATTACH to an attacker-controlled location, causing database exfiltration on migration

**Impact:**

Database file replacement, data exfiltration via ATTACH redirection, or corruption of the encryption migration path.

**Remediation:**

Use a prepared statement approach or the `better-sqlite3-multiple-ciphers` driver's dedicated key API if available. At minimum, validate the encryption key against an explicit allowlist (alphanumeric + base64 chars only via regex) rather than only blocking single quotes. The `DATA_DIR`/`tempPath` path should be resolved to an absolute path and validated against the expected data directory prefix before use in the ATTACH statement.

---

### CRIT-02: Broken Export Encryption — XOR with User-Supplied Password (No Real Confidentiality)

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/lib/exportImport.ts` — Lines 26–50
**Severity Score:** 8/10
**OWASP:** A02 Cryptographic Failures

**Vulnerability Description:**

The password-protected export feature uses repeating-key XOR as its encryption primitive. The code even comments this itself:

```typescript
// Simple XOR-based encryption for demo purposes (in production, use Web Crypto API)
async function encryptData(data: string, password: string): Promise<string> {
```

Repeating-key XOR is not encryption. It is trivially broken by:
1. Known-plaintext attack: the export always starts with `{"version":"1.0.0","exportedAt":"` — a 32+ character known plaintext that reveals the first 32 bytes of the key stream directly
2. Crib-dragging: with known structure at multiple offsets (JSON field names), the full key can be recovered without the password
3. Key reuse: every export with the same password produces a key stream that can be cross-cancelled between exports

**Attack Scenario:**

A user exports their bookmarks with a "password" expecting confidentiality. An attacker who obtains the export file XORs the first 32 bytes of the ciphertext with the known plaintext `{"version":"1.0.0","exportedAt":"`. This directly recovers 32 bytes of the key stream. Since the password is cycled through, if the password is shorter than 32 chars (common), the full key is recovered in one step. The attacker then decrypts the entire file.

Proof-of-concept recovery (JavaScript, runs in any browser console):
```javascript
const known = '{"version":"1.0.0","exportedAt":"';
const enc = atob(encryptedData); // from the exported file
const keyStream = [...enc.slice(0,32)].map((c,i) => c.charCodeAt(0) ^ known.charCodeAt(i));
// keyStream now reveals the repeating password bytes
```

**Impact:**

Complete bypass of export password protection. All user bookmark data, tags, folder structures, and any sensitive metadata stored in exports is exposed. Users who believe their exports are secure will share or store them insecurely.

**Remediation:**

Replace the XOR scheme entirely with the Web Crypto API using AES-GCM with a key derived from the password via PBKDF2 or Argon2. The code already imports `crypto` for other purposes. This is a complete rewrite of `encryptData()` and `decryptData()` — do not patch the XOR approach.

---

## High Issues

---

### HIGH-01: CORS Null-Origin Bypass Allows Cross-Origin Requests from Any Context

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/config/corsConfig.js` — Lines 11, 55, 102
**Severity Score:** 7/10
**OWASP:** A05 Security Misconfiguration

**Vulnerability Description:**

All three CORS modes (development, LAN production without `CORS_ORIGIN`, and strict mode with `CORS_ORIGIN` set) unconditionally allow requests with no `Origin` header:

```javascript
if (!origin) {
  return callback(null, true);
}
```

This appears in every branch. The `Origin` header is omitted in several exploitable contexts:
- Requests from `file://` pages (local HTML files opened by the victim)
- Requests from `null` sandboxed iframes (`<iframe sandbox="allow-scripts">`)
- Some redirect flows that strip the Origin header

**Attack Scenario:**

An attacker crafts an HTML file that the victim opens locally, or hosts a page with a sandboxed iframe. The iframe sends fetch requests to the ClawChives API. The browser sends no `Origin` header (or `Origin: null`). The CORS middleware allows the request unconditionally. The `credentials: true` setting means the request carries the victim's sessionStorage token — but since these are not cookies, the CSRF risk is limited. However, the null-origin bypass means any local HTML file a victim opens can make authenticated API calls if the token is somehow predictable or pre-known.

More practically: curl and scripted tools with no `Origin` header bypass all CORS restrictions. In a LAN deployment with `CORS_ORIGIN` set for strict mode, an attacker on the same network can still make API calls by omitting the Origin header entirely.

**Impact:**

CORS restrictions are partially defeated in all deployment modes. Strict mode (`CORS_ORIGIN` set) provides less protection than intended.

**Remediation:**

In strict production mode (when `CORS_ORIGIN` is set), reject `null`/absent origins rather than allowing them. Requests with no origin should only be allowed in explicit development mode or for specific health-check endpoints. Update the strict-mode branch to reject no-origin requests.

---

### HIGH-02: `jina_conversions` Unique Index Defect Creates Data Isolation Failure

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/db.ts` — Line 215
**Severity Score:** 7/10
**OWASP:** A01 Broken Access Control

**Vulnerability Description:**

The schema creates a unique index on `jina_conversions(user_uuid)` — meaning each user can have at most **one** jina conversion record across their entire account:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_jina_conversions_user ON jina_conversions(user_uuid);
```

The `jina_conversions` table has a `bookmark_id TEXT PRIMARY KEY` — meaning the primary key uniqueness is already enforced per bookmark. The additional unique index on `user_uuid` alone collapses the table to one row per user, not one row per bookmark per user.

**Attack Scenario:**

User A has 10 bookmarks with jina conversions. The unique constraint on `user_uuid` means only one of those 10 can actually persist. When a second bookmark's jina conversion is inserted, the `ON CONFLICT` logic in the PUT route (`ON CONFLICT(bookmark_id) DO UPDATE`) will fail or silently drop conversions because the `user_uuid` unique index fires before the primary key conflict is evaluated.

Beyond data integrity, this defect also means the migration at lines 179–183 may have silently lost data for any user with more than one jina conversion during the migration run.

**Impact:**

Data loss for users with multiple jina conversions. Silent failure — users set conversions that appear to work but are not persisted. This is both a correctness defect and a security defect (audit trail of jina URLs is incomplete).

**Remediation:**

The unique index should be on `(user_uuid, bookmark_id)` not on `user_uuid` alone. The existing `bookmark_id TEXT PRIMARY KEY` already handles per-bookmark uniqueness. Remove the `idx_jina_conversions_user` index and replace it with `CREATE UNIQUE INDEX idx_jina_conversions_bm_user ON jina_conversions(bookmark_id, user_uuid)` if cross-user contamination is the concern being addressed.

---

### HIGH-03: Health Endpoint Leaks Internal State Without Authentication

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/server.ts` — Lines 78–88
**Severity Score:** 6/10
**OWASP:** A01 Broken Access Control / A09 Security Logging Failures

**Vulnerability Description:**

The `/api/health` endpoint is publicly accessible with no authentication and returns aggregate counts from the database:

```javascript
const counts = {
  bookmarks: (db.prepare('SELECT COUNT(*) as c FROM bookmarks').get() as any).c,
  folders:   (db.prepare('SELECT COUNT(*) as c FROM folders').get() as any).c,
  agentKeys: (db.prepare("SELECT COUNT(*) as c FROM agent_keys WHERE is_active = 1").get() as any).c,
};
```

This runs three database queries on every health check poll — including Docker's health checker which runs every 15 seconds.

**Attack Scenario:**

An external attacker discovers the API is running at a LAN IP (from a phishing page or local network scan). They poll `/api/health` to:
1. Confirm the service is ClawChives and its version (`"version": "2.0.0"`)
2. Count active agent keys to understand the attack surface
3. Determine data volume to assess the value of compromising the instance
4. Execute a low-effort DoS by hammering `/api/health` — the rate limiter (`apiLimiter`) is applied to `/api` routes, but the health endpoint runs three DB queries per hit, making it more expensive than a typical rate-limited API call

The CORS null-origin bypass (HIGH-01) means this endpoint is reachable from any local HTML file even with CORS restrictions in place.

**Impact:**

Information disclosure (service fingerprinting, user data volume, active agent count). Amplified DoS vector via DB query execution on every health check request.

**Remediation:**

Remove the database count queries from the health endpoint. A health check should return only enough information to confirm the service is alive — `{ success: true, status: "ok" }`. Move detailed statistics to an authenticated endpoint (e.g., `/api/admin/stats`).

---

### HIGH-04: `hu-` Key Type Accepted Directly by `requireAuth` Without Token Validation

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/middleware/auth.ts` — Lines 34–38, 80–84
**Severity Score:** 6/10
**OWASP:** A07 Identification and Authentication Failures

**Vulnerability Description:**

The `requireAuth` middleware detects key types by prefix. When a `hu-` prefixed key is passed in the Authorization header, the code detects it as `keyType === 'human'` — but then fails to look it up in any database table. The `finalUserUuid` remains `null`, and the handler falls through to the final check:

```typescript
if (!finalUserUuid) {
  res.status(401).json({ success: false, error: 'Could not resolve user identity' });
  return;
}
```

The rejection happens at the right place, but the code path for `keyType === 'human'` is never handled in the validation block. The `if (keyType === 'api')` and `if (keyType === 'agent')` blocks handle lookup; there is no `if (keyType === 'human')` lookup block. This means:

1. Anyone can send `Authorization: Bearer hu-<any 64 chars>` and the middleware will attempt to use it. It will ultimately fail, but only because `finalUserUuid` stays null — not because the key was validated.
2. The flow hits `detectKeyType`, sets `keyType = 'human'`, then skips both lookup blocks, and hits the null check. This is correct behavior, but the design relies on the fallthrough being correct — any future code insertion between the detection and the null check could create an auth bypass.

More critically: the `requireHuman` middleware at lines 104–115 has a redundant database lookup for `api` key type, but if `keyType === 'human'` (set by `requireAuth`), it simply calls `next()` trusting the prior middleware. If `requireAuth`'s keyType assignment is ever decoupled from the validation, `requireHuman` becomes bypassed.

**Impact:**

Currently no exploitation path — the null-UUID check prevents completion. However this is a design fragility: the human keyType has no validation path, only a rejection fallthrough. A future refactor adding early-returns or short-circuits before the null check could silently create an auth bypass.

**Remediation:**

Add an explicit `if (keyType === 'human')` block in `requireAuth` that immediately rejects `hu-` prefix keys with a clear error: "Raw human keys cannot be used as Bearer tokens. Exchange for an api- token via /api/auth/token." This converts an implicit rejection to an explicit, audited rejection and eliminates the fragile fallthrough dependency.

---

## Medium Issues

---

### MED-01: Import Parser Trusts Arbitrary JSON Without Schema Validation

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/components/settings/ImportExportSettings.tsx` — Lines 35–60
**Severity Score:** 5/10
**OWASP:** A08 Software and Data Integrity Failures

**Vulnerability Description:**

The import handler reads a user-supplied JSON file, parses it, and passes fields directly to `db.saveBookmark()` with no schema validation:

```typescript
const data = JSON.parse(text);
if (!Array.isArray(data)) {
  throw new Error("Invalid file format");
}
for (const bookmark of data) {
  await db.saveBookmark({
    url: bookmark.url,
    title: bookmark.title || bookmark.url,
    ...
  });
}
```

No field length limits, URL format validation, or type checking is applied. A malicious import file could inject:
- Extremely long strings (memory exhaustion)
- Non-URL strings in the `url` field that bypass browser URL validation
- Prototype pollution via `__proto__` or `constructor` fields in the JSON

**Attack Scenario:**

An attacker shares a malicious `.json` file with a ClawChives user. The user imports it. Oversized `title` fields (e.g., 10MB strings) could cause the frontend to hang. Malicious `url` values like `javascript:alert(1)` could render as clickable links in the BookmarkCard component. The `folderId` field is passed without UUID validation and could trigger foreign key constraint errors that expose internal error messages.

**Impact:**

DoS via oversized imports, potential XSS via `javascript:` URLs if BookmarkCard renders them as clickable links without validation, internal error message exposure.

**Remediation:**

Apply the same Zod `BookmarkSchemas.create` validation used in the API route to each imported bookmark. Enforce `url: z.string().url()` and `title: z.string().max(255)` at minimum. Add an overall file size limit before parsing.

---

### MED-02: `uuid` Parameter in `/api/auth/token` Allows User Enumeration

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/routes/auth.ts` — Lines 45–51
**Severity Score:** 5/10
**OWASP:** A07 Identification and Authentication Failures

**Vulnerability Description:**

The token endpoint accepts either `uuid` or `keyHash` to look up the user. When a `uuid` is provided, the server looks up the user by UUID first, then compares the keyHash. If the UUID does not exist, a 404 is returned:

```typescript
return res.status(404).json({ success: false, error: 'Identity not registered on this node' });
```

If the UUID exists but the keyHash is wrong, a 401 is returned:

```typescript
return res.status(401).json({ success: false, error: 'Invalid identity key' });
```

The different HTTP status codes for "user not found" vs "wrong key" enable user enumeration. An attacker can probe UUIDs to determine which are registered on the node.

**Impact:**

User enumeration — an attacker can confirm whether specific UUIDs are registered, which leaks account existence information.

**Remediation:**

Return 401 in both cases (not 404). Use a constant-time dummy comparison even for nonexistent users to prevent timing-based enumeration. The error message should be generic: "Invalid credentials" regardless of which check failed. The existing `suggestion` field in the 404 response additionally leaks debugging information and should be removed from production responses.

---

### MED-03: Agent Key Rate Limiter Cache Grows Unboundedly in Memory

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/middleware/rateLimiter.ts` — Lines 37–70
**Severity Score:** 5/10
**OWASP:** A04 Insecure Design

**Vulnerability Description:**

The per-agent rate limiter uses an in-memory `Map` as a cache:

```typescript
const limiterCache = new Map<string, ReturnType<typeof rateLimit>>();
```

Each unique `agentApiKey` that has a `rate_limit` set gets a new rate limiter object added to this Map. The Map is never cleaned up — entries are only added, never removed:

```typescript
if (!limiterCache.has(agentApiKey)) {
  limiterCache.set(cacheKey, rateLimit({ ... }));
}
```

A human user who creates and revokes many agent keys over time will cause the server's memory to grow monotonically. Each `rateLimit` middleware instance from `express-rate-limit` holds its own in-memory counter store.

**Attack Scenario:**

A human user with FULL permissions creates 10,000 agent keys (the API only blocks duplicate active names — a script can generate unique names). Even after revoking them, the limiterCache Map will contain 10,000 rateLimit instances, each with its own memory overhead. This is a slow memory leak / resource exhaustion attack requiring a compromised human account, but it demonstrates the design defect.

**Impact:**

Memory exhaustion over time. On constrained hardware (Raspberry Pi, Unraid with limited RAM), this could cause OOM kills.

**Remediation:**

Use an LRU cache with a bounded size for the `limiterCache`. Alternatively, use a single shared rate limiter with the agentApiKey as the `keyGenerator` discriminator rather than creating one limiter instance per key.

---

### MED-04: `DB_ENCRYPTION_KEY` Defaults to Empty String in `docker-compose.yml`

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/docker-compose.yml` — Line 15
**Severity Score:** 5/10
**OWASP:** A02 Cryptographic Failures

**Vulnerability Description:**

The default `docker-compose.yml` ships with:

```yaml
- DB_ENCRYPTION_KEY=""
```

An empty string is falsy in the db.ts check (`if (encryptionKey)`), which means encryption is never applied. This is documented via a startup warning, but the default configuration actively sets the key to an empty string — which a naive user might read as "I have set a key" rather than "encryption is off."

**Impact:**

Database files stored at `./data/db.sqlite` are unencrypted at rest. Anyone with filesystem access to the Docker volume bind mount can read all user data, credentials, agent keys, and bookmark content in plaintext.

**Remediation:**

Remove the `DB_ENCRYPTION_KEY=""` line from the default `docker-compose.yml` entirely, or replace it with a commented-out instruction. The startup warning is good but insufficient — the empty string assignment actively misleads users into thinking they've engaged encryption.

---

### MED-05: SSRF Validation in `jinaUrlSchema` Misses IPv6 Private Ranges

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/validation/schemas.ts` — Lines 20–22
**Severity Score:** 4/10
**OWASP:** A10 SSRF

**Vulnerability Description:**

The `jinaUrlSchema` SSRF validation blocks several IPv6 ranges but the coverage is incomplete:

```typescript
if (hostname.startsWith('fc') || hostname.startsWith('fd')) return false;
if (hostname.startsWith('fe80:')) return false;
```

This misses:
- `::1` is not in the list (it is explicitly blocked on line 16 but only as exact match `'::1'` — URL-encoded or bracket-wrapped forms like `[::1]` may behave differently in URL parsing depending on Node version)
- Decimal-encoded IPv4: `http://2130706433/` resolves to `127.0.0.1` — the schema only checks string-prefix patterns
- IPv4-mapped IPv6: `::ffff:127.0.0.1` or `::ffff:7f00:1`
- DNS rebinding: no validation prevents a public hostname that later resolves to a private IP at request time (validated at schema time, exploited at request time)

However, note that ClawChives does not currently make the r.jina.ai request server-side — the `jinaUrl` field is stored and the client makes the request. So the SSRF risk is frontend-side (limited) rather than server-side SSRF. This is still worth documenting as the architecture may change.

**Impact:**

Limited SSRF risk in current architecture (client-side fetch). If server-side processing of `jinaUrl` is added in future, the incomplete validation becomes a direct SSRF vector.

**Remediation:**

Add decimal IPv4 and IPv4-mapped IPv6 checks. Consider using a dedicated SSRF-prevention library rather than manual regex patterns, which are easy to get wrong.

---

### MED-06: Settings Key Parameter (`req.params.key`) Is Not Validated or Allowlisted

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/routes/settings.ts` — Lines 8–19
**Severity Score:** 4/10
**OWASP:** A01 Broken Access Control

**Vulnerability Description:**

The settings routes accept any string as the `key` parameter with no validation:

```typescript
router.get('/:key', requireAuth, requireHuman, (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ? AND user_uuid = ?').get(req.params.key, authReq.userUuid);
```

```typescript
router.put('/:key', requireAuth, requireHuman, (req, res) => {
  db.prepare('INSERT OR REPLACE INTO settings (user_uuid, key, value) VALUES (?, ?, ?)').run(authReq.userUuid, req.params.key, JSON.stringify(req.body));
```

A human user can write arbitrary keys to the settings table. While SQL injection is prevented by parameterization, this allows:
- Pollution of the settings table with arbitrary key names
- Arbitrary JSON blobs (no body size limit via schema)
- Key names that could collide with internal keys used by the application

**Impact:**

Settings table pollution, potential for a user to store large amounts of data under arbitrary keys (unbounded storage), key namespace collisions with future application keys.

**Remediation:**

Allowlist the accepted settings keys: `z.enum(['appearance', 'profile'])`. Reject any `key` parameter not in the allowlist with a 400 response. Apply a body size limit (e.g., `z.object({}).passthrough().superRefine(...)` with a serialized size check) to prevent the settings endpoint from being used as arbitrary data storage.

---

## Low Issues

---

### LOW-01: `fallbackSha256` in Client Crypto — Insecure Context Produces Weaker Hashing

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/lib/crypto.ts` — Lines 98–167
**Severity Score:** 3/10

**Description:** When `crypto.subtle` is unavailable (HTTP non-secure context), a JavaScript implementation of SHA-256 is used. This fallback is functionally correct SHA-256 but runs in a non-secure context where the key material (`hu-` token) may already be at risk from XSS or extension injection. The fallback also uses `Math.random()` for UUID generation (line 47) rather than `crypto.randomUUID()`, producing cryptographically weak UUIDs in non-secure contexts.

**Remediation:** Display a hard warning or block login entirely if `crypto.subtle` is unavailable. Do not generate identity UUIDs with `Math.random()`.

---

### LOW-02: Agent Key `api_key` Field Returned in Full via `parseAgentKey()`

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/utils/parsers.ts` — Lines 37–59
**Severity Score:** 3/10

**Description:** `parseAgentKey()` returns the full plaintext `lb-` key in API responses. This is necessary for initial creation (the user needs the key) but the `GET /api/agent-keys` and `GET /api/agent-keys/:id` endpoints return the full key on every read — not just on creation. This means every list operation exposes all active agent keys to whoever holds the human token.

**Remediation:** After creation, return only the first 8 and last 4 characters of the key (e.g., `lb-ABCDef...WXYZ`) to confirm identity without full exposure. The full key should only be returned on the creation response (201). Add a flag or separate endpoint if the full key must be re-viewed.

---

### LOW-03: Request Logger Logs Full Path Including Query Parameters

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/server.ts` — Lines 68–71
**Severity Score:** 2/10

**Description:** The request logger prints `req.path`, not `req.originalUrl`. Currently this does not include query strings, but `search` query parameters (e.g., `/api/bookmarks?search=confidential+term`) appear in the full request log. If logs are captured and stored, they leak user search terms in plaintext.

**Remediation:** Sanitize or strip sensitive query parameters from logs. Consider using `req.path` only (already done) and explicitly noting that query parameters are not logged.

---

### LOW-04: `DB_PATH` Not Validated Against Directory Traversal

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/db.ts` — Lines 9–11
**Severity Score:** 2/10

**Description:** `DATA_DIR` is taken directly from the environment variable with no validation:

```typescript
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '..', '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.sqlite');
```

`path.join` normalizes traversal sequences (`../../../etc`), so a `DATA_DIR` of `/etc` would place the database at `/etc/db.sqlite`. In the Docker context this is constrained by the container filesystem, but in bare-metal deployments this could be exploited if `DATA_DIR` is set by an untrusted source.

**Remediation:** Validate that the resolved `DATA_DIR` is an absolute path and refuse to start if it contains `..` segments or resolves outside expected directories.

---

### LOW-05: `agentKeys` Create Route Accepts Caller-Supplied `apiKey`

**File:** `/home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/server/routes/agentKeys.ts` — Line 39
**Severity Score:** 3/10

**Description:**

```typescript
api_key: req.body.apiKey ?? `lb-${generateString(64)}`,
```

A human user can supply their own `apiKey` value when creating an agent key. The `AgentKeySchemas.create` schema marks this field as `z.string().optional()` with no format validation. This allows:
- Creating keys without the `lb-` prefix (bypassing prefix-based key type detection)
- Creating keys with predictable or previously-used values
- Impersonating revoked keys by re-creating them with the same `apiKey` value

**Remediation:** Remove the `apiKey` field from the create schema entirely and always generate the key server-side. If import/restoration is needed, make it a separate, audited endpoint. At minimum, enforce `z.string().startsWith('lb-').length(66)` if the field must be accepted.

---

## Summary Table

| ID | Severity | Title | File |
|----|----------|-------|------|
| CRIT-01 | Critical (9) | SQL injection via SQLCipher pragma string interpolation | src/server/db.ts |
| CRIT-02 | Critical (8) | Broken XOR export encryption provides no confidentiality | src/lib/exportImport.ts |
| HIGH-01 | High (7) | CORS null-origin bypass in all deployment modes | src/config/corsConfig.js |
| HIGH-02 | High (7) | `jina_conversions` unique index causes data loss per user | src/server/db.ts |
| HIGH-03 | High (6) | Unauthenticated health endpoint leaks DB stats + DoS vector | server.ts |
| HIGH-04 | High (6) | `hu-` key type has no validation path — fragile auth design | src/server/middleware/auth.ts |
| MED-01 | Medium (5) | Import JSON trusted without schema validation | src/components/settings/ImportExportSettings.tsx |
| MED-02 | Medium (5) | User enumeration via different HTTP status codes in token endpoint | src/server/routes/auth.ts |
| MED-03 | Medium (5) | Agent rate limiter Map grows unboundedly (memory leak) | src/server/middleware/rateLimiter.ts |
| MED-04 | Medium (5) | `DB_ENCRYPTION_KEY=""` default silently disables encryption | docker-compose.yml |
| MED-05 | Medium (4) | Incomplete IPv6/decimal-IPv4 SSRF validation in jinaUrlSchema | src/server/validation/schemas.ts |
| MED-06 | Medium (4) | Settings key param not allowlisted — arbitrary key injection | src/server/routes/settings.ts |
| LOW-01 | Low (3) | Fallback SHA-256 + Math.random UUID in non-secure contexts | src/lib/crypto.ts |
| LOW-02 | Low (3) | Full agent `lb-` key exposed on every GET, not just creation | src/server/utils/parsers.ts |
| LOW-03 | Low (2) | Request logger captures query params (search terms) | server.ts |
| LOW-04 | Low (2) | DATA_DIR not validated against directory traversal | src/server/db.ts |
| LOW-05 | Low (3) | Caller-supplied `apiKey` accepted on agent key creation | src/server/routes/agentKeys.ts |

---

## Remediation Priority Order

**Immediate (block next release):**
1. CRIT-01 — SQLCipher pragma injection
2. CRIT-02 — Replace XOR export encryption with AES-GCM

**Before broader LAN deployment:**
3. HIGH-02 — Fix `jina_conversions` unique index (data loss)
4. HIGH-03 — Remove DB stats from health endpoint
5. MED-04 — Remove empty `DB_ENCRYPTION_KEY` from default compose
6. MED-06 — Allowlist settings keys

**Security hardening pass:**
7. HIGH-01 — CORS null-origin handling
8. HIGH-04 — Explicit hu- key rejection in requireAuth
9. MED-01 — Schema-validate imports
10. MED-02 — Normalize auth error codes
11. LOW-05 — Remove caller-supplied apiKey from create schema

**Ongoing maintenance:**
12. MED-03 — Bounded rate limiter cache
13. MED-05 — Extended SSRF IPv6 coverage
14. LOW-01 through LOW-04 — Defense-in-depth improvements

---

*Maintained by CrustAgent©™*
