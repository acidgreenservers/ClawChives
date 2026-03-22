# 🦞 src/CRUSTAGENT.md — Source-Level Intelligence

> **Atomic reference for agents scuttling through the `src/` directory.**
> Focus: Component patterns, stability locks, file map, and state invariants. No philosophy — just code.

---

## 📚 Knowledge Base Navigation

For broader architectural context, consult:
- **Root `CRUSTAGENT.md`** — Backend architecture, deployment, phase tracking
- **`.crustagent/knowledge/`** — Topic-organized deep knowledge
- **`.crustagent/rules/`** — Stability locks & change impact assessment

---

## 📂 Current File Map (Post Phase 6)

<details>
<summary>🗂️ Full src/ Directory Structure</summary>

```
src/
├── App.tsx                          # Root: auth state machine, view routing, refresh restore
├── main.tsx                         # Vite entry point
│
├── features/                        # ◀ Feature-Sliced Domains (Phase 5/6)
│   ├── auth/                        # Login, SetupWizard, useAuth hook
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx          # Composes SidebarNav + FolderList (supports settingsMode for Settings page)
│   │   │   │   ├── SidebarNav.tsx       # Top-level nav items + settings tabs (exports NavTab, SettingsTab types)
│   │   │   │   └── FolderList.tsx       # Custom pod tree + counts
│   │   │   └── modals/
│   │   │       ├── DatabaseStatsModal.tsx  # Composes StatsCards + BookmarkTable
│   │   │       ├── StatsCards.tsx          # DB stats cards
│   │   │       └── BookmarkTable.tsx       # Full searchable pinchmark table
│   └── settings/
│       ├── components/
│       │   ├── AgentPermissions.tsx     # Agent key list (uses AgentKeyCard)
│       │   ├── AgentKeyCard.tsx         # Single agent key display + actions
│       │   ├── agentPermissionsUtils.ts # maskKey, formatDate, isExpired
│       │   ├── ImportExportSettings.tsx # Composes ImportSection + ExportSection
│       │   ├── ImportSection.tsx        # Import UI + logic
│       │   ├── ExportSection.tsx        # Export UI (JSON/HTML/CSV)
│       │   ├── LobsterImportModal.tsx   # 3-step agent import (uses useLobsterSession)
│       │   ├── useLobsterSession.ts     # Session lifecycle hook
│       │   └── ImportSteps.tsx          # SessionStep + SessionResults components
│       └── utils/
│           └── importExportUtils.ts     # Legacy import logic (file parsing, mutation)
│
├── shared/                          # ◀ Global UI & Utilities
│   ├── ui/
│   │   ├── modals/                  # Decomposed Lobster modals
│   │   │   ├── index.ts             # Barrel export
│   │   │   ├── ModalContainer.tsx   # Shared backdrop + container
│   │   │   ├── ConfirmModal.tsx     # Red/amber confirm dialog
│   │   │   ├── AlertModal.tsx       # Cyan/red info modal
│   │   │   └── TagBlockedModal.tsx  # Amber tag-deletion guard
│   │   └── LobsterModal.tsx         # Barrel re-export (backwards compat)
│   └── lib/
│       ├── crypto.ts                # Key gen, SHA-256, AES-256-GCM, identity file
│       ├── exportImport.ts          # Backwards-compat wrapper → exportHub
│       └── export/
│           ├── types.ts             # ExportData, ExportFormatter, ClawChivesExport
│           ├── exportHub.ts         # Central formatter registry + processExport()
│           └── formatters/
│               ├── ClawChivesJSON.ts  # Native .clawchives format
│               ├── NetscapeHTML.ts    # Browser-compatible HTML bookmarks
│               └── CSVFormatter.ts   # Spreadsheet export
│
├── services/                        # ◀ Backend Adapter Layer
│   ├── database/
│   │   ├── adapter.ts               # IDatabaseAdapter interface
│   │   ├── DatabaseProvider.tsx     # React context + useDatabase() hook
│   │   └── rest/
│   │       └── RestAdapter.ts       # 🔒 STABILITY LOCK — sole HTTP client
│   ├── agents/
│   │   └── agentKeyService.ts       # Lobster key CRUD
│   ├── lobster/
│   │   └── lobsterSessionService.ts # Ephemeral session API client
│   └── types/index.ts               # Bookmark, Folder, User, AgentKey, etc.
│
└── server/                          # ◀ Backend (Express + SQLite)
    ├── database/
    │   ├── connection.ts            # DB init, WAL mode, foreign keys
    │   ├── schema.ts                # Table definitions, migrations
    │   └── migrations.ts            # Schema upgrade logic
    ├── middleware/                  # auth, rateLimiter, validate
    ├── routes/
    │   ├── auth.ts                  # /api/auth/*
    │   ├── folders.ts               # /api/folders/*
    │   ├── agentKeys.ts             # /api/agent-keys/*
    │   ├── settings.ts              # /api/settings/*
    │   ├── lobsterSession.ts        # /api/lobster-session/*
    │   └── bookmarks/               # Decomposed handlers
    │       ├── read.ts              # GET /api/bookmarks (paginated)
    │       ├── write.ts             # POST/PUT/DELETE
    │       ├── bulk.ts              # POST /api/bookmarks/bulk
    │       └── toggles.ts           # star, archive toggles
    └── utils/
        ├── auditLogger.ts           # Structured action logging
        ├── crypto.ts                # Server-side key hashing
        ├── parsers.ts               # URL + string validation
        └── tokenExpiry.ts           # calculateExpiry()
```

