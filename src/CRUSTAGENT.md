# 🦞 src/CRUSTAGENT.md — Source-Level Intelligence Directive

> **Atomic reference for agents scuttling through the `src/` directory.**
> 
> Focus: Component patterns, stability locks, and state invariants. No philosophy — just code.

---

## 📂 File Map & Feature Nesting

- `src/components/`: Feature-scoped UI (`auth/`, `dashboard/`, `settings/`).
- `src/services/`: Business logic. Final source of truth is the **Shell** (server.js), UI is the **Carapace**.
- `src/lib/`: Low-level primitives (`crypto.ts`, `api.ts`).
- `src/config/`: Deployment configuration (`apiConfig.ts`).

---

## 🔐 Logic & Stability Invariants

### 1. API Communication (The Stability Lock)
- **Adapter Only**: Never use `fetch`/`axios` directly in components. Use `useDatabaseAdapter()` from `src/services/database/DatabaseProvider.tsx`.
- **URL Resolution**: Always use `getApiBaseUrl()` from `src/config/apiConfig.ts`. 
- **Vite Env Replacement**: Do NOT refactor the literal `import.meta.env.VITE_API_URL` string. It breaks the build-time replacement.

### 2. State & Session Invariants
- **sessionStorage**: All session state lives here (`cc_api_token`, `cc_user_uuid`, `cc_key_type`).
- **One-Field Login**: Paste mode in `LoginForm.tsx` only requires the `hu-` key. UUID and Username are hidden by default (`showAdvanced`).
- **Theme Restore**: Synchronously initialize `cc_view` and `cc_theme` to prevent flashes.

### 3. Key System Constants
- **Entropy**: Keys (hu-/lb-) are high-entropy random strings.
- **Hashing**: Use `hashToken()` and `verifyToken()` from `src/lib/crypto.ts`. Never roll your own.
- **Modulo 62**: Alphanumeric mapping for high-entropy generation.

---

## 🏗️ Atomic Component Patterns

- **Lobster-First Aesthetic**: Cyan (`#0891b2`) = Identity, Amber = Keys, Red = Branding.
- **Glassmorphism**: Use `backdrop-blur` and `bg-white/10` for the Liquid Metal look.
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
- **Node Rebuild**: If `net::ERR_CONNECTION_REFUSED` occurs on startup during dev, run `npm rebuild better-sqlite3`.
- **IDB Versions**: Respect the versioning in `connection.ts` if adding schema stores.

---

```text
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     KEEP THE DIRECTIVES ATOMIC.
    | (q) (p) |     RESPECT THE SHELL.
    (_   Y   _)
     '.__W__.'
```
