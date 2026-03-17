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

# 4. Review the system architecture
# See BLUEPRINT.md for the full technical blueprint

# 5. Start the frontend and backend servers together
npm run scuttle:dev-start
# → Frontend: http://localhost:4545 (development, HMR enabled)
# → Backend: http://localhost:4646/api/health

# Or run individual servers in separate terminals:
# Terminal 1: npm run start:api        (API on :4646)
# Terminal 2: npm run dev              (UI on :4545 with HMR)
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

> These are **non-negotiable** constraints that maintain long-term maintainability.

1. **Separation of Concerns** — Components display, services persist, adapters abstract storage
   - See [BLUEPRINT.md § Architectural Tenets](./BLUEPRINT.md) for details

2. **Use REST Architecture** — All data operations via Express server (no direct DB access)
   - See [BLUEPRINT.md § Data Flow](./BLUEPRINT.md) for request cycle

3. **No Monolith Files** — Files >150 lines signal refactoring need
   - See [BLUEPRINT.md § Component Patterns](./BLUEPRINT.md)

4. **Auth Stays Client-Side** — Never send `hu-*` keys to server (only `api-` and `lb-` tokens)
   - See [BLUEPRINT.md § Key System Architecture](./BLUEPRINT.md)

5. **Feature-First Directories** — New components in named folders, not flat root
   - See [BLUEPRINT.md § Directory Structure](./BLUEPRINT.md)

---

## 📬 Submitting a Pull Request

1. Run `npm run lint && npm run build` to validate TypeScript & ESLint
2. Ensure all new endpoints have corresponding Zod validation schemas
3. Update [BLUEPRINT.md](./BLUEPRINT.md) if you added or moved files
4. Update [ROADMAP.md](./ROADMAP.md) if your change completes or introduces a roadmap item
5. Write a clear PR description: **what** changed, **why**, and **how to test**
6. Link any related GitHub Issues

---

## 🐛 Reporting Bugs

Open a GitHub Issue with:
- Steps to reproduce (minimal reproduction preferred)
- Expected vs actual behaviour
- Browser + OS version
- Any console errors (screenshot or paste)

For **security vulnerabilities**, see [SECURITY.md](./SECURITY.md) — do **not** open a public issue.

---

## 📚 Related Documentation

- **[README.md](./README.md)** — Project overview and setup instructions
- **[BLUEPRINT.md](./BLUEPRINT.md)** — Architecture and implementation patterns
- **[SECURITY.md](./SECURITY.md)** — Security policy and hardening guide
- **[CRUSTSECURITY.md](./CRUSTSECURITY.md)** — ClawStack©™ standards alignment
- **[ROADMAP.md](./ROADMAP.md)** — Current and future development direction
