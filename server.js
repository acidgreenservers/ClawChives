/**
 * ClawChives API Server — SQLite Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Express REST API with persistent SQLite storage via better-sqlite3.
 *
 * Database file: /app/data/db.sqlite (Docker) or ./data/db.sqlite (local)
 *
 * Key prefixes:
 *   hu-  Human identity keys   (login — validated client-side against IndexedDB)
 *   ag-  Agent keys            (generated in Settings → Agent Permissions)
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

"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// ─── SQLite Setup ─────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error(
    "\n❌  better-sqlite3 is not installed.\n" +
    "    Run: npm install better-sqlite3\n"
  );
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");   // Better concurrent read performance
db.pragma("foreign_keys = ON");

// ─── Schema Migrations ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS api_tokens (
    key        TEXT PRIMARY KEY,
    owner_key  TEXT NOT NULL,
    owner_type TEXT NOT NULL,  /* 'human' | 'agent' */
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id          TEXT PRIMARY KEY,
    url         TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    favicon     TEXT DEFAULT '',
    tags        TEXT DEFAULT '[]',  /* JSON array */
    folder_id   TEXT,
    starred     INTEGER DEFAULT 0,
    archived    INTEGER DEFAULT 0,
    color       TEXT,
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
    permissions     TEXT NOT NULL,  /* JSON */
    expiration_type TEXT NOT NULL,
    expiration_date TEXT,
    rate_limit      INTEGER,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL,
    last_used       TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL  /* JSON */
  );
