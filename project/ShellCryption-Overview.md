# 🐚 ShellCryption©™ — At-Rest Encryption & Key-File Auth Standard

> *ShellCryption©™ is the cryptographic shell that wraps the ClawKeys©™ identity system —
> enabling at-rest data encryption, safe key derivation, and tamper-evident storage
> using only the keys the user already holds.*

---

## Prompt Goal / Core Task

Implement **ShellCryption©™** — the encryption and key derivation layer that sits on top of the ClawKeys©™ key system. ShellCryption©™ uses the user's existing `hu-` identity key (or `lb-` Lobster key) as the seed for deriving symmetric encryption keys, enabling at-rest encryption of sensitive user data without any additional passwords, key management systems, or external services. The shell IS the encryption — the key file the user already holds becomes the master key for all encrypted storage.

---

## Key Instructions, Constraints & Steps

### 1. Core Concept — The Shell Metaphor

```
ShellCryption := hu-key → PBKDF2/HKDF → AES-256-GCM symmetric key → encrypted storage
                 lb-key → HKDF (scoped) → read-only decryption key for agent data access

The "shell" wraps your data:
  - Hard outer shell = AES-256-GCM encryption (authenticated, tamper-evident)
  - Inner core = your plaintext data
  - Shell key = derived from hu-key (only you can crack your own shell)
```

No new secrets are introduced. No passwords. No key escrow. If the user has their identity file, they can decrypt their data. If the identity file is lost, the data is unrecoverable — this is by design.

---

### 2. Key Derivation — From ClawKeys©™ to Symmetric Keys

The `hu-` key is high-entropy (~381 bits) but is used for authentication, not directly for encryption. ShellCryption©™ derives purpose-specific symmetric keys using HKDF (HMAC-based Key Derivation Function).

```
Master key derivation:
  Input:  hu-key (67-char base-62 string)
  Salt:   user_uuid (stable, server-stored, unique per user)
  Info:   "clawchives-shellcryption-v1" (domain separation string)
  Output: 256-bit AES-GCM key (the "Shell Key")

Implementation (Web Crypto API):
  1. Import hu-key as raw CryptoKey material
  2. crypto.subtle.importKey("raw", encode(hu-key), "HKDF", false, ["deriveKey"])
  3. crypto.subtle.deriveKey(
       { name: "HKDF", hash: "SHA-256", salt: encode(uuid), info: encode("clawchives-shellcryption-v1") },
       baseKey,
       { name: "AES-GCM", length: 256 },
       false,     // not extractable — key never leaves Web Crypto
       ["encrypt", "decrypt"]
     )
```

**Why HKDF over PBKDF2:**
- PBKDF2 is designed for low-entropy passwords (adds iteration cost)
- hu- keys are already high-entropy (~381 bits) — PBKDF2 iterations add cost with no security benefit
- HKDF is the correct primitive for high-entropy key material derivation
- HKDF is also used for scoped sub-key derivation (per-field, per-table encryption)

---

### 3. Encryption Standard — AES-256-GCM

All ShellCryption©™ encrypted data uses **AES-256-GCM**:

```
Encryption:
  - Algorithm: AES-GCM, 256-bit key
  - IV (nonce): 12 bytes, cryptographically random per encryption operation
    → crypto.getRandomValues(new Uint8Array(12))
  - Additional Authenticated Data (AAD): record ID + table name (prevents ciphertext transplant attacks)
  - Output format: { iv: base64, ciphertext: base64, tag: base64 }

Decryption:
  - Requires: same AES-GCM key (derived from hu-key + uuid)
  - Requires: stored IV (from encrypted record)
  - Requires: same AAD (record ID + table name)
  - Authentication tag is verified automatically by AES-GCM — tamper detection is built-in
  - If tag fails: decryption throws, data is treated as corrupted/tampered

NEVER:
  ❌ Reuse an IV/nonce for the same key — generates new random IV every time
  ❌ Use AES-CBC or AES-ECB — no authentication, vulnerable to tampering
  ❌ Store the derived key — re-derive on each session from hu-key
  ❌ Log or transmit plaintext data after decryption
```

---

### 4. What Gets Encrypted (Encryption Scope)

ShellCryption©™ applies selectively — not every field needs encryption. Over-encrypting kills query performance on SQLite.

```
MUST ENCRYPT (sensitive user content):
  bookmarks.title           — user's bookmark titles
  bookmarks.description     — user notes and descriptions
  bookmarks.tags            — can reveal interests/topics
  bookmarks.jina_content    — full article text (highest sensitivity)
  settings values           — appearance/profile preferences
  agent_keys.name           — agent label (reveals what agents do)

DO NOT ENCRYPT (needed for server-side queries):
  bookmarks.id              — primary key, needed for lookups
  bookmarks.user_uuid       — needed for WHERE user_uuid = ? filtering
  bookmarks.url             — needed for UNIQUE constraint and dedup
  bookmarks.folder_id       — needed for folder filtering queries
  bookmarks.starred         — needed for filtering
  bookmarks.archived        — needed for filtering
  bookmarks.jina_status     — needed for status filtering
  bookmarks.created_at      — needed for sorting
  agent_keys.api_key        — needed for auth lookup
  agent_keys.is_active      — needed for revocation checks
  agent_keys.permissions    — needed for permission enforcement
```

---

### 5. Lobster Key (lb-) Scoped Decryption

Agent keys (`lb-`) can be granted read access to encrypted fields, but with a derived sub-key — not the master Shell Key.

