# 06: Audit Logging (Security Event Trail)

[![Priority](https://img.shields.io/badge/Priority-Medium-yellow)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Medium-yellow)](#)
[![Time](https://img.shields.io/badge/Time-4%20hours-blue)](#)

---

## Why This Matters

**Problem:** Without audit logs, you cannot:
- **Detect breaches** - Unknown if attacker accessed bookmarks
- **Investigate incidents** - No record of who did what when
- **Prove compliance** - No audit trail for security reviews
- **Track abuse** - Can't identify suspicious agent key usage
- **Debug issues** - No visibility into authentication failures

**Impact:** Breaches go undetected, incident response is impossible, compliance failures.

**Solution:** Log all security-critical events with who, what, when, where, outcome.

---

## What This Implements

### Events to Audit Log

| Event Category | Events Logged | Data Captured |
|---------------|---------------|---------------|
| **Authentication** | Register, login success/failure, token issuance | Username, IP, timestamp, outcome |
| **Agent Keys** | Created, revoked, expired, rate limited | Key name, permissions, creator, timestamp |
| **Access Control** | Permission denied, unauthorized access | Resource, required permission, IP |
| **Data Modification** | Bookmark/folder create/update/delete | Resource ID, action, actor, changes |
| **Security Events** | Brute force detected, CORS violation, validation failure | IP, endpoint, details |

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   TEXT NOT NULL,
  event_type  TEXT NOT NULL,     -- "auth.login", "agent.created", etc.
  actor       TEXT,                -- Username, agent key name, or IP
  actor_type  TEXT,                -- "human", "agent", "api_token", "anonymous"
  resource    TEXT,                -- Resource affected (bookmark ID, folder ID)
  action      TEXT NOT NULL,       -- "create", "read", "update", "delete"
  outcome     TEXT NOT NULL,       -- "success", "failure", "blocked"
  ip_address  TEXT,
  user_agent  TEXT,
  details     TEXT                 -- JSON with additional context
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_actor ON audit_logs(actor);
```

### Example Log Entries

```
Authentication Success:
{
  "event_type": "auth.login",
  "actor": "alice",
  "actor_type": "human",
  "action": "login",
  "outcome": "success",
  "ip_address": "192.168.1.100",
  "details": { "method": "human_key" }
}

Agent Key Created:
{
  "event_type": "agent.created",
  "actor": "alice",
  "resource": "ag-abc123...",
  "action": "create",
  "outcome": "success",
  "details": {
    "name": "Bookmark Importer",
    "permissions": { "read": true, "write": true }
  }
}

Permission Denied:
{
  "event_type": "access.denied",
  "actor": "ag-xyz789...",
  "actor_type": "agent",
  "resource": "bookmark/abc123",
  "action": "delete",
  "outcome": "blocked",
  "ip_address": "203.0.113.45",
  "details": { "reason": "Missing 'delete' permission" }
}
```

---

## How It Works

### Audit Logging Flow

```
Request → Authentication → Permission Check → Route Handler
  ├─ Log auth success/failure
  ├─ Log permission checks
  ├─ Log data changes
  └─ Store in audit_logs table

Query audit logs:
  ├─ GET /api/audit-logs?event_type=auth.login
  ├─ GET /api/audit-logs?actor=alice&limit=50
  └─ Returns: Paginated audit log entries
```

### Integration Points

**1. Authentication (server.js line 254+, requireAuth middleware):**
```javascript
// Log successful authentication
auditLogger.log("auth.token_validated", {
  actor: username,
  actor_type: keyType,
  action: "authenticate",
  outcome: "success",
  ip_address: req.ip,
});

// Log failed authentication
auditLogger.log("auth.token_invalid", {
  actor: "anonymous",
  action: "authenticate",
  outcome: "failure",
  ip_address: req.ip,
  details: { reason: "Invalid token format" },
});
```

**2. Agent Key Operations (server.js line 950+):**
```javascript
// Log agent key creation
auditLogger.log("agent.created", {
  actor: username,
  actor_type: "human",
  resource: apiKey,
  action: "create",
  outcome: "success",
  details: { name, permissions, rateLimit },
});

// Log agent key revocation
auditLogger.log("agent.revoked", {
  actor: username,
  resource: keyId,
  action: "delete",
  outcome: "success",
});
```

**3. Permission Checks (new permissionChecker middleware):**
```javascript
// Log permission denied
auditLogger.log("access.denied", {
  actor: req.apiKey,
  actor_type: "agent",
  resource: `bookmark/${req.params.id}`,
  action: req.method.toLowerCase(),
  outcome: "blocked",
  details: { required_permission: "delete" },
});
```

---

## Security Rationale

### Incident Response Scenarios

**Scenario 1: Detect compromised agent key**
```
Audit log shows:
  2024-01-15 02:00:00 | agent.delete_bookmark | ag-xyz789 | 192.168.1.50 | success
  2024-01-15 02:00:05 | agent.delete_bookmark | ag-xyz789 | 192.168.1.50 | success
  ... (100 more deletes in 10 minutes)

Response:
  1. Query audit logs: SELECT * FROM audit_logs WHERE actor='ag-xyz789' AND timestamp > '2024-01-15 02:00:00'
  2. Identify pattern: Bulk delete from single IP
  3. Revoke key: DELETE FROM agent_keys WHERE api_key='ag-xyz789'
  4. Investigate: Check what was deleted, restore from backup
```

**Scenario 2: Investigate unauthorized access**
```
Audit log shows:
  2024-01-15 14:30:00 | access.denied | ag-abc123 | bookmark/sensitive-001 | blocked

Response:
  1. Query: Who tried to access sensitive-001?
  2. Find: Agent key "ag-abc123" (Marketing Bot)
  3. Investigate: Why does marketing bot need private bookmarks?
  4. Action: Review agent key permissions, tighten access
```

**Scenario 3: Compliance audit**
```
Auditor request: "Show all access to financial bookmarks in Q4 2024"

Query:
  SELECT * FROM audit_logs
  WHERE resource LIKE 'bookmark/%'
    AND timestamp BETWEEN '2024-10-01' AND '2024-12-31'
    AND details LIKE '%financial%'
  ORDER BY timestamp DESC;

Result: Complete audit trail with who accessed what and when
```

### OWASP Top 10 Coverage
- ✅ **A09:2021 – Security Logging and Monitoring Failures** - This component directly addresses this
- ✅ **A01:2021 – Broken Access Control** - Audit logs detect access control violations
- ✅ **A07:2021 – Identification and Authentication Failures** - Track auth failures

---

## Implementation

See [auditLogger.ts](./auditLogger.ts) and [schema.sql](./schema.sql) for full implementation.

### Quick Overview

**1. Create audit_logs table (schema.sql):**
```sql
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
```

**2. Create audit logger (src/utils/auditLogger.js):**
```javascript
export function createAuditLogger(db) {
  return {
    log(eventType, data) {
      db.prepare(`
        INSERT INTO audit_logs (timestamp, event_type, actor, actor_type, resource, action, outcome, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        new Date().toISOString(),
        eventType,
        data.actor || null,
        data.actor_type || null,
        data.resource || null,
        data.action,
        data.outcome,
        data.ip_address || null,
        data.user_agent || null,
        data.details ? JSON.stringify(data.details) : null
      );
    }
  };
}
```

**3. Use in server.js:**
```javascript
import { createAuditLogger } from "./src/utils/auditLogger.js";

const auditLogger = createAuditLogger(db);

// Log events in routes
app.post("/api/auth/register", (req, res) => {
  // ... registration logic ...

  auditLogger.log("auth.register", {
    actor: username,
    actor_type: "human",
    action: "register",
    outcome: "success",
    ip_address: req.ip,
  });
});
```

---

## Testing

### Manual Verification

**Test 1: Create audit log entry**
```bash
# Trigger authentication
curl -X POST http://localhost:4242/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"humanKey":"hu-your-key"}'

# Check audit logs
sqlite3 data/db.sqlite "SELECT * FROM audit_logs WHERE event_type='auth.token_issued' ORDER BY timestamp DESC LIMIT 1;"

# Expected output:
# 1|2024-01-15T10:30:00Z|auth.token_issued|alice|human|api-abc123|create|success|192.168.1.100|curl/7.68.0|{"token_prefix":"api-abc"}
```

**Test 2: Query audit logs via API**
```bash
curl http://localhost:4242/api/audit-logs?event_type=auth.login&limit=10 \
  -H "Authorization: Bearer api-your-token"

# Expected: JSON array of audit log entries
```

**Test 3: Test permission denied logging**
```bash
# Try to delete with agent key that has no delete permission
curl -X DELETE http://localhost:4242/api/bookmarks/abc123 \
  -H "Authorization: Bearer ag-no-delete-permission"

# Check audit logs
sqlite3 data/db.sqlite "SELECT * FROM audit_logs WHERE event_type='access.denied' ORDER BY timestamp DESC LIMIT 1;"
```

### Automated Tests

Create `tests/audit/auditLogger.test.js`:
```javascript
describe('Audit Logging', () => {
  it('should log successful authentication', async () => {
    await request(app)
      .post('/api/auth/token')
      .send({ humanKey: 'hu-test-key' });

    const log = db.prepare('SELECT * FROM audit_logs WHERE event_type=? ORDER BY id DESC LIMIT 1')
      .get('auth.token_issued');

    expect(log).toBeDefined();
    expect(log.outcome).toBe('success');
  });

  it('should log failed authentication', async () => {
    await request(app)
      .post('/api/auth/token')
      .send({ humanKey: 'invalid-key' });

    const log = db.prepare('SELECT * FROM audit_logs WHERE event_type=? ORDER BY id DESC LIMIT 1')
      .get('auth.token_invalid');

    expect(log.outcome).toBe('failure');
  });

  it('should log agent key creation', async () => {
    await request(app)
      .post('/api/agent-keys')
      .set('Authorization', 'Bearer api-test-token')
      .send({ name: 'Test Agent', permissions: { read: true } });

    const log = db.prepare('SELECT * FROM audit_logs WHERE event_type=? ORDER BY id DESC LIMIT 1')
      .get('agent.created');

    expect(log).toBeDefined();
    expect(log.action).toBe('create');
  });
});
```

---

## Configuration Options

### Retention Policy

```javascript
// Clean up old audit logs (run daily)
export function cleanupOldAuditLogs(db, retentionDays = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = db.prepare(`
    DELETE FROM audit_logs
    WHERE timestamp < ?
  `).run(cutoffDate.toISOString());

  console.log(`Deleted ${result.changes} audit log entries older than ${retentionDays} days`);
}
```

### Log Levels (Filter by severity)

```javascript
const LOG_LEVELS = {
  INFO: "info",       // Normal operations
  WARN: "warn",       // Suspicious but not malicious
  CRITICAL: "critical" // Security incidents
};

auditLogger.log("auth.brute_force_detected", {
  actor: "anonymous",
  action: "authenticate",
  outcome: "blocked",
  level: LOG_LEVELS.CRITICAL, // Flag as critical
});
```

### Export Audit Logs

```javascript
app.get("/api/audit-logs/export", requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp DESC
  `).all(req.query.start_date, req.query.end_date);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
  res.send(convertToCSV(logs));
});
```

---

## Common Issues & Troubleshooting

### Issue: Audit log table grows too large
**Solution:** Implement retention policy (see Configuration Options).

### Issue: Performance degradation on INSERT
**Solution:** Use WAL mode (already enabled), batch inserts for high-traffic logs.

### Issue: Missing audit logs for some events
**Solution:** Ensure `auditLogger.log()` called in all security-critical code paths.

### Issue: Logs don't show IP address
**Solution:** Verify `req.ip` is available (behind proxy? Set `trust proxy` in Express).

---

## Next Steps

1. ✅ Review [README.md](./README.md), [auditLogger.ts](./auditLogger.ts), [schema.sql](./schema.sql)
2. ⬜ Create audit_logs table with schema.sql
3. ⬜ Create `src/utils/auditLogger.js`
4. ⬜ Add audit logging to auth endpoints
5. ⬜ Add audit logging to agent key operations
6. ⬜ Create `/api/audit-logs` query endpoint
7. ⬜ Test audit log creation and queries
8. ⬜ Proceed to [07-token-expiry](../07-token-expiry/README.md)

---

## References

- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST: Audit and Accountability](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [CIS Controls: Audit Log Management](https://www.cisecurity.org/controls/audit-log-management)
