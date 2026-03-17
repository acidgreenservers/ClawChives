# Audit Gate Enforcer

**Purpose:** Prevent audit fatigue by requiring explicit user signals before running audits.

---

## Rules

### Security Audits are OFF by default
- ✅ Run `npm audit` for HIGH/CRITICAL npm vulnerabilities only
- ✅ Run security-auditor ONLY if user says "audit security" or "security review"
- ❌ Do NOT run proactive security hardening (that's security theatre)
- ❌ Do NOT add extra validation "just in case"

**Signal:** User explicitly requests audit in their message

---

### Code Quality Audits are OFF by default
- ✅ Run code-auditor ONLY if user says "code review" or "audit code"
- ❌ Do NOT generate improvement suggestions unless asked
- ❌ Do NOT refactor "while we're here"

**Signal:** User explicitly requests audit in their message

---

### Test Suite is ALWAYS ON
- ✅ Run `npm test` before every commit
- ✅ Verify 13/13 passing
- ✅ Fail commit if tests fail

**No signal needed — this is required**

---

### Dependency Updates
- ✅ Check `npm audit` for HIGH/CRITICAL CVE severity ONLY
- ❌ Ignore MODERATE/LOW severity (they are noise for self-hosted apps)
- ✅ Update only if blocking release

**Threshold:** CVSS >= 7.0 (HIGH/CRITICAL)

---

### Production Readiness
- ✅ Run only when user says "deploy", "release", or "production"
- ✅ Checklist: tests passing, no blocking vulns, builds clean
- ❌ Do NOT create readiness reports unless asked

**Signal:** Release/deployment context in user message

---

## Enforcement

**If I (as Agent) attempt to:**
1. Run security-auditor without user request → Stop, ask user if they want this
2. Suggest refactoring without code-review request → Stop, don't suggest
3. Run full npm audit for MODERATE CVEs → Only report HIGH/CRITICAL
4. Create audit reports without being asked → Stop, only provide what's requested

**This prevents:**
- Audit fatigue (multiple scans per session)
- Security theatre (adding hardening that wasn't requested)
- Status-seeking (making work visible by creating unnecessary reports)
- Scope creep (fixing "other things while we're here")

---

## Exception: Blocking Issues

If I detect an actual **blocking issue** (tests failing, build broken, deployment preventing):
- ✅ I *will* report it immediately
- ✅ I *will* ask for permission to fix
- ❌ I will NOT fix without confirmation

**Example:** "Tests are failing. Should I fix this before continuing?"

---

**Maintained by CrustAgent©™**
**Last Updated:** 2026-03-16
