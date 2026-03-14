/**
 * Audit Logger (Security Event Trail)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Log all security-critical events for incident response and compliance
 * Location: src/utils/auditLogger.js (new file)
 * Dependencies: better-sqlite3 (already installed)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Create audit logger instance
 *
 * @param {Database} db - SQLite database instance
 * @returns {Object} Audit logger with log() method
 */
export function createAuditLogger(db) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (
      timestamp, event_type, actor, actor_type, resource,
      action, outcome, ip_address, user_agent, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    /**
     * Log a security event
     *
     * @param {string} eventType - Event type (e.g., "auth.login", "agent.created")
     * @param {Object} data - Event data
     * @param {string} data.actor - Username, agent key, or IP
     * @param {string} data.actor_type - "human", "agent", "api_token", "anonymous"
     * @param {string} data.resource - Resource affected (optional)
     * @param {string} data.action - "create", "read", "update", "delete", "authenticate"
     * @param {string} data.outcome - "success", "failure", "blocked"
     * @param {string} data.ip_address - Client IP (optional)
     * @param {string} data.user_agent - User agent string (optional)
     * @param {Object} data.details - Additional context (optional)
     */
    log(eventType, data) {
      stmt.run(
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
    },

    /**
     * Query audit logs
     */
    query(filters = {}) {
      let sql = "SELECT * FROM audit_logs WHERE 1=1";
      const params = [];

      if (filters.event_type) {
        sql += " AND event_type = ?";
        params.push(filters.event_type);
      }

      if (filters.actor) {
        sql += " AND actor = ?";
        params.push(filters.actor);
      }

      if (filters.outcome) {
        sql += " AND outcome = ?";
        params.push(filters.outcome);
      }

      if (filters.start_date) {
        sql += " AND timestamp >= ?";
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        sql += " AND timestamp <= ?";
        params.push(filters.end_date);
      }

      sql += " ORDER BY timestamp DESC LIMIT ?";
      params.push(filters.limit || 100);

      return db.prepare(sql).all(...params);
    },

    /**
     * Clean up old audit logs
     */
    cleanup(retentionDays = 90) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = db.prepare("DELETE FROM audit_logs WHERE timestamp < ?")
        .run(cutoffDate.toISOString());

      return result.changes;
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

/*
import { createAuditLogger } from "./src/utils/auditLogger.js";

const auditLogger = createAuditLogger(db);

// Authentication success
auditLogger.log("auth.login", {
  actor: username,
  actor_type: "human",
  action: "authenticate",
  outcome: "success",
  ip_address: req.ip,
  user_agent: req.get("user-agent"),
});

// Agent key created
auditLogger.log("agent.created", {
  actor: username,
  actor_type: "human",
  resource: apiKey,
  action: "create",
  outcome: "success",
  details: { name, permissions },
});

// Permission denied
auditLogger.log("access.denied", {
  actor: req.apiKey,
  actor_type: "agent",
  resource: `bookmark/${id}`,
  action: "delete",
  outcome: "blocked",
  ip_address: req.ip,
  details: { reason: "Missing delete permission" },
});
*/
