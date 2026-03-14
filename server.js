/**
 * ClawChives API Server — SQLite Edition (Multi-User)
 * ─────────────────────────────────────────────────────────────────────────────
 * Express REST API with persistent SQLite storage via better-sqlite3.
 *
 * Database file: /app/data/db.sqlite (Docker) or ./data/db.sqlite (local)
 *
 * Key prefixes:
 *   hu-  Human identity keys   (login — validated server-side against SQLite)
 *   lb-  Agent keys            (generated in Settings → Agent Permissions)
 *   api- REST API tokens       (issued by POST /api/auth/token)
 *
 * Run (local):
 *   npm install express cors better-sqlite3
 *   node server.js
 *
 * Run (Docker):
 *   docker-compose up
 *
 * Authentication:
 *   All /api/* routes (except /api/health and /api/auth/*) require:
 *   Authorization: Bearer <api-key>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import helmet from "helmet";
import { getCorsConfig } from "./src/config/corsConfig.js";
import { createAuditLogger } from "./src/utils/auditLogger.js";
import { scheduleTokenCleanup, calculateExpiry, checkTokenExpiry } from "./src/utils/tokenExpiry.js";
import { authLimiter, apiLimiter, createAgentKeyRateLimiter } from "./src/middleware/rateLimiter.js";
import { validateBody } from "./src/middleware/validate.js";
import { AuthSchemas, BookmarkSchemas, FolderSchemas, AgentKeySchemas } from "./src/validation/schemas.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { requirePermission, requireHuman } from "./src/middleware/permissionChecker.js";
import { httpsRedirect } from "./src/middleware/httpsRedirect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── SQLite Setup ─────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");   // Better concurrent read performance
db.pragma("foreign_keys = ON");

// ─── Schema Migrations ────────────────────────────────────────────────────────

// Step 1: Create base tables (safe on repeated runs)
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

// Step 2: Additive column migrations — safe to re-run on any schema version
const runColumnMigration = (sql, desc) => {
  try { db.exec(sql); console.log(`[DB Migration] ✅  ${desc}`); }
  catch (e) { if (!e.message.includes("duplicate column")) throw e; }
};

runColumnMigration(
  "ALTER TABLE bookmarks ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''",
  "bookmarks.user_uuid"
);
runColumnMigration(
  "ALTER TABLE folders ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''",
  "folders.user_uuid"
);
runColumnMigration(
  "ALTER TABLE agent_keys ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''",
  "agent_keys.user_uuid"
);
runColumnMigration(
  "ALTER TABLE settings ADD COLUMN user_uuid TEXT NOT NULL DEFAULT ''",
  "settings.user_uuid"
);

// Security Hardening Migrations
runColumnMigration("ALTER TABLE api_tokens ADD COLUMN expires_at TEXT", "api_tokens.expires_at");
db.prepare("UPDATE api_tokens SET expires_at = datetime('now', '+90 days') WHERE expires_at IS NULL").run();

runColumnMigration("ALTER TABLE agent_keys ADD COLUMN revoked_at TEXT", "agent_keys.revoked_at");
runColumnMigration("ALTER TABLE agent_keys ADD COLUMN revoked_by TEXT", "agent_keys.revoked_by");
runColumnMigration("ALTER TABLE agent_keys ADD COLUMN revoke_reason TEXT", "agent_keys.revoke_reason");
runColumnMigration("ALTER TABLE bookmarks ADD COLUMN jina_url TEXT", "bookmarks.jina_url");

// Ensure key_hash has a unique index (migration for existing DBs)
const indexes = db.prepare("PRAGMA index_list('users')").all();
const hasUniqueKeyHash = indexes.some(idx => 
  idx.unique === 1 && 
  db.prepare(`PRAGMA index_info('${idx.name}')`).all().some(col => col.name === 'key_hash')
);

if (!hasUniqueKeyHash) {
  try {
    db.exec('CREATE UNIQUE INDEX idx_users_key_hash ON users(key_hash)');
    console.log('[DB Migration] ✅ Created unique index on key_hash');
  } catch (e) {
    console.warn('[DB Migration] ⚠️ Could not create unique index on key_hash (duplicates might exist)');
  }
}

// Step 3: Ensure composite unique index on bookmarks and settings (user_uuid scoping)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_url ON bookmarks(user_uuid, url);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url) WHERE jina_url IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key  ON settings(user_uuid, key);

  -- Security Hardening Indexes
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

// ─── App & Middleware ─────────────────────────────────────────────────────────

export const audit = createAuditLogger(db);
scheduleTokenCleanup(db);

export const app = express();
export { db };
const PORT = parseInt(process.env.PORT ?? "4242", 10);

// Trust proxy (behind Docker/LB) — only enable when actually behind a reverse proxy
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(httpsRedirect);

app.use(helmet({
  // Only enable HSTS (Strict-Transport-Security) when actually serving HTTPS.
  strictTransportSecurity: process.env.ENFORCE_HTTPS === "true" ? undefined : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://r.jina.ai"],
      // Disable upgrade-insecure-requests on plain HTTP LAN deployments.
      // Helmet injects this by default; null removes it from the header entirely.
      // On HTTP, this directive causes ERR_SSL_PROTOCOL_ERROR for all assets.
      upgradeInsecureRequests: process.env.ENFORCE_HTTPS === "true" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  // Disable CORP and COOP on HTTP LAN — ensures assets load and removes warnings
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  // Match Origin-Agent-Cluster behavior to avoid browser conflicts
  originAgentCluster: false,
}));

app.use(cors(getCorsConfig()));
app.use(express.json());

app.use("/api", apiLimiter);
// app.use("/api/auth", authLimiter); // MOVED TO SPECIFIC ROUTES BELOW

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const agentRateLimiter = createAgentKeyRateLimiter(db);
const humanOnly = requireHuman(db);

// ─── Utilities ────────────────────────────────────────────────────────────────

export function generateString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  // 🛡️ Sentinel Security Fix:
  // Using crypto.randomInt(chars.length) avoids modulo bias that occurs
  // when mapping crypto.randomBytes(length) values (0-255) to a 62-character set.
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }
  return result;
}

export function generateId() { return crypto.randomUUID(); }

function detectKeyType(key) {
  if (key?.startsWith("hu-")) return "human";
  if (key?.startsWith("lb-")) return "agent";
  if (key?.startsWith("api-")) return "api";
  return null;
}

function parseBookmark(row) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags ?? "[]"),
    starred: Boolean(row.starred),
    archived: Boolean(row.archived),
    folderId: row.folder_id,
    jinaUrl: row.jina_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // remove snake_case dupes
    folder_id: undefined,
    created_at: undefined,
    updated_at: undefined,
    user_uuid: undefined,
  };
}

function parseFolder(row) {
  if (!row) return null;
  return { ...row, parentId: row.parent_id, createdAt: row.created_at, parent_id: undefined, created_at: undefined, user_uuid: undefined };
}

function parseAgentKey(row) {
  if (!row) return null;
  return {
    ...row,
    permissions: JSON.parse(row.permissions ?? "{}"),
    isActive: Boolean(row.is_active),
    expirationType: row.expiration_type,
    expirationDate: row.expiration_date,
    rateLimit: row.rate_limit,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    apiKey: row.api_key,
    // remove snake_case dupes
    is_active: undefined, expiration_type: undefined, expiration_date: undefined,
    rate_limit: undefined, created_at: undefined, last_used: undefined, user_uuid: undefined, api_key: undefined
  };
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: no Bearer token" });
  }

  const key = auth.substring(7).trim();
  const keyType = detectKeyType(key);

  if (!keyType) {
    return res.status(401).json({ success: false, error: "Invalid key format — must use hu-, lb-, or api- prefix" });
  }

  let finalUserUuid = null;
  let finalPermissions = null;

  // Super-admin permissions for Human users
  const HUMAN_PERMISSIONS = {
    canRead: true,
    canWrite: true,
    canEdit: true,
    canMove: true,
    canDelete: true,
  };

  let actualKeyType = keyType;

  // api- tokens must exist in DB
  if (keyType === "api") {
    const row = db.prepare("SELECT * FROM api_tokens WHERE key = ?").get(key);
    if (!row) {
      return res.status(401).json({ success: false, error: "Invalid or revoked API token" });
    }
    // Check token expiration
    if (!checkTokenExpiry(row.expires_at)) {
      audit.log("AUTH_FAILURE", {
        actor: row.owner_key,
        action: "validate_token",
        outcome: "failure",
        resource: "api_token",
        details: { reason: "Token expired" },
      });
      return res.status(401).json({
        success: false,
        error: "Token expired. Please authenticate again."
      });
    }
    if (row.owner_type === "human") {
      finalUserUuid = row.owner_key;
      finalPermissions = HUMAN_PERMISSIONS;
      actualKeyType = "human";
    } else if (row.owner_type === "agent") {
      const agent = db.prepare("SELECT user_uuid, permissions, is_active FROM agent_keys WHERE api_key = ?").get(row.owner_key);
      if (!agent) return res.status(401).json({ success: false, error: "Agent for this token no longer exists" });
      if (!agent.is_active) {
          return res.status(401).json({ success: false, error: "Lobster Key Revoked, Are you art of this reef?" });
      }
      if (agent.expiration_date && new Date(agent.expiration_date) < new Date()) {
        return res.status(401).json({ success: false, error: "Lobster Key expired" });
      }
      finalUserUuid = agent.user_uuid;
      finalPermissions = JSON.parse(agent.permissions || "{}");
      actualKeyType = "agent";
    }
  }

  // lb- keys validated against agent_keys table
  if (keyType === "agent") {
    const row = db.prepare("SELECT * FROM agent_keys WHERE api_key = ? AND is_active = 1").get(key);
    if (!row) {
      return res.status(401).json({ success: false, error: "Lobster Key Revoked, Are you art of this reef?" });
    }
    if (row.expiration_date && new Date(row.expiration_date) < new Date()) {
      return res.status(401).json({ success: false, error: "Lobster Key expired" });
    }
    // Update last_used
    db.prepare("UPDATE agent_keys SET last_used = ? WHERE api_key = ?")
      .run(new Date().toISOString(), key);
    finalUserUuid = row.user_uuid;
    finalPermissions = JSON.parse(row.permissions || "{}");
    actualKeyType = "agent";
  }

  if (!finalUserUuid) {
    return res.status(401).json({ success: false, error: "Could not resolve user identity" });
  }

  req.apiKey = key;
  req.keyType = actualKeyType;
  req.userUuid = finalUserUuid;
  req.agentPermissions = finalPermissions || {};
  
  // Apply dynamic agent rate limiting
  agentRateLimiter(req, res, next);
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  const counts = {
    bookmarks: db.prepare("SELECT COUNT(*) as c FROM bookmarks").get().c,
    folders:   db.prepare("SELECT COUNT(*) as c FROM folders").get().c,
    agentKeys: db.prepare("SELECT COUNT(*) as c FROM agent_keys WHERE is_active = 1").get().c,
  };
  res.json({
    success: true, service: "ClawChives API", version: "2.1.0",
    mode: "sqlite", db: DB_PATH, uptime: process.uptime(), counts,
  });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

/** POST /api/auth/register — register a human identity */
app.post("/api/auth/register", authLimiter, validateBody(AuthSchemas.register), (req, res) => {
  const { uuid, username, keyHash } = req.body;

  try {
    db.prepare("INSERT INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)").run(
      uuid, username, keyHash, new Date().toISOString()
    );
    audit.log("AUTH_REGISTER", { actor: uuid, actor_type: "human", action: "register", outcome: "success", resource: "user", details: { username, user_uuid: uuid }, ip_address: req.ip, user_agent: req.headers["user-agent"] });
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed: users.username")) {
      return res.status(409).json({ success: false, error: "Username already taken." });
    }
    return res.status(409).json({ success: false, error: "Failed to register user." });
  }
});

