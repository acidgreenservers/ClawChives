/**
 * Permission Checker Middleware (Server-Side Access Control)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Enforce agent key permissions server-side
 * Location: src/middleware/permissionChecker.js (new file)
 * Dependencies: None (uses existing agentPermissions structure)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

/**
 * Create permission checker middleware
 *
 * @param {Database} db - SQLite database instance
 * @returns {Function} Middleware factory
 */
export function createPermissionChecker(db) {
  /**
   * Check if request has required permission
   *
   * @param {string} requiredPermission - "read", "write", "edit", "delete", "move"
   * @returns {Function} Express middleware
   */
  return function checkPermission(requiredPermission) {
    return (req, res, next) => {
      // Human keys and API tokens: Full access (no permission restrictions)
      if (req.keyType === "human" || req.keyType === "api_token") {
        return next();
      }

      // Agent keys: Check permissions from database
      if (req.keyType === "agent") {
        const agent = db
          .prepare("SELECT permissions, is_active FROM agent_keys WHERE api_key = ?")
          .get(req.apiKey);

        // Agent key not found (shouldn't happen if requireAuth passed)
        if (!agent) {
          return res.status(401).json({ error: "Invalid agent key" });
        }

        // Agent key deactivated
        if (!agent.is_active) {
          return res.status(403).json({ error: "Agent key has been deactivated" });
        }

        // Parse permissions (stored as JSON string)
        let permissions;
        try {
          permissions = JSON.parse(agent.permissions);
        } catch (error) {
          console.error("Failed to parse agent permissions:", error);
          return res.status(500).json({ error: "Invalid permission configuration" });
        }

        // Check if required permission is granted
        if (!permissions[requiredPermission]) {
          return res.status(403).json({
            error: `Access denied: Missing '${requiredPermission}' permission`,
            required: requiredPermission,
            granted: Object.keys(permissions).filter((key) => permissions[key]),
          });
        }
      }

      // Permission granted, continue
      next();
    };
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * How to use in server.js:
 */

/*
import { createPermissionChecker } from "./src/middleware/permissionChecker.js";

const checkPermission = createPermissionChecker(db);

// ────────────────────────────────────────────────────────────────────────────
// BOOKMARK ROUTES
// ────────────────────────────────────────────────────────────────────────────

// GET: Require "read" permission
app.get("/api/bookmarks", requireAuth, checkPermission("read"), (req, res) => {
  const bookmarks = db.prepare("SELECT * FROM bookmarks").all();
  res.json({ success: true, data: bookmarks });
});

// POST: Require "write" permission
app.post("/api/bookmarks", requireAuth, checkPermission("write"), (req, res) => {
  const { url, title } = req.validatedBody;
  const id = crypto.randomBytes(16).toString("hex");

  db.prepare("INSERT INTO bookmarks (id, url, title, ...) VALUES (?, ?, ?, ...)")
    .run(id, url, title, ...);

  res.status(201).json({ success: true, id });
});

// PUT: Require "edit" permission (or "move" if folderId changes)
app.put("/api/bookmarks/:id", requireAuth, checkPermission("edit"), (req, res) => {
  const { id } = req.params;
  const updates = req.validatedBody;

  // If folderId is being changed, also check "move" permission
  if (updates.folderId !== undefined) {
    const hasMove = checkHasPermission(req, "move");
    if (!hasMove) {
      return res.status(403).json({ error: "Moving bookmarks requires 'move' permission" });
    }
  }

  db.prepare("UPDATE bookmarks SET ... WHERE id = ?").run(..., id);
  res.json({ success: true });
});

// DELETE: Require "delete" permission
app.delete("/api/bookmarks/:id", requireAuth, checkPermission("delete"), (req, res) => {
  const { id } = req.params;

  db.prepare("DELETE FROM bookmarks WHERE id = ?").run(id);
  res.json({ success: true });
});

// ────────────────────────────────────────────────────────────────────────────
// FOLDER ROUTES (same pattern)
// ────────────────────────────────────────────────────────────────────────────

app.get("/api/folders", requireAuth, checkPermission("read"), getFolders);
app.post("/api/folders", requireAuth, checkPermission("write"), createFolder);
app.put("/api/folders/:id", requireAuth, checkPermission("edit"), updateFolder);
app.delete("/api/folders/:id", requireAuth, checkPermission("delete"), deleteFolder);
*/

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check if request has permission (for conditional checks)
 *
 * @param {Object} req - Express request
 * @param {string} permission - Permission to check
 * @returns {boolean} True if permission granted
 */
export function checkHasPermission(req, permission, db) {
  if (req.keyType === "human" || req.keyType === "api_token") {
    return true; // Full access
  }

  if (req.keyType === "agent") {
    const agent = db.prepare("SELECT permissions FROM agent_keys WHERE api_key = ?").get(req.apiKey);
    if (!agent) return false;

    const permissions = JSON.parse(agent.permissions);
    return permissions[permission] === true;
  }

  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: Permission check passes but shouldn't
 * Cause: keyType not set correctly in requireAuth
 * Solution: Verify req.keyType set in requireAuth middleware
 *
 * Issue: "Invalid permission configuration" error
 * Cause: Corrupted permissions JSON in database
 * Solution: Check agent_keys.permissions column, ensure valid JSON
 *
 * Issue: Human keys blocked by permission check
 * Cause: keyType === "human" check not working
 * Solution: Verify requireAuth sets req.keyType = "human" for human keys
 */
