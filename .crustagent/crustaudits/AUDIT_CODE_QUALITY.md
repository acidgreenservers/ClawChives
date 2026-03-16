# Code Quality Audit — ClawChives

**Date:** March 16, 2026
**Scope:** Frontend (`src/`), Backend (`server.ts`, `src/server/`), Services (`src/services/`)
**Auditor:** Claude Code
**Status:** 🟢 PRODUCTION READY (with recommendations)

---

## Executive Summary

ClawChives demonstrates **high code quality** with excellent separation of concerns, strong security practices, and deliberate architectural decisions. The codebase is well-organized, maintainable, and follows TypeScript/React best practices.

**Overall Score: 8.5/10**

### Strengths
- ✅ Excellent separation of concerns by feature
- ✅ Consistent patterns across backend routes and frontend services
- ✅ Strong input validation (Zod schemas)
- ✅ Intentional security-first design (constant-time comparison, SSRF protection)
- ✅ Clear middleware chain with documented invariants
- ✅ Audit logging throughout critical operations
- ✅ Well-named variables and functions
- ✅ Type-safe throughout (TypeScript)

### Areas for Improvement
- ⚠️ Minor code duplication in API client patterns
- ⚠️ Component complexity in modal components (744 LOC in AgentKeyGeneratorModal)
- ⚠️ Limited test coverage (only 3 test files)
- ⚠️ Some client-side `getToken()` duplication
- ⚠️ One stale/unused API client (`src/lib/api.ts`)

---

## 1. Code Duplication Issues

### Severity: 🟡 MEDIUM

#### 1.1 Duplicate `getToken()` Implementations

**Files Affected:**
- `/src/services/database/rest/RestAdapter.ts:29`
- `/src/services/agents/agentKeyService.ts:17`

**Current Implementation (RestAdapter):**
```typescript
function getToken(): string | null {
  return sessionStorage.getItem("cc_api_token");
}
```

**Current Implementation (agentKeyService):**
```typescript
const getToken = () => {
  const token = sessionStorage.getItem("cc_api_token");
  if (!token) throw new Error("Not authenticated");
  return token;
};
```

**Issue:** Two nearly identical functions with slightly different error handling. The second throws on missing token, the first returns null. This is confusing and violates DRY.

**Recommendation:** Centralize in `/src/lib/sessionStorage.ts` or `/src/services/auth/tokenStorage.ts`:
```typescript
export function getToken(): string | null {
  return sessionStorage.getItem("cc_api_token");
}

export function requireToken(): string {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}
```

**Impact:** Low refactoring effort, improves maintainability

---

#### 1.2 Duplicate API Request Pattern in agentKeyService

**File:** `/src/services/agents/agentKeyService.ts`

**Pattern Repeated 4 Times:**
```typescript
const response = await fetch(`${getApiUrl()}/api/agent-keys`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`,
  },
  body: JSON.stringify(config),
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || "Failed to create agent key");
}

const { data } = await response.json();
return data;
```

**Appears In:**
- `saveAgentKey()` (line 23)
- `getAllAgentKeys()` (line 42)
- `revokeAgentKey()` (line 52)
- `deleteAgentKey()` (line 61)

**Issue:** This pattern is also present in RestAdapter as a better-abstracted `request<T>()` function. agentKeyService should either use RestAdapter or create a helper.

**Recommendation:** Extract to helper function or consolidate with RestAdapter:
```typescript
async function apiRequest<T>(method: string, path: string, body?: any): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${response.statusText}`);
  }

  const { data } = await response.json();
  return data as T;
}
```

**Impact:** Reduces 68 lines to 8 lines of actual logic, improves consistency

---

### 1.3 Duplicate API URL Resolution

**Files Affected:**
- `/src/config/apiConfig.ts` (centralized ✅)
- `/src/services/agents/agentKeyService.ts:13` (calls it correctly ✅)
- `/src/services/database/rest/RestAdapter.ts:20` (calls it correctly ✅)
- `/src/components/auth/LoginForm.tsx:7` (calls it correctly ✅)
- `/src/components/auth/SetupWizard.tsx:14` (calls it correctly ✅)
- `/src/App.tsx:10` (calls it correctly ✅)

