## 2026-03-06 - [Critical Security Fixes] Agent Key Bypass and Key Generation Entropy
**Vulnerability:**
1. Authorization bypass: `requireAuth` did not check if an agent was revoked (`is_active = 0`) when validating its `api-` tokens. This allowed an API token issued to an agent to remain valid even after the agent was revoked via Settings.
2. Insecure Key Generation: `generateString` used `crypto.randomBytes(length)` but then incorrectly mapped values using modulo (`b % chars.length`). This introduced modulo bias, reducing the overall entropy and cryptographic randomness of the generated API keys and REST tokens.

**Learning:**
1. When validating a child token (like an `api-` token), we must always re-verify the full validation state of the parent owner. The `api-` token validity does not just rely on `expires_at`, but also on the active status of the `owner_key`.
2. Random byte modulo operations are an easy way to compromise random key generation. We must explicitly use `crypto.randomInt` inside bounded loop logic to ensure perfectly uniform distribution of choices.

**Prevention:**
1. `is_active = 1` checks should be rigorously applied across all token validation steps natively (or we should delete `api-` tokens eagerly when revoking an agent).
2. For secure keys, explicitly use high-level methods like `crypto.randomInt` instead of manual arithmetic on byte buffers, or rely strictly on `crypto.randomUUID()` / base64 of bytes without manual alphabet mapping.

## 2024-04-15 - [Insecure PRNG Fallback for UUIDs]
**Vulnerability:** `generateUUID` function used `Math.random()` as a fallback in environments where `crypto.randomUUID` is unavailable.
**Learning:** `Math.random()` is not cryptographically secure and using it for identifiers like UUIDs can lead to predictable IDs and collision attacks. Developers sometimes use insecure fallbacks to maintain functionality in non-secure HTTP environments, inadvertently compromising the unpredictability of security-critical identifiers.
**Prevention:** Always fail securely by throwing an error rather than falling back to weak random number generators (`Math.random()`) for security-related IDs or tokens.