`);

console.log(`[DB] SQLite database at ${DB_PATH}`);

// ─── App & Middleware ─────────────────────────────────────────────────────────

const app = express();
const PORT = parseInt(process.env.PORT ?? "4242", 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(length), (b) => chars[b % chars.length]).join("");
}

function generateId() { return crypto.randomUUID(); }

function detectKeyType(key) {
  if (key?.startsWith("hu-")) return "human";
  if (key?.startsWith("ag-")) return "agent";
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // remove snake_case dupes
    folder_id: undefined,
    created_at: undefined,
    updated_at: undefined,
  };
}

function parseFolder(row) {
  if (!row) return null;
  return { ...row, parentId: row.parent_id, createdAt: row.created_at, parent_id: undefined, created_at: undefined };
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
    // remove snake_case dupes
    is_active: undefined, expiration_type: undefined, expiration_date: undefined,
    rate_limit: undefined, created_at: undefined, last_used: undefined,
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
    return res.status(401).json({ success: false, error: "Invalid key format — must use hu-, ag-, or api- prefix" });
  }

  // api- tokens must exist in DB
  if (keyType === "api") {
    const row = db.prepare("SELECT * FROM api_tokens WHERE key = ?").get(key);
    if (!row) {
      return res.status(401).json({ success: false, error: "Invalid or revoked API token" });
    }
  }

  // ag- keys validated against agent_keys table
  if (keyType === "agent") {
    const row = db.prepare("SELECT * FROM agent_keys WHERE api_key = ? AND is_active = 1").get(key);
    if (!row) {
      return res.status(401).json({ success: false, error: "Invalid or revoked agent key" });
    }
    // Update last_used
    db.prepare("UPDATE agent_keys SET last_used = ? WHERE api_key = ?")
      .run(new Date().toISOString(), key);
  }

  req.apiKey = key;
  req.keyType = keyType;
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  const counts = {
    bookmarks: db.prepare("SELECT COUNT(*) as c FROM bookmarks").get().c,
    folders:   db.prepare("SELECT COUNT(*) as c FROM folders").get().c,
    agentKeys: db.prepare("SELECT COUNT(*) as c FROM agent_keys WHERE is_active = 1").get().c,
  };
  res.json({
    success: true, service: "ClawChives API", version: "2.0.0",
    mode: "sqlite", db: DB_PATH, uptime: process.uptime(), counts,
  });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

/** POST /api/auth/token — issue a REST api- token from a hu- or ag- key */
app.post("/api/auth/token", (req, res) => {
  const { ownerKey } = req.body;
  const ownerType = detectKeyType(ownerKey);
  if (!ownerKey || (ownerType !== "human" && ownerType !== "agent")) {
    return res.status(400).json({ success: false, error: "ownerKey must be a hu- or ag- key" });
  }

  const token = `api-${generateString(32)}`;
  db.prepare("INSERT INTO api_tokens (key, owner_key, owner_type, created_at) VALUES (?, ?, ?, ?)")
    .run(token, ownerKey, ownerType, new Date().toISOString());

  res.status(201).json({ success: true, data: { token, type: ownerType, createdAt: new Date().toISOString() } });
});

/** GET /api/auth/validate */
app.get("/api/auth/validate", requireAuth, (req, res) => {
  res.json({ success: true, data: { valid: true, keyType: req.keyType } });
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────

app.get("/api/bookmarks", requireAuth, (req, res) => {
  let sql = "SELECT * FROM bookmarks WHERE 1=1";
  const params = [];

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

app.get("/api/bookmarks/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  res.json({ success: true, data: parseBookmark(row) });
});

app.post("/api/bookmarks", requireAuth, (req, res) => {
  const { url, title } = req.body;
  if (!url)   return res.status(400).json({ success: false, error: "url is required" });
  if (!title) return res.status(400).json({ success: false, error: "title is required" });

  // Duplicate URL check
  const existing = db.prepare("SELECT id, title FROM bookmarks WHERE url = ?").get(url);
  if (existing) return res.status(409).json({ success: false, error: `A bookmark for "${url}" already exists`, existing });

  const now = new Date().toISOString();
  const bookmark = {
    id:          req.body.id ?? generateId(),
    url,
    title,
    description: req.body.description ?? "",
    favicon:     req.body.favicon ?? "",
    tags:        JSON.stringify(req.body.tags ?? []),
    folder_id:   req.body.folderId ?? null,
    starred:     req.body.starred ? 1 : 0,
    archived:    req.body.archived ? 1 : 0,
    color:       req.body.color ?? null,
    created_at:  req.body.createdAt ?? now,
    updated_at:  now,
  };

  db.prepare(`INSERT INTO bookmarks (id,url,title,description,favicon,tags,folder_id,starred,archived,color,created_at,updated_at)
    VALUES (@id,@url,@title,@description,@favicon,@tags,@folder_id,@starred,@archived,@color,@created_at,@updated_at)`).run(bookmark);

  res.status(201).json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(bookmark.id)) });
});

app.put("/api/bookmarks/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });

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
    updated_at:  new Date().toISOString(),
    id:          req.params.id,
  };

  db.prepare(`UPDATE bookmarks SET url=@url, title=@title, description=@description, favicon=@favicon, tags=@tags,
    folder_id=@folder_id, starred=@starred, archived=@archived, color=@color, updated_at=@updated_at WHERE id=@id`)
    .run(updated);

  res.json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id)) });
});

app.delete("/api/bookmarks/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM bookmarks WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Bookmark not found" });
  res.json({ success: true });
});

app.patch("/api/bookmarks/:id/star", requireAuth, (req, res) => {
  const row = db.prepare("SELECT starred FROM bookmarks WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  db.prepare("UPDATE bookmarks SET starred = ?, updated_at = ? WHERE id = ?")
    .run(row.starred ? 0 : 1, new Date().toISOString(), req.params.id);
  res.json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id)) });
});

app.patch("/api/bookmarks/:id/archive", requireAuth, (req, res) => {
  const row = db.prepare("SELECT archived FROM bookmarks WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: "Bookmark not found" });
  db.prepare("UPDATE bookmarks SET archived = ?, updated_at = ? WHERE id = ?")
    .run(row.archived ? 0 : 1, new Date().toISOString(), req.params.id);
  res.json({ success: true, data: parseBookmark(db.prepare("SELECT * FROM bookmarks WHERE id = ?").get(req.params.id)) });
});

// ─── Folders ──────────────────────────────────────────────────────────────────

app.get("/api/folders", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM folders ORDER BY created_at ASC").all();
  res.json({ success: true, data: rows.map(parseFolder) });
});

app.post("/api/folders", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "name is required" });
  const folder = { id: req.body.id ?? generateId(), name, parent_id: req.body.parentId ?? null, color: req.body.color ?? "#06b6d4", created_at: new Date().toISOString() };
  db.prepare("INSERT INTO folders (id, name, parent_id, color, created_at) VALUES (@id, @name, @parent_id, @color, @created_at)").run(folder);
  res.status(201).json({ success: true, data: parseFolder(db.prepare("SELECT * FROM folders WHERE id = ?").get(folder.id)) });
});

app.put("/api/folders/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM folders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: "Folder not found" });
  const updated = { name: req.body.name ?? row.name, color: req.body.color ?? row.color, parent_id: req.body.parentId !== undefined ? req.body.parentId : row.parent_id, id: req.params.id };
  db.prepare("UPDATE folders SET name=@name, color=@color, parent_id=@parent_id WHERE id=@id").run(updated);
  res.json({ success: true, data: parseFolder(db.prepare("SELECT * FROM folders WHERE id = ?").get(req.params.id)) });
});

app.delete("/api/folders/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM folders WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Folder not found" });
  res.json({ success: true });
});

// ─── Agent Keys ───────────────────────────────────────────────────────────────

app.get("/api/agent-keys", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM agent_keys ORDER BY created_at DESC").all();
  res.json({ success: true, data: rows.map(parseAgentKey) });
});

app.post("/api/agent-keys", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "name is required" });

  // No duplicate active key names
  const dup = db.prepare("SELECT id FROM agent_keys WHERE name = ? AND is_active = 1").get(name);
  if (dup) return res.status(409).json({ success: false, error: `An active agent key named "${name}" already exists` });

  const key = {
    id: req.body.id ?? generateId(),
    name,
    description: req.body.description ?? null,
    api_key: req.body.apiKey ?? `ag-${generateString(64)}`,
    permissions: JSON.stringify(req.body.permissions ?? {}),
    expiration_type: req.body.expirationType ?? "never",
    expiration_date: req.body.expirationDate ?? null,
    rate_limit: req.body.rateLimit ?? null,
    is_active: 1,
    created_at: new Date().toISOString(),
    last_used: null,
  };

  db.prepare(`INSERT INTO agent_keys (id,name,description,api_key,permissions,expiration_type,expiration_date,rate_limit,is_active,created_at,last_used)
    VALUES (@id,@name,@description,@api_key,@permissions,@expiration_type,@expiration_date,@rate_limit,@is_active,@created_at,@last_used)`).run(key);

  res.status(201).json({ success: true, data: parseAgentKey(db.prepare("SELECT * FROM agent_keys WHERE id = ?").get(key.id)) });
});

app.patch("/api/agent-keys/:id/revoke", requireAuth, (req, res) => {
  const info = db.prepare("UPDATE agent_keys SET is_active = 0 WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Agent key not found" });
  res.json({ success: true });
});

app.delete("/api/agent-keys/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM agent_keys WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ success: false, error: "Agent key not found" });
  res.json({ success: true });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

app.get("/api/settings/:key", requireAuth, (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(req.params.key);
  if (!row) return res.status(404).json({ success: false, error: "Setting not found" });
  res.json({ success: true, data: JSON.parse(row.value) });
});

app.put("/api/settings/:key", requireAuth, (req, res) => {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(req.params.key, JSON.stringify(req.body));
  res.json({ success: true });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ success: false, error: "Route not found" }));

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ success: false, error: err.message ?? "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🦞 ClawChives API (SQLite) running on port ${PORT}`);
  console.log(`   Health:       http://localhost:${PORT}/api/health`);
  console.log(`   Issue token:  POST http://localhost:${PORT}/api/auth/token`);
  console.log(`   Database:     ${DB_PATH}\n`);
});
