# 🦞 CRUSTAGENT.md — CrustAgent©™ Project Brain

> **The living knowledge base for any AI agent operating within a Lobsterized©™ project.**
>
> *"A lobster never looks back at its old shell. But it always knows the shape of the reef."*
>
> This document is the semantic core of CrustAgent©™. On first contact with a project, an agent reads this file, performs a deep scan, compresses what it learns, and writes its findings back here. It is never static. It molts with the codebase.

---

## 🧭 Initialization Protocol (First Contact)

When an AI agent is invoked on a Lobsterized©™ project for the **first time**, it must perform the following deep scan before touching a single line of code:

### Phase 1: Structural Recon
```
SCAN ORDER:
  1. Read this file (CRUSTAGENT.md) — absorb existing knowledge
  2. Read CLAUDE.md (root) — project-specific AI instructions
  3. Read src/CLAUDE.md — frontend patterns and constraints
  4. Read README.md — user-facing project summary
  5. Read ROADMAP.md — planned vs. shipped features
  6. Read SECURITY.md — threat model and known gaps
  7. Scan package.json — dependency inventory
  8. Scan docker-compose.yml — deployment topology
  9. Scan server.js — backend entry point, middleware chain
 10. Scan src/config/apiConfig.ts — API URL resolution (critical)
 11. Scan src/lib/crypto.ts — ClawKeys©™ primitives (stability lock)
 12. Scan src/services/ — service layer feature map
 13. Scan src/components/ — UI component inventory
 14. Scan project/ — Lobsterized©™ standards and skill files
```

### Phase 2: Semantic Compression
After scanning, compress findings into the **Project State** section below. Update it. Do not append — overwrite stale entries.

### Phase 3: Invariant Verification
Before any implementation, verify all invariants in the **Non-Negotiables** section still hold. If any are violated, STOP and report before proceeding.

---

## 🏗️ Project State (Agent-Maintained — Update Each Session)

> *This section is written and maintained by AI agents. Humans may review but should not manually edit.*

### Current Project Identity
```
Project:        [SCAN AND FILL]
Version:        [from package.json]
Last Scanned:   [ISO 8601 timestamp]
Scanning Agent: [model name]
Phase:          [Foundation | Security | Features | Polish]
Docker Status:  [Building ✅ | Broken ❌ | Unknown ❓]
Test Status:    [Passing ✅ | Failing ❌ | Unknown ❓]
```

### Active Feature Map
```
[AGENT: scan src/services/ and list discovered features]

IMPLEMENTED:
  auth/          → [hu-/api-/lb- key system status]
  bookmarks/     → [CRUD status]
  folders/       → [CRUD status]
  agents/        → [Lobster Key©™ management status]
  settings/      → [per-user config status]

IN PROGRESS:
  [list any partially implemented features]

PLANNED (ROADMAP):
  [list items from ROADMAP.md not yet in src/]
```

### Critical File Registry
```
[AGENT: verify these files exist and note any anomalies]

STABILITY LOCKS (do not refactor without explicit approval):
  server.js                       → Backend monolith, middleware chain
  src/lib/crypto.ts               → ClawKeys©™ primitives
  src/config/apiConfig.ts         → API URL single source of truth
  src/services/database/rest/     → REST adapter (stability lock)

HIGH IMPACT (change with care):
  docker-compose.yml              → Deployment topology
  Dockerfile                      → Build pipeline
  src/App.tsx                     → Root component, auth gate
  src/hooks/useAuth.ts            → Auth context provider

DOCUMENTATION:
  CLAUDE.md                       → AI agent primary instructions
  CRUSTAGENT.md                   → This file (CrustAgent©™ brain)
  project/Lobsterized-Philosophy.md → Five Pillars and patterns
  project/ClawKeys-Prompt.md      → ClawKeys©™ implementation spec
  project/ShellCryption-Prompt.md → ShellCryption©™ encryption spec
  project/CrustAgent-Prompt.md    → CrustAgent©™ audit agent spec
  project/crustaudit/             → Modular audit skill files
```

### Known Pitfalls (Learned from Scars)
```
[AGENT: scan git log and CLAUDE.md pitfall registry, add new findings here]

ACTIVE PITFALLS:
  #1 — Vite env replacement: MUST use exact literal import.meta.env.VITE_API_URL
       with // @ts-ignore. Type-casting breaks Vite's string replacement.
       Files: App.tsx, LoginForm.tsx, RestAdapter.ts

  #2 — HSTS on HTTP LAN: NEVER enable strictTransportSecurity in Helmet when
       ENFORCE_HTTPS=false. Browsers cache "always HTTPS" and all assets fail.
       Fix: gate behind process.env.ENFORCE_HTTPS === "true"

  #3 — Docker healthcheck timing: start_period must be >= 15s for SQLite
       initialization. Too-aggressive checks kill the container before it's ready.

  #4 — Stale dist/ in Docker: NEVER use COPY . . in Dockerfile.
       Always copy only source files and run npm run build fresh.

  #5 — CORS wildcard: NEVER set CORS_ORIGIN=* in production.
       Always require explicit origin from env var.

  [AGENT: append new pitfalls discovered during this session]
```