**Status:** ✅ **RESOLVED** — Centralized via `getApiBaseUrl()` from `src/config/apiConfig.ts`. Well done! This is the single source of truth for API connectivity.

---

## 2. Code Complexity & Maintainability

### Severity: 🟡 MEDIUM

#### 2.1 Large Component: AgentKeyGeneratorModal (744 LOC)

**File:** `/src/components/settings/AgentKeyGeneratorModal.tsx`

**Issues:**
- 744 lines in a single component
- 9 useState hooks (high state management complexity)
- 6-step wizard logic embedded in one component
- Multiple concerns: form handling, API calls, UI rendering, validation

**Metrics:**
```
useState calls:        9
useEffect calls:       1
Handler functions:     8+
Conditional renders:   Multiple (switch on currentStep)
Cognitive complexity:  High
```

**Recommendation — Refactor into Smaller Components:**

```
AgentKeyGeneratorModal/
├── index.tsx                    (orchestrator, 100 LOC)
├── steps/
│   ├── DetailsStep.tsx         (80 LOC)
│   ├── PermissionsStep.tsx     (120 LOC)
│   ├── ExpirationStep.tsx      (100 LOC)
│   ├── RateLimitStep.tsx       (80 LOC)
│   ├── ReviewStep.tsx          (100 LOC)
│   └── GeneratedStep.tsx       (120 LOC)
├── hooks/
│   └── useAgentKeyWizard.ts    (custom hook for state, 150 LOC)
└── types/
    └── index.ts                (types only, 30 LOC)
```

This would:
- Reduce per-file cognitive load
- Make testing easier
- Reuse step components
- Clarify data flow

**Impact:** Medium refactoring effort, significant maintainability gain

---

#### 2.2 Large Component: Dashboard (340 LOC)

**File:** `/src/components/dashboard/Dashboard.tsx`

**Status:** Acceptable complexity
- 12 useState hooks (manageable for orchestrator)
- Clear separation of child components
- Well-named state variables

**Recommendation:** Monitor for future growth; consider extracting more stateful logic to custom hooks if it exceeds 400 LOC.

---

#### 2.3 Complex Middleware Chain: auth.ts (116 LOC)

**File:** `/src/server/middleware/auth.ts`

**Issues:**
- 40 lines of nested conditionals in `requireAuth()` (lines 26-93)
- Multiple database queries per request (performance consideration)
- detectKeyType() defined twice (in auth.ts and auth routes)

**Metrics:**
```
Cyclomatic complexity: 12 (high)
Nesting depth: 5 levels
Database queries: 2-3 per auth check
```

**Specific Problem Areas:**
```typescript
// Lines 45-69: Nested if/else for api token handling
if (keyType === 'api') {
  const row = db.prepare(...).get(key) as any;
  if (!row) { /* handle error */ }
  if (!checkTokenExpiry(row.expires_at)) { /* handle */ }
  if (row.owner_type === 'human') {
    // 4 more lines
  } else if (row.owner_type === 'agent') {
    const agent = db.prepare(...).get(row.owner_key) as any;
    if (!agent) { /* handle */ }
    if (!agent.is_active) { /* handle */ }
    if (agent.expiration_date && new Date(agent.expiration_date) < new Date()) { /* handle */ }
  }
}
```

**Recommendation — Extract Helper Functions:**

```typescript
function resolveApiTokenUser(token: string): {
  uuid: string,
  permissions: Record<string, boolean>,
  keyType: 'human' | 'agent'
} | null {
  const row = db.prepare('SELECT * FROM api_tokens WHERE key = ?').get(token) as any;
  if (!row || !checkTokenExpiry(row.expires_at)) return null;

  if (row.owner_type === 'human') {
    return {
      uuid: row.owner_key,
      permissions: HUMAN_PERMISSIONS,
      keyType: 'human'
    };
  }

  // Agent handling...
}

function resolveAgentKeyUser(key: string): { ... } | null {
  // Similar extraction
}
```