/** POST /api/auth/token — issue a REST api- token from a hu- hash or lb- key */
app.post("/api/auth/token", authLimiter, validateBody(AuthSchemas.token), (req, res) => {
  const { type, uuid, keyHash, ownerKey } = req.body;
  
  const ttl = process.env.TOKEN_TTL_DEFAULT || "30d";
  const expiresAt = calculateExpiry(ttl);

  if (type === "human") {
    let user;
    if (uuid) {
      user = db.prepare("SELECT * FROM users WHERE uuid = ?").get(uuid);
    } else if (keyHash) {
      // Fallback: look up by keyHash if UUID is missing (Simplified Login)
      user = db.prepare("SELECT * FROM users WHERE key_hash = ?").get(keyHash);
    }

    if (!user) {
      audit.log("AUTH_FAILURE", { action: "login", outcome: "failure", actor_type: "human", ip_address: req.ip, user_agent: req.headers["user-agent"] });
      return res.status(404).json({ 
        success: false, 
        error: "Identity not registered on this node",
        suggestion: "Try providing your username for better error details if this is a registration issue."
      });
    }

    let keyMatch = false;
    try {
      keyMatch = crypto.timingSafeEqual(Buffer.from(user.key_hash), Buffer.from(keyHash));
    } catch {
      keyMatch = false;
    }

    if (!keyMatch) {
      audit.log("AUTH_FAILURE", { action: "login", outcome: "failure", actor_type: "human", ip_address: req.ip, user_agent: req.headers["user-agent"], details: { user_uuid: user.uuid } });
      return res.status(401).json({ 
        success: false, 
        error: "Invalid identity key",
        suggestion: "Ensure you are using the correct ClawKey©™ for this server instance."
      });
    }

    const token = `api-${generateString(32)}`;
    db.prepare("INSERT INTO api_tokens (key, owner_key, owner_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
      token, user.uuid, "human", new Date().toISOString(), expiresAt
    );

    audit.log("AUTH_SUCCESS", { actor: user.uuid, actor_type: "human", action: "login", outcome: "success", ip_address: req.ip, user_agent: req.headers["user-agent"] });
    return res.status(201).json({ 
      success: true, 
      data: { token, type: "human", createdAt: new Date().toISOString(), expiresAt, user: { uuid: user.uuid, username: user.username } } 
    });
  } else if (type === "agent" || (ownerKey && detectKeyType(ownerKey) === "agent")) {
    const agentKey = ownerKey;
    if (!agentKey || !agentKey.startsWith("lb-")) return res.status(400).json({ success: false, error: "Invalid agent key" });

    const agent = db.prepare("SELECT * FROM agent_keys WHERE api_key = ? AND is_active = 1").get(agentKey);
    if (!agent) {
      audit.log("AUTH_FAILURE", { action: "login", outcome: "failure", actor_type: "agent", ip_address: req.ip, user_agent: req.headers["user-agent"] });
      return res.status(401).json({ success: false, error: "Invalid or revoked agent key" });
    }

    const token = `api-${generateString(32)}`;
    db.prepare("INSERT INTO api_tokens (key, owner_key, owner_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
      token, agentKey, "agent", new Date().toISOString(), expiresAt
    );

    audit.log("AUTH_SUCCESS", { actor: agent.id, actor_type: "agent", action: "login", outcome: "success", ip_address: req.ip, user_agent: req.headers["user-agent"] });
    return res.status(201).json({ success: true, data: { token, type: "agent", createdAt: new Date().toISOString(), expiresAt } });
  } else {
    return res.status(400).json({ success: false, error: "Invalid authentication request" });
  }
});

