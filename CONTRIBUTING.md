# 🤝 Contributing to ClawChives

[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen?style=for-the-badge)](#)
[![Code Style](https://img.shields.io/badge/Code_Style-ESLint%20%2B%20TypeScript-blue?style=for-the-badge)](#)

Thank you for your interest in contributing to ClawChives! This guide covers everything you need to get started.

---

## 📋 Table of Contents

<details>
<summary>Click to expand</summary>

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Branch Strategy](#-branch-strategy)
- [Development Conventions](#-development-conventions)
- [Architectural Rules](#-architectural-rules)
- [Submitting a Pull Request](#-submitting-a-pull-request)
- [Reporting Bugs](#-reporting-bugs)

</details>

---

## 🧭 Code of Conduct

Be respectful, collaborative, and constructive. Criticism should be directed at code, not people.

---

## 🚀 Getting Started

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/ClawChives.git
cd ClawChives

# 2. Install dependencies
npm install

# 3. Copy the environment config
cp .env.example .env

# 4. Start the development server
npm run dev
# → http://localhost:5173
```

For **SQLite mode** contributions, also run:
```bash
npm install express cors better-sqlite3
node server.js
# → http://localhost:4242/api/health
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `dev` | Active development integration |
| `feat/<name>` | New features (branch from `dev`) |
| `fix/<name>` | Bug fixes (branch from `dev`) |
| `docs/<name>` | Documentation-only updates |

```bash
# Create a feature branch
git checkout dev
git pull origin dev
git checkout -b feat/my-new-feature
```

---

## 🎨 Development Conventions

<details>
<summary>TypeScript & React standards</summary>

- **TypeScript strict mode** is enabled — no `any` unless justified with a comment explaining why.
- Use `import type` for type-only imports.
- Use **named exports**, not default exports (exception: React page-level components).
- All React components use **function syntax** with hooks.
- State variables use descriptive names — avoid `data`, `result`, `val`.
- Errors must be typed and handled explicitly. No silent `catch` blocks.

</details>

<details>
<summary>File & naming standards</summary>

- Component files: `PascalCase.tsx`
- Utility / service files: `camelCase.ts`
- Type definition files: `camelCase.ts` inside `types/`
- One component per file — no bundling multiple unrelated components.
- CSS via Tailwind utility classes only. No raw CSS files unless for global resets.

</details>

---

## 🏗️ Architectural Rules

> These are **non-negotiable** constraints that maintain the project's long-term maintainability.

1. **Separation of Concerns** — Components display. Services fetch/persist. Adapters abstract storage.
2. **Use the adapter** — Components must call `useDatabaseAdapter()`, never call `indexedDB.ts` or `fetch()` directly.
3. **No monolith files** — Files growing beyond ~150 lines are a signal to refactor into sub-modules.
4. **Auth stays client-side** — Never send `hu-*` identity keys to the server. Only `api-` and `ag-` tokens are server-side artifacts.
5. **Feature-first directories** — New component groups go inside a named feature folder (`components/myfeature/`), not flat in the components root.

---

## 📬 Submitting a Pull Request

1. Run `npm run build` — must pass with **zero TypeScript errors**.
2. Run `npm run lint` — must show **zero warnings**.
3. Update [BLUEPRINT.md](./BLUEPRINT.md) if you added or moved files.
4. Update [ROADMAP.md](./ROADMAP.md) if your change completes or introduces a roadmap item.
5. Write a clear PR description: **what** changed, **why**, and **how to test**.
6. Link any related GitHub Issues.

---

## 🐛 Reporting Bugs

Open a GitHub Issue with:
- Steps to reproduce (minimal reproduction preferred)
- Expected vs actual behaviour
- Browser + OS version
- Database mode (`INDEXEDDB` or `SQLITE`)
- Any console errors (screenshot or paste)

For **security vulnerabilities**, see [SECURITY.md](./SECURITY.md) — do **not** open a public issue.