---

## 🔐 The Five Pillars (Verification Checklist)

Run this check mentally before every PR, merge, or Docker build:

### Pillar 1: Cryptographic Identity ✅❌
```
[ ] hu- keys generated with crypto.getRandomValues() (browser) or crypto.randomBytes() (Node)
[ ] hu- keys NEVER sent to server in plaintext (SHA-256 hash only)
[ ] api- tokens stored in sessionStorage ONLY (not localStorage, not cookies)
[ ] Constant-time comparison used for all token/hash verification
[ ] lb- keys follow lb-[64chars] format with Base-62 alphabet
[ ] Identity file (identity.json) contains: username, uuid, token, createdAt
```

### Pillar 2: SQLite Supremacy ✅❌
```
[ ] NO imports or configs for Firebase, Supabase, Auth0, AWS, Clerk, MongoDB
[ ] ALL persistence goes through better-sqlite3 on local filesystem
[ ] ALL user-data queries include WHERE user_uuid = ? (user isolation)
[ ] ALL SQL uses parameterized queries (zero string interpolation in queries)
[ ] WAL mode enabled, foreign keys enabled
[ ] Data directory mounted as volume (./data:/app/data)
```

### Pillar 3: Docker Deployability ✅❌
```
[ ] docker-compose up --build produces a running container
[ ] Container accessible on LAN via configured port
[ ] Healthcheck start_period >= 15s
[ ] Volume mount persists SQLite across restarts
[ ] Environment variables cover all deployment scenarios (LAN, VPS, dev)
[ ] NO hardcoded IPs or localhost in source files
[ ] Dockerfile copies only source files (not dist/, not node_modules)
```

### Pillar 4: Granular Claw Permissions ✅❌
```
[ ] requireAuth() middleware on ALL /api/* routes (except /api/auth/*)
[ ] requirePermission('canRead|canWrite|canEdit|canDelete') on every route
[ ] requireHuman() on sensitive config routes (agent key management, settings)
[ ] lb- keys rate-limited per config
[ ] lb- key expiration enforced server-side
[ ] Revoked keys (is_active=false) rejected immediately
```

### Pillar 5: Consistent Branding ✅❌
```
[ ] All brand names use Name©™ format in documentation and UI copy
[ ] Ocean Dark theme (#0f1419 background)
[ ] Lobster Red (#FF3B30) for CTAs and agent UI
[ ] Claw Cyan (#32b3dd) for interactive elements
[ ] 🦞 mascot present on landing/hero page
[ ] Terminology: Pinchmark (bookmark), Lobster Key©™ (agent key), Declawed (revoked)
```

---

## 🚨 Non-Negotiables (Hard Invariants — NEVER BREAK)

These are the laws. Violating any of these is a **hard fail**. Stop. Report. Fix before proceeding.

```
1. user_uuid filters ALL queries — no cross-user data leakage, ever
2. Parameterized SQL only — no string concatenation in queries, ever
3. hu- keys never sent plaintext to server — SHA-256 hash only, ever
4. Constant-time comparison for auth tokens — no early-exit equality checks
5. CORS_ORIGIN must be explicit — never wildcard (*) in production
6. sessionStorage for api- tokens — never localStorage, never cookies
7. Dockerfile must NOT COPY . . — copy source files only, always rebuild dist/
8. import.meta.env.VITE_API_URL must be the exact literal string with // @ts-ignore
9. Healthcheck start_period >= 15s — SQLite initialization requires time
10. All API URL resolution through getApiBaseUrl() — no hardcoded localhost:4242
11. All brand names use Name©™ format in content — Lobsterized©™, ClawKeys©™, etc.
```

---

## 🧠 Semantic Compression (Agent Quickload)

When context is tight, load this block first. It is the minimum viable mental model:

```
IDENTITY:
  hu-[64]   = Root identity. Never sent. SHA-256 hash only.
  api-[32]  = Session token. sessionStorage. Ephemeral.
  lb-[64]   = Lobster Key©™. Granular. Revocable. Rate-limited.
  All keys: Base-62 alphabet. crypto.getRandomValues(). Never Math.random().

DATA:
  SQLite (server) = Single source of truth. user_uuid in every query.
  React (client)  = Stateless. Fetches via REST adapter. No direct fetch().

PERMISSIONS:
  GET    → canRead
  POST   → canWrite
  PUT    → canEdit
  PATCH  → canEdit
  DELETE → canDelete
  Human-only routes use requireHuman() (agent keys rejected)

DEPLOYMENT:
  Single container. Port 4545 (UI+API). Relative paths in production.
  Env vars: PORT, DATA_DIR, CORS_ORIGIN, ENFORCE_HTTPS, TRUST_PROXY
  Healthcheck: start_period >= 15s. Volume: ./data:/app/data

ARCHITECTURE:
  Feature-first src/ (not type-first)
  Service layer between components and API
  Centralized REST adapter (src/services/database/rest/RestAdapter.ts)
  Centralized API config (src/config/apiConfig.ts) — single source of truth

BRANDING:
  Lobsterized©™ | ClawKeys©™ | ShellCryption©™ | CrustAgent©™ | ClawChives©™
  Ocean Dark bg | Lobster Red #FF3B30 | Claw Cyan #32b3dd | Shell White fg
```