/** GET /api/auth/validate */
app.get("/api/auth/validate", requireAuth, (req, res) => {
  res.json({ success: true, data: { valid: true, keyType: req.keyType, userUuid: req.userUuid } });
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────

app.get("/api/bookmarks", requireAuth, requirePermission("canRead"), (req, res) => {
  let sql = "SELECT * FROM bookmarks WHERE user_uuid = ?";
  const params = [req.userUuid];

  if (req.query.starred === "true")  { sql += " AND starred = 1"; }
  if (req.query.archived === "true") { sql += " AND archived = 1"; }
  if (req.query.folderId)            { sql += " AND folder_id = ?"; params.push(req.query.folderId); }
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    sql += " AND (title LIKE ? OR url LIKE ? OR description LIKE ?)";
    params.push(q, q, q);
  }

  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows.map(parseBookmark) });
});

app.get("/api/bookmarks/:id", requireAuth, requirePermission("canRead"), (req, res) => {
  const row = db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  res.json({ success: true, data: parseBookmark(row) });
});

app.post("/api/bookmarks", requireAuth, requirePermission("canWrite"), validateBody(BookmarkSchemas.create), (req, res) => {
  const { url, title } = req.body;

  // Duplicate URL check per user
  const existing = db.prepare("SELECT id, title FROM bookmarks WHERE url = ? AND user_uuid = ?").get(url, req.userUuid);
  if (existing) return res.status(409).json({ success: false, error: `A bookmark for "${url}" already exists`, existing });

  // Check: Only humans can set jinaUrl
  if (req.body.jinaUrl !== undefined && req.keyType !== 'human') {
    return res.status(403).json({
      success: false,
      error: 'Agent keys cannot create bookmarks with r.jina.ai conversion. Only human users can set jinaUrl.'
    });
  }

  const now = new Date().toISOString();
  const bookmark = {
    id:          req.body.id ?? generateId(),
    user_uuid:   req.userUuid,
    url,
    title,
    description: req.body.description ?? "",
    favicon:     req.body.favicon ?? "",
    tags:        JSON.stringify(req.body.tags ?? []),
    folder_id:   req.body.folderId ?? null,
    starred:     req.body.starred ? 1 : 0,
    archived:    req.body.archived ? 1 : 0,
    color:       req.body.color ?? null,
    jina_url:    req.body.jinaUrl ?? null,
    created_at:  req.body.createdAt ?? now,
    updated_at:  now,
  };

  db.prepare(`INSERT INTO bookmarks (id,user_uuid,url,title,description,favicon,tags,folder_id,starred,archived,color,jina_url,created_at,updated_at)
    VALUES (@id,@user_uuid,@url,@title,@description,@favicon,@tags,@folder_id,@starred,@archived,@color,@jina_url,@created_at,@updated_at)`).run(bookmark);

  audit.log("BOOKMARK_CREATED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "create",
    outcome: "success",
    resource: "bookmark",
    details: { bookmark_id: bookmark.id, title: bookmark.title },
  });

  if (req.body.jinaUrl && req.keyType === 'human') {
    audit.log("bookmark_jina_conversion_set", {
      actor: req.userUuid,
      actor_type: req.keyType,
      action: "create",
      outcome: "success",
      resource: "bookmark",
      details: { bookmark_id: bookmark.id, jina_url: req.body.jinaUrl },
    });
  }

  res.status(201).json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(bookmark.id, req.userUuid)) });
});

