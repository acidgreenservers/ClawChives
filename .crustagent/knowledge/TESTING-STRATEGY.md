---
name: HardShell Testing Strategy
description: Comprehensive testing system for ClawChives, inspired by Ken's Monize approach
type: reference
---

# HardShell — ClawChives Comprehensive Testing System

**HardShell** = The hardened outer layer. Comprehensive test coverage that proves your application survives real-world conditions.

You currently have:
- `security.test.js` — 2 test suites, 3 tests total
- `vitest` configured
- `supertest` for API testing
- Basic setup for test database

**Goal:** Build to **Ken's level** — 80% code coverage, tests for happy paths AND failure modes.

---

## Current State vs. Target

### Current (Security Tests Only)
- ✅ Key generation validation
- ✅ Authorization bypass detection
- ✅ Agent revocation enforcement
- ❌ Error handling paths
- ❌ Database constraint violations
- ❌ Edge cases
- ❌ Rate limiting behavior
- ❌ Permission enforcement

### Target (HardShell)

```
HardShell/
├── unit/                          # Component-level tests
│   ├── middleware/
│   │   ├── auth.test.ts
│   │   ├── errorHandler.test.ts
│   │   ├── rateLimiter.test.ts
│   │   └── permissions.test.ts
│   └── utils/
│       ├── crypto.test.ts
│       ├── validation.test.ts
│       └── audit.test.ts
│
├── integration/                   # API endpoint tests
│   ├── bookmarks.test.ts
│   ├── folders.test.ts
│   ├── agent-keys.test.ts
│   ├── auth.test.ts
│   └── settings.test.ts
│
├── error-paths/                   # Failure mode tests
│   ├── constraint-violations.test.ts
│   ├── invalid-input.test.ts
│   ├── authorization-failures.test.ts
│   └── rate-limit-bypass.test.ts
│
├── security/                      # Security-focused tests
│   ├── xss-prevention.test.ts
│   ├── sql-injection.test.ts
│   ├── permission-escalation.test.ts
│   └── key-revocation.test.ts
│
└── helpers/
    ├── testDb.ts                  # Test database setup
    ├── testFactories.ts           # Create test data
    ├── testAuth.ts                # Auth helpers
    └── assertions.ts              # Custom assertions
```

---

## Test Categories Explained

### 1. Unit Tests (Middleware & Utils)

**What:** Individual function/class behavior in isolation

**Example:**
```typescript
describe('validateUserInput', () => {
  it('should reject URLs without protocol', () => {
    expect(() => validateUserInput('example.com')).toThrow();
  });

  it('should accept valid HTTPS URLs', () => {
    expect(validateUserInput('https://example.com')).toBe('https://example.com');
  });

  it('should normalize URLs (trim, lowercase)', () => {
    const result = validateUserInput('  HTTPS://EXAMPLE.COM  ');
    expect(result).toBe('https://example.com');
  });
});
```

**Coverage:** 80%+ of utility functions, middleware

---

### 2. Integration Tests (API Endpoints)

**What:** Full request-response cycle through real Express app

