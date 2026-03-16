# 🦞 src/CRUSTAGENT.md — Source-Level Intelligence Directive

> **Atomic reference for agents scuttling through the `src/` directory.**
> 
> Focus: Component patterns, stability locks, and state invariants. No philosophy — just code.

---

## 📚 Knowledge Base Navigation

For detailed architectural knowledge, consult:
- **Root CRUSTAGENT.md** — Backend architecture, deployment, phase tracking
- **.crustagent/knowledge/** — Topic-organized knowledge (14 files)
- **.crustagent/rules/** — Stability locks & change impact assessment

---

## 📂 Complete File Map & Directory Structure

```
src/
├── App.tsx                        # Root: auth state machine, view routing, session restore
├── main.tsx                       # Vite entry point
├── config/
│   └── apiConfig.ts               # API URL resolution (centralized source of truth)
├── lib/
│   ├── crypto.ts                  # Key generation, SHA-256, constant-time compare, identity file
│   ├── crypto.test.ts             # Unit tests for crypto primitives
│   ├── api.ts                     # Low-level fetch helpers
│   ├── exportImport.ts            # Bookmark import/export logic
│   └── utils.ts                   # General utilities
├── hooks/
│   └── useAuth.ts                 # Auth context provider and hook
├── types/
│   ├── index.ts                   # Re-exports from services/types
│   └── agent.ts                   # AgentKey, AgentPermission, PermissionLevel, PERMISSION_CONFIGS
├── components/
│   ├── theme-provider.tsx         # Theme context: light/dark/auto + clip-path transitions
│   ├── landing/LandingPage.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx          # Identity file upload → token exchange → session
│   │   └── SetupWizard.tsx        # Key generation → register → token → session
│   ├── dashboard/
│   │   ├── Dashboard.tsx          # Shell: loads bookmarks + folders
│   │   ├── BookmarkCard.tsx       # Single card; r.jina.ai menu gated to humans
│   │   ├── BookmarkModal.tsx      # Create/edit; jinaUrl checkbox gated to humans
│   │   ├── Sidebar.tsx            # Folder tree + filter nav
│   │   ├── FolderModal.tsx        # Create folder
│   │   └── ...                    # BookmarkGrid, SearchBar, TagsView, etc.
│   └── settings/
│       ├── AgentPermissions.tsx   # List + revoke lobster keys
│       ├── AgentKeyGeneratorModal.tsx  # Create lobster key; shows lb- key ONCE
│       ├── AppearanceSettings.tsx # Theme + layout settings
│       ├── ImportExportSettings.tsx   # JSON/CSV/HTML export with safe escaping
│       └── ...                    # ProfileSettings, DatabaseReset, etc.
└── services/
    ├── database/
    │   ├── rest/RestAdapter.ts    # SOLE HTTP client — stability lock (see below)
    │   ├── schema.ts              # IndexedDB schema (all stores + indices)
    │   ├── connection.ts          # IDB open/upgrade
    │   ├── adapter.ts             # IDatabaseAdapter interface
    │   └── DatabaseProvider.tsx   # React context that provides the adapter
    ├── agents/
    │   ├── agentKeyService.ts     # Lobster key CRUD — stability lock (see below)
    │   └── agentPermissions.ts    # Client-side permission helpers
    ├── auth/
    │   ├── setupService.ts        # New-user account creation (IDB)
    │   └── loginService.ts        # Auth helpers
    ├── bookmarks/
    │   ├── bookmarkService.ts     # IDB CRUD for bookmarks
    │   ├── bookmarkSearch.ts      # Search + filter logic
    │   └── bookmarkTags.ts        # Tag management
    ├── folders/
    │   ├── folderService.ts       # IDB CRUD for folders
    │   └── folderHierarchy.ts     # Nested folder helpers
    ├── settings/
    │   ├── appearanceService.ts   # Theme/layout read+write (IDB)
    │   └── profileService.ts      # Profile read+write (IDB)
    ├── types/index.ts             # Bookmark, Folder, User, AppearanceSettings, ProfileSettings, AgentKey
    └── utils/
        ├── constants.ts           # STORES enum — always import store names from here
        ├── database.ts            # executeTransaction() — always use for IDB ops
        └── errors.ts              # ApiError class — use for all HTTP errors
```

---

## 🔐 Hard Constraints: Key System

Keys are base-62 alphanumeric strings (`A-Z a-z 0-9`), generated with `crypto.getRandomValues(Uint32Array)` and `% 62` modulo mapping. No real crypto library — just high-entropy random strings that are matched via SHA-256 hashing.

| Key | Prefix | Body | Total | Entropy |
|-----|--------|------|-------|---------|
| Human identity | `hu-` | 64 chars | 67 | ~381 bits |
| Lobster (agent) | `lb-` | 64 chars | 67 | ~381 bits |
| API session | `api-` | 32 chars | 36 | ~190 bits |

**Server never receives `hu-` or `lb-` plaintext.** Only `SHA-256(key)` as a lowercase hex string (64 chars) is ever sent over the wire.

Constant-time comparison lives in `src/lib/crypto.ts` (XOR accumulator, not `===`).
Use `hashToken()` and `verifyToken()` from that file — never roll your own.

### Identity File

Downloaded as `clawchives_identity_{username}.json` after account creation.

```json
{
  "username": "lucaslobster",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token": "hu-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUv",
  "createdAt": "2026-03-07T10:30:00.000Z"
}
```

`token` is the raw `hu-` key. It is never sent to the server — only its hash.
The `uuid` is a client-generated UUID v4 that acts as the stable user identifier.

---

## 🔐 Hard Constraint: Session & Theme State (Never Lose on Refresh)

All session state lives in `sessionStorage` under `cc_*` keys.
On tab close, sessionStorage is cleared — this is intentional (security).

```
cc_api_token    → Bearer token for all API requests (api-*)
cc_user_uuid    → User UUID (matches users.uuid in SQLite)
cc_username     → Display username
cc_key_type     → "human" | "agent"  — gates r.jina.ai UI components
cc_view         → "dashboard" | "settings"  — restored on refresh
cc_theme        → "light" | "dark" | "auto"  — restored on refresh
```

**Rules:**
- Restore `cc_view` synchronously in `useState` initializer (before any async work) so there is no flash to the landing page on refresh.
- Theme: apply `cc_theme` locally first, then sync from backend — never wait for backend before rendering.
- Logout must clear ALL `cc_*` keys (no leaking stale state).
- `cc_view` must only ever be `"dashboard"` or `"settings"`. Never write `"landing"`, `"login"`, or `"setup"` to `cc_view`.
- `cc_key_type` must be written immediately after the token is stored (both `LoginForm.tsx` and `SetupWizard.tsx` must set it).

---

## 🔐 Hard Constraint: Pinchmark + Pin Folder System

**"Pinchmark"** is the lobster-themed term for a bookmark. The codebase uses `bookmark` in variable/function names; `pinchmark` is the product concept.

**Every pinchmark must:**
- Have a `user_uuid` field tied to its owner (server enforces `WHERE user_uuid = ?`)
- Have an `id` that is a UUID v4 generated client-side before `POST`

**Pin system** (required design — follow this when implementing):

A pinchmark can be **pinned** (`pinned: boolean` on the `Bookmark` type, default `false`).
Pinned pinchmarks live in a special **Pin Folder**:

```
Pin Folder rules:
  - System folder, identified by isPinFolder: true on the Folder record
  - Created automatically when the first pinchmark is pinned
  - Only one Pin Folder per user (enforced in both IDB and SQLite)
  - Cannot be manually renamed, recolored, or moved by the user
  - MUST auto-delete itself when it contains zero pinchmarks
  - Deleting the last pinchmark from it triggers folder deletion
  - Unpin = remove from Pin Folder + set pinned: false on the bookmark
```

Required schema additions when implementing:
- `Bookmark`: add `pinned: boolean` field
- `Folder`: add `isPinFolder: boolean` field
- SQLite `bookmarks` table: `pinned INTEGER DEFAULT 0`
- SQLite `folders` table: `is_pin_folder INTEGER DEFAULT 0`
- IDB `bookmarks` store: index on `"pinned"`
- IDB `folders` store: index on `"isPinFolder"`

---

## 🔐 Hard Constraint: SQLite Table user_uuid Attachment

Every table that stores user data **must** have `user_uuid TEXT NOT NULL`
referencing `users.uuid`. Every server-side query that reads or writes user
data **must** include `WHERE user_uuid = ?`.

```
bookmarks.user_uuid   → users.uuid
folders.user_uuid     → users.uuid
agent_keys.user_uuid  → users.uuid
settings.user_uuid    → users.uuid
```

Parameterized queries only (`db.prepare(...).run(?, ?)`) — no string
interpolation ever. This is verified in the root CRUSTAGENT.md invariants.

---

## ⚡ Stability Lock: REST API Adapter

**File:** `src/services/database/rest/RestAdapter.ts`

This is the **sole HTTP client** for the app. All components talk to it through
the `DatabaseProvider` context. Once working and secure, method signatures and
the auth pattern must not change.

### Base URL (do not refactor this line)

```typescript
// @ts-ignore: Vite replaces import.meta.env.VITE_API_URL at build-time — do NOT refactor this line
const API_BASE = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4646").replace(/\/$/, "");
```

`import.meta.env.PROD` must appear as an exact literal — TypeScript casting
breaks Vite's string replacement and hardcodes `localhost:4646` in the build.

### Auth pattern

```typescript
Authorization: Bearer {cc_api_token}   // from sessionStorage
```

### Response contract

```typescript
// Success: { data: T }   — adapter returns data, throws on error
// Error:   { error: string }  — adapter throws ApiError(status, message)
```

### Method surface (do not change signatures)

```
Bookmarks:  getBookmarks()  saveBookmark()  updateBookmark()  deleteBookmark()  deleteAllBookmarks()
Folders:    getFolders()    saveFolder()    updateFolder()    deleteFolder()    deleteAllFolders()
AgentKeys:  getAgentKeys()  saveAgentKey()  revokeAgentKey()  deleteAgentKey()
Settings:   getAppearanceSettings()  saveAppearanceSettings()
            getProfileSettings()     saveProfileSettings()
```

---

## ⚡ Stability Lock: Lobster Key (Agent) System

**File:** `src/services/agents/agentKeyService.ts`

Lobster keys (`lb-*`) give agents scoped access to the API. Created by humans
in Settings → Agent Permissions. Once working and secure, this file's pattern
must not change.

Uses the same Vite env literal pattern as RestAdapter for `getApiUrl()`.

### Permission levels

Defined in `src/types/agent.ts` as `PERMISSION_CONFIGS`:

```
READ   → canRead only
WRITE  → canRead + canWrite
EDIT   → canRead + canWrite + canEdit
MOVE   → canRead + canWrite + canEdit + canMove
FULL   → all permissions
CUSTOM → all false by default (user sets individual booleans)
```

### Key lifecycle

```
Created (lb- key shown ONCE in AgentKeyGeneratorModal) → Active → Used
  → [Expired by date/duration] | [Revoked by human] → Inactive
```

The raw `lb-` key is **shown exactly once** at creation and never stored or
retrievable again from the UI. Agents must save it immediately.

### Expiry types

`"never" | "30d" | "60d" | "90d" | "custom"` — all resolved to an ISO timestamp
server-side via `calculateExpiry()`. The server enforces expiry on every request.

---

## 🏗️ Component Patterns

- **Base UI components** live in `src/components/ui/` (Shadcn/Radix). Use them;
  don't create new base components.
- **Feature components** live in `src/components/{feature}/`.
- **Modals** use the `LobsterModal.tsx` wrapper for consistent framing.
- **Human-only UI** (r.jina.ai checkbox, context menu item) is gated by:
  ```typescript
  const keyType = sessionStorage.getItem("cc_key_type");
  if (keyType === "human") { /* show r.jina.ai controls */ }
  ```
- **API calls** always go through the `RestAdapter` via `useDatabaseAdapter()`.
  Never call `fetch()` directly from a component.
- **r.jina.ai fields** (`jinaUrl`) are returned on all `GET /api/bookmarks`
  responses — both humans and agents receive them. Only `POST`/`PUT` of
  `jinaUrl` is restricted to humans.

---

## 🎯 Type Locations

| Type | File |
|------|------|
| `Bookmark`, `Folder`, `User`, `AppearanceSettings`, `ProfileSettings`, `AgentKey` | `src/services/types/index.ts` |
| `AgentKey`, `AgentPermission`, `PermissionLevel`, `PERMISSION_CONFIGS` | `src/types/agent.ts` |
| `View` (`"landing" \| "login" \| "setup" \| "dashboard" \| "settings"`) | `src/App.tsx` |
| `IdentityData` (identity JSON shape) | `src/lib/crypto.ts` |

---

## 🔧 Utility Rules

- **IDB store names:** always import from `src/services/utils/constants.ts` (`STORES.BOOKMARKS`, etc.) — never hardcode strings.
- **IDB transactions:** always use `executeTransaction()` from `src/services/utils/database.ts`.
- **HTTP errors:** always throw/use `ApiError` from `src/services/utils/errors.ts` (has `.status` and `.message`).
- **Crypto:** always use `hashToken()` / `verifyToken()` / `generateHumanKey()` etc. from `src/lib/crypto.ts`. Never implement hashing or key generation inline.

---

## 🔧 Dev Workflow

```bash
npm start          # Vite dev (port 4545) + API server (port 4646) — use this
npm run dev        # Vite only — API will be unreachable, use npm start instead
npm run build      # tsc + vite build (production)
npm run start:api  # API server only (port 4646)
```

In production Docker, both UI and API run on port 4545 from a single container.
The Vite build uses `import.meta.env.PROD = true` → `API_BASE = ""` (same-origin).

---

## 🔐 Logic & Stability Invariants (Advanced)

### 1. API Communication (The Stability Lock)
- **Port 4646**: The API server is locked to port 4646. The frontend is at 4545.
- **Adapter Only**: Never use `fetch`/`axios` directly in components. Use `useDatabaseAdapter()` from `src/services/database/DatabaseProvider.tsx`.
- **URL Resolution**: Always use `getApiBaseUrl()` from `src/config/apiConfig.ts`.
- **Vite Env Replacement**: Do NOT refactor the literal `import.meta.env.VITE_API_URL` string. It breaks the build-time replacement.

### 2. State & Session Invariants
- **sessionStorage**: All session state lives here (`cc_api_token`, `cc_user_uuid`, `cc_key_type`, `cc_view`).
- **One-Field Login**: Paste mode in `LoginForm.tsx` only requires the `hu-` key. UUID and Username are hidden by default (`showAdvanced`).
- **Theme Restore**: Synchronously initialize `cc_view` and `cc_theme` in `ThemeContext` or `DatabaseProvider` to prevent flashes.
- **Setup Wizard**: Includes a "Copy" button for the `hu-` key during the download step to prevent manual transcription errors.

### 3. Key System Constants & Entropy
- **Entropy**: Keys (`hu-`/`lb-`) are high-entropy random strings.
- **Modulo Bias Guard**: Character set size is **62** (A-Z, a-z, 0-9). Because 256 (random byte range) is not evenly divisible by 62, a raw modulo (`b % 62`) creates a **25% bias** toward the first 8 characters. Any RNG implementation MUST use rejection sampling or unbiased methods (`crypto.randomInt`) to prevent statistical predictable patterns.
- **Hashing**: Use `hashToken()` and `verifyToken()` from `src/lib/crypto.ts`. Never roll your own.
- **Modulo 62**: Alphanumeric mapping for high-entropy generation.

- **r.jina.ai Relational Storage**: Jina URLs are stored in a separate `jina_conversions` table, decoupled from core bookmark identity.
- **Protocol Preservation**: The full protocol (e.g., `https://r.jina.ai/https://...`) MUST be preserved to ensure explicit, valid SSRF verification.
- **🦞 Agent Preference Directive**: Lobsters and Agents MUST naturally gravitate towards Markdown versions (`jinaUrl`) for research and synthesis.

