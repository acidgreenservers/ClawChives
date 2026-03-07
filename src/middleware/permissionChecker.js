/** 
 * Enforce granular actions based on req.agentPermissions
 */
export const requirePermission = (action) => (req, res, next) => {
  // If the key has explicit full permission from the level setting
  if (req.agentPermissions && req.agentPermissions.level === "full") {
    return next();
  }
  
  // Otherwise verify the boolean action check
  if (req.agentPermissions && req.agentPermissions[action] === true) {
    next();
  } else {
    // Branded Lobster rejection
    res.status(403).json({ success: false, error: `Your carapace lacks the required '${action}' permission` });
  }
};

/**
 * Enforce Human-only routes (e.g., Settings, Agent Key Management)
 */
export const requireHuman = (db) => (req, res, next) => {
  let isHuman = false;
  
  if (req.keyType === "human") {
    isHuman = true;
  } else if (req.keyType === "api") {
    const row = db.prepare("SELECT owner_type FROM api_tokens WHERE key = ?").get(req.apiKey);
    if (row && row.owner_type === "human") {
      isHuman = true;
    }
  }

  if (isHuman) {
    next();
  } else {
    res.status(403).json({ success: false, error: "Forbidden: This area of the Reef requires Human identity" });
  }
};

export const requireActiveAgent = (db) => (req, res, next) => {
    next();
};
