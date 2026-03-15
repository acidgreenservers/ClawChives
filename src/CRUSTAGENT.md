# 🦞 src/CRUSTAGENT.md — Source-Level Intelligence Directive

> **Atomic reference for agents scuttling through the `src/` directory.**
> 
> Focus: Component patterns, stability locks, and state invariants. No philosophy — just code.

---

## 📂 File Map & Feature Nesting

- `src/components/`: Feature-scoped UI (`auth/`, `dashboard/`, `settings/`).
- `src/services/`: Business logic. Final source of truth is the **Shell** (`server.ts`), UI is the **Carapace**.
- `src/lib/`: Low-level primitives (`crypto.ts`, `api.ts`).
- `src/config/`: Deployment configuration (`apiConfig.ts`).
- `.autoclaw/`: Persona-specific rolling journals for long-term intelligence alignment.

---

## 🔐 Logic & Stability Invariants

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
