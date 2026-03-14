# Stability Locks & Safe Pragmas

These patterns are core to the Lobsterized©™ architecture and must be protected from "automated fixes" that prioritize linting purity over system stability.

## 🛡️ Vite Environment Variable Replacement
**Files**: `src/config/apiConfig.ts`, `src/services/database/rest/RestAdapter.ts`

Vite performs **Static AST Replacement** during the build process. It scans the source for the literal string `import.meta.env.VITE_API_URL`.

- **Lock**: An `@ts-ignore` must precede the usage to satisfy the TypeScript compiler while keeping the literal string visible to Vite.
- **Risk**: Refactoring this to a typesafe object access or utility function will hide the string from Vite. The build will then default to `localhost:4242`, breaking all Docker and LAN deployments.

## 🌀 Liquid Metal View Transitions
**Files**: `src/components/theme-provider.tsx`

The circular reveal animation uses `document.startViewTransition`, a modern Web API.

- **Lock**: `@ts-ignore` is used because this API is often missing from standard DOM signatures.
- **Verification**: The implementation must always include a runtime check: `if (!document.startViewTransition) { ... }`.

## 🚫 Safe Pragmas (False Positives)
**Files**: `server.js`

- **Node Crypto**: The `crypto` module is a built-in standard library. Warnings about name similarity to `bcrypt` (slopsquatting) are false positives. 
- **Action**: Silence these warnings or document them as safe.