</details>

---

## 🔐 Hard Constraints

<details>
<summary>🗝️ Key System — Entropy & Format</summary>

| Key | Prefix | Body | Total | Entropy |
|-----|--------|------|-------|---------|
| Human identity | `hu-` | 64 chars | 67 | ~381 bits |
| Lobster/Agent | `lb-` | 64 chars | 67 | ~381 bits |
| API session | `api-` | 32 chars | 36 | ~190 bits |

> [!IMPORTANT]
> **Modulo Bias Guard**: Character set is 62 (`A-Z a-z 0-9`). Because 256 is not evenly divisible by 62, raw `byte % 62` creates a ~25% bias. Implementation MUST use rejection sampling (already implemented in `crypto.ts`).

**Identity File Format:**
```json
{
  "username": "lucaslobster",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token": "hu-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789....",
  "createdAt": "2026-03-07T10:30:00.000Z"
}
```

`token` is the raw `hu-` key. Only its SHA-256 hash ever travels to the server.

</details>

<details>
<summary>🔒 Session State — Never Lose on Refresh</summary>

All session state lives in `sessionStorage` under `cc_*` keys. On tab close, sessionStorage is cleared (intentional security).

```
cc_api_token    → Bearer token for all API requests (api-*)
cc_user_uuid    → User UUID (matches users.uuid in SQLite)
cc_username     → Display username
cc_key_type     → "human" | "agent" — gates r.jina.ai UI
cc_view         → "dashboard" | "settings" — restored on refresh
cc_theme        → "light" | "dark" | "auto" — restored on refresh
```

**Rules:**
- Restore `cc_view` synchronously in `useState` initializer — no flash to landing page.
- Apply `cc_theme` locally first, then sync from backend — never wait for backend before render.
- Logout must clear ALL `cc_*` keys (no leaking stale state).
- `cc_view` must only ever be `"dashboard"` or `"settings"`. Never write auth views to `cc_view`.
- `cc_key_type` must be written immediately after token storage (both `LoginForm` and `SetupWizard` must set it).

</details>

<details>
<summary>🗄️ SQLite — User Isolation Rule</summary>

Every table that stores user data **must** have `user_uuid TEXT NOT NULL` referencing `users.uuid`. Every server-side query **must** include `WHERE user_uuid = ?`.

```
bookmarks.user_uuid   → users.uuid
folders.user_uuid     → users.uuid
agent_keys.user_uuid  → users.uuid
settings.user_uuid    → users.uuid
```

**Parameterized queries only.** `db.prepare(...).run(?, ?)` — no string interpolation. Ever.

</details>

---

## ⚡ Stability Locks

<details>
<summary>🔒 RestAdapter.ts — The Sole HTTP Client</summary>

**File:** `src/services/database/rest/RestAdapter.ts`

This is the **only** HTTP client for the app. All components talk through the `DatabaseProvider` context. Once working and secure, method signatures must not change.

```typescript
// ⚠️ DO NOT REFACTOR THIS LINE — Vite replaces import.meta.env.VITE_API_URL at build-time
const API_BASE = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4646").replace(/\/$/, "");
```

