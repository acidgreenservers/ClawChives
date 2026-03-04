/**
 * Cryptographic utilities for key generation and file handling
 */

export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function generateHumanKey(): string {
  return `hu-${generateRandomString(64)}`;
}

export function generateAgentKey(): string {
  return `ag-${generateRandomString(64)}`;
}

export function generateApiKey(): string {
  return `api-${generateRandomString(32)}`;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export interface IdentityData {
  username: string;
  uuid: string;
  token: string;
}

export function downloadIdentityFile(data: IdentityData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clawchives_identity_key.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}