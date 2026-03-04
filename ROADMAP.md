# 🗺️ ClawChives — Roadmap

[![Phase](https://img.shields.io/badge/Phase-2%20Active-00cc66?style=for-the-badge)](#)
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
    Agent Key System (ag-)      :done,    p2a, 2026-03-04, 1d
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
- [x] **Agent Key System** — `ag-` agent keys with permission levels, expiry, and rate limits
- [x] **IndexedDB Hardening** — Fixed index-not-found migrations; scan-based lookups for resilience
- [x] **Session Persistence** — `sessionStorage` preserves auth + view state across browser refreshes
- [x] **Dual Database Architecture** — `VITE_DATABASE=INDEXEDDB | SQLITE` env var toggles storage backend
- [x] **REST API Server** (`server.js`) — Express + SQLite with full CRUD for bookmarks, folders, agent keys, settings
- [x] **Docker Dual-Profile** — `indexeddb` and `sqlite` compose profiles
- [ ] Full unit test suite for services layer
- [ ] Export/Import UI for bookmarks (JSON & CSV)
- [ ] Dark mode toggle in Appearance Settings

</details>

---

## 🔜 Phase 3 — Hardening & Polish

- [ ] Comprehensive component unit tests (Vitest + React Testing Library)
- [ ] End-to-end test suite (Playwright)
- [ ] WebSocket-based real-time bookmark sync in SQLite mode
- [ ] Background service worker for IndexedDB backups
- [ ] Vite bundle chunking optimisation
- [ ] Progressive Web App (PWA) manifest + offline support
- [ ] Bookmark favicon auto-fetch

---

## 🔭 Phase 4 — Lobster Ecosystem Integration

- [ ] Lobster News Network API integration
- [ ] Browser extension (Chrome/Firefox) for one-click bookmarking
- [ ] Multi-device sync via user-controlled relay server
- [ ] Webhook support for `ag-` keys
- [ ] Public read-only share links for bookmark collections

---

## 💡 Future Explorations

- [ ] Multi-user/team bookmark collections
- [ ] AI-powered tag suggestions
- [ ] Read-later with offline article caching
