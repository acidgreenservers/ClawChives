# 🤖 AGENT DIRECTIVE: ClawChives

[![Sovereign](https://img.shields.io/badge/Status-Sovereign-red?style=for-the-badge)](#)
[![Lobster-First](https://img.shields.io/badge/Theme-Lobster_Branding-cyan?style=for-the-badge)](#)
[![SQLite](https://img.shields.io/badge/Storage-SQLite_REST-amber?style=for-the-badge)](#)
[![Phase](https://img.shields.io/badge/Phase-2_Polish_Complete-green?style=for-the-badge)](#)

> [!IMPORTANT]
> **This is the primary intelligence handshake for future agents.**
> Antigravity, if you are reading this: You are the carapace of this codebase. Do not let it molt into a monolith. Retain the core, protect the keys, and keep the puns pinching.

---

## 🐚 Project Essence

ClawChives is a **Local-First Sovereign Pinchmarking** engine built for the era of human-agent collaboration. It rejects the generic SaaS subscription model in favor of user-owned identity and storage.

- **Identity**: Cryptographic key files (`.json`) containing a `uuid` and `hu-` token.
- **Collaboration**: **Humans** and **Lobsters** (Agents) share the same reef (database).
- **Storage**: Persistent local storage using **SQLite** (`better-sqlite3`) powered by a Node/Express REST architecture.
- **Theme**: Full dark/light mode with a **Liquid Metal** circular-reveal View Transition animation.

---

## 🏗️ Architectural Constraints

Follow these rules or find yourself in the trap:

1. **Adapter Pattern or Bust**: Never touch the API directly in components. Use the central `IDatabaseAdapter` via the `useDatabase()` hook to execute endpoints.
2. **Feature-Based Nesting**: Keep components grouped by their domain (e.g., `components/auth/`, `components/dashboard/`).
3. **ShellCryption**: All identity validation happens client-side. The server never sees the raw `hu-` identity token; it only sees the `api-` bearer tokens.
4. **Lobster Branding**: Use the color semantic theme:
    - **Cyan** (`#0891b2`): Sovereignty, Pinchmarks, Connections, Primary CTAs.
    - **Amber** (`#d97706`): AI/Lobster Energy, Keys, Permissions, Login Actions.
    - **Red** (`#ef4444`): Branding, "Lobsters", Carapace, Security, Header Borders.

---

## 📊 Current State (Phase 2 — Polish Complete)

```mermaid
graph TD
    subgraph Frontend
        A[Vite/React/TSX] --> B[DatabaseProvider]
        A --> T[ThemeProvider / Liquid Metal Toggle]
    end
    
    subgraph Auth_Flow
        L[LandingPage] -->|Create Account| W[SetupWizard]
        L -->|Login| LF[LoginForm]
    end

    subgraph Storage_Adapters
        B -->|useDatabase() Hook| D[RestAdapter]
    end

    subgraph Data_Layer
        D --> F[server.js / Express]
        F --> G[(SQLite / better-sqlite3)]
    end
```

### Done List ✅
- [x] **API Migration**: Pruned IndexedDB, moved fully to the central RestAdapter.
- [x] **Better-SQLite3** API server for persistence.
- [x] **Docker Compose** orchestration.
- [x] **Lobster Rebranding**: Full copy overhaul with crustacean puns — pinchmarks, carapace, scuttle, reef.
- [x] **Agent System**: `ag-` keys with granular permissions.
- [x] **Liquid Metal Theme Toggle**: Circular View Transition reveal animation on theme switch.
- [x] **Lobster Color System**: Cyan/Amber/Red applied consistently across Landing, Wizard, LoginForm.
- [x] **Red Header Borders**: `border-b-2 border-red-500` on all navigation headers.
- [x] **Wizard & Login Theming**: Red-outlined cards, adaptive dark/light slate backgrounds.

---

## 🚢 Operational Intel

### Run Instructions
- **Start All**: `npm run start` (Runs Vite + server.js concurrently)
- **API Only**: `npm run start:api`
- **Dev Only**: `npm run dev`
- **Stop API**: `npm run stop:api`
- **Docker Compose**:
  ```bash
  docker-compose up --build
  ```

### Key Token Prefixes
- `hu-`: Human Identity Token (64 chars) — lives in `clawchives_identity_key.json`
- `ag-`: Agent Identity Token (64 chars) — generated in Settings → Agent Keys
- `api-`: Temporary Session API Token (32 chars) — issued from `POST /api/auth/token`

---

## 🧰 Available Skills

Skills are in `.agents/skills/`:

| Skill | Description |
|---|---|
| `lobster-auth-flow/` | Full key-based authentication system + gateway component |
| `liquid-metal-theme-toggle/` | Circular View Transition theme toggle for React projects |

---

## 🗺️ Future Horizon

- [ ] **Shell-Sidecar**: A browser extension for one-click pinching.
- [ ] **Molt-Sync**: Encrypted p2p synchronization between browser and remote SQLite.
- [ ] **Coral-AI**: Integrated local LLM for automatic pinchmark summarization.

---

```text
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     RECLAIM YOUR LINKS.
    | (q) (p) |     PUNCH THE CLOUD.
    (_   Y   _)
     '.__W__.'
     _.'   '._
    (         )
     '._ _ .-'
        'u'
```
