# 🦞 src/GEMINI.md — ClawChives Frontend Intelligence

> **Atomic directive for Gemini agents scuttling through the `src/` directory.**
> 
> Focus: Component patterns, state invariants, and the Lobster UI standard. For system architecture, see root `GEMINI.md`.

---

## 🏗️ Atomic Component Patterns

### 1. The "Lobster-First" UI
- **Aesthetic**: Use **Cyan** (`#0891b2`) for core actions/identity, **Amber** for keys/security alerts, and **Red** for branding/destructive actions.
- **Glassmorphism**: Favor `bg-white/10` or `bg-slate-900/10` with `backdrop-blur` for a premium "Liquid Metal" feel.
- **Visual Lock**: Component positions are spatially frozen. If adding a new feature, tuck it into a collapsible container or a modal (`LobsterModal`).

### 2. Authentication Gates
- **One-Field Login**: Paste mode in `LoginForm.tsx` only requires the `hu-` key.
- **Advanced Options**: UUID and Username are hidden by default (`showAdvanced` state).
- **Session Keys**:
  - `cc_api_token`: Current bearer.
  - `cc_key_type`: `"human" | "agent"`. Gating human-only features (e.g., `r.jina.ai`).
  - `cc_view`: persists view state across refreshes.

---

## 🔐 Logic Invariants

### 1. API Communication
- **Adapter Only**: Never use `fetch` or `axios` directly in components. Use `useDatabaseAdapter()` from `src/services/database/DatabaseProvider.tsx`.
- **URL Resolution**: Always use `getApiBaseUrl()` from `src/config/apiConfig.ts` to ensure Docker/LAN/Local portability.

### 2. Database (SQLite via REST)
- The UI is a **Carapace**; truth is in the **Shell** (server.js).
- **Optimistic UI**: Update local React state immediately, but always handle `apiFetch` failures with descriptive `ErrorToast` or `p` alerts using the server's `suggestion` field.

---

## 🐚 Lobsterized Lexicon
- `Bookmark` (Code) → **Pinchmark** (UI)
- `Authorization` → **Identity Handshake**
- `Database` → **The Reef**
- `API Keys` → **Lobster Keys** (`lb-`) or **ClawKeys** (`hu-`)

---

## 🔧 Maintenance Gotchas
- **Vite Env**: Do NOT refactor the literal `import.meta.env.VITE_API_URL` string in `apiConfig.ts`. It breaks the build-time replacement.
- **Node Rebuild**: If `net::ERR_CONNECTION_REFUSED` occurs during dev, verify the API process is alive. If it crashed on startup, run `npm rebuild better-sqlite3`.

---

```text
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     KEEP THE DIRECTIVES ATOMIC.
    | (q) (p) |     RESPECT THE SHELL.
    (_   Y   _)
     '.__W__.'
```
