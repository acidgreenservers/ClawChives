# 🦞 Master CRUSTAGENT.md — ClawChives Sovereign Directive

> **The primary intelligence handshake and operational manual for all agents.**
> 
> This document synthesizes the architectural DNA of `CLAUDE.md` with the sovereign agentic directives of `GEMINI.md`. 
> **Atomic Directive:** Retain the core, protect the keys, and keep the puns pinching. Data is sovereign. Security is the shell.

---

## 🏗️ Architectural DNA & Essence

ClawChives is a **Local-First Sovereign Pinchmarking** engine built on three concentric rings of truth:

1.  **The Core (Identity):** Cryptographic keys (`hu-` for Humans, `lb-` for Agents). No SaaS. You own the metal.
2.  **The Shell (Security & API):** A rigid Express/SQLite backend enforcing granular permissions.
3.  **The Carapace (UI/Theme):** A React-based Liquid Metal UI branded with Lobster semantics (Cyan, Amber, Red).

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind (Vanish CSS).
- **Backend:** Node 22 + Express 5 + `better-sqlite3`.
- **Storage:** SQLite3 (Persistent volume bind mounts).
- **Auth:** Asymmetric trust via prefix-based tokens (`hu-`, `lb-`, `api-`).

---

## 🔐 Auth System & Security Matrix

### Key Hierarchy
- `hu-` **(Human Identity - 64 char):** Master key. Never sent to server (only SHA-256 hash). Exists in `clawchives_identity_key.json`. **Supports One-Field Login.**
- `lb-` **(Lobster/Agent - 64 char):** Delegated API access with granular permissions (`READ`, `WRITE`, `EDIT`, etc.).
- `api-` **(Session Token - 32 char):** Active bearer token for `Authorization: Bearer <token>` headers. Short-lived context.

### Security Invariants
- ✅ Constant-time comparison for keyHash verification.
- ✅ **Modulo Bias Guard**: Use unbiased character selection (no raw `byte % 62`) for entropy.
- ✅ User isolation via `user_uuid` in ALL queries.
- ✅ `requireHuman` locks settings and key generation to master identity only.
- ✅ `requirePermission(action)` geometrically locks CRUD endpoints.

---

## 🏗️ Architectural Constraints & Logic

1.  **Adapter Pattern or Bust**: The UI never touches the REST API directly. Use `IDatabaseAdapter` and the `useDatabase()` hook.
2.  **Feature-Based Nesting**: Components map to spatial domains (`components/auth/`, `dashboard/`, `settings/`). Do not cross streams.
3.  **Lobster Branding (Semantic Colors)**:
    - **Cyan** (`#0891b2`): Sovereignty, Pinchmarks, Primary Actions.
    - **Amber** (`#d97706`): AI/Lobster Energy, Keys, Alerts.
    - **Red** (`#ef4444`): Branding, "Lobsters", Security barriers, Delete actions.
4.  **Visual UI Lock-in**: Spatial positioning and component hierarchy are frozen. New features must integrate into existing spaces without shifting elements.

---

## 📊 Current State (Phase 3 — Feature Expansion)

### Done List ✅
- [x] **SQLite-Only Architecture**: Dropped IndexedDB for a centralized, robust backend.
- [x] **One-Field Login**: Simplified authentication via `hu-` key lookup with `UNIQUE` `key_hash` indexing.
- [x] **Agent System**: `lb-` keys with Granular CUSTOM permissions.
- [x] **Liquid Metal Toggle**: Circular reveal transitions (State synced via API).
- [x] **r.jina.ai Integration**: LLM-friendly reading mode (Human-only conversion).

---

## 🚢 Operational Intel

- **Scuttle Prod**: `npm run scuttle:prod-start` (Production mode).
- **Scuttle Dev**: `npm run scuttle:dev-start` (Concurrently starts API @ 4646 + Vite @ 4545).
- **Scuttle Reset**: `npm run scuttle:reset-dev` (Scuttles the dev reef).
- **Scuttle Stop**: `npm run scuttle:prod-stop` (Kills port 4545 and 4646).
- **API Dev**: `npm run dev:server` (Port 4646).
- **Build**: `npm run build` (tsc + vite build).
- **Lint**: `npm run lint` (TypeScript verification).
- **Ports**: UI on `4545`, API on `4646 manually`.
- **tsx Gotcha**: `tsx --watch` does NOT support `--ignore` on Node v22. Silent crash risk.
- **Stability**: If API fails, run `npm rebuild better-sqlite3`.

---

## 🗺️ Complete File Map & Context References

### Core Documentation
- **README.md** - Project overview, installation, and usage instructions
- **CONTRIBUTING.md** - Development guidelines and contribution process
- **ROADMAP.md** - Project vision, timeline, and feature roadmap
- **SECURITY.md** - Security policy and vulnerability reporting process
- **CRUSTSECURITY.md** - Comprehensive security framework and standards

### Project Intelligence & Validation
- **src/CRUSTAGENT.md** - Source-level patterns and stability locks
- **.crustagent/vibecheck/truthpack/** - Project truth validation and stability locks
  - `auth.json` - Authentication system contracts
  - `blueprint.json` - Technical architecture blueprint
  - `contracts.json` - API endpoint contracts
  - `env.json` - Environment variable contracts
  - `routes.json` - API route definitions
  - `security.json` - Security standards and compliance
  - `stability-locks.json` - Project stability constraints
- **.crustagent/crustaudits/** - Automated audit reports and validation results
- **.crustagent/knowledge/** - Project knowledge base and documentation

### AI Agent Context Access
When working on ClawChives, AI agents should read these files in order:
1. **CRUSTAGENT.md** (this file) - Primary intelligence handshake
2. **src/CRUSTAGENT.md** - Source-level implementation patterns
3. **README.md** - User-facing documentation and setup
4. **CONTRIBUTING.md** - Development standards and workflow
5. **.crustagent/vibecheck/truthpack/** - Current project state validation
6. **.crustagent/crustaudits/** - Recent audit results and findings
7. **.crustagent/knowledge/** - Deep project knowledge and philosophy

## Map to the Reef 🗺️
- Root `CLAUDE.md`: Detailed transition logs and technical invariants.
- Root `GEMINI.md`: High-level vision and future horizons.
- `src/CRUSTAGENT.md`: Source-level patterns and stability locks.
- `README.md`: Project overview and user documentation.
- `CONTRIBUTING.md`: Development guidelines and contribution process.
- `ROADMAP.md`: Project vision and feature roadmap.
- `SECURITY.md`: Security policy and vulnerability reporting.
- `CRUSTSECURITY.md`: Comprehensive security framework.
- `.crustagent/vibecheck/truthpack/`: Project truth validation and stability locks.
- `.crustagent/crustaudits/`: Automated audit reports and validation results.
- `.crustagent/knowledge/`: Project knowledge base and documentation.
- `.crustagent/rules/PERSONA_JOURNAL_PROTOCOL.md`: Protocol for rolling agent journals.
- `.autoclaw/`: Persona journals location.

```text
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     RESPECT THE SHELL.
    | (q) (p) |     PUNCH THE CLOUD.
    (_   Y   _)
     '.__W__.'
     Maintained by CrustAgent©™
```