Then in `requireAuth()`:
```typescript
const result =
  keyType === 'api' ? resolveApiTokenUser(key) :
  keyType === 'agent' ? resolveAgentKeyUser(key) :
  null;

if (!result) {
  return res.status(401).json({ ... });
}

authReq.userUuid = result.uuid;
authReq.agentPermissions = result.permissions;
```

**Impact:** Small refactoring, significant readability gain

---

#### 2.4 Duplicate detectKeyType()

**Defined In:**
- `/src/server/routes/auth.ts:15`
- `/src/server/middleware/auth.ts:15`

**Issue:** Identical function implemented twice. Should be in `src/server/utils/crypto.ts` or `src/server/utils/keys.ts`.

**Recommendation:**
```typescript
// src/server/utils/keys.ts
export function detectKeyType(key: string): 'human' | 'agent' | 'api' | null {
  if (key?.startsWith('hu-'))  return 'human';
  if (key?.startsWith('lb-'))  return 'agent';
  if (key?.startsWith('api-')) return 'api';
  return null;
}
```

Then import in both places.

**Impact:** Trivial refactoring, improves maintainability

---

## 3. Dead Code & Unused Exports

### Severity: 🟢 LOW

#### 3.1 Unused API Client: src/lib/api.ts

**File:** `/src/lib/api.ts` (305 LOC)

**Analysis:**
- Exports: `apiClient`, `API_KEY_PREFIX`, `API_KEY_LENGTH`, `Bookmark`, `ApiResponse`, `ApiKeyResponse`
- Imports: Used only in `/src/lib/api.test.ts`
- Purpose: Mock/simulated REST API client with comments saying "In production, replace with actual fetch() calls"

**Status:** DEAD CODE

The real API client is `/src/services/database/rest/RestAdapter.ts` (161 LOC) which properly implements `IDatabaseAdapter` and is actually used throughout the app.

**Issue:** The old `apiClient` is left over from earlier development iterations. The test file is testing mock data only.

**Recommendation:** Remove entirely (or archive if needed for reference):
- Delete `/src/lib/api.ts`
- Delete `/src/lib/api.test.ts` (also testing dead code)
- Keep actual implementation tests in route tests if needed

**Impact:** Trivial effort, removes 305 LOC of clutter

---

#### 3.2 Unused Imports — Quick Scan

No systematic unused imports detected. Good import hygiene overall.

---

## 4. Best Practices & Patterns

### Severity: 🟢 GOOD

#### 4.1 ✅ Excellent Patterns Observed

**Input Validation:**
- Comprehensive Zod schemas with SSRF protection (validation/schemas.ts)
- Consistent validation middleware on all POST/PUT routes
- Clear error messages for validation failures

**Error Handling:**
- Custom error classes (DatabaseError, ValidationError, AuthenticationError)
- Consistent error response format
- Audit logging on auth failures

**Security:**
- Constant-time token comparison (`crypto.timingSafeEqual`)
- Token hashing (SHA-256) on client and server
- Parameterized SQL queries throughout
- CORS configuration
- Helmet.js with CSP headers
- Rate limiting middleware
- SSRF protection for r.jina.ai URLs

**Type Safety:**
- Strict TypeScript throughout
- Interface-based contract definitions
- No `any` abuse (mostly used in server routes for row parsing, acceptable)

**Testing:**
- Crypto functions tested (crypto.test.ts)
- Basic utilities tested (utils.test.ts)
- Coverage could be expanded to routes and services

---

## 5. Test Coverage

### Severity: 🟡 MEDIUM

**Current State:**
```
Test Files: 3
├── src/lib/crypto.test.ts          (Good coverage of crypto functions)
├── src/lib/utils.test.ts           (Utilities tested)
└── src/lib/api.test.ts             (Testing dead code — can be removed)

Test Suite: Vitest
Coverage: ~10% of codebase (estimated)
```

**Gaps:**
- ❌ No route tests (auth, bookmarks, folders, agent-keys, settings)
- ❌ No middleware tests (auth, validation, rate limiting)
- ❌ No service tests (bookmark service, folder service, etc.)
- ❌ No component tests (React components)

**Recommendation — Test Priorities:**

