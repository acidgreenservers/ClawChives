/**
 * Input Validation Schemas (Zod)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Validate all user input to prevent injection, XSS, DoS, type confusion
 * Location: src/validation/schemas.js (new file)
 * Dependencies: zod@^3.22.0
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION SCHEMAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Registration schema
 * POST /api/auth/register
 */
export const registerSchema = z.object({
  // UUID v4 format (36 characters with dashes)
  uuid: z.string().uuid({
    message: "Invalid UUID format. Expected UUID v4 (e.g., 123e4567-e89b-12d3-a456-426614174000)",
  }),

  // Username: 3-50 chars, alphanumeric + underscore/dash
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(50, { message: "Username cannot exceed 50 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: "Username can only contain letters, numbers, underscores, and dashes",
    }),

  // SHA-256 hash (64 hex characters)
  keyHash: z
    .string()
    .length(64, { message: "Key hash must be 64 characters (SHA-256 hex)" })
    .regex(/^[0-9a-f]{64}$/, { message: "Key hash must be lowercase hexadecimal" }),
});

/**
 * Token issuance schema
 * POST /api/auth/token
 */
export const tokenSchema = z.object({
  // Human key (hu-...) format
  humanKey: z
    .string()
    .min(10)
    .regex(/^hu-/, { message: "Invalid human key format. Must start with 'hu-'" }),
});

// ──────────────────────────────────────────────────────────────────────────────
// BOOKMARK SCHEMAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create bookmark schema
 * POST /api/bookmarks
 */
export const createBookmarkSchema = z.object({
  // URL: Must be valid HTTP(S) URL, max 2000 chars
  url: z
    .string()
    .url({ message: "Invalid URL format. Must start with http:// or https://" })
    .max(2000, { message: "URL cannot exceed 2000 characters" })
    .regex(/^https?:\/\//, { message: "URL must use HTTP or HTTPS protocol" }),

  // Title: Required, 1-500 chars
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(500, { message: "Title cannot exceed 500 characters" }),

  // Description: Optional, max 1000 chars
  description: z
    .string()
    .max(1000, { message: "Description cannot exceed 1000 characters" })
    .default(""),

  // Favicon: Optional URL or data URI
  favicon: z
    .string()
    .max(10000, { message: "Favicon cannot exceed 10KB" })
    .regex(/^(https?:\/\/|data:image\/)/, { message: "Favicon must be URL or data URI" })
    .optional()
    .or(z.literal("")),

  // Tags: Array of strings, max 50 tags, each max 50 chars
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(50, { message: "Tag cannot exceed 50 characters" })
        .regex(/^[a-zA-Z0-9_-]+$/, { message: "Tags can only contain letters, numbers, underscores, and dashes" })
    )
    .max(50, { message: "Cannot have more than 50 tags" })
    .default([]),

  // Folder ID: Optional UUID or folder ID
  folderId: z
    .string()
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Invalid folder ID format" })
    .optional()
    .or(z.null()),

  // Starred: Boolean flag
  starred: z.boolean().default(false),

  // Archived: Boolean flag
  archived: z.boolean().default(false),

  // Color: Hex color code (e.g., #06b6d4)
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: "Color must be valid hex code (e.g., #06b6d4)" })
    .optional()
    .or(z.null()),
});

/**
 * Update bookmark schema (all fields optional)
 * PUT /api/bookmarks/:id
 */
export const updateBookmarkSchema = z.object({
  url: z
    .string()
    .url()
    .max(2000)
    .regex(/^https?:\/\//)
    .optional(),

  title: z.string().trim().min(1).max(500).optional(),

  description: z.string().max(1000).optional(),

  favicon: z
    .string()
    .max(10000)
    .regex(/^(https?:\/\/|data:image\/)/)
    .optional(),

  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(50)
    .optional(),

  folderId: z.string().max(100).optional().or(z.null()),

  starred: z.boolean().optional(),

  archived: z.boolean().optional(),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .or(z.null()),
});

// ──────────────────────────────────────────────────────────────────────────────
// FOLDER SCHEMAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create folder schema
 * POST /api/folders
 */
export const createFolderSchema = z.object({
  // Folder name: 1-100 chars, no path separators
  name: z
    .string()
    .trim()
    .min(1, { message: "Folder name is required" })
    .max(100, { message: "Folder name cannot exceed 100 characters" })
    .regex(/^[^/\\]+$/, { message: "Folder name cannot contain / or \\ (path traversal)" }),

  // Parent folder ID: Optional
  parentId: z
    .string()
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .or(z.null()),

  // Color: Hex color code
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#06b6d4"),
});

/**
 * Update folder schema
 * PUT /api/folders/:id
 */
export const updateFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^/\\]+$/)
    .optional(),

  parentId: z
    .string()
    .max(100)
    .optional()
    .or(z.null()),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

