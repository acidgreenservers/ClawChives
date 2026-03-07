# 🦞 ClawKeys©™ — Identity & Access Key System Specification

> *ClawKeys©™ is a sovereign, password-free identity and access key system for human-agent applications.*
> *No passwords. No accounts. The key file IS the identity.*

---

## Prompt Goal / Core Task

Implement the **ClawKeys©™** identity and access key system — a cryptographic key-file-based authentication standard for applications where humans and AI agents both need sovereign, scoped access. The system must generate prefixed alphanumeric keys, bind them to UUIDs, hash them before storage, and export human identity as a portable JSON file. No passwords, no email, no external auth providers — the key file is the credential.

---

## Key Instructions, Constraints & Steps

### 1. Key Alphabet & Entropy

All keys use a **base-62 alphabet**: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`

Generation must use a **cryptographically secure RNG** — never `Math.random()`.
- Browser: `crypto.getRandomValues(new Uint32Array(length))` with `% 62` modulo mapping
- Node.js: `crypto.randomBytes(length)` with `% 62` modulo mapping

---

### 2. Key Types & Formats

| Key Type | Prefix | Body Length | Total Length | Entropy | Scope |
|----------|--------|-------------|--------------|---------|-------|
| Human Identity | `hu-` | 64 chars | 67 chars | ~381 bits | Full human access |
| Lobster Key | `lb-` | 64 chars | 67 chars | ~381 bits | Scoped agent access |
| API Session Token | `api-` | 32 chars | 36 chars | ~190 bits | Short-lived session |

```
hu-[64 base-62 chars]    → Human identity key (never sent to server)
lb-[64 base-62 chars]    → Lobster key (never sent to server)
api-[32 base-62 chars]   → Short-lived session token (sent as Bearer token)
```

---

### 3. Identity Binding — UUID

Every human identity is bound to a **UUID v4** generated at registration time.

- UUID is generated client-side using `crypto.randomUUID()` (with fallback for HTTP contexts)
- UUID is the stable user identifier — it never changes, even if username is updated
- UUID prevents username collision attacks and username squatting across registrations
- UUID is stored server-side in the `users` table as the primary key

```
Registration → generateUUID() → UUID is the permanent user identifier
               username is a display label only, UUID is the truth
```

---

### 4. Key Hashing — Server Never Sees Plaintext Keys

**Critical invariant:** `hu-` and `lb-` keys are **NEVER sent to the server in plaintext.**

The hash flow:
```
Client: hu-key → SHA-256(hu-key) → lowercase hex string (64 chars) → POST to server
Server: stores the hash, never the plaintext
Server: verifies by hashing the submitted key and comparing with stored hash
```

SHA-256 implementation priority:
1. `crypto.subtle.digest("SHA-256", ...)` — Web Crypto API (secure contexts, browsers)
2. `crypto.createHash("sha256")` — Node.js crypto module
3. Pure-JS fallback SHA-256 — for non-secure HTTP contexts (LAN deployments)

Comparison must use **constant-time XOR comparison** to prevent timing attacks:
```javascript
// Never use ===  for token comparison
let result = 0;
for (let i = 0; i < computedHash.length; i++) {
  result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
}
return result === 0; // true only if identical
```

---

### 5. Human Identity File — `clawchives_identity_{username}.json`

After registration, the user downloads a JSON identity file. **This file IS the login credential.** If lost, the account cannot be recovered — there is no password reset.

```json
{
  "username": "lucaslobster",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token": "hu-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUv",
  "createdAt": "2026-03-07T10:30:00.000Z"
}
```

**Field rules:**
- `username` — display name chosen at registration, human-readable
- `uuid` — UUID v4, generated client-side, permanent, prevents username collisions
- `token` — the raw `hu-` key, this is the secret, never logged or stored server-side
- `createdAt` — ISO 8601 timestamp of registration

**File delivery:** Download as `clawchives_identity_{username}.json` via browser Blob URL. Never transmit via email or store in cloud.

**Validation on login:** The identity file must have all three fields present. The `token` field must start with `hu-`. Missing fields are reported as specific errors.

---

### 6. Session Token Flow

Session tokens (`api-`) are short-lived tokens issued by the server after successful key verification. They are stored in `sessionStorage` (never `localStorage`) and cleared on tab close.

```
Login flow:
  1. User uploads identity file → client reads hu- key
  2. Client: SHA-256(hu-key) → sends {uuid, keyHash} to POST /api/auth/token
  3. Server: looks up user by uuid → compares keyHash via constant-time compare
  4. Server: generates api-[32 chars] → stores in api_tokens table → returns token
  5. Client: stores api-token in sessionStorage["cc_api_token"]
  6. All subsequent requests: Authorization: Bearer {api-token}