`import.meta.env.PROD` must appear as an exact literal. TypeScript casting breaks Vite's string replacement.

**Auth pattern:**
```typescript
Authorization: Bearer {cc_api_token}  // from sessionStorage
```

**Method surface (do not change signatures):**
```
Bookmarks:  getBookmarks()  saveBookmark()  updateBookmark()  deleteBookmark()  deleteAllBookmarks()
Folders:    getFolders()    saveFolder()    updateFolder()    deleteFolder()    deleteAllFolders()
AgentKeys:  getAgentKeys()  saveAgentKey()  revokeAgentKey()  deleteAgentKey()
Settings:   getAppearanceSettings()  saveAppearanceSettings()
            getProfileSettings()     saveProfileSettings()
Stats:      getBookmarkStats()
```

</details>

<details>
<summary>🦞 Lobster Key (Agent) System</summary>

**File:** `src/services/agents/agentKeyService.ts`

Lobster keys (`lb-*`) give agents scoped access. Created by humans only (Settings → Agent Permissions). Uses the same Vite env literal pattern as `RestAdapter`.

**Permission levels** (`src/types/agent.ts` → `PERMISSION_CONFIGS`):
```
READ   → canRead only
WRITE  → canRead + canWrite
EDIT   → canRead + canWrite + canEdit
MOVE   → canRead + canWrite + canEdit + canMove
FULL   → all permissions
CUSTOM → all false by default (user sets individual booleans)
```

**Key lifecycle:**
```
Created (lb- key shown ONCE) → Active → Used
  → [Expired by date] | [Revoked by human] → Inactive
```

Raw `lb-` key shown exactly once at creation. Not stored, not retrievable.

</details>

<details>
<summary>🌊 Modular Export System</summary>

**Files:** `src/shared/lib/export/`

The export system uses a **formatter registry pattern**. New export formats are added by implementing `ExportFormatter` and registering in `exportHub.ts` — no other component changes required.

```typescript
export interface ExportFormatter {
  id: string;
  label: string;
  extension: string;
  format: (data: ExportData) => Promise<string>;
}
```

**Current formatters:**
- `ClawChivesJSON.ts` — native sovereign format (supports AES-256-GCM encryption)
- `NetscapeHTML.ts` — Netscape bookmark file (browser import compatible)
- `CSVFormatter.ts` — spreadsheet export

**To add a new format:** Create a new formatter file, implement `ExportFormatter`, add to `exportHub.ts` formatters array.

</details>

---

## 🏗️ Component Patterns

<details>
<summary>🎨 Lobster-First UI Rules</summary>

- **Base UI components** live in `src/shared/ui/` (shadcn/Radix). Use them — don't create new base primitives.
- **Feature components** live in `src/features/{feature}/components/`.
- **Shared modals** use `src/shared/ui/modals/` (`ConfirmModal`, `AlertModal`, `TagBlockedModal`).
- **Human-only UI** (r.jina.ai controls) is gated by:
  ```typescript
  const keyType = sessionStorage.getItem("cc_key_type");
  if (keyType === "human") { /* show Jina controls */ }
  ```
- **API calls** always go through `useDatabaseAdapter()` — never call `fetch()` directly from a component.

**Semantic color use:**
```
Cyan  (#0891b2) → Sovereignty, primary actions, pinchmarks
Amber (#d97706) → AI energy, keys, alerts, agent features
Red   (#ef4444) → Branding, delete, security barriers
```

</details>

<details>
<summary>🎯 Type Locations</summary>

| Type | File |
|------|------|
| `Bookmark`, `Folder`, `User`, `AppearanceSettings`, `ProfileSettings` | `src/services/types/index.ts` |
| `AgentKey`, `AgentPermission`, `PermissionLevel`, `PERMISSION_CONFIGS` | `src/types/agent.ts` |
| `View` (`"landing" \| "login" \| "setup" \| "dashboard" \| "settings"`) | `src/App.tsx` |
| `IdentityData` (identity JSON shape) | `src/shared/lib/crypto.ts` |
| `ExportData`, `ExportFormatter`, `ClawChivesExport` | `src/shared/lib/export/types.ts` |
| `ImportStep` (`"idle" \| "session" \| "done"`) | `src/features/settings/components/useLobsterSession.ts` |
| `NavTab`, `SettingsTab` | `src/features/dashboard/components/layout/SidebarNav.tsx` |

