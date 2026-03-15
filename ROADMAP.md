# 🗺️ ClawChives — Roadmap

[![Phase](https://img.shields.io/badge/Phase-3%20Hardening-00cc66?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-In_Development-orange?style=for-the-badge)](#)

This document tracks where ClawChives has been, where it is now, and where it's going.

---

## Timeline Overview

```mermaid
gantt
    title ClawChives Evolution
    dateFormat  YYYY-MM-DD
    section Phase 1 — Foundation
    Vite + React Scaffold       :done,    p1a, 2026-03-01, 2026-03-03
    Docker + Docs Suite         :done,    p1b, 2026-03-03, 1d
    IndexedDB Auth System       :done,    p1c, 2026-03-03, 1d
    IndexedDB Fixes (index)     :done,    p1d, 2026-03-04, 1d
    section Phase 2 — Agent & API
    Agent Key System (lb-)      :done,    p2a, 2026-03-04, 1d
    Identity Key Export (hu-)   :done,    p2b, 2026-03-04, 1d
    Session Persistence         :done,    p2c, 2026-03-04, 1d
    Dual Database Architecture  :done,    p2d, 2026-03-04, 1d
    REST API (server.js)        :done,    p2e, 2026-03-04, 1d
    section Phase 3 — Hardening
    Full Test Suite             :         p3a, after p2e, 14d
    WebSocket Sync              :         p3b, after p3a, 10d
    Export / Import Tools       :         p3c, after p3a, 7d
    section Phase 4 — Ecosystem
    Lobster Network API         :         p4a, after p3b, 14d
    Browser Extension           :         p4b, after p4a, 21d
```

---

## ✅ Phase 1 — Foundation

<details>
<summary>View completed items</summary>

- [x] Vite + React + TypeScript scaffold
- [x] TailwindCSS + shadcn/ui component system
- [x] Docker containerization with volume bind mounts
- [x] Full documentation suite (README, ROADMAP, BLUEPRINT, CONTRIBUTING, SECURITY)
- [x] IndexedDB core storage layer
- [x] Setup Wizard (first-run onboarding)
- [x] Landing page

</details>

---

## 🔄 Phase 2 — Agent & API Layer *(Active)*

<details>
<summary>View completed & in-progress items</summary>

- [x] **Identity Key System** — `hu-` human keys with UUID + JSON export (`clawchives_identity_key.json`)
- [x] **Agent Key System** — `lb-` agent keys with expiration, rate limits, and **granular CUSTOM permissions**
- [x] **SQLite-Only Architecture** — Dropped IndexedDB entirely for a centralized robust SQLite backend
- [x] **REST API Server** (`server.js`) — Express + SQLite mapped securely to user UUIDs
- [x] **Strict API Middleware** — `requirePermission` rigidly enforces `canRead/Write/Delete/Move/Edit`
- [x] **File Download Fallbacks** — Download Identity keys and individual Lobster keys cross-origin
- [x] **Lobsterized UI Modals** — Brand-colored Confirm/Alert/Block modals replacing browser dialogs
- [x] **Docker Dual-Profile** — `dev` and `api` compose profiles mapped to local volumes
- [ ] Export/Import UI for bookmarks (JSON & CSV)
- [x] Liquid Metal Dark mode toggle via View Transitions
- [x] **r.jina.ai Reading Mode** — LLM-friendly markdown conversion with dual-click context menu
- [x] **One-Field Login** — Simplified authentication via `hu-` key alone
- [x] **Database Migration Safety** — Automated uniqueness enforcement for `key_hash`
- [x] **V2 Backend Refactor** — Migrated to TypeScript feature-split architecture (`src/server/`) matching PinchPad

</details>

---

## 🔜 Phase 3 — Hardening & Polish

- [ ] Comprehensive component unit tests (Vitest + React Testing Library)
- [ ] End-to-end test suite (Playwright)
- [ ] WebSocket-based real-time bookmark sync SQLite
- [ ] Vite bundle chunking optimisation
- [ ] Progressive Web App (PWA) manifest + offline support
- [ ] Bookmark favicon auto-fetch

---

## 🔭 Phase 4 — Lobster Ecosystem Integration

- [ ] Lobster News Network API integration
- [ ] Browser extension (Chrome/Firefox) for one-click bookmarking
- [ ] Multi-device sync via user-controlled relay server
- [ ] Webhook support for `lb-` keys
- [ ] Public read-only share links for bookmark collections
- [ ] r.jina.ai integration for bookmark summarization in markdown for lobster parsing

---

## 💡 Future Explorations

- [ ] Multi-user/team bookmark collections
- [ ] AI-powered tag suggestions
- [ ] Read-later with offline article caching