// ──────────────────────────────────────────────────────────────────────────────
// AGENT KEY SCHEMAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create agent key schema
 * POST /api/agent-keys
 */
export const createAgentKeySchema = z.object({
  // Agent name: 1-100 chars
  name: z
    .string()
    .trim()
    .min(1, { message: "Agent name is required" })
    .max(100, { message: "Agent name cannot exceed 100 characters" }),

  // Description: Optional, max 500 chars
  description: z
    .string()
    .max(500, { message: "Description cannot exceed 500 characters" })
    .optional()
    .or(z.literal("")),

  // Permissions object
  permissions: z.object({
    read: z.boolean().default(true),
    write: z.boolean().default(false),
    edit: z.boolean().default(false),
    delete: z.boolean().default(false),
    move: z.boolean().default(false),
  }),

  // Expiration type: never, 30d, 60d, 90d, custom
  expirationType: z.enum(["never", "30d", "60d", "90d", "custom"], {
    errorMap: () => ({ message: "Invalid expiration type. Must be: never, 30d, 60d, 90d, or custom" }),
  }),

  // Expiration date: Required if expirationType is "custom"
  expirationDate: z
    .string()
    .datetime({ message: "Invalid date format. Expected ISO 8601 (e.g., 2024-12-31T23:59:59Z)" })
    .optional()
    .or(z.null()),

  // Rate limit: 1-10000 requests/minute
  rateLimit: z
    .number()
    .int({ message: "Rate limit must be an integer" })
    .min(1, { message: "Rate limit must be at least 1 request/minute" })
    .max(10000, { message: "Rate limit cannot exceed 10000 requests/minute" })
    .optional()
    .or(z.null()),
}).refine(
  (data) => {
    // Require expirationDate if expirationType is "custom"
    if (data.expirationType === "custom" && !data.expirationDate) {
      return false;
    }
    return true;
  },
  {
    message: "Expiration date is required when expiration type is 'custom'",
    path: ["expirationDate"],
  }
).refine(
  (data) => {
    // Recommend rate limit if write permission enabled
    if (data.permissions.write && !data.rateLimit) {
      // Warning, not error - allow but recommend
      console.warn("⚠️ Agent key has write permission but no rate limit");
    }
    return true;
  }
);

/**
 * Update agent key schema
 * PUT /api/agent-keys/:id
 */
export const updateAgentKeySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),

  description: z.string().max(500).optional(),

  permissions: z
    .object({
      read: z.boolean(),
      write: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
      move: z.boolean(),
    })
    .optional(),

  rateLimit: z.number().int().min(1).max(10000).optional().or(z.null()),

  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────────────────────────────────────────
// ID VALIDATION SCHEMAS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validate ID parameter (for DELETE/PUT routes)
 * Example: DELETE /api/bookmarks/:id
 */
