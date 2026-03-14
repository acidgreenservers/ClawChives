--- FILE: project-overview.md ---

# ClawChives©™ — Sovereign Pinchmark Library

## Executive Summary
ClawChives©™ is a sovereign pinchmark (bookmark) manager designed for humans and their AI agents. It operates as a self-hosted personal web intelligence layer where users authenticate via cryptographic identity files rather than passwords. The system empowers users to curate the web while enabling AI agents—known as "Lobsters"—to process and enrich data via scoped API keys (`lb-` keys). The platform is built to be entirely offline-capable, privacy-first, and immune to vendor lock-in.

## Project Vision
ClawChives©™ envisions a digital ecosystem that serves as the "reef" where your AI agents live and work, with you as the Sovereign. By eliminating cloud dependencies, external authentication providers, and complex setups, ClawChives©™ ensures that your data remains entirely yours. It bridges the gap between human curation and AI automation in a secure, local environment.

## Core Goals & Objectives
*   **Sovereignty:** Deliver a privacy-first manager with zero cloud dependency (no S3, no Auth0, no Firebase).
*   **Authentication:** Implement cryptographic key file authentication (`hu-` keys) where the identity file is the login.
*   **Agent Integration:** Enable scoped, automated API access for AI agents using Lobster keys (`lb-` keys) to read, write, or manage bookmarks.
*   **Measurable Objective:** A single Docker container (`docker-compose up -d`) that produces a fully working, LAN-accessible bookmark manager with agent API access—no external services, no signups, no data leakage.

--- FILE: development-standards.md ---

# Project Standards & Consistency

## Team Roles & Responsibilities
*   **Lucas (Owner / Sovereign):**
    *   Product decisions, direction, and definition of "done".
    *   Architecture approval and final say on all merges/deployments.
*   **Claude (AI Co-Pilot / Implementation Agent):**
    *   Code implementation per approved plans.
    *   Bug diagnosis, fixes, and documentation maintenance (`CRUSTAGENT.md` for CrustAgent©™ audits).
    *   **Rule:** Never commits or pushes without explicit instruction. Always plans before implementing.

*   **Jules (Autonomous Background Agent — Google Jules):**
    *   Documentation home: `.jules/` directory in repo root.
    *   Operates async on GitHub — reads the repo, opens a PR, cannot ask questions mid-task.

    ✅ **APPROVED TASK TYPES** (safe to queue without pre-approval):
    *   Dependency updates — `npm audit fix`, package version bumps, security patches
    *   Test gap filling — "write Vitest tests for `src/lib/X.ts`" (bounded, verifiable)
    *   Boilerplate API routes — new endpoint that exactly mirrors an existing route pattern
    *   Lint / format fixes — ESLint rule violations, TypeScript `noUnused*` violations
    *   Documentation sync — keep `README`, `ROADMAP` in sync with merged changes
    *   Dead code removal — unused imports, unreachable branches (non-auth files only)
    *   CSS / Tailwind fixes — styling regressions, class name corrections

    🚫 **HARD OFF-LIMITS** (never queue — require Lucas + Claude planning first):
    *   `server.js` auth middleware — `requireAuth`, `requireHuman`, `requirePermission`, `httpsRedirect`
    *   `src/lib/crypto.ts` — ClawKeys©™ primitives, `hashToken`, `verifyToken`, key generation
    *   `src/config/apiConfig.ts` — single source of truth for API URL resolution
    *   `Dockerfile` / `docker-compose.yml` — high blast radius; HSTS/proxy lessons hard-won
    *   Any change to `sessionStorage` key names (`cc_*`) — breaks active user sessions
    *   Any change to SQLite schema without a migration plan — data loss risk
    *   Any change to the `import.meta.env.VITE_API_URL` literal — breaks Vite build
    *   Any task where correct implementation requires asking Lucas a question first

## Development Standards
### TypeScript & Code Style
*   **Strict Mode:** `strict: true` in `tsconfig.json`. All errors must be resolved.
*   **No Unused:** `noUnusedLocals` and `noUnusedParameters` must be true.
*   **Organization:** Feature-first directory structure (e.g., `src/services/folders/` not `src/services/services/`).
*   **Naming:**
    *   Files: `camelCase.ts` / `PascalCase.tsx`
    *   Components: `PascalCase`
    *   Functions: `camelCase`
    *   Constants: `UPPER_SNAKE_CASE`

### Testing
*   **Runtime:** Vitest (`vitest run`) is the exclusive runner. Do not use Bun, Jest, or Mocha.
*   **Location:** Test files live next to the code they test (e.g., `src/lib/utils.test.ts`).
*   **Requirement:** All tests must pass before a Docker build is attempted.

### Documentation
*   **CRUSTAGENT.md:** CrustAgent©™ knowledge base and validation standards.
*   **This document (ClawChives-Project.md):** Core concepts, rules, and standards.
*   **Git Workflow:** `main` is stable. Feature branches `feat/<name>`. Conventional commits required.

