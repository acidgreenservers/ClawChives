import Database from 'better-sqlite3-multiple-ciphers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory functions for creating test data.
 * These functions insert records directly into the test database,
 * allowing tests to set up realistic scenarios quickly.
 */

export interface TestUser {
  uuid: string;
  username?: string;
  keyHash: string;
  createdAt: string;
}

export interface TestFolder {
  id: string;
  userUuid: string;
  name: string;
  createdAt: string;
}

export interface TestBookmark {
  id: string;
  userUuid: string;
  url: string;
  title: string;
  folderId?: string;
  createdAt: string;
}

export interface TestAgentKey {
  id: string;
  userUuid: string;
  name: string;
  apiKey: string;
  permissions: Record<string, boolean>;
  createdAt: string;
  revokedAt?: string;
}

/**
 * Creates a test user with generated UUID and key hash.
 * Returns the user data for use in token generation.
 */
export function createTestUser(db: Database.Database, overrides?: Partial<TestUser>): TestUser {
  const uuid = overrides?.uuid ?? uuidv4();
  const username = overrides?.username ?? `testuser_${uuid.slice(0, 8)}`;
  const keyHash = overrides?.keyHash ?? 'a'.repeat(64);
  const createdAt = overrides?.createdAt ?? new Date().toISOString();

  db.prepare(
    'INSERT INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)'
  ).run(uuid, username, keyHash, createdAt);

  return { uuid, username, keyHash, createdAt };
}

/**
 * Creates a test folder under a user.
 * Requires that the user already exists.
 */
export function createTestFolder(db: Database.Database, userUuid: string, overrides?: Partial<TestFolder>): TestFolder {
  const id = overrides?.id ?? uuidv4();
  const name = overrides?.name ?? `Test Folder ${Date.now()}`;
  const createdAt = overrides?.createdAt ?? new Date().toISOString();

  db.prepare(
    'INSERT INTO folders (id, user_uuid, name, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, userUuid, name, createdAt);

  return { id, userUuid, name, createdAt };
}

/**
 * Creates a test bookmark under a user.
 * Optionally associates it with a folder (folder must exist).
 */
export function createTestBookmark(
  db: Database.Database,
  userUuid: string,
  overrides?: Partial<TestBookmark>
): TestBookmark {
  const id = overrides?.id ?? uuidv4();
  const url = overrides?.url ?? `https://example.com/${Date.now()}`;
  const title = overrides?.title ?? 'Test Bookmark';
  const folderId = overrides?.folderId ?? null;
  const createdAt = overrides?.createdAt ?? new Date().toISOString();

  db.prepare(
    'INSERT INTO bookmarks (id, user_uuid, url, title, folder_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userUuid, url, title, folderId, createdAt);

  return { id, userUuid, url, title, folderId, createdAt };
}

/**
 * Creates a test agent key for a user.
 * The API key is randomly generated (not a valid JWT, just a string).
 */
export function createTestAgentKey(
  db: Database.Database,
  userUuid: string,
  overrides?: Partial<TestAgentKey>
): TestAgentKey {
  const id = overrides?.id ?? uuidv4();
  const name = overrides?.name ?? `Test Agent ${Date.now()}`;
  const apiKey = overrides?.apiKey ?? `lb-${generateRandomKey(60)}`;
  const permissions = overrides?.permissions ?? { canRead: true, canWrite: false };
  const createdAt = overrides?.createdAt ?? new Date().toISOString();
  const revokedAt = overrides?.revokedAt ?? null;

  db.prepare(
    'INSERT INTO agent_keys (id, user_uuid, name, api_key, permissions, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userUuid, name, apiKey, JSON.stringify(permissions), createdAt, revokedAt);

  return { id, userUuid, name, apiKey, permissions, createdAt, revokedAt };
}

/**
 * Helper to generate a random alphanumeric key string.
 * Used for agent key generation in factories.
 */
function generateRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
