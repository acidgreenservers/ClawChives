import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a fresh, isolated test database for each test run.
 * The database is created in tests/data/test-*.sqlite with a unique name.
 * All schema and migrations are applied automatically.
 */
export function createTestDatabase(): Database.Database {
  const testDataDir = path.join(__dirname, '..', 'data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Create a unique test database file for this test session
  const timestamp = Date.now();
  const testDbPath = path.join(testDataDir, `test-${timestamp}.sqlite`);

  // Clean up old test db if it somehow exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Create database
  const db = new Database(testDbPath);

  // Apply encryption key if provided (same as production)
  const encryptionKey = process.env.DB_ENCRYPTION_KEY;
  if (encryptionKey) {
    db.pragma(`key = '${encryptionKey}'`);
  }

  // Run schema (same as production db.ts)
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uuid       TEXT PRIMARY KEY,
      username   TEXT NOT NULL UNIQUE,
      key_hash   TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      key        TEXT PRIMARY KEY,
      owner_key  TEXT NOT NULL,
      owner_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id          TEXT PRIMARY KEY,
      url         TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      favicon     TEXT DEFAULT '',
      tags        TEXT DEFAULT '[]',
      folder_id   TEXT,
      user_uuid   TEXT NOT NULL DEFAULT '',
      starred     INTEGER DEFAULT 0,
      archived    INTEGER DEFAULT 0,
      color       TEXT,
      jina_url    TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      parent_id  TEXT,
      user_uuid  TEXT NOT NULL DEFAULT '',
      color      TEXT DEFAULT '#06b6d4',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_keys (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      description     TEXT,
      api_key         TEXT NOT NULL UNIQUE,
      permissions     TEXT NOT NULL,
      user_uuid       TEXT NOT NULL DEFAULT '',
      expiration_type TEXT NOT NULL,
      expiration_date TEXT,
      rate_limit      INTEGER,
      is_active       INTEGER DEFAULT 1,
      created_at      TEXT NOT NULL,
      last_used       TEXT,
      revoked_at      TEXT,
      revoked_by      TEXT,
      revoke_reason   TEXT
    );

    CREATE TABLE IF NOT EXISTS jina_conversions (
      bookmark_id TEXT PRIMARY KEY,
      user_uuid   TEXT NOT NULL,
      url         TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key       TEXT NOT NULL,
      value     TEXT NOT NULL,
      user_uuid TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(key, user_uuid)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      actor       TEXT,
      actor_type  TEXT,
      resource    TEXT,
      action      TEXT NOT NULL,
      outcome     TEXT NOT NULL,
      ip_address  TEXT,
      user_agent  TEXT,
      details     TEXT
    );
  `);

  // Create indexes
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_url ON bookmarks(user_uuid, url);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_jina_conversions_user ON jina_conversions(user_uuid);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_uuid, key);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
    CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_logs(outcome);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_key ON api_tokens(key);
    CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_agent_keys_api_key ON agent_keys(api_key);
    CREATE INDEX IF NOT EXISTS idx_agent_keys_active ON agent_keys(is_active);
  `);

  return db;
}

/**
 * Cleanly closes and removes the test database.
 * Call this in afterAll() or afterEach() to prevent test pollution.
 */
export function cleanupTestDatabase(db: Database.Database, testDbPath?: string): void {
  try {
    db.close();
  } catch (err) {
    console.error('[TestDb] Error closing database:', err);
  }

  // If path not provided, try to infer it from the database filename
  if (!testDbPath) {
    // Database filename is stored internally; we'll just skip file cleanup
    // in this case to avoid errors
    return;
  }

  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (err) {
    console.error('[TestDb] Error removing test database file:', err);
  }
}

/**
 * Clears all data from the test database without closing it.
 * Useful for resetting state between tests while keeping the database connection open.
 */
export function resetTestDatabase(db: Database.Database): void {
  try {
    // Disable foreign key constraints temporarily to allow deletion order flexibility
    db.pragma('foreign_keys = OFF');

    // Delete all data in reverse dependency order
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM tokens').run();
    db.prepare('DELETE FROM agent_keys').run();
    db.prepare('DELETE FROM bookmarks').run();
    db.prepare('DELETE FROM folders').run();
    db.prepare('DELETE FROM settings').run();
    db.prepare('DELETE FROM users').run();

    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
  } catch (err) {
    console.error('[TestDb] Error resetting database:', err);
    throw err;
  }
}