app.put("/api/bookmarks/:id", requireAuth, requirePermission("canEdit"), validateBody(BookmarkSchemas.update), (req, res) => {
  const row = db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });

  if (req.body.jinaUrl !== undefined && req.keyType !== 'human') {
    return res.status(403).json({
      success: false,
      error: 'Agent keys cannot set r.jina.ai conversion. Only human users can manage jinaUrl.'
    });
  }

  const updated = {
    url:         req.body.url         ?? row.url,
    title:       req.body.title       ?? row.title,
    description: req.body.description ?? row.description,
    favicon:     req.body.favicon     ?? row.favicon,
    tags:        JSON.stringify(req.body.tags ?? JSON.parse(row.tags)),
    folder_id:   req.body.folderId    !== undefined ? req.body.folderId : row.folder_id,
    starred:     req.body.starred     !== undefined ? (req.body.starred ? 1 : 0) : row.starred,
    archived:    req.body.archived    !== undefined ? (req.body.archived ? 1 : 0) : row.archived,
    color:       req.body.color       !== undefined ? req.body.color : row.color,
    jina_url:    req.body.jinaUrl     !== undefined ? req.body.jinaUrl : row.jina_url,
    updated_at:  new Date().toISOString(),
    id:          req.params.id,
    user_uuid:   req.userUuid,
  };

  db.prepare(`UPDATE bookmarks SET url=@url, title=@title, description=@description, favicon=@favicon, tags=@tags,
    folder_id=@folder_id, starred=@starred, archived=@archived, color=@color, jina_url=@jina_url, updated_at=@updated_at WHERE id=@id AND user_uuid=@user_uuid`)
    .run(updated);

  audit.log("BOOKMARK_UPDATED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "update",
    outcome: "success",
    resource: "bookmark",
    details: { bookmark_id: req.params.id },
  });

  if (req.body.hasOwnProperty("jinaUrl") && req.keyType === 'human' && req.body.jinaUrl !== row.jina_url) {
    audit.log("bookmark_jina_conversion_set", {
      actor: req.userUuid,
      actor_type: req.keyType,
      action: "update",
      outcome: "success",
      resource: "bookmark",
      details: { bookmark_id: req.params.id, jina_url: req.body.jinaUrl },
    });
  }

  res.json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid)) });
});