1. **High Priority (Security-Critical):**
   - `/src/server/routes/auth.ts` — token generation, validation, expiry
   - `/src/server/middleware/auth.ts` — permission checking
   - Validation middleware — SSRF protection

2. **Medium Priority (Core Features):**
   - Bookmark CRUD operations
   - Folder hierarchy operations
   - Agent key creation/revocation

3. **Low Priority (UI):**
   - React components (use Vitest + React Testing Library)

**Suggested Test Structure:**
```
tests/
├── integration/
│   ├── auth.test.ts               (register, token, validate)
│   ├── bookmarks.test.ts          (CRUD operations)
│   └── folders.test.ts            (hierarchy operations)
├── unit/
│   ├── middleware/
│   │   ├── auth.test.ts
│   │   └── validate.test.ts
│   ├── utils/
│   │   ├── crypto.test.ts         (already exists)
│   │   └── tokenExpiry.test.ts
│   └── services/
│       ├── bookmarkService.test.ts
│       └── folderService.test.ts
└── security/
    └── ssrf-protection.test.ts
```

**Estimated LOC:** 1500-2000 lines of tests to achieve 70% coverage

---

## 6. Code Organization & Architecture

### Severity: 🟢 EXCELLENT

#### 6.1 Frontend Structure (src/)

```
src/
├── components/        ✅ Organized by feature (auth, dashboard, settings)
├── services/         ✅ Business logic separated from UI
├── lib/              ✅ Utilities (crypto, export/import)
├── types/            ✅ Centralized type definitions
├── config/           ✅ Environment and configuration
├── hooks/            (React hooks — could be more organized)
└── main.tsx, App.tsx ✅ Clean entry points
```

**Observation:** Clean separation of concerns. Services/types are well-organized by feature.

---

#### 6.2 Backend Structure (src/server/)

```
src/server/
├── routes/           ✅ Feature-based (auth, bookmarks, folders, agentKeys, settings)
├── middleware/       ✅ Cross-cutting concerns (auth, validation, error handling, rate limiting)
├── utils/            ✅ Helpers (crypto, auditLogger, tokenExpiry)
├── validation/       ✅ Zod schemas
├── db.ts             ✅ Database initialization and schema
└── middleware/
    └── README: Could document middleware execution order
```

**Recommendation:** Add a `server/README.md` or inline comment in `server.ts` documenting middleware order:
```typescript
// Middleware Execution Order (critical for security):
// 1. express.json()        — Parse JSON body
// 2. helmet()              — Security headers
// 3. cors()                — CORS policy
// 4. apiLimiter            — Rate limiting (global)
// 5. agentRateLimiter      — Agent-specific rate limiting
// 6. requireAuth           — Extract and validate token
// 7. requirePermission()   — Check permissions
// 8. Route handler         — Business logic
```

---

## 7. Performance Considerations

### Severity: 🟢 ACCEPTABLE

#### 7.1 Database Query Patterns

**File:** `/src/server/routes/bookmarks.ts`

**Pattern Observed:**
```typescript
const BOOKMARK_SELECT = `
  SELECT b.*, jc.url as jina_conversion_url
  FROM bookmarks b
  LEFT JOIN jina_conversions jc ON ...
`;

// Used in every GET request
```

**Analysis:**
- ✅ Parameterized queries prevent injection
- ✅ Indexes present on common filters (user_uuid, created_at)
- ⚠️ LEFT JOIN on every request — could impact performance with large jina_conversions table
- ⚠️ No pagination on `/api/bookmarks` — could return 10K+ rows

