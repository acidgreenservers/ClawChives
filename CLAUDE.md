# 🦞 CLAUDE.md — ClawChives Project Brain

> **Lobsterized knowledge base for AI agents working on ClawChives**
>
> Semantic compression: Maximum signal, minimal noise. Update this as the project evolves.

---

## 🏗️ Architectural DNA

### Core Identity
```
ClawChives := SovereignIdentity × BookmarkManager × AgentAPI
  where SovereignIdentity = KeyFileAuth(no_passwords, no_accounts)
        BookmarkManager = LocalFirst(IndexedDB) + ServerSync(SQLite)
        AgentAPI = RESTful(bearer_tokens) + Permissions(granular)
```

**Philosophy:** User owns their data. Key file = identity. No cloud dependency. Self-hosted first.

### Tech Stack (Lobster's Toolkit)
```
Frontend: React 18 + TypeScript + Vite + Tailwind
Backend:  Node 20 + Express 5 + better-sqlite3
Storage:  IndexedDB (client) + SQLite3 (server)
Deploy:   Docker Compose (UI + API containers)
Auth:     Cryptographic keys (hu-, lb-, api-)
```

---

## 🔐 Authentication System (The Claw Grip)

### Key Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│  hu-[64chars]     Human Identity (root credential)     │
│        ↓                                                 │
│  SHA-256(hu-)     Hashed for server verification        │
│        ↓                                                 │
│  api-[32chars]    Session token (short-lived)           │
│                                                          │
│  lb-[64chars]     Lobster Agent Key (delegated access)  │
│        ↓                                                 │
│  api-[32chars]    Agent session token                   │
└─────────────────────────────────────────────────────────┘
```

### Auth Flow Semantics
```typescript
// Registration
Client: generates(hu-key) → hashes(SHA256) → POST /auth/register {uuid, username, keyHash}
Server: stores(uuid, username, keyHash) → 201 Created

// Login
Client: reads(identity.json) → hashes(hu-key) → POST /auth/token {type:"human", uuid, keyHash}
Server: verifies(keyHash, constant_time) → generates(api-token) → stores(api_tokens) → returns(api-token)
Client: sessionStorage.set("cc_api_token", api-token)