app.delete("/api/bookmarks/:id", requireAuth, requirePermission("canDelete"), (req, res) => {
  const info = db.prepare("DELETE FROM bookmarks WHERE id = ? AND user_uuid = ?").run(req.params.id, req.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Bookmark not found" });
  audit.log("BOOKMARK_DELETED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "delete",
    outcome: "success",
    resource: "bookmark",
    details: { bookmark_id: req.params.id },
  });
  res.json({ success: true });
});

app.delete("/api/folders", requireAuth, requirePermission("canDelete"), (req, res) => {
  const info = db.prepare("DELETE FROM folders WHERE user_uuid = ?").run(req.userUuid);
  audit.log("FOLDERS_PURGED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "delete",
    outcome: "success",
    resource: "folder",
    details: { count: info.changes },
  });
  res.json({ success: true, count: info.changes });
});

app.delete("/api/bookmarks", requireAuth, requirePermission("canDelete"), (req, res) => {
  const info = db.prepare("DELETE FROM bookmarks WHERE user_uuid = ?").run(req.userUuid);
  audit.log("BOOKMARKS_PURGED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "delete",
    outcome: "success",
    resource: "bookmark",
    details: { count: info.changes },
  });
  res.json({ success: true, count: info.changes });
});

app.patch("/api/bookmarks/:id/star", requireAuth, requirePermission("canEdit"), (req, res) => {
  const row = db.prepare("SELECT starred FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  const newStarred = row.starred ? 0 : 1;
  db.prepare("UPDATE bookmarks SET starred = ?, updated_at = ? WHERE id = ? AND user_uuid = ?")
    .run(newStarred, new Date().toISOString(), req.params.id, req.userUuid);
  const result = parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid));
  audit.log("BOOKMARK_STARRED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "update",
    outcome: "success",
    resource: "bookmark",
    details: { bookmark_id: req.params.id, starred: result.starred },
  });
  res.json({ success: true, data: result });
});

