# 08: Permission Enforcement (Server-Side Access Control)

[![Priority](https://img.shields.io/badge/Priority-Critical-red)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-3%20hours-blue)](#)

---

## Why This Matters

**Problem:** Agent key permissions are **stored but not enforced**:
- **Agent keys ignore permissions** - Write=false agents can still create/update/delete
- **Client-side only** - UI hides buttons, but API allows all actions
- **No server validation** - Attackers can bypass UI and call API directly
- **Privilege escalation** - Read-only agent can delete all bookmarks

**Impact:** Permission system is security theater. Anyone with an agent key has full access.

**Solution:** Enforce permissions server-side in middleware before route handlers.

---

## What This Implements

### Permission Matrix

| Permission | Allows | HTTP Methods | Routes |
|-----------|--------|--------------|--------|
| **read** | View bookmarks/folders | GET | `/api/bookmarks`, `/api/folders` |
| **write** | Create new items | POST | `/api/bookmarks`, `/api/folders` |
| **edit** | Update existing items | PUT, PATCH | `/api/bookmarks/:id`, `/api/folders/:id` |
| **delete** | Remove items | DELETE | `/api/bookmarks/:id`, `/api/folders/:id` |
| **move** | Change folder hierarchy | PUT (folderId change) | `/api/bookmarks/:id`, `/api/folders/:id` |

### Current vs Hardened

**CURRENT (Insecure):**
```javascript
app.post("/api/bookmarks", requireAuth, (req, res) => {
  // ⚠️ NO PERMISSION CHECK - Any agent key can create bookmarks
  const id = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO bookmarks ...").run(...);
  res.json({ success: true, id });
});
```

**HARDENED:**
```javascript
app.post("/api/bookmarks", requireAuth, checkPermission("write"), (req, res) => {
  // ✅ Permission checked - Only agents with "write" permission can proceed
  const id = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO bookmarks ...").run(...);
  res.json({ success: true, id });
});
```

---

## How It Works

### Permission Check Flow

```
Request → requireAuth → checkPermission → Route Handler
  ├─ Extract API key from Authorization header
  ├─ Validate key exists (requireAuth)
  ├─ Query database for key permissions
  ├─ Check if required permission granted
  ├─ ✅ If granted: Continue to handler
  └─ ❌ If denied: Return 403 Forbidden

Example:
  DELETE /api/bookmarks/abc123
  Authorization: Bearer ag-xyz789

  1. requireAuth: Key valid ✅
  2. Query: SELECT permissions FROM agent_keys WHERE api_key='ag-xyz789'
  3. Permissions: { "read": true, "write": false, "delete": false }
  4. Required: "delete"
  5. Check: permissions.delete === true? NO
  6. Response: 403 "Access denied: Missing 'delete' permission"
```

### Integration Points

**1. Permission Checker Middleware (new file):**
```javascript
// src/middleware/permissionChecker.js
export function checkPermission(requiredPermission) {
  return (req, res, next) => {
    // Human keys and API tokens: full access
    if (req.keyType === "human" || req.keyType === "api_token") {
      return next();
    }

    // Agent keys: check permissions
    if (req.keyType === "agent") {
      const agent = db.prepare("SELECT permissions FROM agent_keys WHERE api_key = ?").get(req.apiKey);
      const permissions = JSON.parse(agent.permissions);

      if (!permissions[requiredPermission]) {
        return res.status(403).json({
          error: `Access denied: Missing '${requiredPermission}' permission`,
        });
      }
    }

    next();
  };
}
```

**2. Apply to Routes (server.js):**
```javascript
import { checkPermission } from "./src/middleware/permissionChecker.js";

// GET routes: require "read"
app.get("/api/bookmarks", requireAuth, checkPermission("read"), ...);

// POST routes: require "write"
app.post("/api/bookmarks", requireAuth, checkPermission("write"), ...);

// PUT routes: require "edit"
app.put("/api/bookmarks/:id", requireAuth, checkPermission("edit"), ...);

// DELETE routes: require "delete"
app.delete("/api/bookmarks/:id", requireAuth, checkPermission("delete"), ...);
```

---

## Security Rationale

### Attack Scenarios Prevented

**Privilege Escalation (Blocked):**
```
Attacker has read-only agent key:
  ag-readonly | permissions: { "read": true, "write": false, "delete": false }

Attack: Bypass UI and call API directly
  curl -X DELETE http://localhost:4242/api/bookmarks/abc123 \
    -H "Authorization: Bearer ag-readonly"

Without permission enforcement:
  ✅ Request succeeds, bookmark deleted
  Attacker escalated from read to delete

With permission enforcement:
  ❌ Response: 403 "Access denied: Missing 'delete' permission"
  Attack blocked, bookmark safe
```

**Mass Deletion (Blocked):**
```
Attacker uses automation agent key (intended for read-only sync):
  ag-sync | permissions: { "read": true, "write": false }

Attack: Delete all bookmarks
  for id in bookmarks:
    DELETE /api/bookmarks/{id}

Without enforcement:
  All bookmarks deleted

With enforcement:
  First DELETE: 403 "Access denied: Missing 'delete' permission"
  Attack stopped immediately
```

### OWASP Top 10 Coverage
- ✅ **A01:2021 – Broken Access Control** - This component directly fixes this
- ✅ **A04:2021 – Insecure Design** - Client-side only access control is insecure design
- ✅ **A05:2021 – Security Misconfiguration** - Missing server-side checks is misconfiguration

---

## Implementation

See [permissionChecker.ts](./permissionChecker.ts) for full implementation.

### Quick Overview

**1. Create permission checker middleware:**
```javascript
// src/middleware/permissionChecker.js
export function checkPermission(requiredPermission) {
  return (req, res, next) => {
    if (req.keyType === "human" || req.keyType === "api_token") {
      return next(); // Full access
    }

    if (req.keyType === "agent") {
      const agent = db.prepare("SELECT permissions FROM agent_keys WHERE api_key = ?").get(req.apiKey);
      const permissions = JSON.parse(agent.permissions);

      if (!permissions[requiredPermission]) {
        return res.status(403).json({ error: `Access denied: Missing '${requiredPermission}' permission` });
      }
    }

    next();
  };
}
```

**2. Apply to all routes in server.js:**
```javascript
import { checkPermission } from "./src/middleware/permissionChecker.js";

// Bookmarks
app.get("/api/bookmarks", requireAuth, checkPermission("read"), getBookmarks);
app.post("/api/bookmarks", requireAuth, checkPermission("write"), createBookmark);
app.put("/api/bookmarks/:id", requireAuth, checkPermission("edit"), updateBookmark);
app.delete("/api/bookmarks/:id", requireAuth, checkPermission("delete"), deleteBookmark);

// Folders
app.get("/api/folders", requireAuth, checkPermission("read"), getFolders);
app.post("/api/folders", requireAuth, checkPermission("write"), createFolder);
app.put("/api/folders/:id", requireAuth, checkPermission("edit"), updateFolder);
app.delete("/api/folders/:id", requireAuth, checkPermission("delete"), deleteFolder);
```

---

## Testing

### Manual Tests

**Test 1: Create agent with write=false, try to POST**
```bash
# Create read-only agent key via UI or API
# GET permissions: { "read": true, "write": false }

curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer ag-readonly" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test"}'

# Expected: 403 Forbidden
# { "error": "Access denied: Missing 'write' permission" }
```

**Test 2: Create agent with delete=false, try to DELETE**
```bash
curl -X DELETE http://localhost:4242/api/bookmarks/abc123 \
  -H "Authorization: Bearer ag-no-delete"

# Expected: 403 Forbidden
```

**Test 3: Human key should have full access**
```bash
curl -X DELETE http://localhost:4242/api/bookmarks/abc123 \
  -H "Authorization: Bearer api-human-token"

# Expected: 200 OK (human keys bypass permission checks)
```

### Automated Tests

```javascript
describe('Permission Enforcement', () => {
  it('should deny POST with write=false', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${readOnlyAgentKey}`)
      .send({ url: 'https://example.com', title: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("write");
  });

  it('should allow POST with write=true', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${writeAgentKey}`)
      .send({ url: 'https://example.com', title: 'Test' });

    expect(res.status).toBe(201);
  });

  it('should allow all operations with human key', async () => {
    const res = await request(app)
      .delete('/api/bookmarks/abc123')
      .set('Authorization', `Bearer ${humanApiToken}`);

    expect(res.status).not.toBe(403);
  });
});
```

---

## Next Steps

1. ✅ Review [README.md](./README.md) and [permissionChecker.ts](./permissionChecker.ts)
2. ⬜ Create `src/middleware/permissionChecker.js`
3. ⬜ Apply `checkPermission()` to all bookmark routes
4. ⬜ Apply `checkPermission()` to all folder routes
5. ⬜ Test with read-only agent key
6. ⬜ Test with full-access human key
7. ⬜ Proceed to [09-https-support](../09-https-support/README.md)

---

## References

- [OWASP: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
