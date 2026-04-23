# 🔍 Lint & Security Audit: ClawChives

This document tracks accepted lint deviations and security false positives in the codebase. These are **Stability Locks** or **Core Invariants** and should not be refactored without extreme caution.

---

## 🛡️ Accepted Deviations (Stability Locks)

### 1. Vite Environment Replacement (`@ts-ignore`)
- **Location**: [`src/config/apiConfig.ts`](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/config/apiConfig.ts#L20-22)
- **Warning**: `TypeScript safety bypassed with @ts-ignore`
- **Rationale**: **CRITICAL STABILITY LOCK**. Vite performs static string replacement at build time. It requires the *exact literal string* `import.meta.env.VITE_API_URL` to be visible. Refactoring this to a typesafe pattern (e.g., casting or utility functions) hides the literal from Vite's engine, causing build artifacts to fail in Docker/LAN environments by hardcoding "localhost".
- **Action**: **DO NOT REFACTOR.** The `@ts-ignore` is intentional.

### 2. Liquid Metal View Transitions (`@ts-ignore`)
- **Location**: [`src/components/theme-provider.tsx`](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/src/components/theme-provider.tsx#L55-62)
- **Warning**: `TypeScript safety bypassed with @ts-ignore`
- **Rationale**: Uses the specialized `document.startViewTransition` API for the circular theme "Liquid Metal" reveal. As a modern Web API, it is frequently missing from standard TypeScript DOM type definitions.
- **Action**: **ACCEPTED.** The code includes a runtime check for feature support before execution.

---

## 🚫 Security False Positives

### 1. Crypto Module Similarity (SLOP001)
- **Location**: [`server.js`](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/ClawChives/server.js#L28)
- **Warning**: `Slopsquatting risk: "crypto" is suspiciously similar to "bcrypt"`
- **Rationale**: `crypto` is a **built-in Node.js core module**. The warning is a heuristic based on name distance to `bcrypt`. Using the standard library is the correct and secure practice.
- **Action**: **IGNORE.** This is a linter hallucination/over-sensitivity.

---

## 📜 Audit Verdict
> All reported warnings as of 2026-03-09 are either **Intentional Design Decisions** for cross-platform stability or **Linter Documentation Hallucinations**.