export const idParamSchema = z.object({
  id: z
    .string()
    .min(1, { message: "ID is required" })
    .max(100, { message: "ID too long" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Invalid ID format" }),
});

/**
 * Validate UUID parameter
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid UUID format" }),
});

// ──────────────────────────────────────────────────────────────────────────────
// VALIDATION MIDDLEWARE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Validate request body against schema
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 *
 * Usage:
 *   app.post("/api/bookmarks", validateBody(createBookmarkSchema), handler);
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors for client
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        issues,
      });
    }

    // Store validated data (type-safe)
    req.validatedBody = result.data;
    next();
  };
}

/**
 * Validate request params against schema
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 *
 * Usage:
 *   app.delete("/api/bookmarks/:id", validateParams(idParamSchema), handler);
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        success: false,
        error: "Invalid URL parameter",
        issues,
      });
    }

    req.validatedParams = result.data;
    next();
  };
}

/**
 * Validate query parameters against schema
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 *
 * Usage:
 *   app.get("/api/bookmarks", validateQuery(searchQuerySchema), handler);
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        success: false,
        error: "Invalid query parameter",
        issues,
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATION EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Example: Apply validation to routes in server.js
 */

/*
import {
  validateBody,
  validateParams,
  registerSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  createFolderSchema,
  createAgentKeySchema,
  idParamSchema,
} from "./src/validation/schemas.js";

// ────────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ────────────────────────────────────────────────────────────────────────────

app.post("/api/auth/register", authLimiter, validateBody(registerSchema), (req, res) => {
  const { uuid, username, keyHash } = req.validatedBody; // Type-safe!
  // ...
});

app.post("/api/auth/token", authLimiter, validateBody(tokenSchema), (req, res) => {
  const { humanKey } = req.validatedBody;
  // ...
});

// ────────────────────────────────────────────────────────────────────────────
// BOOKMARK ROUTES
// ────────────────────────────────────────────────────────────────────────────

app.post("/api/bookmarks", requireAuth, validateBody(createBookmarkSchema), (req, res) => {
  const { url, title, description, tags, folderId, starred, archived, color } = req.validatedBody;
  // All fields validated and type-checked!
  // ...
});

app.put("/api/bookmarks/:id", requireAuth, validateParams(idParamSchema), validateBody(updateBookmarkSchema), (req, res) => {
  const { id } = req.validatedParams;
  const updates = req.validatedBody; // Only valid fields present
  // ...
});

app.delete("/api/bookmarks/:id", requireAuth, validateParams(idParamSchema), (req, res) => {
  const { id } = req.validatedParams;
  // ...
});

// ────────────────────────────────────────────────────────────────────────────
// FOLDER ROUTES
// ────────────────────────────────────────────────────────────────────────────

app.post("/api/folders", requireAuth, validateBody(createFolderSchema), (req, res) => {
  const { name, parentId, color } = req.validatedBody;
  // ...
});

app.put("/api/folders/:id", requireAuth, validateParams(idParamSchema), validateBody(updateFolderSchema), (req, res) => {
  const { id } = req.validatedParams;
  const { name, parentId, color } = req.validatedBody;
  // ...
});

// ────────────────────────────────────────────────────────────────────────────
// AGENT KEY ROUTES
// ────────────────────────────────────────────────────────────────────────────

app.post("/api/agent-keys", requireAuth, validateBody(createAgentKeySchema), (req, res) => {
  const { name, description, permissions, expirationType, expirationDate, rateLimit } = req.validatedBody;
  // ...
});
*/

// ──────────────────────────────────────────────────────────────────────────────
// TESTING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test schema validation in isolation:
 */

/*
// Valid bookmark
const validBookmark = {
  url: "https://example.com",
  title: "Example Site",
  description: "A test bookmark",
  tags: ["tech", "reference"],
  starred: false,
};
console.log(createBookmarkSchema.parse(validBookmark)); // ✅ Succeeds

// Invalid bookmark (URL not HTTP/HTTPS)
const invalidBookmark = {
  url: "ftp://example.com",
  title: "Example",
};
try {
  createBookmarkSchema.parse(invalidBookmark);
} catch (error) {
  console.error(error.issues); // ❌ Shows validation errors
}
*/

// ──────────────────────────────────────────────────────────────────────────────
// TROUBLESHOOTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Issue: "Expected boolean, received string"
 * Cause: Client sent { "starred": "true" } instead of { "starred": true }
 * Solution: Use z.coerce.boolean() to auto-convert:
 *   starred: z.coerce.boolean()
 *
 * Issue: "Required" error for optional field
 * Cause: Field defined without .optional()
 * Solution: Add .optional() or .default():
 *   description: z.string().optional()
 *   description: z.string().default("")
 *
 * Issue: Validation error leaks internal details
 * Cause: Zod error message too verbose
 * Solution: Customize error messages with { message: "..." }
 *
 * Issue: Performance slow on large arrays
 * Cause: Validating 1000s of items
 * Solution: Add .max() limit to arrays:
 *   tags: z.array(z.string()).max(50)
 */