---

## 🏗️ Atomic Component Patterns

### 1. The "Lobster-First" UI
- **Aesthetic**: Use **Cyan** (`#0891b2`) for core actions/identity, **Amber** for keys/security alerts, and **Red** for branding/destructive actions.
- **Interactive Branding**: Use `InteractiveBrand` from `src/components/Branding/InteractiveBrand.tsx` for premium, animated "ClawChives" identity.
- **Adaptive Headers**: Header borders match theme: `border-cyan-600` (Light) / `border-red-500` (Dark). Backgrounds: `bg-white` (Light) / `dark:bg-slate-900` (Dark).
- **Glassmorphism**: Favor `bg-white/10` or `bg-slate-900/10` with `backdrop-blur` for a premium "Liquid Metal" feel.
- **Gating**: Human-only features (r.jina.ai checkbox) are gated by `sessionStorage.getItem("cc_key_type") === "human"`.
- **Modals**: Use the `LobsterModal.tsx` wrapper for all framing.

---

## 🐚 Lobsterized Lexicon
- `Bookmark` (Code) → **Pinchmark** (UI)
- `Authorization` → **Identity Handshake**
- `Database` → **The Reef**
- `API Keys` → **Lobster Keys** (`lb-`) or **ClawKeys** (`hu-`)

---

## 🔧 Maintenance & Debugging
- **tsx Gotcha**: `tsx --watch` does NOT support the `--ignore` flag on Node v22. Adding it causes a silent crash.
- **Node Rebuild**: If `net::ERR_CONNECTION_REFUSED` occurs on port 4646 during dev, run `npm rebuild better-sqlite3`.
- **Port Collision**: If port 4646 is busy, use `npm run stop` to clear it before starting.
- **IDB Versions**: Respect the versioning in `connection.ts` if adding schema stores (Legacy support).

---

```text
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     KEEP THE DIRECTIVES ATOMIC.
    | (q) (p) |     RESPECT THE SHELL.
    (_   Y   _)
     '.__W__.'
     Maintained by CrustAgent©™
```