**Example (from Monize pattern):**
```typescript
describe('POST /api/bookmarks', () => {
  let humanToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup: create user, get token
    const res = await createTestUser();
    userId = res.userId;
    humanToken = res.token;
  });

  it('should create a bookmark with valid input', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${humanToken}`)
      .send({
        url: 'https://example.com',
        title: 'Example'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.url).toBe('https://example.com');
  });

  it('should return 409 if URL already exists', async () => {
    // Create first bookmark
    await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${humanToken}`)
      .send({ url: 'https://example.com', title: 'First' });

    // Attempt duplicate
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${humanToken}`)
      .send({ url: 'https://example.com', title: 'Second' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('should reject if folder does not exist', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${humanToken}`)
      .send({
        url: 'https://example.com',
        title: 'Example',
        folderId: 'nonexistent'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Folder not found');
  });

  it('should validate URL format', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${humanToken}`)
      .send({
        url: 'not-a-url',
        title: 'Bad URL'
      });

    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    // Cleanup
    db.prepare('DELETE FROM bookmarks WHERE user_uuid = ?').run(userId);
  });
});
```

**Coverage:** All API endpoints, happy path + common errors

---

### 3. Error Path Tests (Constraint Violations)

**What:** Database constraint violations, edge cases, error handling

**Example:**
```typescript
describe('Error Handling: UNIQUE constraint violations', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const res = await createTestUser();
    userId = res.userId;
    token = res.token;
  });

  it('should return 409 Conflict for duplicate bookmark URL', async () => {
    await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', title: 'First' });

    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', title: 'Second' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('should preserve constraint details in dev mode', async () => {
    // In development, error details should be visible
    // In production, they should be hidden
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', title: 'Dup' });

    if (process.env.NODE_ENV === 'development') {
      expect(res.body.stack).toBeDefined();
    } else {
      expect(res.body.stack).toBeUndefined();
    }
  });
});
```

**Coverage:** All error paths from database constraints

---

### 4. Security Tests (Already Started)

**What:** Authorization, authentication, key revocation, injection prevention

**Example (you already have):**
```typescript
it('rejects an agent whose key has been revoked', async () => {
  // Revoke the agent key
  const revokeRes = await request(app)
    .patch(`/api/agent-keys/${agentId}/revoke`)
    .set('Authorization', `Bearer ${humanApiToken}`);

  expect(revokeRes.status).toBe(200);

  // Attempt to access API with revoked key
  const res = await request(app)
    .get('/api/auth/validate')
    .set('Authorization', `Bearer ${agentToken}`);

  expect(res.status).toBe(401);
});
```

**Coverage:** Auth, permissions, key revocation, OWASP

---

## Building HardShell: Phase-by-Phase

### Phase 1: Foundation (Week 1)

**Goal:** Comprehensive helpers + error handler tests

Files to create:
- `tests/helpers/testDb.ts` — Test database setup/teardown
- `tests/helpers/testFactories.ts` — Create test users, bookmarks, folders
- `tests/helpers/testAuth.ts` — Auth token generation helpers
- `tests/unit/middleware/errorHandler.test.ts` — Error mapping tests (20+ tests)

**Effort:** 4-6 hours

---

### Phase 2: API Endpoints (Week 2)

**Goal:** Integration tests for all routes (happy path + common errors)

Files to create:
- `tests/integration/bookmarks.test.ts` (create, read, update, delete, constraints)
- `tests/integration/folders.test.ts`
- `tests/integration/agent-keys.test.ts`
- `tests/integration/auth.test.ts`

**Effort:** 6-8 hours

---

### Phase 3: Error Paths (Week 3)

**Goal:** Test every constraint violation, missing field, invalid input

Files to create:
- `tests/error-paths/constraint-violations.test.ts`
- `tests/error-paths/invalid-input.test.ts`
- `tests/error-paths/authorization-failures.test.ts`

**Effort:** 4-5 hours

---

### Phase 4: Security Hardening (Week 4)

**Goal:** XSS, SQL injection, permission escalation, key revocation

Expand:
- `tests/security/permission-escalation.test.ts`
- `tests/security/key-revocation.test.ts`
- `tests/security/xss-prevention.test.ts`

**Effort:** 3-4 hours

---

## Phase 1 Deep Dive: Start Here

### Step 1: Create Test Helpers

Create `tests/helpers/testDb.ts`:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createTestDatabase(): Database.Database {
  const testDbPath = path.join(__dirname, '..', 'data', 'test.sqlite');

  // Clean up old test db
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);

  // Run schema (same as production)
  const schemaPath = path.join(__dirname, '..', '..', 'src', 'server', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}

export function cleanupTestDatabase(db: Database.Database): void {
  db.close();
  const testDbPath = path.join(__dirname, '..', 'data', 'test.sqlite');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}
```

