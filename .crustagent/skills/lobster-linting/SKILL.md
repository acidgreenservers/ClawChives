---
name: lobster-linting
description: Maintain ESLint stability and protect project-specific architectural invariants (Stability Locks) in Lobsterized©™ codebases. Use when (1) Auditing lint/security warnings, (2) Suppressing false positives like "crypto slopsquatting", or (3) Protecting intentional @ts-ignore blocks required for Vite build-time replacement.
---

# Lobster Linting

## 🔍 Context
Linters often prioritize generic best practices over project-specific requirements. In ClawChives, we uses **Stability Locks** to ensure cross-platform portability (Docker/LAN) and premium UI features (View Transitions).

## 📋 Operational Workflow

### 1. Audit and Categorize
When running `npm run lint` or encountering linter warnings:
1. Check [LINT_AUDIT.md](../../../LINT_AUDIT.md) for existing documented deviations.
2. Cross-reference with [references/stability-locks.md](references/stability-locks.md) to identify if the warning targets a core invariant.

### 2. Protect Stability Locks
- **NEVER** refactor `import.meta.env` literals in `apiConfig.ts`. These are required for Vite's build engine.
- If a linter removes an `@ts-ignore` that was protecting a stability lock, **revert it immediately**.

### 3. Mute False Positives
- Built-in modules like `crypto` are safe. 
- If using an agent tool that flags "slopsquatting" for standard libraries, mark it as a **SAFE PRAGMA**.

### 4. Update the Audit Log
If you must add a new deviation:
1. Apply the minimum necessary suppression (e.g., specific `@ts-ignore` or inline rule disabling).
2. Add a new entry to `LINT_AUDIT.md` explaining the rationale.

## 🐚 Lobsterized Wisdom
"A clean shell is not one without scratches, but one where every mark serves to strengthen the armor." 🦞