**Recommendation — Add Pagination:**
```typescript
router.get('/', requireAuth, requirePermission('canRead'), (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const rows = db.prepare(`${BOOKMARK_SELECT} ... LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const totalCount = db.prepare(
    'SELECT COUNT(*) as c FROM bookmarks WHERE user_uuid = ?'
  ).get(authReq.userUuid) as any;

  res.json({
    success: true,
    data: rows.map(parseBookmark),
    pagination: { page, limit, total: totalCount.c }
  });
});
```

**Impact:** Improves scalability for large bookmark collections

---

#### 7.2 Client-Side Bundle Size

**Components:** Using React + Tailwind + shadcn/ui

**Analysis:**
- ✅ Vite dev server with HMR
- ✅ Tree-shaking enabled
- ✅ No obvious bloat (appropriate dependencies)

**Note:** Production bundle analysis would require running `npm run build` and checking `dist/assets/` sizes.

---

## 8. Type Safety & TypeScript

### Severity: 🟢 EXCELLENT

**Observations:**
- ✅ Strict type coverage across frontend
- ✅ Well-defined service interfaces (IDatabaseAdapter, BookmarkService, etc.)
- ⚠️ Backend routes use `as any` for database rows (acceptable for SQLite raw results)
- ✅ Custom AuthRequest interface for middleware context

**Example of Good Practice:**
```typescript
// src/services/database/adapter.ts — Clear contract
export interface IDatabaseAdapter {
  getBookmarks(): Promise<Bookmark[]>;
  saveBookmark(bookmark: Bookmark): Promise<Bookmark>;
  updateBookmark(bookmark: Bookmark): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<void>;
  // ... more methods
}