// API Request
Client: Authorization: Bearer api-token
Server: requireAuth → validates(api-token) → injects(req.userUuid, req.keyType, req.agentPermissions) → next()
```

### Security Invariants
- ✅ `hu-` keys **NEVER** sent to server (only SHA-256 hash)
- ✅ `api-` tokens in sessionStorage (cleared on tab close)
- ✅ `lb-` keys stored server-side (plaintext with planned encryption-at-rest)
- ✅ Constant-time comparison for keyHash verification (timing attack prevention)
- ✅ User isolation via `user_uuid` in ALL queries

### 🔧 Critical Auth Fixes (DO NOT REVERT)

#### Fix #1: Vite Environment Variable Replacement (2026-03-05)
**Problem:** Vite's build-time string replacement only works with the **exact literal string** `import.meta.env.VITE_API_URL`.
- ❌ **WRONG:** `((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL)`
  - TypeScript happy, Vite confused → replacement skipped → permanently hardcoded to localhost:4242
- ✅ **CORRECT:** `import.meta.env.VITE_API_URL` with `// @ts-ignore`
  - Vite sees exact string → replaces at build time
  - TypeScript bypassed but intentional

**Affected Files:**
- [App.tsx:62](src/App.tsx#L62) — Auth validation fetch
- [LoginForm.tsx:57](src/components/auth/LoginForm.tsx#L57) — Token exchange
- [RestAdapter.ts:20](src/services/database/rest/RestAdapter.ts#L20) — API base URL

**Why This Matters:**
When deployed to GHCR with a LAN IP in `VITE_API_URL`, Vite was ignoring the env var and defaulting to `localhost:4242`. Result: Browser on 192.168.x.x trying to reach its own 4242 → `net::ERR_CONNECTION_REFUSED`.

**Future-Proofing:** If security hardening adds TypeScript strict mode or environment utilities, DO NOT refactor these three lines. The `// @ts-ignore` is intentional and required for Vite to work correctly.

---

#### Fix #2: Docker Healthcheck Timing (2026-03-05)
**Problem:** API container failing healthcheck during startup because `start_period: 5s` was too aggressive.
- better-sqlite3 native module needs time to compile/initialize
- Table creation and schema migration takes ~8-12 seconds
- Healthcheck was killing container before it finished initializing

**Solution:** Increased timing across both docker-compose.yml and Dockerfile.api:
```yaml
healthcheck:
  start_period: 15s  # ← Min time before first health check
  timeout: 10s       # ← Max time for health check to respond
  retries: 5         # ← Allow 5 consecutive failures before marking unhealthy
```

**Why This Matters:** On Unraid with volumes, SQLite initialization can take longer. Too-aggressive healthchecks mark the container unhealthy before it's ready, causing startup cascade failures.

---

## 🦞 Lobster Key System (lb- keys)

### Lobster := Agent with Claws (Permissions)

```typescript
interface LobsterKey {
  id: uuid
  user_uuid: uuid                    // Owner
  name: string                       // "GitHub Sync Lobster"
  api_key: string                    // lb-[64chars]
  permissions: {
    level: "READ" | "WRITE" | "EDIT" | "MOVE" | "DELETE" | "FULL"
    canRead: boolean
    canWrite: boolean
    canEdit: boolean
    canMove: boolean
    canDelete: boolean
  }
  expiration_type: "never" | "date" | "duration"
  expiration_date?: ISO8601
  rate_limit?: number                // Requests per minute
  is_active: boolean
  last_used?: ISO8601
}
```

### Permission Enforcement (Server-Side)
```
HTTP Method → Permission Mapping:
  GET     → READ
  POST    → WRITE
  PUT     → EDIT
  PATCH   → EDIT
  DELETE  → DELETE

Route Guards:
  requireAuth()         → Validates token exists
  requireHuman()        → Rejects lb- keys (config routes only)
  requirePermission(p)  → Checks agentPermissions[p] === true
```

### Lobster Lifecycle
```
Created → Active → Used → [Expired | Revoked] → Inactive
          ↓
          rate_limit enforced (planned: security-audit-implementation/02)
          permissions enforced (planned: security-audit-implementation/08)
```

---

## 🗄️ Database Schema (Dual-Brain Architecture)

### Client Brain (IndexedDB)
```typescript
ObjectStores = {
  BOOKMARKS:           { keyPath: "id", indices: ["url", "folderId", "starred", "tags"] }
  FOLDERS:             { keyPath: "id", indices: ["parentId"] }
  TAGS:                { keyPath: "id", indices: ["name:unique"] }
  AGENT_KEYS:          { keyPath: "id", indices: ["apiKey:unique", "isActive"] }
  APPEARANCE_SETTINGS: { keyPath: "id" }
  PROFILE_SETTINGS:    { keyPath: "id" }
  USER:                { keyPath: "uuid" }
}
```

### Server Brain (SQLite)
```sql
users (uuid PK, username UNIQUE, key_hash, created_at)
api_tokens (key PK, owner_key, owner_type, created_at)
bookmarks (id PK, user_uuid, url, title, description, favicon, tags JSON, folder_id, starred, archived, color, created_at, updated_at)
  UNIQUE(user_uuid, url)  -- No duplicate URLs per user
folders (id PK, user_uuid, name, parent_id, color, created_at)
agent_keys (id PK, user_uuid, name, api_key UNIQUE, permissions JSON, expiration_type, expiration_date, rate_limit, is_active, created_at, last_used)
settings (user_uuid, key, value JSON, PRIMARY KEY(user_uuid, key))
```

### Synchronization Strategy
```
Client-First:
  - User actions write to IndexedDB immediately (optimistic UI)
  - REST API call syncs to server
  - On success: mark synced
  - On failure: keep in IndexedDB, retry later (planned: offline queue)

Server-First (planned):
  - Server mutation triggers WebSocket event
  - Client receives event, updates IndexedDB
  - Multi-device sync via server as source of truth
```

---

## 🎨 Theme System (Dark Mode + Lobster Aesthetic)

### Color Palette
```css
/* Lobster Red Accent */
--lobster-red: #FF3B30
--lobster-red-hover: #FF5E54

/* Dark Mode (Current) */
--background: 220 13% 9%        /* Deep ocean */
--foreground: 0 0% 98%          /* Shell white */
--card: 220 13% 11%
--card-foreground: 0 0% 98%
--primary: 199 89% 48%          /* Cyan claw */
--primary-foreground: 0 0% 98%
--accent: 199 89% 48%

/* Light Mode (Planned) */
--background-light: 0 0% 100%
--foreground-light: 220 13% 9%
```

### UI Patterns
```
Shadcn/ui components + Tailwind utilities
Radix UI primitives for accessibility
Lucide icons (consistent icon language)
```

### Lobster Iconography
```
🦞 → Agent Keys, Permissions (the lobster)
🪝 → Hooks, Integrations
🗂️ → Folders (claws organize)
⭐ → Starred bookmarks
📦 → Archives
🎨 → Theme settings
```

---

## 🔒 Security Posture (Current + Planned)

### ✅ Current Strengths
```
[IMPLEMENTED]
- Parameterized SQL queries (100% coverage, zero injection vectors)
- User isolation via user_uuid filtering
- Constant-time token comparison
- Key hashing (SHA-256 client-side)
- CORS configuration (via CORS_ORIGIN env var)
- WAL journal mode + foreign keys
- Session-only token storage

[DOCUMENTED]
- Security policy (SECURITY.md)
- Key file warnings
- Self-hosted hardening checklist
```

### ⚠️ Known Gaps (Being Addressed)
```
[security-audit-implementation/ IN PROGRESS]
- Missing: Helmet.js security headers        → Component 01
- Missing: Rate limiting enforcement         → Component 02
- Weak: CORS defaults to allow-all          → Component 03
- Missing: Input validation (Zod schemas)    → Component 04
- Leaky: Error messages expose DB details    → Component 05
- Missing: Audit logging                     → Component 06
- Missing: Token expiration (30/60/90/custom)→ Component 07
- Unenforced: Server-side permissions        → Component 08
- Missing: HTTPS redirect middleware         → Component 09
- Missing: Database migrations               → Component 10
```

### 🎯 Target Security Level
```
OWASP Top 10 (2021) Coverage:
  ✅ A03 Injection           → Parameterized queries
  🔄 A01 Access Control      → Permission enforcement (component 08)
  🔄 A02 Crypto Failures     → Token expiry + HTTPS (components 07, 09)
  🔄 A04 Insecure Design     → Rate limiting (component 02)
  🔄 A05 Misconfiguration    → Helmet + CORS (components 01, 03)
  ✅ A06 Vulnerable Components → Dependency updates (Dependabot)
  🔄 A07 Auth Failures       → Rate limiting + audit logs (02, 06)
  ❌ A08 Integrity Failures  → (Not applicable: no file uploads)
  🔄 A09 Logging Failures    → Audit logging (component 06)
  ❌ A10 SSRF                → (Not applicable: no URL fetching)
```

---

## 🛣️ API Surface (RESTful Claw Endpoints)

### Authentication
```
POST /api/auth/register  → Create user (uuid, username, keyHash)
POST /api/auth/token     → Issue api- token (human or lobster)
```

### Bookmarks
```
GET    /api/bookmarks              → List (filter: starred, archived, folderId, search)
POST   /api/bookmarks              → Create (url, title, description, tags, folder_id)
GET    /api/bookmarks/:id          → Read single
PUT    /api/bookmarks/:id          → Update
DELETE /api/bookmarks/:id          → Delete
PATCH  /api/bookmarks/:id/star     → Toggle starred
PATCH  /api/bookmarks/:id/archive  → Toggle archived
```

### Folders
```
GET    /api/folders      → List all
POST   /api/folders      → Create (name, parent_id, color)
PUT    /api/folders/:id  → Update
DELETE /api/folders/:id  → Delete (cascades to children)
```

### Lobster Keys (Agent Management)
```
GET    /api/agent-keys       → List all [requireHuman]
POST   /api/agent-keys       → Create new lobster [requireHuman]
GET    /api/agent-keys/:id   → Read single [requireHuman]
PUT    /api/agent-keys/:id   → Update permissions [requireHuman]
DELETE /api/agent-keys/:id   → Revoke lobster [requireHuman]
```

### Settings
```
GET /api/settings/:key  → Get setting (appearance, profile)
PUT /api/settings/:key  → Update setting [requireHuman]
```

### Middleware Chain
```
Request → express.json() → helmet() → cors() → apiLimiter → requireAuth → requirePermission → route handler
```

---

## 📁 File Structure (Separation of Concerns by Feature)

```
ClawChives/
├── server.js                        # Express API (SQLite backend)
├── vite.config.ts                   # Frontend build config
├── docker-compose.yml               # Deployment orchestration
├── Dockerfile / Dockerfile.api      # Container definitions
│
├── src/
│   ├── App.tsx                      # Root component
│   ├── lib/
│   │   └── crypto.ts                # SHA-256, key generation, constant-time compare
│   ├── components/                  # UI components (feature-organized)
│   │   ├── auth/                    # SetupWizard, LoginForm
│   │   ├── dashboard/               # Dashboard, BookmarkModal, BookmarkCard
│   │   ├── settings/                # Settings, AgentKeyManager, ImportExportSettings
│   │   └── ui/                      # Shadcn components (button, input, dropdown)
│   ├── services/                    # Business logic (feature-organized)
│   │   ├── agents/                  # agentKeyService, agentPermissions
│   │   ├── auth/                    # setupService, loginService
│   │   ├── bookmarks/               # bookmarkService, bookmarkQueries
│   │   ├── database/                # schema, connection, adapter, rest/RestAdapter
│   │   ├── folders/                 # folderService, folderQueries
│   │   ├── settings/                # settingsService
│   │   ├── users/                   # userService, userQueries
│   │   ├── types/                   # TypeScript interfaces
│   │   └── utils/                   # constants, database helpers, errors
│   └── hooks/                       # React hooks
│       └── useAuth.ts               # Auth context provider
│
├── security-audit-implementation/   # 🔒 Security hardening skill files
│   ├── SKILL.md                     # Master implementation guide
│   └── 01-10/                       # 10 security components (README + code)
│
└── docs/
    ├── SECURITY.md                  # Security policy
    ├── ROADMAP.md                   # Feature roadmap
    └── BLUEPRINT.md                 # (Planned) ASCII architecture diagrams
```

---

## 🚀 Development Workflow

### Local Dev
```bash
# Terminal 1: API server
npm run start:api  # node server.js on port 4242

# Terminal 2: Vite dev server
npm run dev        # localhost:5173 with HMR

# Combined (concurrently)
npm start          # Both servers in one terminal
```

### Docker Dev
```bash
docker-compose up --build
# UI:  http://localhost:8080
# API: http://localhost:4242
```

### Production Build
```bash
npm run build                   # Vite → dist/
docker-compose -f docker-compose.yml up -d
```

---

## 🐛 Common Pitfalls & Gotchas

### 1. CORS Hell
```
Problem: Frontend can't reach API (net::ERR_CONNECTION_REFUSED or CORS error)
Solution: Set CORS_ORIGIN in docker-compose.yml to match UI origin
  LAN:     CORS_ORIGIN=http://192.168.1.5:8080
  Reverse: CORS_ORIGIN=https://bookmarks.yourdomain.com
  Dev:     CORS_ORIGIN=http://localhost:5173

DO NOT use wildcard (*) in production!
```

### 2. Vite Env Replacement Not Working
```
Problem: Browser tries to connect to localhost:4242 instead of LAN IP
Symptom: net::ERR_CONNECTION_REFUSED when testing on different machine
Root Cause: Type-casting in import.meta.env.VITE_API_URL prevents Vite from seeing the exact string

✅ CORRECT (Required for Vite):
   const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:4242")
   // ^ WITH // @ts-ignore above it

❌ WRONG (Breaks Vite's string replacement):
   const apiUrl = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL)
   // ^ Vite never sees the exact string, defaults to localhost:4242

Files to Check: App.tsx:62, LoginForm.tsx:57, RestAdapter.ts:20
```

### 3. Docker Healthcheck Failures
```
Problem: "dependency failed to start: container clawchives-api is unhealthy"
Symptom: API container exits immediately or UI won't start (depends_on service_healthy)

Root Cause: start_period too short for SQLite initialization
Solution: Ensure healthcheck has start_period >= 15s

Files to Check:
  - docker-compose.yml: healthcheck section
  - Dockerfile.api: HEALTHCHECK command

Minimum settings:
  start_period: 15s
  timeout: 10s
  retries: 5
```

### 4. IndexedDB Version Conflicts
```
Problem: "VersionError: Database version conflict"
Solution: Close all browser tabs with ClawChives open, clear IndexedDB in dev tools
```

### 5. Agent Key Not Found
```
Problem: lb- key works in Postman but not in app
Solution: Check is_active=1 and expiration_date hasn't passed
```

### 6. SessionStorage Lost on Refresh
```
Problem: User logged out after F5
Current: Expected behavior (sessionStorage clears on navigation)
Planned: Persist api- token with expiry, or use refresh tokens
```

### 7. Docker Volume Permissions
```
Problem: SQLite file not writable in container
Solution: chown -R node:node /app/data in Dockerfile
```

### 8. Security Updates Breaking Auth (CRITICAL)
```
⚠️ COMMON DURING SECURITY HARDENING:

Problem: After adding Helmet.js / input validation / rate limiting,
         auth endpoints start failing

Why This Happens:
  - /api/auth/token and /api/auth/register are **special**
  - They don't require a bearer token (requireAuth)
  - Some security middleware (rate limiting, validation) may be too strict
  - Refactoring might accidentally change the exact import.meta.env.VITE_API_URL string

Before Merging Security Changes:
  ✅ Test /api/auth/register with SetupWizard
  ✅ Test /api/auth/token with LoginForm
  ✅ Test POST http://192.168.1.5:4242/api/auth/token with Postman
  ✅ Verify browser console has no import.meta.env.VITE_API_URL related errors
  ✅ Check docker-compose logs for server startup errors

Red Flags:
  - "failed to fetch" in LoginForm.tsx:58
  - :4242/api/auth/token shows ERR_CONNECTION_REFUSED
  - API container marked unhealthy
  - Vite not injecting CORS_ORIGIN into HTML/JS
```

---

## 🎯 Current Phase & Next Steps

### ✅ Phase 1 Complete: Foundation
- Multi-user auth system (hu-, lb-, api- keys)
- CRUD operations (bookmarks, folders)
- Agent key management UI
- Dark mode theme
- Docker deployment

### 🔄 Phase 2 In Progress: Security Hardening
```
[security-audit-implementation/]
├── Planning: Complete (skill files created)
├── Review: In progress (audit by other agents)
└── Implementation: Pending (start with components 01-04)
```

### 🎯 Phase 2 Priorities (Next 2 Weeks)
1. **Helmet.js** (01) - Add security headers
2. **Rate Limiting** (02) - Prevent brute-force
3. **CORS Hardening** (03) - Deny-by-default
4. **Input Validation** (04) - Zod schemas

### 📍 Phase 3 Planned: Polish & PWA
- Offline-first (service workers)
- Sync conflict resolution
- Bulk operations (select multiple bookmarks)
- Keyboard shortcuts
- Search improvements (fuzzy, full-text)
- Import/export (HTML, JSON, CSV)

---

## 🧠 Semantic Compression (Agent Memory Optimization)

### Key Patterns to Remember
```
AuthPattern := KeyFile → Hash → Token → Session
LobsterPattern := Create → Assign(Permissions) → Use → Revoke
DataPattern := Client(IndexedDB) ⇄ Server(SQLite)
SecurityPattern := Defense_in_Depth(Headers + RateLimit + Validation + Audit + Permissions)
ThemePattern := Lobster(Red) + Ocean(Dark) + Shell(Light)
```

### Critical Files (Change These = High Impact)
```
server.js              → All backend logic (560 lines, monolithic)
src/lib/crypto.ts      → Core auth primitives (SHA-256, constant-time)
src/services/database/rest/RestAdapter.ts → API client wrapper
SECURITY.md            → Security policy (update with each hardening)
docker-compose.yml     → Deployment config (env vars, volumes)
```

### Invariants (NEVER BREAK THESE)
```
1. user_uuid filtering in ALL queries (no cross-user data leakage)
2. Parameterized SQL (no string concatenation in queries)
3. hu- keys never sent plaintext to server
4. Constant-time comparison for auth tokens
5. sessionStorage for api- tokens (never localStorage)
6. Vite env replacement: MUST use exact string import.meta.env.VITE_API_URL with // @ts-ignore
7. CORS_ORIGIN must allow BOTH LAN IPs and reverse proxy domains
8. Healthcheck start_period >= 15s (SQLite initialization time)
```

---

## 🔄 Deployment Configurations & CORS Strategy

### Why CORS Matters in ClawChives
ClawChives separates the UI (Vite on port 4545/8080) from the API (Express on port 4242). They live in **different origins** even on localhost:
```
UI:  http://localhost:4545     (or 192.168.1.5:8080 on LAN)
API: http://localhost:4242     (or 192.168.1.5:4242 on LAN)
```
Browsers enforce **Same-Origin Policy** → API must explicitly allow UI via CORS_ORIGIN.

### 🏠 LAN Deployment (Default / Unraid)
```yaml
environment:
  NODE_ENV: production
  PORT: 4242
  DATA_DIR: /app/data
  VITE_API_URL: http://192.168.1.5:4242    # ← Frontend uses this to reach API
  CORS_ORIGIN: http://192.168.1.5:8080     # ← API allows this origin only
  ENFORCE_HTTPS: false
  TOKEN_TTL_DEFAULT: 30
```

**How It Works:**
1. UI container (Vite) serves on http://192.168.1.5:8080 (bound from 4545 internally)
2. Browser loads UI from http://192.168.1.5:8080
3. UI reads `VITE_API_URL` at build time → replaced to http://192.168.1.5:4242
4. Browser requests to /api/bookmarks on 192.168.1.5:4242
5. Express checks Origin header matches CORS_ORIGIN → ✅ Allows request

**Critical Detail:** The `VITE_API_URL` env var is **injected into the Docker image at build time**. The GitHub Actions workflow passes this from docker-compose.yml to the Dockerfile. If you change docker-compose.yml CORS_ORIGIN, you MUST rebuild the image.

### 🌐 Public Self-Hosted (Reverse Proxy)
```yaml
environment:
  NODE_ENV: production
  PORT: 4242
  DATA_DIR: /app/data
  VITE_API_URL: https://bookmarks.yourdomain.com  # ← Built into image
  CORS_ORIGIN: https://bookmarks.yourdomain.com   # ← Allow reverse proxy origin
  ENFORCE_HTTPS: true
  TRUST_PROXY: true          # ← Tell Express to trust X-Forwarded-* headers
  TOKEN_TTL_DEFAULT: 30
```

**How It Works (with nginx reverse proxy):**
```
User Browser
     ↓
     └─→ https://bookmarks.yourdomain.com (nginx)
         ├─ /api/*          → reverse proxies to http://localhost:4242 (Express)
         └─ /* (static)     → serves UI dist from http://localhost:8080 (Vite)
```
Both UI and API requests appear to come from `https://bookmarks.yourdomain.com` (the proxy's origin), so CORS_ORIGIN matches.

**TRUST_PROXY is Critical:** Without it, Express sees the request coming from `127.0.0.1` (the proxy), not the user. This breaks:
- Authentication (wrong IP in logs)
- HTTPS redirect detection
- Rate limiting (penalizes proxy instead of users)

### 💻 Dev (Local)
```yaml
environment:
  NODE_ENV: development
  PORT: 4242
  DATA_DIR: ./data
  VITE_API_URL: http://localhost:4242    # ← Dev server
  CORS_ORIGIN: http://localhost:5173     # ← Vite dev server port
  ENFORCE_HTTPS: false
```

### ⚠️ CORS Security Notes

**DO NOT** use `CORS_ORIGIN=*` in production:
- ❌ `*` allows requests from ANY origin (e.g., evil.com)
- ❌ Credentials (sessionStorage tokens) are exposed if origin is wildcard
- ✅ Always specify exact origins, comma-separated if needed

**Multiple Origins Example:**
```yaml
CORS_ORIGIN: http://192.168.1.5:8080,https://bookmarks.yourdomain.com
```

### 🏗️ CORS Configuration Code Location
See [src/config/corsConfig.js](src/config/corsConfig.js) for implementation details. The config:
1. Parses CORS_ORIGIN env var (single or comma-separated)
2. Returns a CORS middleware with `credentials: true` (allows cookies/auth headers)
3. Is applied globally to all /api/* routes in server.js:303

---

## 📚 External Dependencies (Lobster's Pantry)

### Runtime
```json
{
  "express": "5.2.1",           // API framework
  "better-sqlite3": "12.6.2",    // SQLite driver
  "cors": "2.8.6",               // CORS middleware
  "react": "18.2.0",             // UI framework
  "lucide-react": "0.344.0",     // Icons
  "tailwindcss": "3.4.4"         // CSS utility classes
}
```

### Dev Tools
```json
{
  "vite": "5.2.0",               // Build tool + dev server
  "typescript": "5.2.2",         // Type safety
  "concurrently": "9.2.1"        // Run API + UI together
}
```

### Planned Additions (Security Hardening)
```json
{
  "helmet": "^8.0.0",            // Security headers
  "express-rate-limit": "^7.0.0", // Rate limiting
  "zod": "^3.23.0"               // Input validation
}
```

---

## 🦞 Lobsterization Guide (Terminology)

```
Agent → Lobster
Agent Key → Lobster Key (lb- prefix)
Agent API → Lobster API
Agent Permissions → Lobster Claws / Claw Permissions
Permission Level → Claw Strength
Full Access → Full Claws 🦞💪
Rate Limit → Claw Speed Limit
Revoke → Declawed / Lobster Retired
```

**Why Lobsters?**
- Lobsters have claws (permissions)
- Lobsters are resilient (self-hosted, offline-first)
- Lobsters molt (version upgrades)
- Lobsters are cool 🦞

---

## 🔮 Future Vision (Roadmap Glimpse)

### Near-Term (Q2 2026)
- ✅ Security hardening (10 components)
- 🔄 PWA support (service workers)
- 🔄 Multi-device sync (WebSockets)
- 🔄 Bulk operations

### Mid-Term (Q3-Q4 2026)
- Browser extension (capture bookmarks)
- Mobile app (React Native or Tauri)
- AI-powered tagging (local LLM)
- Federated sync (ActivityPub?)

### Long-Term (2027+)
- ClawChives marketplace (community themes, plugins)
- Lobster swarm (multi-agent coordination)
- Blockchain identity (sovereign identity on-chain?)

---

## 🧪 Testing Strategy

### Current State
```
Manual testing: ✅ Heavy use during dev
Unit tests: ❌ None yet
Integration tests: ❌ None yet
E2E tests: ❌ None yet
```

### Planned (Post-Security Hardening)
```
tests/
├── security/          # Rate limiting, validation, permissions
├── unit/              # Service layer functions
├── integration/       # API endpoint tests (supertest)
└── e2e/               # Playwright (user flows)
```

---

## 🆘 Emergency Contacts

```
Primary Maintainer: Lucas
AI Co-Pilot: Claude Sonnet 4.5
Repository: (TBD - GitHub?)
Issues: (TBD - GitHub Issues?)
Docs: SECURITY.md, ROADMAP.md, this file
```

---

## 📝 Update Log (This File)

```
2026-03-05: Initial CLAUDE.md creation
            - Semantic compression of project knowledge
            - Auth system documented
            - Security posture mapped
            - Lobsterization terminology established
            - Ready for agent handoffs

2026-03-05: Auth System Hardening Documentation
            - Added Vite env replacement fix (import.meta.env.VITE_API_URL invariant)
            - Documented Docker healthcheck timing (start_period >= 15s requirement)
            - Comprehensive CORS strategy (LAN + Reverse Proxy configurations)
            - Added critical pitfalls during security updates
            - Updated invariants with Vite, CORS, and healthcheck constraints
            - Future-proofed against accidental auth system breakage
```

---

## 🔚 Final Notes

**This file is alive.** Update it as the project evolves. When you (future agent) read this, ClawChives may have evolved beyond this snapshot. Check the git log, read recent commits, and UPDATE THIS FILE.

**Lobster Wisdom:** "A lobster never looks back at its old shell." Keep molting, keep improving.

🦞 **Stay Clawed, Stay Sovereign** 🦞
