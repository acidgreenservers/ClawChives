# 🦞 ClawChives

<div align="center">

```
  ██████╗██╗      █████╗ ██╗    ██╗ ██████╗██╗  ██╗██╗██╗   ██╗███████╗███████╗
 ██╔════╝██║     ██╔══██╗██║    ██║██╔════╝██║  ██║██║██║   ██║██╔════╝██╔════╝
 ██║     ██║     ███████║██║ █╗ ██║██║     ███████║██║██║   ██║█████╗  ███████╗
 ██║     ██║     ██╔══██║██║███╗██║██║     ██╔══██║██║╚██╗ ██╔╝██╔══╝  ╚════██║
 ╚██████╗███████╗██║  ██║╚███╔███╔╝╚██████╗██║  ██║██║ ╚████╔╝ ███████╗███████║
  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚══════╝
```

*A self-hosted, dual-mode bookmark manager for the Lobster Ecosystem*

</div>

---

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)](#)

---

## 📜 Table of Contents

<details>
<summary>Click to expand</summary>

- [About](#-about)
- [Database Modes](#-database-modes)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Mode 1 — IndexedDB (Local / GitHub Pages)](#mode-1--indexeddb-local--github-pages)
  - [Mode 2 — SQLite (Docker / Self-Hosted)](#mode-2--sqlite-docker--self-hosted)
- [API Reference](#-api-reference)
- [Key System](#-key-system)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Security](#-security)

</details>

---

## 📌 About

**ClawChives** is a privacy-first, self-hostable bookmark manager built with Vite + React + TypeScript. It stores your bookmarks locally in the browser (`IndexedDB`) or persistently on your own server (`SQLite`) — your choice.

- 🔐 **Identity Key Authentication** — login with a generated JSON identity file, not a password
- 🤖 **Agent Key System** — generate API access keys (`ag-`) for automated agents and scripts
- 🗄️ **Dual Database** — swap between browser-local IndexedDB and server-side SQLite via one env var
- 🐳 **Docker-First** — fully containerized with persistent volume mounts

---

## 🗄️ Database Modes

ClawChives supports two storage backends, controlled by `VITE_DATABASE`:

| Mode | `VITE_DATABASE` | Hosting | Server Required |
|---|---|---|---|
| **IndexedDB** | `INDEXEDDB` *(default)* | GitHub Pages, Netlify, any CDN | ❌ No |
| **SQLite** | `SQLITE` | Docker, VPS, self-hosted | ✅ Yes (`server.js`) |

> Auth (identity key file, `hu-`/`ag-` tokens) always validates **client-side** in both modes. Your private key never leaves the browser.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Client ["🌐 Browser"]
        UI[React / Tailwind UI]
        Auth[Auth Module<br/>SetupWizard + LoginForm]
        Provider[DatabaseProvider<br/>useDatabaseAdapter hook]
        IDB[IndexedDBAdapter]
        REST[RestAdapter]
        IStore[(Browser IndexedDB)]
    end

    subgraph Server ["🖥️ server.js — optional"]
        API[Express REST API<br/>Port 4242]
        DB[(SQLite db.sqlite)]
    end

    UI --> Auth
    UI --> Provider
    Provider -->|VITE_DATABASE=INDEXEDDB| IDB
    Provider -->|VITE_DATABASE=SQLITE| REST
    IDB --> IStore
    REST -->|fetch + Bearer token| API
    API --> DB
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+
- **npm** v10+
- **Docker & Docker Compose** *(for containerized modes)*

---

### Mode 1 — IndexedDB (Local / GitHub Pages)

No server required. All data stays in the browser.

```bash
# ── Copy environment config ──────────────────────────────
cp .env.example .env
# Leave VITE_DATABASE=INDEXEDDB (default)

# ── Install dependencies ─────────────────────────────────
npm install

# ── Start development server ──────────────────────────────
npm run dev
# → http://localhost:5173

# ── Production build (deploy dist/ anywhere) ──────────────
npm run build
```

**Docker — IndexedDB mode:**
```bash
docker-compose --profile indexeddb up -d --build
# → http://localhost:5173

# Stop
docker-compose --profile indexeddb down
```

---

### Mode 2 — SQLite (Docker / Self-Hosted)

Persistent server-side storage. Requires `server.js` alongside the frontend.

**Local development (2 terminals):**
```bash
# Terminal 1 — API server
npm install express cors better-sqlite3
node server.js
# → http://localhost:4242/api/health

# Terminal 2 — Frontend
VITE_DATABASE=SQLITE VITE_API_URL=http://localhost:4242 npm run dev
# → http://localhost:5173
```

**Docker — SQLite mode (recommended):**
```bash
# Edit DATABASE variable if needed (SQLITE | INDEXEDDB)
DATABASE=SQLITE docker-compose --profile sqlite up -d --build

# View logs
docker-compose logs -f claw-chives-api

# Stop
docker-compose --profile sqlite down
```

Data is persisted in the `sqlite_data` Docker volume at `/app/data/db.sqlite`.

---

## 🔌 API Reference

> All endpoints except `/api/health` and `/api/auth/token` require `Authorization: Bearer <api-token>`.

<details>
<summary>View full API endpoint table</summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + record counts |
| `POST` | `/api/auth/token` | Issue `api-` token from `hu-` or `ag-` key |
| `GET` | `/api/auth/validate` | Validate current Bearer token |
| `GET` | `/api/bookmarks` | List all bookmarks (filterable) |
| `POST` | `/api/bookmarks` | Create bookmark |
| `GET` | `/api/bookmarks/:id` | Get single bookmark |
| `PUT` | `/api/bookmarks/:id` | Update bookmark |
| `DELETE` | `/api/bookmarks/:id` | Delete bookmark |
| `PATCH` | `/api/bookmarks/:id/star` | Toggle star |
| `PATCH` | `/api/bookmarks/:id/archive` | Toggle archive |
| `GET` | `/api/folders` | List all folders |
| `POST` | `/api/folders` | Create folder |
| `PUT` | `/api/folders/:id` | Update folder |
| `DELETE` | `/api/folders/:id` | Delete folder |
| `GET` | `/api/agent-keys` | List agent keys |
| `POST` | `/api/agent-keys` | Create agent key |
| `PATCH` | `/api/agent-keys/:id/revoke` | Revoke agent key |
| `DELETE` | `/api/agent-keys/:id` | Delete agent key |
| `GET` | `/api/settings/:key` | Get setting |
| `PUT` | `/api/settings/:key` | Update setting |

</details>

---

## 🔑 Key System

ClawChives uses a prefix-based cryptographic key system:

| Prefix | Type | Usage |
|---|---|---|
| `hu-` | **Human Key** | Your personal identity key (in `clawchives_identity_key.json`) |
| `ag-` | **Agent Key** | For automated scripts/agents (generated in Settings) |
| `api-` | **REST Token** | Short-lived token for API access (issued via `POST /api/auth/token`) |

All keys are 64-character random strings. Your `hu-` key is paired with a UUID and exported as a JSON identity file — **keep it safe, it cannot be recovered**.

---

## 🛠️ Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR on `http://localhost:5173` |
| `npm run build` | TypeScript check + Vite production bundle → `dist/` |
| `npm run preview` | Serve the production `dist/` locally |
| `npm run lint` | ESLint check across all `.ts` / `.tsx` files |
| `node server.js` | Start the Express/SQLite API server on port `4242` |

---

## 📂 Project Structure

See [BLUEPRINT.md](./BLUEPRINT.md) for the full ASCII construction diagram.

```
ClawChives/
├── src/
│   ├── components/          # Feature-scoped UI components
│   │   ├── auth/            # SetupWizard + LoginForm
│   │   ├── dashboard/       # Bookmark grid, sidebar, modals
│   │   ├── landing/         # Unauthenticated landing page
│   │   └── settings/        # AgentKey, Profile, Appearance
│   ├── services/
│   │   └── database/
│   │       ├── adapter.ts           # IDatabaseAdapter interface
│   │       ├── DatabaseProvider.tsx # React context + hook
│   │       ├── indexeddb/           # IndexedDBAdapter
│   │       └── rest/                # RestAdapter (SQLite mode)
│   └── lib/
│       └── indexedDB.ts     # Low-level IndexedDB API
├── server.js                # Express + SQLite API server
├── Dockerfile               # Frontend container
├── Dockerfile.api           # API server container
├── docker-compose.yml       # Dual-profile orchestration
└── .env.example             # Environment variable reference
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## 🛡️ Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and key security practices.

---

<div align="center">

*Maintained with 🦞 by Lucas*

</div>