// Both RestAdapter and local IndexedDB adapter implement this
// Allows swapping implementations without changing consumer code
```

---

## 9. Security Hardening Status

### Severity: 🟢 EXCELLENT

**Implemented Protections:**
- ✅ SSRF protection (Zod validation in schemas.ts)
- ✅ Constant-time token comparison
- ✅ Rate limiting (apiLimiter, agentRateLimiter)
- ✅ Helmet.js security headers
- ✅ CORS configuration with configurable origins
- ✅ Audit logging throughout
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (parameterized queries)

**Noted in CLAUDE.md — Fix #3:**
- API URL configuration centralized
- Prevents hardcoded localhost in production Docker images
- Docker healthcheck timing properly configured (start_period: 15s)

**Recommendations (from planned security-audit-implementation):**
- Token expiry enforcement (component 07) — partially done, could be stricter
- Server-side permission enforcement (component 08) — implemented but could be tested more
- Database migrations (component 10) — schema is embedded in db.ts

---

## 10. Documentation Quality

### Severity: 🟡 MEDIUM

**Good Documentation:**
- ✅ CLAUDE.md — Comprehensive project knowledge base
- ✅ Code comments in middleware (clear purpose)
- ✅ Type definitions well-documented
- ✅ Security invariants documented in CLAUDE.md

**Gaps:**
- ❌ No README.md in project root (or minimal)
- ❌ No CONTRIBUTING.md (unclear how to set up dev environment)
- ❌ No API.md documenting endpoint contracts
- ❌ No DATABASE.md explaining schema and migrations
- ❌ No TESTING.md explaining test setup

**Recommendation — Minimal Documentation Additions:**

1. **API.md** — Endpoint reference (30 min to write)
   ```markdown
   # ClawChives API Reference

   ## Authentication
   - POST /api/auth/register
   - POST /api/auth/token
   - GET /api/auth/validate

   ## Bookmarks
   - GET /api/bookmarks
   - POST /api/bookmarks
   - PUT /api/bookmarks/:id
   ...
   ```

2. **DATABASE.md** — Schema explanation (20 min)
   ```markdown
   # Database Schema

   ## users
   - uuid (PK): Unique user identifier
   - username (UNIQUE): User display name
   - key_hash: SHA-256 hash of hu- key
   ...
   ```

3. **TESTING.md** — Test commands and setup (15 min)
   ```markdown
   # Testing Guide

   ## Run all tests
   npm test

   ## Watch mode
   npm test -- --watch

   ## Coverage
   npm test -- --coverage
   ```

---

## 11. Recommendations Summary

### High Priority (Implementation Impact > Effort)

| Issue | Effort | Impact | Recommendation |
|-------|--------|--------|-----------------|
| Remove dead code (api.ts) | 5 min | High | Delete 305 LOC of unused code |
| Consolidate getToken() | 15 min | High | Extract to shared utility |
| Extract detectKeyType() | 10 min | Medium | Move to utils, import in both places |
| Split AgentKeyGeneratorModal | 2 hours | High | Refactor into 6 smaller components |
| Extract auth middleware logic | 30 min | High | Helper functions for token resolution |

### Medium Priority

| Issue | Effort | Impact | Recommendation |
|-------|--------|--------|-----------------|
| Add pagination to bookmarks GET | 45 min | Medium | Prevents loading 10K+ rows |
| Extract API request helper | 30 min | Medium | Consolidate fetch patterns |
| Add route tests | 3-4 hours | Medium | Security-critical routes first |
| Add API documentation | 45 min | Medium | Helps external API consumers |

### Low Priority

| Issue | Effort | Impact | Recommendation |
|-------|--------|--------|-----------------|
| Add component tests | 4-5 hours | Low | Polish, not critical |
| Middleware order documentation | 10 min | Low | Clarity for future maintainers |
| Monitor Dashboard size | Ongoing | Low | Watch for growth beyond 400 LOC |

---

## 12. Production Readiness Checklist

### Functional Requirements
- ✅ Auth system (register, login, token exchange)
- ✅ Bookmark CRUD with r.jina.ai integration
- ✅ Folder management with hierarchy
- ✅ Agent key management with permissions
- ✅ Settings (appearance, profile)
- ✅ Import/export functionality

### Security & Compliance
- ✅ OWASP Top 10 protections
- ✅ Parameterized SQL queries
- ✅ SSRF protection
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Input validation (Zod)
- ✅ Security headers (Helmet.js)
- ✅ Constant-time comparison for auth
- ⚠️ Limited test coverage (not a blocker, but should improve)

### Deployment & DevOps
- ✅ Docker containerization
- ✅ Environment variable configuration
- ✅ Health check endpoint
- ✅ Database initialization
- ✅ SQLCipher encryption at rest (optional)

### Maintainability
- ✅ Clean separation of concerns
- ✅ Type-safe throughout
- ✅ Well-organized file structure
- ✅ Consistent naming conventions
- ⚠️ Some code duplication (minor)
- ⚠️ Could benefit from additional tests
- ⚠️ Documentation could be expanded

---

## 13. Conclusion

**ClawChives is PRODUCTION READY** with strong fundamentals. The codebase demonstrates:

1. **Architecture Excellence:** Clear separation by feature, middleware chain is well-designed
2. **Security First:** Proactive SSRF protection, audit logging, rate limiting
3. **Type Safety:** Full TypeScript coverage with thoughtful interface design
4. **Maintainability:** Well-organized code, consistent patterns, intentional decisions

**Recommended Actions Before Major Scale:**
1. Add route tests (security-critical)
2. Consolidate duplicate patterns (getToken, api request patterns)
3. Add pagination to large result sets
4. Expand documentation for external API consumers

**Not Blockers for Production:**
- Test coverage can grow incrementally
- Documentation improvements are nice-to-have
- Code duplication is minor and doesn't impact functionality

---

## Appendix: Quick Reference

### Files to Review/Improve
```
Priority Review:
- src/components/settings/AgentKeyGeneratorModal.tsx    (744 LOC — split it)
- src/server/middleware/auth.ts                         (116 LOC — extract helpers)
- src/services/agents/agentKeyService.ts                (68 LOC — deduplicate fetch)

Priority Delete:
- src/lib/api.ts                                        (305 LOC — dead code)
- src/lib/api.test.ts                                   (tests dead code)

Priority Add Tests:
- src/server/routes/auth.ts                            (security-critical)
- src/server/middleware/auth.ts                        (security-critical)
- src/server/routes/bookmarks.ts                       (core feature)
```

### Key Patterns to Maintain
```typescript
// 1. RestAdapter pattern — use this for API calls
request<T>(path: string, options?: RequestInit): Promise<T>

// 2. Zod validation pattern — centralize schemas
export const SomeSchemas = { create: z.object(...) }

// 3. Type-first development
export interface BookmarkService { ... }
class RestBookmarkService implements BookmarkService { ... }

// 4. Middleware stacking
app.use(helmet())
app.use(cors())
app.use(apiLimiter)
app.use(requireAuth)
app.use(requirePermission('action'))

// 5. Audit logging on mutations
audit.log('ACTION_TAKEN', { actor, details, outcome })
```

---

**Report Generated:** March 16, 2026
**Maintained by:** CrustAgent©™

