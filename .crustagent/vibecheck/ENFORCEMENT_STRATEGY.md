# Enforcement Strategy — How VibeCheck Works

## The Triangle: Truthpack → Rules → Gates

```
┌─────────────────────────────────────────────────────────┐
│ TRUTHPACK (261 lines)                                   │
│ ├─ What CAN be changed (stability-locks.json)           │
│ ├─ What CANNOT be changed (auth.json, env.json)         │
│ └─ How routes work (routes.json, contracts.json)        │
└─────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────────┐
│ RULES (262 lines)                                       │
│ ├─ truthpack-enforcer.md    → Check code matches truth  │
│ ├─ drift-watcher.md         → Detect architecture drift │
│ ├─ audit-gate-enforcer.md   → Control when audits run   │
│ └─ stability-locks.md       → Prevent breaking changes  │
└─────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────────┐
│ GATES (audit-gates.json)                                │
│ ├─ security-audit       OFF (on request only)           │
│ ├─ code-quality-audit   OFF (on request only)           │
│ ├─ test-suite          ON (always)                      │
│ ├─ dependency-audit    ON (HIGH/CRITICAL only)          │
│ └─ production-ready    OFF (on release only)            │
└─────────────────────────────────────────────────────────┘
```

---

## The Problem We Solved

**Before:** You had 30 narrow agent specs (824 lines) with no "off" switch. Each one independently looked for issues and suggested fixes. Result: audit fatigue, security theatre, broken docker.

**After:** Agents still exist, but they check audit gates first.

---

## How I (Agent) Should Use This

### When you give me a task:

1. **Check the gates**
   - Is this task behind a gate that's OFF?
   - If yes, ask: "Want me to run this audit?"
   - If no, proceed

2. **Check the truthpack**
   - Does my change violate stability-locks.json?
   - If yes, stop and ask why
   - If no, proceed

3. **Check the rules**
   - Does my change match the pattern?
   - If no, fix to match
   - If yes, proceed

4. **Run required tests**
   - `npm test` always runs
   - Always verify before commit

---

## The Key Insight

**You were right:** The narrow agent specs are useful for *specific* moments (when you ask for security review), but useless for *all the time*.

The gates are the guardrails that prevent me from uselessly running security theatre.

---

## To Disable Future Audit Fatigue

If I ever start auditing without you asking:

```bash
# Tell me:
"Stop running audits. Audit gates are OFF."

# Or update the gates:
# Edit .crustagent/vibecheck/truthpack/audit-gates.json
# Set security-audit enabled: false
```

---

**Maintained by CrustAgent©™**
