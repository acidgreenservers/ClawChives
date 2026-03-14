# 10: Database Migrations (Security Schema Updates)

[![Priority](https://img.shields.io/badge/Priority-Critical-red)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-2%20hours-blue)](#)

---

## Why This Matters

**Problem:** Security features require database schema changes:
- **Token expiry** - Needs `expires_at` column in `api_tokens`
- **Audit logging** - Needs `audit_logs` table
- **Agent key tracking** - Needs `last_used_at`, `revoked_at` columns
- **Schema versioning** - No way to track what migrations have been applied

**Impact:** Manual schema changes are error-prone, can't rollback, no deployment automation.

**Solution:** Database migrations with version tracking.

---

## What This Implements

### Migration System

| Component | Description |
|-----------|-------------|
| **migrations Table** | Tracks applied migrations (version, timestamp) |
| **001-security-hardening.sql** | Adds all security-related schema changes |
| **Migration Runner** | Applies pending migrations on server startup |
| **Rollback Support** | Down migrations for reverting changes (optional) |

### Schema Changes Required

**1. Add `expires_at` to `api_tokens` (Token Expiry):**
```sql
ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;
```

**2. Create `audit_logs` table (Audit Logging):**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT,
  actor_type TEXT,
  resource TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT
);
```

**3. Add tracking columns to `agent_keys`:**
```sql
ALTER TABLE agent_keys ADD COLUMN last_used_at TEXT;
ALTER TABLE agent_keys ADD COLUMN revoked_at TEXT;
ALTER TABLE agent_keys ADD COLUMN revoked_by TEXT;
ALTER TABLE agent_keys ADD COLUMN revoke_reason TEXT;
```

**4. Create `migrations` tracking table:**
```sql
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
```

---

## How It Works

### Migration Flow

```
Server Startup:
  ├─ Check if migrations table exists
  ├─ If not: Create migrations table
  ├─ Get list of migration files (001-security-hardening.sql, 002-...)
  ├─ Check which migrations already applied (SELECT * FROM migrations)
  ├─ Run pending migrations in order
  ├─ Record each migration in migrations table
  └─ Continue server startup

Migration File Structure:
  001-security-hardening.sql
    ├─ -- ========== UP ========== (Apply changes)
    ├─ ALTER TABLE api_tokens ADD COLUMN expires_at TEXT;
    ├─ CREATE TABLE audit_logs (...);
    ├─ -- ========== DOWN ========== (Rollback changes)
    ├─ ALTER TABLE api_tokens DROP COLUMN expires_at;
    └─ DROP TABLE audit_logs;
```

### Integration Points

**1. Create migrations directory:**
```
project/
  ├─ migrations/
  │   ├─ 001-security-hardening.sql
  │   └─ 002-future-migration.sql
  └─ server.js
```

**2. Run migrations on startup (server.js line 48+):**
```javascript
import { runMigrations } from "./src/utils/migrations.js";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ✅ Run migrations before creating tables
await runMigrations(db, "./migrations");

// Then create/update tables...
db.exec(`CREATE TABLE IF NOT EXISTS users (...)`);
```

---

## Implementation

See [001-security-hardening.sql](./001-security-hardening.sql) for full migration.

### Quick Overview

**1. Create migrations table:**
```sql
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);
```

**2. Create migration runner (src/utils/migrations.js):**
```javascript
export async function runMigrations(db, migrationsDir) {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    )
  `);

  // Get applied migrations
  const applied = db.prepare("SELECT version FROM migrations").all();
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Get migration files
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const version = file.replace(".sql", "");

    if (appliedVersions.has(version)) {
      continue; // Already applied
    }

    console.log(`🔄 Running migration: ${version}`);

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const upSql = sql.split("-- ========== DOWN ==========")[0];

    db.exec(upSql);

    db.prepare("INSERT INTO migrations (version, applied_at) VALUES (?, ?)")
      .run(version, new Date().toISOString());

    console.log(`✅ Migration applied: ${version}`);
  }
}
```

**3. Create migration file (migrations/001-security-hardening.sql):**
See [001-security-hardening.sql](./001-security-hardening.sql)

---

## Testing

### Manual Tests

**Test 1: Apply migrations on fresh database**
```bash
# Delete database
rm data/db.sqlite

# Start server (migrations run automatically)
npm run start:api

# Check migrations table
sqlite3 data/db.sqlite "SELECT * FROM migrations;"
# Expected: 001-security-hardening | 2024-01-15T10:30:00Z
```

**Test 2: Verify schema changes**
```bash
sqlite3 data/db.sqlite ".schema api_tokens"
# Expected: expires_at TEXT column present

sqlite3 data/db.sqlite ".schema audit_logs"
# Expected: audit_logs table exists
```

**Test 3: Idempotent migrations (run twice)**
```bash
# Restart server
npm run start:api

# Check logs
# Expected: No migrations run (already applied)
```

---

## Configuration Options

### Migration Directory

```javascript
// .env
MIGRATIONS_DIR=./migrations

// server.js
const migrationsDir = process.env.MIGRATIONS_DIR || "./migrations";
await runMigrations(db, migrationsDir);
```

### Rollback Migrations

```javascript
export async function rollbackMigration(db, version) {
  const file = `${version}.sql`;
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  const downSql = sql.split("-- ========== DOWN ==========")[1];

  if (!downSql) {
    throw new Error(`No DOWN migration for ${version}`);
  }

  db.exec(downSql);
  db.prepare("DELETE FROM migrations WHERE version = ?").run(version);
  console.log(`⏪ Rolled back migration: ${version}`);
}
```

---

## Common Issues & Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution:** Use `IF NOT EXISTS` in CREATE TABLE statements.

### Issue: Can't rollback migration
**Solution:** Add `-- ========== DOWN ==========` section to migration file.

### Issue: Migrations run out of order
**Solution:** Name files with zero-padded numbers (001-, 002-, not 1-, 2-).

### Issue: SQLite doesn't support DROP COLUMN
**Solution:** Use create-copy-drop pattern:
```sql
-- Create new table without column
CREATE TABLE api_tokens_new AS SELECT id, key, owner_key FROM api_tokens;
DROP TABLE api_tokens;
ALTER TABLE api_tokens_new RENAME TO api_tokens;
```

---

## Next Steps

1. ✅ Review [README.md](./README.md) and [001-security-hardening.sql](./001-security-hardening.sql)
2. ⬜ Create `migrations/` directory
3. ⬜ Add `001-security-hardening.sql` migration
4. ⬜ Create `src/utils/migrations.js` runner
5. ⬜ Add migration runner to server.js startup
6. ⬜ Delete test database and verify migrations run
7. ⬜ Security audit complete! 🎉

---

## References

- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)
- [Database Migration Best Practices](https://www.liquibase.com/blog/database-migration-best-practices)
