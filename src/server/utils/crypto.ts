import crypto from 'crypto';

/**
 * 🛡️ Sentinel Security Fix (v2):
 * crypto.randomInt avoids modulo bias that occurs when mapping
 * crypto.randomBytes values (0-255) to a 62-character charset.
 */
export function generateString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}

export function generateId(): string {
  return crypto.randomUUID();
}