</details>

---

## 🦞 Ephemeral Lobster Session Flow

<details>
<summary>🔄 Session Lifecycle (Phase 4)</summary>

**Endpoints:**
- `POST /api/lobster-session/start` — generates `lb-eph-*` key (15min TTL)
- `POST /api/lobster-session/:id/close` — revokes key + returns accumulated errors

**Flow:**
```
1. User clicks "Ready" in LobsterImportModal
2. useLobsterSession.handleReady() → POST /api/lobster-session/start
3. Backend creates lb-eph-{48 chars} key, returns { sessionId, sessionKey }
4. SessionStep component displays masked key for copying
5. External agent uses key → POST /api/bookmarks/bulk with X-Session-Id header
6. Bulk endpoint accumulates per-item errors in import_sessions.errors_json
7. User clicks "Done" → handleDone() → closeLobsterSession(sessionId)
8. Backend revokes key (is_active = 0), returns accumulated errors
9. SessionResults shows success or error list; badge counts invalidate
```

**Key Constraints:**
- Ephemeral key: `canWrite` only (no read, edit, delete, move)
- Hard 15-minute TTL or manual close — whichever comes first
- Session scoped to `authReq.userUuid` — user isolation enforced
- Error accumulation: per-item, non-breaking (one bad URL ≠ failed session)

</details>

---

## 🔧 Utility Rules

<details>
<summary>⚙️ Always-Use List</summary>

| Task | Module | Function |
|---|---|---|
| Hash/verify a key | `src/shared/lib/crypto.ts` | `hashToken()` / `verifyToken()` |
| Generate a key | `src/shared/lib/crypto.ts` | `generateHumanKey()` / `generateAgentKey()` |
| Encrypt data | `src/shared/lib/crypto.ts` | `encryptData()` / `decryptData()` |
| Export bookmarks | `src/shared/lib/export/exportHub.ts` | `processExport()` |
| HTTP errors | `src/services/utils/errors.ts` | `ApiError` |

</details>

---

## 🧪 Test Infrastructure

<details>
<summary>🧬 Test Files & Commands</summary>

```bash
npm run test                    # All 131 tests
npm run test:lobster-session    # Lobster session (19 tests)
npm run test:phase3:full        # Phase 3 suite (109 tests)
npm run test:phase4:full        # Full suite (131 tests)
```

**Test helpers:**
- `tests/helpers/testDb.ts` — DB isolation, full schema, cleanup
- `tests/helpers/testFactories.ts` — User/folder/bookmark/agent key factories

**Test files:**
- `src/server/utils/parsers.test.ts` — 26 unit tests
- `src/shared/lib/crypto.test.ts` — 7 unit tests
- `tests/unit/middleware/errorHandler.test.ts` — 31 middleware tests
- `tests/security.test.js` — 3 integration tests
- `tests/bulk-import.test.js` — 20 integration tests
- `tests/lobster-session.test.ts` — 19 integration tests
- `tests/phase3-integration.test.ts` — 6 integration tests
- `tests/build-gates.test.ts` — 10 build validation tests

</details>

---

## 🔧 Dev Workflow & Gotchas

<details>
<summary>🚢 Commands & Known Issues</summary>

```bash
npm run scuttle:dev-start    # API @4646 + Vite @4545 (localhost only)
npm run scuttle:prod-start   # Production build + LAN servers
npm run build                # tsc + vite build
npm run lint                 # TypeScript check (0 errors required)
npm run test                 # Vitest all layers
```

**Gotchas:**
- **`tsx --watch`**: Does NOT support `--ignore` on Node v22. Silent crash risk.
- **`better-sqlite3` mismatch**: If port 4646 refuses connection → `npm rebuild better-sqlite3`
- **Port collision**: Use `npm run scuttle:prod-stop` to clear 4545/4646 before restarting.

</details>

---

## 🐚 Lobsterized Lexicon

| Code Term | UI Term |
|---|---|
| `bookmark` | **Pinchmark** |
| `folder` | **Pod** |
| `database` | **The Reef** |
| `agent key` | **Lobster Key** (`lb-`) |
| `identity key` | **ClawKey** (`hu-`) |
| `authorization` | **Identity Handshake** |

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