```
Agent sub-key derivation:
  Input:  lb-key (67-char base-62 string)
  Salt:   owner_user_uuid (the human owner's UUID)
  Info:   "clawchives-shellcryption-agent-read-v1"
  Output: 256-bit AES-GCM key (read-only — same data, different key context)

How it works:
  - Human encrypts: AES-GCM with Shell Key derived from hu-key
  - Agent decrypts: AES-GCM with agent sub-key derived from lb-key
  - The two keys decrypt the SAME ciphertext only if:
    → The server re-encrypts with the agent sub-key when creating the agent key
    → OR the human wraps a Data Encryption Key (DEK) with both the Shell Key and agent sub-key

Simpler approach for v1 (recommended):
  - Encrypted fields are decrypted server-side by the human session only
  - Agent API responses return plaintext (decrypted server-side after auth)
  - Full double-key envelope encryption is a Phase 4+ feature
```

---

### 6. Encrypted Storage Format

Each encrypted field is stored as a JSON string in SQLite:

```json
{
  "v": 1,
  "alg": "AES-GCM-256",
  "iv": "base64-encoded-12-byte-nonce",
  "ct": "base64-encoded-ciphertext-with-tag",
  "aad": "bookmarks:550e8400-e29b-41d4-a716-446655440000"
}
```

**Field breakdown:**
- `v` — schema version (for future migration without full re-encryption)
- `alg` — algorithm identifier (future-proofs against algorithm changes)
- `iv` — initialization vector, unique per encryption, stored with ciphertext
- `ct` — ciphertext + GCM authentication tag (GCM appends tag automatically)
- `aad` — Additional Authenticated Data: `{table}:{record_id}` — prevents moving ciphertext between rows

---

### 7. Key Session Lifecycle

```
App startup / login:
  1. User uploads identity file → hu-key extracted
  2. hu-key → HKDF → Shell Key derived in Web Crypto (not extractable)
  3. Shell Key held in memory for session duration (never serialized, never stored)
  4. On tab close / logout → Shell Key garbage collected automatically

Encryption request:
  1. Generate random 12-byte IV
  2. Build AAD: "{table}:{record_id}"
  3. AES-GCM encrypt with Shell Key + IV + AAD
  4. Serialize to ShellCryption JSON format
  5. Store in SQLite

Decryption request:
  1. Parse ShellCryption JSON from SQLite
  2. Decode IV and ciphertext from base64
  3. AES-GCM decrypt with Shell Key + IV + AAD
  4. If auth tag fails → throw CryptoError("Decryption failed: data may be tampered")
  5. Return plaintext to application

Key loss (identity file lost):
  → Shell Key cannot be re-derived → all encrypted fields are permanently inaccessible
  → This is intentional — sovereign encryption means no recovery backdoor
  → Users must be warned clearly at registration: "Back up your identity file"
```

---

### 8. Implementation Reference (ClawChives)

The canonical implementation lives in:
- `src/lib/crypto.ts` — key generation, hashing, constant-time compare
- *(planned)* `src/lib/shellCryption.ts` — `deriveShellKey()`, `encrypt()`, `decrypt()`, `encryptField()`, `decryptField()`

**Planned API surface:**
```typescript
// Derive the Shell Key for this session (call once at login)
async function deriveShellKey(huKey: string, userUuid: string): Promise<CryptoKey>

// Encrypt a single string field
async function encryptField(plaintext: string, shellKey: CryptoKey, aad: string): Promise<string>

// Decrypt a single string field
async function decryptField(encrypted: string, shellKey: CryptoKey, aad: string): Promise<string>

// Encrypt a full record (encrypts all sensitive fields in one pass)
async function encryptRecord<T>(record: T, sensitiveFields: (keyof T)[], shellKey: CryptoKey, table: string): Promise<T>

// Decrypt a full record
async function decryptRecord<T>(record: T, sensitiveFields: (keyof T)[], shellKey: CryptoKey, table: string): Promise<T>
```

---

### 9. Security Properties

```
✅ Confidentiality     — AES-256-GCM ensures encrypted fields are unreadable without hu-key
✅ Authenticity        — GCM authentication tag detects any tampering or corruption
✅ Non-extractable key — Web Crypto CryptoKey cannot be read out of memory by JS
✅ IV uniqueness       — Random IV per operation prevents ciphertext analysis
✅ Domain separation   — HKDF info string scopes keys to ShellCryption context
✅ Ciphertext binding  — AAD (table:id) prevents row-swapping attacks
✅ Zero-knowledge server — Server stores only ciphertext, cannot decrypt without hu-key
✅ Sovereign recovery  — No backdoor, no escrow, no recovery path (by design)

🔄 Planned:
   Agent sub-key envelope encryption (Phase 4)
   Key rotation (re-encrypt with new hu-key on identity refresh)
   Encrypted export (encrypted JSON/CSV export for backup)
```

---

### 10. What ShellCryption©™ Is NOT

```
❌ Not full-disk encryption — only encrypts sensitive application fields, not the SQLite file itself
❌ Not end-to-end encrypted sync — server has access to plaintext during active session
❌ Not zero-knowledge in the strictest sense — decryption happens server-assisted in v1
❌ Not a password manager — does not store or generate passwords for other services
❌ Not a key management service — no KMS, no HSM, no external key storage
❌ Not multi-key — one Shell Key per user session (agent envelope encryption is Phase 4)
```

---

*🐚 ShellCryption©™ — Crack the shell, own the data. Lose the shell, lose the key.*
*Your sovereignty is the encryption. Your key file is the only door.*
