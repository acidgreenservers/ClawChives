---
name: Critical Files & Change Impact Assessment
description: Files that have high impact when modified, their responsibilities, and stability locks
type: project
---

# 🎯 Critical Files & Change Impact Assessment

These files define core project behavior. Changes here cascade through the system.

## Tier 1 (Core Architecture — Change = Redesign)

### `server.js`
**Responsibility:** All backend logic (monolithic).

**Impact:** Any change affects auth, bookmarks, agents, settings, database access.

**Before Editing:**
- Understand entire routing structure
- Run all tests: `npm test`
- Test auth flows: `/api/auth/register`, `/api/auth/token`
- Test CRUD: `/api/bookmarks`, `/api/agent-keys`
- Check Docker healthcheck still passes

**Stability Locks:**
- User isolation via `user_uuid` in ALL queries
- Parameterized SQL (no string concatenation)
- `requireAuth`, `requireHuman`, `requirePermission` middleware chain
- CORS configuration via env var
- Constant-time token comparison

**Red Flags:**
- SQL queries without `WHERE user_uuid = ?`
- String concatenation in queries
- Changes to auth endpoints without testing setup/login flows

---

### `src/config/apiConfig.ts`
**Responsibility:** API URL resolution (centralized source of truth).

**Impact:** Change here affects ALL frontend-to-backend communication.

**Before Editing:**
- Test priority chain:
  1. Explicit VITE_API_URL (custom domains)
  2. Production relative paths (Docker, LAN)
  3. Dev fallback (localhost:4646)
- Verify in multiple deployment scenarios:
  - `npm run scuttle:dev-start` (localhost)
  - Docker with VITE_API_URL
  - npm prod with .env

**Stability Locks:**
- Three-tier priority: explicit > prod > dev
- Never hardcode URLs in individual components
- Vite uses exact string `import.meta.env.VITE_API_URL` with `// @ts-ignore`

**Red Flags:**
- Adding new logic that duplicates URL resolution elsewhere
- Refactoring the import.meta.env line (breaks Vite)
- Hardcoding fallbacks instead of using env vars

---

## Tier 2 (Security & Auth — Change = Security Risk)

### `src/lib/crypto.ts`
**Responsibility:** Core auth primitives (SHA-256, constant-time compare, key generation).

**Impact:** Auth system integrity depends on this.

**Before Editing:**
- Never modify constant-time comparison without cryptography review
- Test key generation bias: run key gen 10,000 times, verify entropy
- Verify SHA-256 hashing is consistent

**Stability Locks:**
- Constant-time comparison for all token/hash verification
- Unbiased key generation (no modulo bias)
- SHA-256 for key hashing

**Red Flags:**
- Simple `===` comparison instead of `timingSafeEqual`
- Using `Math.random()` for key generation
- Changes to hashing algorithm without migration plan

---

### `src/services/database/rest/RestAdapter.ts`
**Responsibility:** API client wrapper (stability lock for all network requests).

**Impact:** All frontend API calls flow through this. Bad changes break the entire UI.

**Before Editing:**
- Test all CRUD operations still work
- Verify error handling (404, 401, 500)
- Check auth header injection
- Test with both hu- and lb- keys

**Stability Locks:**
- Uses `getApiBaseUrl()` for all requests
- Bearer token injection via `Authorization` header
- Handles user_uuid context from sessionStorage

**Red Flags:**
- Hardcoding API URLs instead of using `getApiBaseUrl()`
- Removing user isolation checks
- Changing auth header format

---

### `src/services/agents/agentKeyService.ts`
**Responsibility:** Lobster key CRUD (agent management UI + API integration).

**Impact:** Agent key creation, permissions, revocation all depend on this.

**Before Editing:**
- Test lobster key creation with various permissions
- Verify permission enforcement (READ, WRITE, EDIT, DELETE, FULL)
- Test key revocation
- Test expiration logic

**Stability Locks:**
- Granular permission model (6 levels)
- User isolation via `user_uuid`
- Human-only creation (requireHuman)

**Red Flags:**
- Removing permission checks
- Adding new key types without understanding permission model
- Hardcoding default permissions

---

## Tier 3 (Deployment & Docker — Change = Deployment Failure)

### `Dockerfile`
**Responsibility:** Container build config (API + UI compilation).

**Impact:** Any Docker deployment depends on this. Bad builds = white screen, 404 errors.

**Before Editing:**
- Build and test locally: `docker build -t test .`
- Verify dist/ rebuilds fresh (grep for hardcoded localhost)
- Test all deployment scenarios (localhost, LAN, custom domain)

**Stability Locks:**
- Copy only source files needed for build (NO `COPY . .`)
- Always rebuild `dist/` fresh from source
- healthcheck start_period >= 15s for SQLite init
- **Line 37:** `RUN npm install` (NOT `--omit=dev`) — keeps tsx at runtime
- **Line 64:** `CMD ["npx", "tsx", "server.ts"]` — uses npx to locate tsx

