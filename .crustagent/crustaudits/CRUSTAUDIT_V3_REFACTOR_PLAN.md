# CRUSTAUDIT — ClawChives v3 Refactor Plan
### Architecture: `server.js` Monolith → TypeScript Feature-Split Backend

**Date:** 2026-03-14  
**Auditor:** CrustAgent©™  
**Source Reference:** PinchPad©™ (`../../../PinchPad`) as the target architecture template

---

## Overview

ClawChives currently runs on a 922-line plain JS `server.js` monolith with Express 5. The goal of this refactor is to port the project to TypeScript, split the backend into feature-based route files, and establish a clean `src/server/` module structure — matching the pattern proven in PinchPad. All existing security features, audit logging, Zod validation, and middleware **must be preserved and ported**, not dropped.

This is a **backend-only refactor**. The `src/` React frontend is untouched.

---

## Target Directory Structure

```
ClawChives/
├── server.ts                        ← NEW: Thin entrypoint. Import routes, start server.
├── src/
│   └── server/
│       ├── db.ts                    ← NEW: DB singleton, schema init, migrations, purge util
│       ├── routes/
│       │   ├── auth.ts              ← NEW: /api/auth/*
│       │   ├── bookmarks.ts         ← NEW: /api/bookmarks/*
│       │   ├── folders.ts           ← NEW: /api/folders/*
│       │   ├── agentKeys.ts         ← NEW: /api/agent-keys/*
│       │   └── settings.ts          ← NEW: /api/settings/*
│       ├── middleware/
│       │   ├── auth.ts              ← NEW: requireAuth (TS), requireHuman (TS)
│       │   ├── rateLimiter.ts       ← PORT: rateLimiter.js → .ts
│       │   ├── validate.ts          ← PORT: validate.js → .ts
│       │   ├── errorHandler.ts      ← PORT: errorHandler.js → .ts
│       │   └── httpsRedirect.ts     ← PORT: httpsRedirect.js → .ts
│       ├── utils/
│       │   ├── auditLogger.ts       ← PORT: auditLogger.js → .ts
│       │   ├── tokenExpiry.ts       ← PORT: tokenExpiry.js → .ts
│       │   └── crypto.ts            ← NEW: generateString, generateId (typed)
│       └── validation/
│           └── schemas.ts           ← PORT: schemas.js → .ts (Zod schemas)
├── package.json                     ← MODIFY: add tsx, ts deps, update scripts
└── tsconfig.json                    ← MODIFY: ensure server/ is included
```

---

## Step-by-Step Implementation

### Step 1 — Install TypeScript Tooling

Update `package.json` devDependencies:

```bash
npm install --save-dev tsx @types/better-sqlite3 @types/cors @types/express
```

Update `package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "dev:server": "tsx --watch --ignore data/** server.ts",
  "start": "NODE_ENV=production tsx server.ts &",
  "start-dev": "npm run dev:server & npm run dev &",
  "stop": "fuser -k 8282/tcp 4242/tcp || true",
  "stop-dev": "fuser -k 8282/tcp 4242/tcp || true",
  "build": "tsc && vite build",
  "lint": "tsc --noEmit",
  "test": "vitest run"
}
```

Remove `concurrently` from dependencies — it's no longer needed.

---

### Step 2 — Create `src/server/utils/crypto.ts`

Extract `generateString` and `generateId` from `server.js` lines 261–273.

```typescript
import crypto from 'crypto';

// 🛡️ Sentinel Security Fix: crypto.randomInt avoids modulo bias.
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
```

---

### Step 3 — Create `src/server/db.ts`

Move all DB setup from `server.js` lines 47–201. Key changes:
- Change `DATA_DIR` to use `process.env.DATA_DIR` with fallback.
- Change DB filename from `db.sqlite` to `clawchives.db` (or keep as-is, your call — just be consistent).
- Keep ALL schema + migration logic intact. Do NOT simplify.
- Export `purgeExpiredTokens()` as a named export.
- Export `db` as default.

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'db.sqlite');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema and migrations (copy verbatim from server.js lines 62–198) ---
db.exec(`...`);

// runColumnMigration helper (copy from server.js lines 136–138)
const runColumnMigration = (sql: string, desc: string) => { ... };

// All runColumnMigration calls (copy from server.js lines 141–165)

// Unique index migration (copy from server.js lines 167–181)

// Composite indexes (copy from server.js lines 183–198)