Create `tests/helpers/testFactories.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

export function createTestUser(db: Database.Database) {
  const uuid = uuidv4();
  const keyHash = 'a'.repeat(64);

  db.prepare(
    'INSERT INTO users (uuid, key_hash, created_at) VALUES (?, ?, ?)'
  ).run(uuid, keyHash, new Date().toISOString());

  return { uuid, keyHash };
}

export function createTestFolder(db: Database.Database, userUuid: string) {
  const id = uuidv4();

  db.prepare(
    'INSERT INTO folders (id, user_uuid, name, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, userUuid, `Test Folder ${Date.now()}`, new Date().toISOString());

  return { id };
}

export function createTestBookmark(db: Database.Database, userUuid: string, folderId?: string) {
  const id = uuidv4();
  const url = `https://example.com/${Date.now()}`;

  db.prepare(
    'INSERT INTO bookmarks (id, user_uuid, url, title, folder_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userUuid, url, 'Test Bookmark', folderId || null, new Date().toISOString());

  return { id, url };
}
```

Create `tests/helpers/testAuth.ts`:
```typescript
import request from 'supertest';
import type { Express } from 'express';

export async function getHumanToken(app: Express, uuid: string, keyHash: string) {
  const res = await request(app)
    .post('/api/auth/token')
    .send({ type: 'human', uuid, keyHash });

  if (res.status !== 201) {
    throw new Error(`Failed to get token: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data.token;
}

export async function createTestUserWithToken(app: Express, db: any) {
  const { uuid, keyHash } = createTestUser(db);
  const token = await getHumanToken(app, uuid, keyHash);
  return { uuid, keyHash, token };
}
```

---

### Step 2: Create Error Handler Tests

Create `tests/unit/middleware/errorHandler.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { errorHandler } from '../../../src/server/middleware/errorHandler';

describe('errorHandler Middleware', () => {
  let mockRes;
  let mockReq;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
    };
    mockReq = {};
    mockNext = vi.fn();
  });

  describe('JSON Parse Errors', () => {
    it('should return 400 for invalid JSON', () => {
      const err = new Error('Invalid JSON payload');
      err.type = 'entity.parse.failed';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid JSON')
        })
      );
    });
  });

  describe('Database Constraint Violations', () => {
    it('should return 409 for UNIQUE constraint violations', () => {
      const err = new Error('UNIQUE constraint failed: bookmarks.url');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('already exists')
        })
      );
    });

    it('should return 400 for FOREIGN KEY constraint violations', () => {
      const err = new Error('FOREIGN KEY constraint failed');

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should NOT leak constraint names in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new Error('UNIQUE constraint failed: bookmarks.user_uuid_url');
      errorHandler(err, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(JSON.stringify(jsonCall)).not.toContain('constraint');
      expect(JSON.stringify(jsonCall)).not.toContain('user_uuid_url');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Unknown Errors', () => {
    it('should return 500 for unexpected errors', () => {
      const err = new Error('Something broke');
      err.status = undefined;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should show stack trace in development', () => {
      process.env.NODE_ENV = 'development';

      const err = new Error('Dev error');
      errorHandler(err, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();
    });

    it('should hide stack trace in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new Error('Prod error');
      errorHandler(err, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });
  });
});
```

---

## Success Criteria for HardShell v1

✅ All 4 phases complete
✅ 80%+ code coverage (use `npm test -- --coverage`)
✅ Every middleware tested
✅ Every API endpoint has happy + error path tests
✅ Security tests pass
✅ All tests run in <30 seconds

---

## Commands to Add to package.json

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:security": "vitest run tests/security",
  "test:integration": "vitest run tests/integration"
}
```

---

## Next: Start Phase 1

Ready to build the test helpers?

---

**Maintained by CrustAgent©™**