**Red Flags:**
- `COPY . .` (copies stale dist/)
- `RUN npm install --omit=dev` (removes tsx, breaks container startup)
- `CMD ["tsx", "server.ts"]` (tsx won't be found without npx)
- Removing `npm run build`
- Reducing healthcheck timing
- Healthcheck error: `su-exec: tsx: No such file or directory` = missing dev dependencies or wrong CMD

---

### `docker-entrypoint.sh`
**Responsibility:** Container initialization (user setup, privilege dropping, dir permissions).

**Impact:** Entrypoint controls whether container boots successfully.

**Before Editing:**
- Test privilege dropping: run container as root, verify process drops to node user
- Test PUID/PGID support: test custom host user mapping
- Test data directory permissions
- Verify entrypoint just passes through CMD without adding extra commands

**Stability Locks:**
- Lines 35-40: Simple pass-through logic only (`exec su-exec node "$@"`)
- NO command injection or duplication (e.g., don't add npx)
- User/group setup respects PUID/PGID env vars
- Directory permission fixes before privilege drop

**Red Flags:**
- Adding extra command logic (like `npx`) that duplicates CMD
- Hardcoded paths instead of relying on PATH
- Privilege drop fails (process doesn't switch to node user)
- Error: `su-exec: tsx: No such file or directory` = check Dockerfile CMD uses npx

---

### `docker-compose.yml`
**Responsibility:** Deployment orchestration (env vars, volumes, network config).

**Impact:** User's entire deployment depends on this. Wrong env vars = broken API connectivity.

**Before Editing:**
- Document why each env var changed
- Test with real LAN IP (not localhost)
- Verify VITE_API_URL and CORS_ORIGIN match
- Check volume mounts for SQLite persistence

**Stability Locks:**
- VITE_API_URL set at build time
- CORS_ORIGIN configurable per deployment
- healthcheck with start_period >= 15s
- Data volume mounted to /app/data

**Red Flags:**
- Hardcoding LAN IPs or domains
- Changing CORS to wildcard (*)
- Removing volume mounts
- Reducing healthcheck timing

---

### `vite.config.ts`
**Responsibility:** Frontend build config (React compilation, dev server, preview).

**Impact:** UI build and dev server depend on this. Bad config = broken hot reload or build errors.

**Before Editing:**
- Test dev server: `npm run dev`
- Test production build: `npm run build`
- Test preview: `npm run preview`

**Stability Locks:**
- UI dev server binds to 0.0.0.0 on port 4545 (LAN-accessible)
- Preview server (production preview) binds to 0.0.0.0 on port 4545
- API base URL resolved via `getApiBaseUrl()`

**Red Flags:**
- Changing ports without updating npm scripts
- Changing host binding from 0.0.0.0 back to localhost
- Touching the `import.meta.env` replacement logic

---

## Tier 4 (Feature-Critical — Change = Feature Regression)

### `src/services/database/rest/RestAdapter.ts` (GET/POST/PUT/DELETE methods)
**Responsibility:** REST CRUD operations for bookmarks, folders, agents.

**Before Editing:**
- Test all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Verify response status codes
- Check error handling

---

### `.crustagent/vibecheck/truthpack/` (All contracts)
**Responsibility:** Project truth validation and stability locks.

**Before Editing:**
- Update when API contracts change
- Update when auth system changes
- Update when security invariants change
- Run `npm run vibecheck` to validate against truthpack

---

## Tier 5 (Documentation — Change = Knowledge Loss)

### `CRUSTAGENT.md` (this directory)
**Responsibility:** Root-level operational directive and file map.

**Before Editing:**
- Keep operational intel (scripts, ports, gotchas)
- Maintain file map to .crustagent/ knowledge
- Preserve stability lock references
- Link to src/CRUSTAGENT.md for source-level patterns

**Stability Locks:**
- Three concentric rings: Core (Identity) → Shell (Security) → Carapace (UI)
- Tech stack: React 18, Express 5, SQLite, Docker
- Key hierarchy: hu-, lb-, api-
- Scuttle scripts: dev-start, prod-start, reset-dev, prod-stop

---

### `SECURITY.md`
**Responsibility:** Security policy and vulnerability reporting.

**Before Editing:**
- Update when new security features added
- Add new OWASP coverage improvements
- Document security incident process

---

## Impact Assessment Matrix

| File | Change Impact | Test Scope | Review Required |
|------|----------------|-----------|-----------------|
| server.js | Critical | Full suite + manual | Security + API |
| apiConfig.ts | Critical | All dev/prod builds | Vite build expert |
| crypto.ts | Critical | Cryptography review | Security + crypto |
| RestAdapter.ts | High | All CRUD + auth | API + frontend |
| agentKeyService.ts | High | Agent key flows | Auth + agent system |
| Dockerfile | High | Docker build + test | DevOps + deployment |
| docker-compose.yml | High | Real deployment test | DevOps + LAN setup |
| vite.config.ts | High | Build + dev + preview | Build system |
| README.md | Medium | Documentation review | Technical writing |
| CRUSTAGENT.md | Medium | Truthpack validation | Project governance |

---

**Maintained by CrustAgent©™**

Last Updated: 2026-03-16
