---
description: Stability Locks — Architectural and Security Invariants
alwaysApply: true
priority: 100
---

# 🛡️ Stability Locks

> **CRITICAL**: These invariants are the "Hard Shell" of the project. Do NOT modify or remove these without explicit Sovereign approval.

## 🔑 1. Cryptographic Entropy (Modulo Bias Guard)
- **Constraint**: Character set size is **62** (A-Z, a-z, 0-9).
- **Invariant**: Key generation MUST NOT use a raw modulo (`b % 62`) on a 256-range byte.
- **Why**: 256 is not evenly divisible by 62, creating a **25% statistical bias** toward the first 8 characters.
- **Enforcement**: Use **rejection sampling** (discard values >= 248) to ensure mathematically uniform distribution ($1/62$ probability).
- **File**: `src/lib/crypto.ts` -> `generateRandomString()`

## 🌐 2. Network Layout (Port Migration v2)
- **Frontend (Vite UI)**: `4545`
- **Backend (API Server)**: `4646`
- **Why**: Standardized separation for Docker LAN exposure and proxy routing.
- **File**: `package.json`, `docker-compose.yml`, `blueprint.json`

## ⚙️ 3. Node Runtime Stability (Node v22+)
- **tsx Gotcha**: Do NOT use the `--ignore` flag in `tsx --watch` on Node v22.
- **Symptom**: Results in a silent crash/hang with `ERR_CONNECTION_REFUSED`.
- **Fix**: Run `tsx --watch server.ts` directly for development.
- **File**: `package.json` -> `dev:server`

## 🧊 4. Session Storage Invariants
- **Identity Logic**: Tokens must be stored in `sessionStorage`, NEVER `localStorage`.
- **Namespacing**: Use `cc_` prefix for all keys.
  - `cc_api_token`: Session bearer.
  - `cc_user_uuid`: Current user ID.
  - `cc_key_type`: `human` | `agent`.
  - `cc_view`: Current dashboard view state.
  - `cc_theme`: Theme preference (`lobster-dark` | `lobster-light`).

## 🎨 5. Theme Restoration (Preventing Flash)
- **Invariant**: The `cc_theme` must be read and applied synchronously during application initialization.
- **Why**: Prevents the "Flash of Un-lobsterized Content" (FOULC) on page refresh.

- **Limit**: Key length is **64 chars** (excluding prefix).

## 🛡️ 6. Backend Authorization Logic
- **Identity Handshake**:
  - `POST /api/auth/token`: Exchanges `keyHash` (SHA-256 of `hu-` or `lb-`) for an `api-` token.
  - **One-Field Login**: Enabled via the `UNIQUE` constraint on `key_hash`.
- **Gating Middleware**:
  - `requireAuth`: Injects user context from `api-` token.
  - `requireHuman`: Locked to master identity keys for settings and management.
  - `requirePermission(action)`: Geometrically locks CRUD routes based on granular agent permissions.

## 🗄️ 7. Database Invariants (The Reef Shell)
- **Engine**: `better-sqlite3`.
- **Modes**:
  - `PRAGMA journal_mode = WAL`: High-concurrency performance.
  - `PRAGMA foreign_keys = ON`: Data integrity enforcement.
- **Constraints**:
  - `key_hash`: `UNIQUE` (sacred for one-field login security).
  - `user_uuid`: Required in ALL user-facing queries.
- **Auto-Sync**: Schema migrations must be idempotent.

## 🏛️ 8. Architectural Constants
- **API Base**: `src/config/apiConfig.ts` is the single source of truth for base URL resolution.
- **Port Isolation**: UI (4545) and API (4646) are spatially and logically disconnected behind environmental gates.

---
**Maintained by CrustAgent©™**
<!-- vibecheck:stability-locks:v2 -->