app.patch("/api/bookmarks/:id/archive", requireAuth, requirePermission("canEdit"), (req, res) => {
  const row = db.prepare("SELECT archived FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  const newArchived = row.archived ? 0 : 1;
  db.prepare("UPDATE bookmarks SET archived = ?, updated_at = ? WHERE id = ? AND user_uuid = ?")
    .run(newArchived, new Date().toISOString(), req.params.id, req.userUuid);
  const result = parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid));
  audit.log("BOOKMARK_ARCHIVED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "update",
    outcome: "success",
    resource: "bookmark",
    details: { bookmark_id: req.params.id, archived: result.archived },
  });
  res.json({ success: true, data: result });
});

// ─── Folders ──────────────────────────────────────────────────────────────────

app.get("/api/folders", requireAuth, requirePermission("canRead"), (req, res) => {
  const rows = db.prepare("SELECT * FROM folders WHERE user_uuid = ? ORDER BY created_at ASC").all(req.userUuid);
  res.json({ success: true, data: rows.map(parseFolder) });
});

app.post("/api/folders", requireAuth, requirePermission("canWrite"), validateBody(FolderSchemas.create), (req, res) => {
  const { name } = req.body;
  const folder = { id: req.body.id ?? generateId(), user_uuid: req.userUuid, name, parent_id: req.body.parentId ?? null, color: req.body.color ?? "#06b6d4", created_at: new Date().toISOString() };
  db.prepare("INSERT INTO folders (id, user_uuid, name, parent_id, color, created_at) VALUES (@id, @user_uuid, @name, @parent_id, @color, @created_at)").run(folder);
  audit.log("FOLDER_CREATED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "create",
    outcome: "success",
    resource: "folder",
    details: { folder_id: folder.id, name: folder.name },
  });
  res.status(201).json({ success: true, data: parseFolder(db.prepare("SELECT * FROM folders WHERE id = ? AND user_uuid = ?").get(folder.id, req.userUuid)) });
});

