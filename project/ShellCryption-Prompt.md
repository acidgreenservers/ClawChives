### ROLE
You are a **Senior Cryptography Engineer and Systems Architect** specializing in **Web Crypto API**, **TypeScript**, and **Zero-Trust/Sovereign Identity Systems**. You are an expert in implementing secure, client-side encryption standards where the user holds the only decryption key.

### TASK
Your goal is to implement **ShellCryption©™**, an at-rest encryption and key derivation layer for the ClawKeys©™ identity system. You will write the logic for `src/lib/shellCryption.ts` to handle key derivation, field-level encryption, and decryption using the user's existing identity key (`hu-` key) as the seed.

### CONTEXT & PHILOSOPHY
ShellCryption©™ follows the "Shell Metaphor":
1.  **The Shell:** AES-256-GCM authenticated encryption wrapping the data.
2.  **The Key:** Derived from the user's `hu-` identity key (ClawKey).
3.  **Sovereignty:** No passwords, no key escrow, no recovery backdoors. If the identity file is lost, the data is mathematically unrecoverable.

### TECHNICAL SPECIFICATIONS

#### 1. Key Derivation Standard (HKDF)
You must use **HKDF (SHA-256)**, not PBKDF2. The `hu-` key is already high-entropy (~381 bits).
*   **Input:** Raw `hu-` key bytes (decoded from base-62 string).
*   **Salt:** User UUID (stable, unique per user).
*   **Info (Context):** `new TextEncoder().encode("clawchives-shellcryption-v1")`.
*   **Output:** 256-bit AES-GCM key (The "Shell Key").
*   **Web Crypto Config:** `extractable: false`, usages: `["encrypt", "decrypt"]`.

#### 2. Encryption Standard (AES-256-GCM)
*   **Algorithm:** AES-GCM with a 256-bit key.
*   **IV (Nonce):** 12 bytes, cryptographically random **per operation** (`crypto.getRandomValues`).
*   **AAD (Additional Authenticated Data):** Must be bound to the specific record to prevent ciphertext transplant attacks. Format: `"{table_name}:{record_id}"`.
*   **Tag:** The GCM authentication tag is automatically handled by Web Crypto's `encrypt` result (appended to ciphertext).

#### 3. Storage Format
Encrypted fields must be serialized into the following JSON structure:
```json
{
  "v": 1,
  "alg": "AES-GCM-256",
  "iv": "base64-encoded-12-byte-nonce",
  "ct": "base64-encoded-ciphertext-with-tag",
  "aad": "table_name:record_uuid"
}
```

### IMPLEMENTATION REQUIREMENTS

#### API Surface (`src/lib/shellCryption.ts`)
Implement the following functions using TypeScript and the native Web Crypto API (`window.crypto.subtle` or Node `webcrypto`):

1.  **`deriveShellKey(huKey: string, userUuid: string): Promise<CryptoKey>`**
    *   Import the raw key material.
    *   Derive the symmetric key using HKDF parameters defined above.

2.  **`encryptField(plaintext: string, shellKey: CryptoKey, aad: string): Promise<string>`**
    *   Generate IV.
    *   Encrypt using AES-GCM.
    *   Return JSON string of the storage format.

3.  **`decryptField(encryptedJson: string, shellKey: CryptoKey, aad: string): Promise<string>`**
    *   Parse JSON.
    *   Validate `alg` and `v`.
    *   Decrypt using AES-GCM.
    *   **Error Handling:** If the tag check fails (decryption throws), raise a specific `CryptoError` indicating potential tampering.

4.  **`encryptRecord<T>(record: T, sensitiveFields: (keyof T)[], shellKey: CryptoKey, table: string): Promise<T>`**
    *   Iterate through `sensitiveFields`.
    *   Encrypt values in place.
    *   Construct AAD using `table` and `record.id` (or `record.uuid`).

5.  **`decryptRecord<T>(...)`**
    *   Inverse of `encryptRecord`.

#### Encryption Scope (Whitelist/Blacklist)
Do **NOT** encrypt fields required for SQL indexing/querying.
*   **ENCRYPT:** `bookmarks.title`, `bookmarks.description`, `bookmarks.tags`, `bookmarks.jina_content`, `settings`, `agent_keys.name`.
*   **DO NOT ENCRYPT:** Primary Keys (`id`, `uuid`), Foreign Keys (`user_uuid`, `folder_id`), URLs (for dedup), Status flags (`starred`, `archived`), Timestamps.

### SECURITY CONSTRAINTS & RULES
1.  **IV Reuse:** NEVER reuse an IV. Every call to `encryptField` must generate a new 12-byte array.
2.  **Memory Safety:** The `shellKey` (CryptoKey object) must be marked `extractable: false`. Never serialize the key itself to disk or local storage.
3.  **Algorithms:** STRICTLY use AES-GCM. Do not implement CBC or ECB modes.
4.  **Logging:** NEVER log plaintext data or raw key material to the console.
5.  **Types:** Use strict TypeScript types.

### OUTPUT FORMAT
Provide the full implementation code for `src/lib/shellCryption.ts`. Use Markdown code blocks. Include brief comments explaining security-critical decisions (e.g., "AAD prevents row-swapping attacks").