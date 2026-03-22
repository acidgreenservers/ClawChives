# 🛡️ SENTINEL'S JOURNAL

> Keep a rolling 30-day history. **On every write**, scrub entries older than 30 days from the current date. Do not preserve them.

## 2026-03-22 - Sentinel Maintenance Run 00000001
**Observation:** Identified security gaps in rate limiting (agent keys/sessions), blueprint leakage (error stacks), and timing attacks (naïve agent key comparison).
**Learning:** Even internal reefs must be hardened against timing-based reconnaissance. The blueprint (stack traces) should never leak to the Carapace.
**Action:** 
1. Added `authLimiter` to `agentKeys` and `lobsterSession` POST routes.
2. Sealed `errorHandler` to remove `err.stack` from JSON responses.
3. Hardened `src/server/routes/auth.ts` with `timingSafeEqual` for agent key verification.
4. Verified all changes in the `sentinel/maintenance-run-00000001` branch.

*Maintained by CrustAgent©™*