app.put("/api/folders/:id", requireAuth, requirePermission("canEdit"), validateBody(FolderSchemas.update), (req, res) => {
  const row = db.prepare("SELECT * FROM folders WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid);
  if (!row) return res.status(404).json({ success: false, error: "Folder not found" });
  const updated = { name: req.body.name ?? row.name, color: req.body.color ?? row.color, parent_id: req.body.parentId !== undefined ? req.body.parentId : row.parent_id, id: req.params.id, user_uuid: req.userUuid };
  db.prepare("UPDATE folders SET name=@name, color=@color, parent_id=@parent_id WHERE id=@id AND user_uuid=@user_uuid").run(updated);
  audit.log("FOLDER_UPDATED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "update",
    outcome: "success",
    resource: "folder",
    details: { folder_id: req.params.id },
  });
  res.json({ success: true, data: parseFolder(db.prepare("SELECT * FROM folders WHERE id = ? AND user_uuid = ?").get(req.params.id, req.userUuid)) });
});

app.delete("/api/folders/:id", requireAuth, requirePermission("canDelete"), (req, res) => {
  const info = db.prepare("DELETE FROM folders WHERE id = ? AND user_uuid = ?").run(req.params.id, req.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Folder not found" });
  audit.log("FOLDER_DELETED", {
    actor: req.userUuid,
    actor_type: req.keyType,
    action: "delete",
    outcome: "success",
    resource: "folder",
    details: { folder_id: req.params.id },
  });
  res.json({ success: true });
});

// ─── Agent Keys ───────────────────────────────────────────────────────────────

app.get("/api/agent-keys", requireAuth, humanOnly, (req, res) => {
  const rows = db.prepare("SELECT * FROM agent_keys WHERE user_uuid = ? ORDER BY created_at DESC").all(req.userUuid);
  res.json({ success: true, data: rows.map(parseAgentKey) });
});

app.post("/api/agent-keys", requireAuth, humanOnly, validateBody(AgentKeySchemas.create), (req, res) => {
  const { name } = req.body;

  // No duplicate active key names per user
  const dup = db.prepare("SELECT id FROM agent_keys WHERE name = ? AND is_active = 1 AND user_uuid = ?").get(name, req.userUuid);
  if (dup) return res.status(409).json({ success: false, error: `An active agent key named "${name}" already exists` });

  let expDate = null;
  if (req.body.expirationType && req.body.expirationType !== "never") {
    expDate = calculateExpiry(req.body.expirationType);
  }

  const key = {
    id: req.body.id ?? generateId(),
    user_uuid: req.userUuid,
    name,
    description: req.body.description ?? null,
    api_key: req.body.apiKey ?? `lb-${generateString(64)}`,
    permissions: JSON.stringify(req.body.permissions ?? {}),
    expiration_type: req.body.expirationType ?? "never",
    expiration_date: expDate,
    rate_limit: req.body.rateLimit ?? null,
    is_active: 1,
    created_at: new Date().toISOString(),
    last_used: null,
  };

  db.prepare(`INSERT INTO agent_keys (id,user_uuid,name,description,api_key,permissions,expiration_type,expiration_date,rate_limit,is_active,created_at,last_used)
    VALUES (@id,@user_uuid,@name,@description,@api_key,@permissions,@expiration_type,@expiration_date,@rate_limit,@is_active,@created_at,@last_used)`).run(key);

  audit.log("AGENT_KEY_CREATED", { actor: req.userUuid, actor_type: "human", resource: key.id, action: "create", outcome: "success", ip_address: req.ip, user_agent: req.headers["user-agent"], details: { name: key.name } });

  res.status(201).json({ success: true, data: parseAgentKey(db.prepare("SELECT * FROM agent_keys WHERE id = ? AND user_uuid = ?").get(key.id, req.userUuid)) });
});

app.patch("/api/agent-keys/:id/revoke", requireAuth, humanOnly, (req, res) => {
  const now = new Date().toISOString();
  const info = db.prepare("UPDATE agent_keys SET is_active = 0, revoked_at = ?, revoked_by = ? WHERE id = ? AND user_uuid = ?").run(now, req.userUuid, req.params.id, req.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Agent key not found" });
  audit.log("AGENT_KEY_REVOKED", { actor: req.userUuid, actor_type: "human", resource: req.params.id, action: "revoke", outcome: "success", ip_address: req.ip, user_agent: req.headers["user-agent"] });
  res.json({ success: true });
});

app.delete("/api/agent-keys/:id", requireAuth, humanOnly, (req, res) => {
  const info = db.prepare("DELETE FROM agent_keys WHERE id = ? AND user_uuid = ?").run(req.params.id, req.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Agent key not found" });
  res.json({ success: true });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

app.get("/api/settings/:key", requireAuth, humanOnly, (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ? AND user_uuid = ?").get(req.params.key, req.userUuid);
  if (!row) return res.json({ success: true, data: {} }); // Return empty object if setting not found, to let frontend apply defaults without 404 errors
  res.json({ success: true, data: JSON.parse(row.value) });
});

app.put("/api/settings/:key", requireAuth, humanOnly, (req, res) => {
  // Use INSERT OR REPLACE with the composite (user_uuid, key) unique index
  db.prepare("INSERT OR REPLACE INTO settings (user_uuid, key, value) VALUES (?, ?, ?)")
    .run(req.userUuid, req.params.key, JSON.stringify(req.body));
  res.json({ success: true });
});

// ─── Static Files & Catch-All ─────────────────────────────────────────────────

// Serve static frontend files from 'dist' in production
const distPath = path.join(__dirname, "dist");
console.log("🦞 [Server] Serving static files from:", distPath);
console.log("🦞 [Server] dist/ exists:", fs.existsSync(distPath));
console.log("🦞 [Server] index.html exists:", fs.existsSync(path.join(distPath, "index.html")));

// Serve static assets with default caching (hashed filenames — safe to cache).
// Force no-cache on index.html so the browser always fetches the latest asset
// hashes after a Docker rebuild, preventing stale hash mismatches.
app.use(express.static(distPath, {
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  },
}));

// For any non-API, non-asset route, send index.html (React Router SPA fallback).
// Explicitly exclude /assets/ so CSS/JS/images are never served as index.html.
app.get(/^(?!\/api\/)(?!\/assets\/).*/, (req, res, next) => {
  const indexPath = path.join(distPath, "index.html");
  
  // Aggressive cache-busting for the SPA entry point to prevent "Stale Hash" CSS issues
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.sendFile(indexPath);
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use("/api", (_req, res) => res.status(404).json({ success: false, error: "Route not found" }));

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🦞 ClawChives API (SQLite - Multi-User) running on port ${PORT}`);
  console.log(`   Health:       http://localhost:${PORT}/api/health`);
  console.log(`   Issue token:  POST http://localhost:${PORT}/api/auth/token`);
  console.log(`   Database:     ${DB_PATH}\n`);
});