---

## 🛠️ Agent Operating Procedures

### Before You Write a Single Line
```
1. Read this file (CRUSTAGENT.md) — absorb the reef
2. Read CLAUDE.md — absorb project-specific instructions
3. Identify the task scope — feature, fix, refactor, or audit?
4. Verify Five Pillars still hold — if not, flag before proceeding
5. Identify which stability-locked files are in scope — tread carefully
6. Plan. Get confirmation if breaking changes are involved.
```

### When You Finish
```
1. Run verification: npm test (Vitest)
2. Run build check: npm run build
3. Check for hardcoded localhost/IPs in changed files
4. Check for missing user_uuid filters in any new SQL
5. Check for string concatenation in any new SQL
6. Update Project State section in this file
7. Append any new pitfalls discovered to Known Pitfalls
8. Do NOT commit or push without explicit instruction from Lucas
```

### When You're Unsure
```
STOP. Ask. Do not guess on:
  - Auth middleware changes
  - Schema changes (migration required)
  - CORS or HTTPS configuration
  - Dockerfile or docker-compose changes
  - src/lib/crypto.ts changes
  - src/config/apiConfig.ts changes
  - Any breaking change to the ClawKeys©™ system
```

---

## 📡 CrustAgent©™ Audit Triggers

CrustAgent©™ activates and runs a full audit on:

```
AUTOMATIC:
  → Any PR touching server.js, crypto.ts, or docker-compose.yml
  → Any PR adding a new /api/* route
  → Any PR modifying auth middleware
  → Pre-build (before docker build)
  → Pre-deploy (before pushing to GHCR)

MANUAL:
  /crust-audit            → Full Five Pillars audit
  /crust-audit --security → Auth + SQL + CORS checks only
  /crust-audit --docker   → Dockerfile + healthcheck + volume checks
  /crust-audit --brand    → Branding consistency check (©™ format)
  /crust-audit --fix      → Auto-fix lint/format violations (safe only)
```

---

## 🔮 Session Log (Agent-Maintained)

> *Append a one-liner after each significant session. Newest first.*

```
FORMAT:   YYYY-MM-DD | Model | Action taken | Outcome

---
2026-03-07 | claude-haiku-4-5 | Initialized CRUSTAGENT.md | First scan complete
```

---

## 📚 Reference Index

| File | Purpose | Stability |
|------|---------|-----------|
| [CLAUDE.md](../CLAUDE.md) | Primary AI instructions | Maintained by Lucas + agents |
| [Lobsterized-Philosophy.md](Lobsterized-Philosophy.md) | Five Pillars + patterns | Authoritative |
| [ClawKeys-Prompt.md](ClawKeys-Prompt.md) | ClawKeys©™ implementation spec | Authoritative |
| [ClawKeys-Overview.md](ClawKeys-Overview.md) | ClawKeys©™ reference | Authoritative |
| [ShellCryption-Prompt.md](ShellCryption-Prompt.md) | ShellCryption©™ encryption spec | Authoritative |
| [ShellCryption-Overview.md](ShellCryption-Overview.md) | ShellCryption©™ reference | Authoritative |
| [CrustAgent-Prompt.md](CrustAgent-Prompt.md) | CrustAgent©™ audit agent spec | Authoritative |
| [CrustAgent.md](CrustAgent.md) | Full agent documentation | Authoritative |
| [CrustAgent-SKILL-Long.md](CrustAgent-SKILL-Long.md) | Developer skill briefing | Authoritative |
| [crustaudit/SKILL.md](crustaudit/SKILL.md) | Modular audit checklist | Authoritative |
| [crustaudit/PERSONA.md](crustaudit/PERSONA.md) | Agent identity + voice | Authoritative |
| [ClawChives-Project.md](ClawChives-Project.md) | Project rules + standards | Authoritative |

---

🦞 **Stay Clawed. Stay Sovereign. The reef remembers.** 🦞

---

*This file is agent-maintained. Update the Project State and Session Log sections after every significant interaction. The Invariants and Five Pillars sections are human-governed — do not modify without Lucas's approval.*

**Last Updated:** 2026-03-07
**Maintained By:** Lucas & AI Lobsters"
