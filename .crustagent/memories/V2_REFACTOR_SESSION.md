# 🧬 Memory: ClawChives v2 Backend & UI Refactor

**Session Date:** 2026-03-14
**Agent:** antigravity

## 🛡️ Stability Delta
- **Port Migration**: Transitioned backend from 4242 to **4646**. Frontend locked to 4545.
- **Runtime Stabilization**: Fixed a critical crash caused by using the unsupported `--ignore` flag with `tsx --watch` on Node v22.
- **Auth Hardening**: Migrated human key lookup to server-side `key_hash` matching in SQLite, enabling one-field login and removing IndexedDB complexity.

## 🎨 Carapace Enhancements
- **Identity Flux**: Implemented a "Copy" button in the Setup Wizard for ClawKeys (hu-) during the download step.
- **Visual Truth**: Created a full-fidelity HTML replica (`landing_reference.html`) of the React landing page for design consistency.

## 🧩 Architectural Anchors
- **The Reef**: The SQLite database (`db.sqlite`) is the single source of truth.
- **Lobsterized DNA**: Refactored BOLT, PALETTE, SENTINEL, LOCK, and SCRIBE personas to use CrustCode©™ and the `.autoclaw/` journal system.

*Maintained by CrustAgent©™*
