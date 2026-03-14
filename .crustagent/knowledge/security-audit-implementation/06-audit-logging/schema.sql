/**
 * Audit Logs Table Schema
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Store security event audit trail
 * Location: Add to server.js schema migrations (line 52+)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

-- Create audit_logs table
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

-- ──────────────────────────────────────────────────────────────────────────────
-- INTEGRATION: Add this to server.js line 52+ (after existing table creation)
-- ──────────────────────────────────────────────────────────────────────────────

/*
db.exec(`
  -- Existing tables...
  CREATE TABLE IF NOT EXISTS users (...);
  CREATE TABLE IF NOT EXISTS bookmarks (...);

  -- ✅ ADD: Audit logs table
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

  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
  CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
  CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_logs(outcome);
`);
*/
