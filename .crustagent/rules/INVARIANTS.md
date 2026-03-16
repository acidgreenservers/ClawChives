---
name: Project Invariants (NEVER BREAK THESE)
description: Critical stability locks and constraints that define project integrity
type: project
---

# 🔒 Project Invariants (NEVER BREAK THESE)

These invariants are the structural guarantees of ClawChives. Breaking any of them cascades into system instability.

## 1. User Isolation

**Invariant:** `user_uuid` filtering in ALL queries.

**Why:** No cross-user data leakage. Every database query MUST include `WHERE user_uuid = ?`.

**Check:** Before merging any PR that touches `server.js`, grep for SQL queries and verify `user_uuid` filtering.

**Red Flag:** `SELECT * FROM bookmarks` without `WHERE user_uuid = ?`

---

## 2. Parameterized SQL Queries

**Invariant:** NO string concatenation in SQL queries.

**Why:** Prevents SQL injection. All user input must use `?` placeholders.

**Correct:**
```typescript
db.prepare("SELECT * FROM bookmarks WHERE user_uuid = ? AND id = ?").get(userUuid, id)
```

**Wrong:**
```typescript
db.prepare(`SELECT * FROM bookmarks WHERE user_uuid = '${userUuid}' AND id = ${id}`).get()
```

**Check:** Code review for backticks in SQL strings.

---

## 3. hu- Key Security

**Invariant:** `hu-` keys NEVER sent plaintext to server.

**Why:** Master key is secret. Only SHA-256 hash is transmitted.

**Correct Flow:**
```
Client: hu-key → SHA256() → hash → POST /auth/token {hash}
Server: receives hash, compares constant-time, returns api-token
```

**Wrong:** Sending `hu-key` in Authorization header

**Check:** Search codebase for `hu-` being sent to `/api/*` endpoints.

---

## 4. Constant-Time Comparison

**Invariant:** Auth token verification uses constant-time comparison.

**Why:** Prevents timing attacks that could leak token information.

**Correct:**
```typescript
crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(provided))
```

**Wrong:**
```typescript
stored === provided  // Vulnerable to timing attacks
```

**Check:** `src/lib/crypto.ts` implements constant-time comparison.

---

## 5. SessionStorage for API Tokens

**Invariant:** `api-` tokens live in `sessionStorage`, NOT `localStorage`.

**Why:** SessionStorage clears on browser close. localStorage persists and is vulnerable to XSS.

**Correct:**
```typescript
sessionStorage.setItem("cc_api_token", apiToken)
```

**Wrong:**
```typescript
localStorage.setItem("cc_api_token", apiToken)
```

**Check:** Search frontend code for `localStorage` references.

---

## 6. Vite Environment Variable Replacement

**Invariant:** MUST use exact string `import.meta.env.VITE_API_URL` with `// @ts-ignore`.

**Why:** Vite's build-time string replacement only works with the exact literal string. Type-casting breaks it.

**Correct:**
```typescript
// @ts-ignore
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4646"
```

**Wrong:**
```typescript
const apiUrl = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL)
// ^ Vite never sees this, defaults to localhost:4646
```