## Consistency Guidelines
### UI Consistency
*   **Stack:** React 18 + Vite + Tailwind + shadcn/ui (no substitutes).
*   **Theme:** Dark theme is primary. Lobster Red (`#FF3B30`) for agent UI, Cyan (`#0EA5E9`) for brand.
*   **Components:** `LobsterModal.tsx` wraps all modals.

### Terminology (UI & Comments)
*   **Bookmark:** Pinchmark
*   **Agent Key:** Lobster Key (`lb-`)
*   **Agent:** Lobster
*   **Permission:** Claw / Claw Permission
*   **Revoke:** Declawed
*   **Archive:** The Hold

### API & Environment
*   **Key Prefixes:** `hu-` (Human), `lb-` (Lobster), `api-` (Session Token).
*   **Session Storage:** `cc_api_token`, `cc_user_uuid`, `cc_key_type`.
*   **Env Vars:** `PORT`, `DATA_DIR`, `CORS_ORIGIN`, `ENFORCE_HTTPS` (default false), `TRUST_PROXY` (default false).

--- FILE: rules-and-guardrails.md ---

# Project Rules & Constraints

## General Project Rules
1.  **Sovereign First:** No cloud accounts, no external auth, no vendor dependencies. The `hu-` key IS the user.
2.  **Docker Always Works:** A broken Docker build is a P0 blocker. Fix before merging anything else.
3.  **Never Scatter API URL Logic:** All API URL resolution goes through `src/config/apiConfig.ts`.
4.  **Parameterized SQL Only:** Zero string interpolation in database queries. No exceptions.
5.  **User Isolation Is Sacred:** Every server query touching user data MUST include `WHERE user_uuid = ?`.
6.  **hu- Keys Never Touch the Server:** Only `SHA-256(hu-key)` is sent. Plaintext stays client-side.
7.  **Plan Well, Implement Once:** Never blindly implement. Confirm with Lucas first.
8.  **Test Files Stay in Their Runtime:** Tests using `bun:test` stay bun-only. `src/` tests use `vitest` only.
9.  **Separation of Concerns By Feature:** No monolithic files (except `server.js`).
10. **Helmet HSTS Off on HTTP:** `strictTransportSecurity: false` unless `ENFORCE_HTTPS=true` to prevent LAN breakage.

## Operational Constraints
*   **Architecture:** Single-container deployment (UI + API on port 4545). SQLite is the only persistent store.
*   **Security:** CORS open (allow-all) for LAN self-hosting. `TRUST_PROXY` false by default.
*   **Deployment:** `docker-compose.yml` is canonical. Dockerfile must build fresh `dist/` from source.
*   **Health Check:** `start_period >= 15s` to allow `better-sqlite3` initialization.

## Project Guardrails & Guidelines
### Development Checklist
*   ✅ Always run `npm run build` locally before pushing.
*   ✅ Always run `npm test` (Vitest) before pushing.
*   ✅ Use `ApiError` from `src/services/utils/errors.ts` for HTTP error handling.
*   ❌ Never hardcode `localhost:4242` or IPs in component files.
*   ❌ Never use string interpolation in SQL queries.

### Security Checklist
*   ✅ No hardcoded secrets in committed files.
*   ✅ Auth endpoints (`/api/auth/*`) work without bearer tokens.
*   ✅ Docker build completes cleanly.
*   ✅ Browser loads `http://{LAN_IP}:4545` without `ERR_SSL_PROTOCOL_ERROR`.

### Known Pitfall Registry

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| HSTS on HTTP | White screen, `ERR_SSL_PROTOCOL_ERROR` on assets | Set `strictTransportSecurity: false` in Helmet; clear browser HSTS cache (`chrome://net-internals/#hsts`) |
| Trust proxy hardcoded | Rate limiting wrong IPs; HTTPS redirect loops | Gate behind `TRUST_PROXY=true` env var |
| Vite env type-casting | `localhost:4242` hardcoded in production build | Use exact `import.meta.env.VITE_API_URL` with `// @ts-ignore` |
| `bun:test` in `src/` | `TS2307: Cannot find module 'bun:test'` breaks Docker build | Rewrite test using Vitest (`vi.mock`, `vi.fn`, etc.) |
| Duplicate Folder types | `color: string` vs `color?: string` type mismatch | Import from `../types` (services/types) not `../../types` |
| Stale `dist/` in Docker | Old hardcoded URLs baked into image | Dockerfile must `COPY src ./src` + `RUN npm run build`, never `COPY dist ./dist` |
| CORS wildcard | Any origin can reach the API | Leave `CORS_ORIGIN` unset for LAN (allow-all); set explicitly for reverse proxy |
| Healthcheck too fast | Container marked unhealthy before SQLite init | `start_period: 15s`, `timeout: 10s`, `retries: 5` |
| Wrong Folder type import | TypeScript errors in `folderHierarchy.ts` | Import `Folder` from `../types` (services/types), not `../../types` |