Token expiry:
  - Default TTL: 30 minutes (configurable via TOKEN_TTL_DEFAULT env var)
  - On expiry: server returns 401, client clears session and redirects to login
  - On tab close: sessionStorage cleared, token effectively invalidated client-side
```

---

### 7. Lobster Key (lb-) Lifecycle

Lobster keys are created by humans, stored server-side, and used by AI agents or scripts for scoped API access.

```
Create:  Human generates lb-key in UI → one-time display → agent saves immediately
Store:   Server stores lb-key plaintext (encryption-at-rest planned)
Use:     Agent: SHA-256(lb-key) → POST /api/auth/token {type:"agent", keyHash}
         Server: validates → issues api-token with agent's permission set
Expire:  By date, duration (30d/60d/90d/custom), or never
Revoke:  Human marks is_active=false → server rejects all future auth attempts
```

**Permission levels (scoped access):**
```
READ   → canRead
WRITE  → canRead + canWrite
EDIT   → canRead + canWrite + canEdit
MOVE   → canRead + canWrite + canEdit + canMove
FULL   → all permissions
CUSTOM → granular per-boolean configuration
```

---

### 8. Server-Side Storage Schema

```sql
users (
  uuid        TEXT PRIMARY KEY,   -- UUID v4, client-generated
  username    TEXT UNIQUE,         -- Display name
  key_hash    TEXT NOT NULL,       -- SHA-256(hu-key), hex string
  created_at  TEXT NOT NULL        -- ISO 8601
)

api_tokens (
  key         TEXT PRIMARY KEY,    -- api-[32 chars]
  owner_uuid  TEXT NOT NULL,       -- references users.uuid
  owner_type  TEXT NOT NULL,       -- "human" | "lobster"
  expires_at  TEXT,                -- ISO 8601, null = session-only
  created_at  TEXT NOT NULL
)

lobster_keys (
  id              TEXT PRIMARY KEY, -- UUID v4
  user_uuid       TEXT NOT NULL,    -- references users.uuid (owner)
  name            TEXT NOT NULL,    -- human-readable label
  api_key         TEXT UNIQUE,      -- lb-[64 chars] plaintext
  permissions     TEXT NOT NULL,    -- JSON blob of permission flags
  expiration_type TEXT NOT NULL,    -- "never" | "date" | "duration"
  expiration_date TEXT,             -- ISO 8601, nullable
  rate_limit      INTEGER,          -- requests per minute, nullable
  is_active       INTEGER DEFAULT 1,-- 0 = revoked
  created_at      TEXT NOT NULL,
  last_used       TEXT              -- ISO 8601, nullable
)
```

---

### 9. What ClawKeys©™ Is NOT

```
❌ Not a JWT system — no base64 payloads, no algorithm fields, no JWKS
❌ Not OAuth — no redirect flows, no provider dependencies
❌ Not password-based — no bcrypt, no argon2, no password reset flows
❌ Not email-based — no account recovery, no verification emails
❌ Not biometric — no WebAuthn, no passkeys (yet)
❌ Not cloud-dependent — no Firebase, no Clerk, no Auth0
```

---

### 10. Implementation Reference (ClawChives)

The canonical implementation lives in:
- `src/lib/crypto.ts` — `generateHumanKey()`, `generateLobsterKey()`, `generateApiKey()`, `hashToken()`, `verifyToken()`, `downloadIdentityFile()`
- `server.js` — `/api/auth/register`, `/api/auth/token`, `requireAuth()` middleware

---

*🦞 ClawKeys©™ — Your key. Your identity. Your reef.*
