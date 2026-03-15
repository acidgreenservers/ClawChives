import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATA_DIR: use env var or fall back to /data next to project root
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '..', '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────────
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
    color      TEXT DEFAULT '#06b6d4',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_keys (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    api_key         TEXT NOT NULL UNIQUE,
    permissions     TEXT NOT NULL,
    expiration_type TEXT NOT NULL,
    expiration_date TEXT,
    rate_limit      INTEGER,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL,
    last_used       TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
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

// ─── Migrations ────────────────────────────────────────────────────────────────
const runColumnMigration = (sql: string, desc: string) => {
  try { db.exec(sql); console.log(`[DB Migration] ✅  ${desc}`); }
  catch (e: any) { if (!e.message.includes('duplicate column')) throw e; }
};

runColumnMigration("ALTER TABLE bookmarks ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''", 'bookmarks.user_uuid');
runColumnMigration("ALTER TABLE folders ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''", 'folders.user_uuid');
runColumnMigration("ALTER TABLE agent_keys ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''", 'agent_keys.user_uuid');
runColumnMigration("ALTER TABLE settings ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''", 'settings.user_uuid');

runColumnMigration('ALTER TABLE api_tokens ADD COLUMN expires_at TEXT', 'api_tokens.expires_at');
db.prepare("UPDATE api_tokens SET expires_at = datetime('now', '+90 days') WHERE expires_at IS NULL").run();

runColumnMigration('ALTER TABLE agent_keys ADD COLUMN revoked_at TEXT', 'agent_keys.revoked_at');
runColumnMigration('ALTER TABLE agent_keys ADD COLUMN revoked_by TEXT', 'agent_keys.revoked_by');
runColumnMigration('ALTER TABLE agent_keys ADD COLUMN revoke_reason TEXT', 'agent_keys.revoke_reason');
runColumnMigration('ALTER TABLE bookmarks ADD COLUMN jina_url TEXT', 'bookmarks.jina_url');

// Ensure key_hash unique index
const indexes = db.prepare("PRAGMA index_list('users')").all() as any[];
const hasUniqueKeyHash = indexes.some((idx: any) =>
  idx.unique === 1 &&
  (db.prepare(`PRAGMA index_info('${idx.name}')`).all() as any[]).some((col: any) => col.name === 'key_hash')
);
if (!hasUniqueKeyHash) {
  try {
    db.exec('CREATE UNIQUE INDEX idx_users_key_hash ON users(key_hash)');
    console.log('[DB Migration] ✅ Created unique index on key_hash');
  } catch {
    console.warn('[DB Migration] ⚠️ Could not create unique index on key_hash (duplicates might exist)');
  }
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_url ON bookmarks(user_uuid, url);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url) WHERE jina_url IS NOT NULL;
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

console.log(`[DB] SQLite database at ${DB_PATH}`);

// ─── Purge utility ─────────────────────────────────────────────────────────────
export function purgeExpiredTokens(): number {
  const result = db.prepare(
    `DELETE FROM api_tokens WHERE datetime(expires_at) <= datetime('now')`
  ).run();
  if (result.changes > 0) console.log(`[DB] Purged ${result.changes} expired token(s)`);
  return result.changes;
}

export default db;