**Critical Files:**
- [App.tsx:62](src/App.tsx#L62)
- [LoginForm.tsx:57](src/components/auth/LoginForm.tsx#L57)
- [RestAdapter.ts:20](src/services/database/rest/RestAdapter.ts#L20)

**Check:** Before security hardening PRs, grep for type-casted import.meta.env.

---

## 7. CORS Philosophy

**Invariant:** CORS is intentionally open (allow-all) for LAN deployments.

**Why:** ClawChives is self-hosted. Users access from arbitrary LAN IPs. Restricting CORS breaks the app.

**Correct:** Document opt-in CORS_ORIGIN restriction for reverse-proxy setups.

**Wrong:** Adding default CORS_ORIGIN that breaks LAN access.

**Check:** docker-compose.yml CORS_ORIGIN should be user-configurable, not hardcoded.

---

## 8. Docker Healthcheck Timing

**Invariant:** `start_period >= 15s` for SQLite initialization.

**Why:** better-sqlite3 native module + SQLite schema migration takes 8-12 seconds.

**Correct:**
```yaml
healthcheck:
  start_period: 15s
  timeout: 10s
  retries: 5
```

**Wrong:**
```yaml
healthcheck:
  start_period: 5s  # Too aggressive, kills container during init
```

**Check:** docker-compose.yml and Dockerfile healthcheck blocks.

---

## 9. Jina Content Exposure to Agents

**Invariant:** `jinaUrl`/`jina_content` IS exposed to agent keys on GET /api/bookmarks.

**Why:** Agents legitimately need r.jina.ai content for automated processing (research, summarization, indexing).

**Constraint:** Only WRITE operations (POST/PUT jinaUrl) are blocked for agents via `requireHuman`.

**Wrong:** Stripping jina fields from GET responses to agents.

**Check:** Before filtering bookmarks response, verify GET is agent-accessible but POST/PUT jinaUrl blocks agents.

---

## 10. Dockerfile Build Strategy

**Invariant:** Dockerfile must NOT copy entire directory (`COPY . .`).

**Why:** Prevents stale `dist/` folder (with hardcoded localhost) from being included.

**Correct:**
```dockerfile
COPY index.html vite.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build  # ← Fresh build every time
```

**Wrong:**
```dockerfile
COPY . .  # ← Includes stale dist/
```

**Check:** Dockerfile before any deployment changes.

---

## 11. API URL Centralization

**Invariant:** All API URL resolution must go through `getApiBaseUrl()` from `src/config/apiConfig.ts`.

**Why:** Single source of truth. Prevents hardcoded `localhost:4646` scattered across codebase.

**Correct:**
```typescript
import { getApiBaseUrl } from "@/config/apiConfig"
const API = getApiBaseUrl() + "/api/bookmarks"
```

**Wrong:**
```typescript
const API = "http://192.168.1.5:4646/api/bookmarks"  // ← Hardcoded
```

**Check:** Code review for hardcoded API URLs in components/services.

---

## 12. .env File Strategy

**Invariant:** `.env` files are NOT committed. Users must create `.env` with their LAN IP.

**Why:** Each deployment has different IP. `.env.example` is template; `.env` is local.

**Correct:**
```bash
cat .env.example > .env
# User edits: VITE_API_URL=http://192.168.1.6:4646
```

**Wrong:**
```bash
git add .env  # ← NEVER commit
```

**Check:** .gitignore includes `.env`.

---

## 13. Relational Jina Storage

**Invariant:** Jina URLs are decoupled into `jina_conversions` table for clean identity separation.

**Why:** Separates r.jina.ai processing from core bookmark data. Easier to manage, audit, and cache independently.

**Check:** Any jina-related features should use `jina_conversions` table, not add columns to `bookmarks`.

---

## 14. Modulo Bias Guard

**Invariant:** Use unbiased character selection (no raw `byte % 62`) for entropy in key generation.

**Why:** Prevents modulo bias in random key generation (some characters are statistically more likely).

**Correct:** Use cryptographic randomness with unbiased selection algorithm.

**Check:** Any key generation code in `src/lib/crypto.ts`.

---

## 15. requireHuman Lock

**Invariant:** Settings and key generation locked to master identity (`requireHuman`).

**Why:** Agents (lb- keys) cannot modify core user settings or generate new agent keys.

**Check:** API routes for `/api/settings`, `/api/agent-keys` POST/PUT/DELETE all use `requireHuman` middleware.

---

## 16. Docker Build Dependencies

**Invariant:** Dockerfile MUST use `RUN npm install` (NOT `--omit=dev`).

**Why:** Dev dependencies like `tsx` are needed at runtime to execute `npx tsx server.ts`.

**Correct:**
```dockerfile
RUN npm install  # Keeps tsx, vite, and other dev deps
CMD ["npx", "tsx", "server.ts"]
```

**Wrong:**
```dockerfile
RUN npm install --omit=dev  # Removes tsx, breaks CMD
```

**Consequence:** Container fails with `su-exec: tsx: No such file or directory`

**Check:** Dockerfile line 37 before any changes to npm install command.

---

## 17. Docker Entrypoint Simplicity

**Invariant:** Entrypoint must NOT add extra command logic (like npx). Just handle privilege dropping.

**Why:** CMD already specifies the full command. Entrypoint should only do:
1. User/group setup (PUID/PGID support)
2. Directory permission fixes
3. Privilege drop via `su-exec`

**Correct:**
```bash
if [ "$(id -u)" = "0" ]; then
    exec su-exec node "$@"  # Pass through "$@" unchanged
else
    exec "$@"
fi
```

**Wrong:**
```bash
exec su-exec node npx "$@"  # Adds npx, creates: npx npx tsx server.ts
```

**Consequence:** Duplicate command invocation breaks execution.

**Check:** docker-entrypoint.sh lines 35-40. Should be pass-through only.

---

**Maintained by CrustAgent©™**

Last Updated: 2026-03-16
