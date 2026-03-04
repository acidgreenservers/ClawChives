/**
 * Cryptographic utilities for key generation and file handling
 */

/** Uses Web Crypto's secure RNG to build a URL-safe alphanumeric string */
export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
}

/** Identity key for human users: `hu-<64 chars>` */
export function generateHumanKey(): string {
  return `hu-${generateRandomString(64)}`;
}

/** Identity key for agents: `ag-<64 chars>` */
export function generateAgentKey(): string {
  return `ag-${generateRandomString(64)}`;
}

/** REST API key: `api-<32 chars>` */
export function generateApiKey(): string {
  return `api-${generateRandomString(32)}`;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

// ─── Identity File ────────────────────────────────────────────────────────────

/** The data embedded in a downloaded identity key file */
export interface IdentityData {
  username: string;
  uuid: string;
  token: string;       // The hu-* key — this IS the secret credential
  createdAt: string;
}

/**
 * Validates that a parsed object looks like a valid IdentityData file.
 * Returns an array of field names that are missing or invalid.
 */
export function validateIdentityFile(data: unknown): string[] {
  if (!data || typeof data !== "object") return ["file is not a valid JSON object"];
  const d = data as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof d.username !== "string" || !d.username) missing.push("username");
  if (typeof d.uuid !== "string" || !d.uuid) missing.push("uuid");
  if (typeof d.token !== "string" || !d.token.startsWith("hu-")) missing.push("token (must start with hu-)");
  return missing;
}

/** Downloads a JSON identity file to the user's device */
export function downloadIdentityFile(data: IdentityData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clawchives_identity_${data.username}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ─── Token Hashing ────────────────────────────────────────────────────────────

/**
 * Hashes a token using SHA-256 for secure storage in IndexedDB.
 * This prevents plaintext tokens from being readable if browser storage is compromised.
 *
 * @param token - The plaintext token (e.g., "hu-abc123...")
 * @returns Promise resolving to hex-encoded hash string
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a plaintext token against a stored hash using constant-time comparison.
 * This prevents timing attacks during authentication.
 *
 * @param plaintextToken - The token to verify (from user's identity file)
 * @param storedHash - The hash stored in IndexedDB
 * @returns Promise resolving to true if token matches
 */
export async function verifyToken(plaintextToken: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashToken(plaintextToken);

  // Constant-time string comparison to prevent timing attacks
  if (computedHash.length !== storedHash.length) return false;

  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }

  return result === 0;
}