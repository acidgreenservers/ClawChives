---
agent: fix-planner
status: warn
findings: 4
---

# Prioritized FIXES

## Priority 1: Critical Stability & Docs

### 1. Update Truthpack Blueprint
- **Severity**: High
- **Location**: `truthpack/blueprint.json`
- **Audit**: Doc Auditor
- **Remediation**: Re-scan the new `src/server/` structure and update the blueprint to reflect the reality of the v2 architecture.

## Priority 2: Deployment Polish

### 2. Move `tsx` to dependencies
- **Severity**: Low
- **Location**: `package.json`
- **Audit**: Dep Auditor / Infra Auditor
- **Remediation**: Move `tsx` from `devDependencies` to `dependencies` to ensure the production Docker build (using `--omit=dev`) can still execute the server.

## Priority 3: Housekeeping

### 3. Cleanup Legacy Logic
- **Severity**: Low
- **Location**: Project Root & `src/`
- **Audit**: Code Auditor
- **Remediation**: Delete `server.js`, `src/middleware/`, `src/utils/`, and `src/validation/` once the v2 branch is merged and verified in the target environment.

### 4. Update Roadmap
- **Severity**: Low
- **Location**: `ROADMAP.md`
- **Audit**: Doc Auditor
- **Remediation**: Update Roadmap to reflect Phase 3 completion.

## Summary Metrics
- **Total Audits**: 11
- **Total Findings**: 4
- **Critical Issues**: 1 (Docs mismatch)
