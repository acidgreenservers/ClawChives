/**
 * Migration 001: Security Hardening Schema Updates
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Add all security-related schema changes
 * Version: 001-security-hardening
 * Date: 2024-01-15
 *
 * Changes:
 *   1. Add expires_at to api_tokens (Token Expiry)
 *   2. Create audit_logs table (Audit Logging)
 *   3. Add agent key tracking columns
 *   4. Create indexes for performance
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

-- ═══════════════════════════════════════════════════════════════════════════
-- ========== UP ========== (Apply Changes)
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Token Expiry: Add expires_at to api_tokens
-- ────────────────────────────────────────────────────────────────────────────

-- Add expires_at column (NULL = never expires)
ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;

-- Set default expiry for existing tokens (90 days from now)
-- Comment this line if you want existing tokens to never expire
UPDATE api_tokens
SET expires_at = datetime('now', '+90 days')
WHERE expires_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Audit Logging: Create audit_logs table
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT NOT NULL,              -- ISO 8601 timestamp
  event_type  TEXT NOT NULL,              -- "auth.login", "agent.created", etc.
  actor       TEXT,                       -- Username, agent key name, or IP
  actor_type  TEXT,                       -- "human", "agent", "api_token", "anonymous"
  resource    TEXT,                       -- Resource affected (bookmark ID, folder ID)
  action      TEXT NOT NULL,              -- "create", "read", "update", "delete"
  outcome     TEXT NOT NULL,              -- "success", "failure", "blocked"
  ip_address  TEXT,                       -- Client IP address
  user_agent  TEXT,                       -- HTTP User-Agent header
  details     TEXT                        -- JSON with additional context
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_logs(outcome);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Agent Key Tracking: Add columns to agent_keys
-- ────────────────────────────────────────────────────────────────────────────

-- Track when agent key was last used
ALTER TABLE agent_keys ADD COLUMN last_used_at TEXT;

-- Track when/why agent key was revoked
ALTER TABLE agent_keys ADD COLUMN revoked_at TEXT;
ALTER TABLE agent_keys ADD COLUMN revoked_by TEXT;
ALTER TABLE agent_keys ADD COLUMN revoke_reason TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Performance Indexes
-- ────────────────────────────────────────────────────────────────────────────

-- Index for token lookup (if not already exists)
CREATE INDEX IF NOT EXISTS idx_api_tokens_key ON api_tokens(key);

-- Index for expired token cleanup
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at);

-- Index for agent key lookup
CREATE INDEX IF NOT EXISTS idx_agent_keys_api_key ON agent_keys(api_key);

-- Index for active agent keys
CREATE INDEX IF NOT EXISTS idx_agent_keys_active ON agent_keys(is_active);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Data Validation (Optional - Add CHECK constraints)
-- ────────────────────────────────────────────────────────────────────────────

-- Note: SQLite doesn't support adding CHECK constraints to existing tables
-- These would be added during initial table creation

-- CHECK constraints for new tables:
-- CREATE TABLE audit_logs (
--   ...
--   outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked')),
--   actor_type TEXT CHECK (actor_type IN ('human', 'agent', 'api_token', 'anonymous')),
--   ...
-- );

-- ═══════════════════════════════════════════════════════════════════════════
-- ========== DOWN ========== (Rollback Changes)
-- ═══════════════════════════════════════════════════════════════════════════

-- WARNING: SQLite has limited ALTER TABLE support
-- Some operations require create-copy-drop pattern

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Rollback: Remove expires_at from api_tokens
-- ────────────────────────────────────────────────────────────────────────────

-- SQLite doesn't support DROP COLUMN directly (before version 3.35.0)
-- Use create-copy-drop pattern:

-- BEGIN TRANSACTION;
--
-- CREATE TABLE api_tokens_new (
--   key        TEXT PRIMARY KEY,
--   owner_key  TEXT NOT NULL,
--   owner_type TEXT NOT NULL,
--   created_at TEXT NOT NULL
-- );
--
-- INSERT INTO api_tokens_new (key, owner_key, owner_type, created_at)
-- SELECT key, owner_key, owner_type, created_at FROM api_tokens;
--
-- DROP TABLE api_tokens;
-- ALTER TABLE api_tokens_new RENAME TO api_tokens;
--
-- COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Rollback: Drop audit_logs table
-- ────────────────────────────────────────────────────────────────────────────

-- DROP TABLE IF EXISTS audit_logs;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Rollback: Remove agent key tracking columns
-- ────────────────────────────────────────────────────────────────────────────

-- Similar create-copy-drop pattern for agent_keys
-- (omitted for brevity - same as api_tokens example)

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Rollback: Drop indexes
-- ────────────────────────────────────────────────────────────────────────────

-- DROP INDEX IF EXISTS idx_audit_timestamp;
-- DROP INDEX IF EXISTS idx_audit_event_type;
-- DROP INDEX IF EXISTS idx_audit_actor;
-- DROP INDEX IF EXISTS idx_audit_outcome;
-- DROP INDEX IF EXISTS idx_api_tokens_expires_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════════════════

/**
 * SQLite Limitations:
 *   - No DROP COLUMN support (before 3.35.0)
 *   - No ALTER COLUMN support
 *   - Limited CHECK constraint modification
 *
 * Workarounds:
 *   - Use create-copy-drop pattern for column removal
 *   - Use triggers for complex validation
 *   - Migrate to new table for major schema changes
 *
 * Migration Best Practices:
 *   - Test on copy of production database first
 *   - Backup database before applying
 *   - Use transactions for atomic changes
 *   - Add indexes after data migration for performance
 *   - Verify data integrity after migration
 *
 * Applying This Migration:
 *   1. Backup database: cp data/db.sqlite data/db.sqlite.backup
 *   2. Run migration: sqlite3 data/db.sqlite < migrations/001-security-hardening.sql
 *   3. Verify: sqlite3 data/db.sqlite ".schema"
 *   4. Test application functionality
 *
 * Rolling Back:
 *   1. If issues found, restore backup: cp data/db.sqlite.backup data/db.sqlite
 *   2. Or manually run DOWN section (requires create-copy-drop for some changes)
 */