console.log(`[DB] SQLite at ${DB_PATH}`);

export function purgeExpiredTokens(): number {
  // Copy from server.js tokenExpiry scheduler — or implement directly using:
  const result = db.prepare(
    `DELETE FROM api_tokens WHERE datetime(expires_at) <= datetime('now')`
  ).run();
  return result.changes;
}

export default db;
```

---

### Step 4 — Port `src/server/utils/auditLogger.ts`

Copy `src/utils/auditLogger.js` verbatim, rename to `.ts`, add types:

```typescript
import type { Database } from 'better-sqlite3';

export interface AuditEntry {
  actor?: string;
  actor_type?: string;
  resource?: string;
  action: string;
  outcome: string;
  ip_address?: string;
  user_agent?: string;
  details?: object;
}

export function createAuditLogger(db: Database) {
  return {
    log(event_type: string, entry: AuditEntry) {
      db.prepare(`INSERT INTO audit_logs (timestamp, event_type, actor, actor_type, resource, action, outcome, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          new Date().toISOString(),
          event_type,
          entry.actor ?? null,
          entry.actor_type ?? null,
          entry.resource ?? null,
          entry.action,
          entry.outcome,
          entry.ip_address ?? null,
          entry.user_agent ?? null,
          entry.details ? JSON.stringify(entry.details) : null
        );
    }
  };
}
```

---

### Step 5 — Port `src/server/utils/tokenExpiry.ts`

Copy `src/utils/tokenExpiry.js` → `.ts`. Add `db: Database` type to function signatures. Keep all TTL parsing and scheduling logic.

---

### Step 6 — Port Middleware Files

Copy all files from `src/middleware/*.js` → `src/server/middleware/*.ts`. Apply types:

#### `auth.ts`
Move `requireAuth` function from `server.js` lines 326–420 into this file.  
- Accept `db` as an argument (dependency injection) OR import `db` from `../db`.
- Define and export `AuthRequest` interface extending `express.Request`.
- Export `requireHuman` middleware separately.

```typescript
import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userUuid: string;
  keyType: 'human' | 'agent' | 'api';
  agentPermissions: Record<string, boolean>;
  apiKey: string;
}
```

#### `rateLimiter.ts`
Port `rateLimiter.js`. Keep `createAgentKeyRateLimiter(db)` — it needs the db instance — so import db from `../db`.

#### `validate.ts`
Port `validate.js`. The `validateBody(schema)` factory should keep the same Zod shape:
```typescript
import { ZodSchema } from 'zod';
export function validateBody(schema: ZodSchema) { ... }
```

#### `errorHandler.ts`, `httpsRedirect.ts`
Straight ports — add express `Request, Response, NextFunction` types.

---

### Step 7 — Port `src/server/validation/schemas.ts`

Copy `src/validation/schemas.js` → `src/server/validation/schemas.ts`.  
All schemas are Zod — they're already well-typed, just add `.ts` extension and convert `import` paths.

---

### Step 8 — Create Route Files

Split the corresponding blocks out of `server.js` into individual route files. Each file follows this pattern:

```typescript
import { Router } from 'express';
import db from '../db';
import { requireAuth, requireHuman, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { audit } from '../utils/auditLogger'; // or pass db and init inside
// ... schemas

const router = Router();

// ... route handlers (ported from server.js)

export default router;
```

#### `auth.ts` — lines 436–527 of `server.js`
- `POST /` → register
- `POST /token` → issue token  
- `GET /validate` → validate

Note: Replace `authLimiter` import with `import { authLimiter } from '../middleware/rateLimiter'`.

#### `bookmarks.ts` — lines 534–711 of `server.js`
- `GET /` (with query filters: starred, archived, folderId, search)
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `DELETE /` (purge all)
- `PATCH /:id/star`
- `PATCH /:id/archive`

Keep the `parseBookmark()` helper local to this file or in `../utils/parsers.ts`.

#### `folders.ts` — lines 749–798
- `GET /`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `DELETE /` (purge all, line 687)

Keep `parseFolder()` local or in parsers util.

#### `agentKeys.ts` — lines 801–855
- `GET /`
- `POST /`
- `PATCH /:id/revoke`
- `DELETE /:id`

Keep `parseAgentKey()` local or in parsers util.

#### `settings.ts` — lines 857–870
- `GET /:key`
- `PUT /:key`

---

### Step 9 — Create `server.ts` (Thin Entrypoint)

Replace `server.js` with `server.ts`. This file should only:
1. Import and wire middleware
2. Mount routes
3. Serve static files (production)
4. Start listening

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import { getCorsConfig } from './src/config/corsConfig';    // keep existing
import { authLimiter, apiLimiter } from './src/server/middleware/rateLimiter';
import { errorHandler } from './src/server/middleware/errorHandler';
import { httpsRedirect } from './src/server/middleware/httpsRedirect';
import { purgeExpiredTokens } from './src/server/db';
import { scheduleTokenCleanup } from './src/server/utils/tokenExpiry';

import authRoutes      from './src/server/routes/auth';
import bookmarkRoutes  from './src/server/routes/bookmarks';
import folderRoutes    from './src/server/routes/folders';
import agentKeyRoutes  from './src/server/routes/agentKeys';
import settingsRoutes  from './src/server/routes/settings';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4242;

// Startup tasks
purgeExpiredTokens();
scheduleTokenCleanup();

// Middleware (same security stack as current server.js lines 203–256)
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(httpsRedirect);
app.use(helmet({ /* ... keep existing CSP config */ }));
app.use(cors(getCorsConfig()));
app.use(express.json());
app.use('/api', apiLimiter);
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health
app.get('/api/health', (_req, res) => { ... });  // keep existing counts query

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/bookmarks',  bookmarkRoutes);
app.use('/api/folders',    folderRoutes);
app.use('/api/agent-keys', agentKeyRoutes);
app.use('/api/settings',   settingsRoutes);

// Static files (production)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath, { /* ... keep no-cache headers for index.html */ }));
  app.get(/^(?!\/api\/)(?!\/assets\/).*/, (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 + Error handler
app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🦞 ClawChives running on port ${PORT}`);
});
```

---

### Step 10 — Delete `server.js`

Once `server.ts` is verified and running:

```bash
rm server.js
```

Delete `server.js` from `Dockerfile CMD` and replace with:

```dockerfile
CMD ["tsx", "server.ts"]
```

---

### Step 11 — Update `tsconfig.json`

Ensure `server.ts` and `src/server/**` are included:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist-server"
  },
  "include": ["server.ts", "src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 12 — Update Dockerfile

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/tsconfig.json ./
RUN npm install -g tsx
EXPOSE 4242
CMD ["tsx", "server.ts"]
```

---

## Verification Plan

### 1. TypeScript Compile Check
```bash
npx tsc --noEmit
```
Expected: zero errors.

### 2. Dev Server Boot Test
```bash
npm run dev:server
```
Expected: Server starts on port 4242. Log line: `🦞 ClawChives running on port 4242`.

### 3. Health Endpoint
```bash
curl http://localhost:4242/api/health
```
Expected: `{ "success": true, "service": "ClawChives API", ... }`

### 4. Auth Flow Integration Test
```bash
# Register
curl -X POST http://localhost:4242/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"uuid":"test-uuid","username":"testuser","keyHash":"abc123"}'

# Token
curl -X POST http://localhost:4242/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"type":"human","uuid":"test-uuid","keyHash":"abc123"}'
```

### 5. Run Existing Vitest Suite
```bash
npm run test
```
Expected: All existing tests in `tests/` pass unchanged.

### 6. Docker Build Test
```bash
docker build -t clawchives-v3 .
docker run -p 4242:4242 -v $(pwd)/data:/app/data clawchives-v3
curl http://localhost:4242/api/health
```

---

## Important Rules During Refactor

1. **Do NOT remove the audit logger** from any route. Every auth event, create, update, delete, and revoke action must still call `audit.log()`.
2. **Do NOT remove Zod validation** from any route. `validateBody()` stays on every POST/PUT/PATCH.
3. **Do NOT change the SQLite schema** — this is a backend architecture refactor, not a data model change.
4. **Do NOT touch `src/` frontend code** at all.
5. **Keep the `parseBookmark`, `parseFolder`, `parseAgentKey` helpers** — either in a shared `src/server/utils/parsers.ts` file, or local to each route file.
6. **Port the CSP config verbatim** from `server.js` lines 219–242 into `server.ts`.
7. Keep the SPA catch-all regex `/^(?!\/api\/)(?!\/assets\/).*$/` exactly as-is — it prevents CSS/JS from being served as `index.html`.

---

*Maintained by CrustAgent©™*
