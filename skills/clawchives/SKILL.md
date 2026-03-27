---
name: clawchives-agent-api©™
description: The canonical ClawChives©™ agent integration skill. Full API reference for autonomous agents (Lobsters©™) to authenticate, manage bookmarks, folders, and integrate with the ClawChive bookmarking system.
---

# ClawChives©™ Agent API Skill

## 🦞 Overview

ClawChives©™ is a **local-first sovereign bookmarking system** that agents can integrate with via HTTP API. This skill document defines every action an agent can take — from authentication to CRUD operations on bookmarks and folders.

**Key Principles:**
- **Human-First Permissions:** All agents must be explicitly authorized by a human via the Settings panel before accessing resources
- **Granular Access Control:** Each agent key has independent permission grants (`canRead`, `canWrite`, `canEdit`, `canDelete`)
- **Cryptographic Identity:** Agents prove identity via a `lb-` (Lobster) key hash, issued tokens are `api-` prefixed
- **No Passwords:** Authentication is stateless and cryptographic — no session state, no passwords, no recovery email

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Permissions Model](#permissions-model)
3. [Bookmarks API](#bookmarks-api)
4. [Folders API](#folders-api)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [Query Parameters](#query-parameters)

---

## Authentication

### Key Types

| Prefix | Type | Usage | Context |
|--------|------|-------|---------|
| `hu-` | Human Identity | Secret stored in offline identity file | Login; never sent to server |
| `lb-` | Lobster (Agent) Key | Secret used to request API tokens | Agent setup; never sent to server |
| `api-` | API Token | Bearer token for API calls | All authenticated requests |

### Step 1: Generate Agent Key

A **human** creates an agent key in **Settings → Agent Keys**.

```
UI: Settings panel → "+ New Agent Key" button
    └─ Human provides a name (e.g., "My Bookmark Crawler")
    └─ System generates a 64-character `lb-` key
    └─ Human copies the key and gives it to the agent
```

### Step 2: Hash the Key

The **agent** must hash its `lb-` key before sending it to the server.

```typescript
// Pseudocode — your language may vary
async function hashAgentKey(lbKey: string): Promise<string> {
  // lbKey format: "lb-aAbBcCdDeEfFgGhH..." (67 chars total)
  const encoder = new TextEncoder()
  const data = encoder.encode(lbKey)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}
// Output: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" (64 hex chars)
```

**Critical:** The raw `lb-` key is **NEVER** sent to the server. Only the SHA-256 hash is transmitted.

### Step 3: Exchange for API Token

The **agent** calls `POST /api/auth/token` with the hashed key.

```http
POST /api/auth/token
Content-Type: application/json

{
  "type": "agent",
  "keyHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

**Response — 200 OK:**
```json
{
  "token": "api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"
}
```

**Error Responses:**
- `401 Unauthorized` — keyHash does not match any registered agent key
- `400 Bad Request` — missing or malformed `type` or `keyHash` field
- `429 Too Many Requests` — rate limit exceeded (max 10 auth attempts per minute per IP)
- `500 Internal` — server error

### Step 4: Use the API Token

For all subsequent requests, include the token in the `Authorization` header:

```http
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

---

## Permissions Model

### How Permissions Work

1. **Human creates an agent key** in Settings → Agent Keys
2. **Human grants permissions** to that key: `canRead`, `canWrite`, `canEdit`, `canDelete`
3. **Agent obtains an `api-` token** by hashing and exchanging its `lb-` key
4. **Server checks permissions** on every request using the token's associated key

### Permission Bits

| Permission | Allows |
|-----------|--------|
| `canRead` | `GET /bookmarks`, `GET /bookmarks/:id`, `GET /folders`, `GET /bookmarks/stats`, etc. |
| `canWrite` | `POST /bookmarks`, `POST /bookmarks/bulk`, `POST /folders` |
| `canEdit` | `PUT /bookmarks/:id`, `PUT /folders/:id`, `PATCH /bookmarks/:id/star`, `PATCH /bookmarks/:id/archive` |
| `canDelete` | `DELETE /bookmarks/:id`, `DELETE /bookmarks/`, `DELETE /folders/:id`, `DELETE /folders/` |

### Failure Mode: Missing Permission

If an agent token lacks the required permission for an endpoint, the server returns:

```http
403 Forbidden
Content-Type: application/json

{
  "error": "Forbidden",
  "message": "This agent key does not have permission to write bookmarks"
}
```

---

## Bookmarks API

### GET /bookmarks — List Bookmarks

Retrieve paginated bookmarks with optional search and filtering.

**Request:**
```http
GET /bookmarks?page=1&limit=50&search=lobster&folder=science&tags=crustacean&archived=false
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Query Parameters:**
- `page` (number, optional, default: 1) — pagination page number
- `limit` (number, optional, default: 50, max: 200) — items per page
- `search` (string, optional) — full-text search in title and URL
- `folder` (string, optional) — filter by folder name (exact match)
- `tags` (string, optional) — comma-separated tag names (filters to bookmarks with ANY of these tags)
- `archived` (boolean, optional) — filter by archive status (`true` = archived only, `false` = active only, omit = all)

**Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "bm-uuid-1",
      "url": "https://example.com/article",
      "title": "Understanding Lobster Communication",
      "description": "A deep dive into crustacean linguistics",
      "folder": "science",
      "tags": ["marine-biology", "behavior"],
      "starred": false,
      "archived": false,
      "createdAt": "2026-03-20T14:30:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "pages": 3
  }
}
```

**Permissions Required:** `canRead`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canRead` permission

---

### GET /bookmarks/:id — Get Single Bookmark

Retrieve a single bookmark by ID.

**Request:**
```http
GET /bookmarks/bm-uuid-1
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "id": "bm-uuid-1",
  "url": "https://example.com/article",
  "title": "Understanding Lobster Communication",
  "description": "A deep dive into crustacean linguistics",
  "folder": "science",
  "tags": ["marine-biology", "behavior"],
  "starred": false,
  "archived": false,
  "createdAt": "2026-03-20T14:30:00Z",
  "updatedAt": "2026-03-20T14:30:00Z"
}
```

**Permissions Required:** `canRead`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canRead` permission
- `404 Not Found` — bookmark does not exist

---

### POST /bookmarks — Create Bookmark

Create a single bookmark.

**Request:**
```http
POST /bookmarks
Content-Type: application/json
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

{
  "url": "https://example.com/article",
  "title": "Understanding Lobster Communication",
  "description": "A deep dive into crustacean linguistics",
  "folder": "science",
  "tags": ["marine-biology", "behavior"]
}
```

**Request Body Schema:**
```typescript
{
  url: string              // HTTP(S) URL; must be absolute
  title: string            // 1-255 characters
  description?: string     // 0-2000 characters (optional)
  folder?: string          // folder name (optional; created if doesn't exist)
  tags?: string[]          // array of tag names (optional; max 20 tags)
}
```

**Response — 201 Created:**
```json
{
  "id": "bm-uuid-1",
  "url": "https://example.com/article",
  "title": "Understanding Lobster Communication",
  "description": "A deep dive into crustacean linguistics",
  "folder": "science",
  "tags": ["marine-biology", "behavior"],
  "starred": false,
  "archived": false,
  "createdAt": "2026-03-20T14:30:00Z",
  "updatedAt": "2026-03-20T14:30:00Z"
}
```

**Permissions Required:** `canWrite`

**Error Responses:**
- `400 Bad Request` — missing required fields or invalid types
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canWrite` permission
- `422 Unprocessable Entity` — URL is invalid or duplicate (URL uniqueness enforced per user)
- `429 Too Many Requests` — rate limit exceeded

---

### PUT /bookmarks/:id — Update Bookmark

Update an existing bookmark (partial or full).

**Request:**
```http
PUT /bookmarks/bm-uuid-1
Content-Type: application/json
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

{
  "title": "Understanding Lobster Communication (Revised)",
  "description": "An updated deep dive",
  "tags": ["marine-biology", "behavior", "new-tag"]
}
```

**Request Body Schema:**
```typescript
{
  url?: string             // update URL (optional)
  title?: string           // update title (optional)
  description?: string     // update description (optional)
  folder?: string          // move to folder (optional)
  tags?: string[]          // replace tags (optional)
}
```

**Response — 200 OK:**
```json
{
  "id": "bm-uuid-1",
  "url": "https://example.com/article",
  "title": "Understanding Lobster Communication (Revised)",
  "description": "An updated deep dive",
  "folder": "science",
  "tags": ["marine-biology", "behavior", "new-tag"],
  "starred": false,
  "archived": false,
  "createdAt": "2026-03-20T14:30:00Z",
  "updatedAt": "2026-03-25T10:15:00Z"
}
```

**Permissions Required:** `canEdit`

**Error Responses:**
- `400 Bad Request` — invalid field types or empty body
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canEdit` permission
- `404 Not Found` — bookmark does not exist
- `422 Unprocessable Entity` — URL conflict (duplicate URL)

---

### DELETE /bookmarks/:id — Delete Single Bookmark

Delete a bookmark by ID.

**Request:**
```http
DELETE /bookmarks/bm-uuid-1
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 204 No Content**

**Permissions Required:** `canDelete`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canDelete` permission
- `404 Not Found` — bookmark does not exist

---

### DELETE /bookmarks — Purge All Bookmarks

**DESTRUCTIVE:** Delete all bookmarks for the authenticated user. No undo.

**Request:**
```http
DELETE /bookmarks
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 204 No Content**

**Permissions Required:** `canDelete`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canDelete` permission

---

### POST /bookmarks/bulk — Bulk Import Bookmarks

Import multiple bookmarks in a single request.

**Request:**
```http
POST /bookmarks/bulk
Content-Type: application/json
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

{
  "bookmarks": [
    {
      "url": "https://example.com/1",
      "title": "Article 1",
      "folder": "reading",
      "tags": ["tech"]
    },
    {
      "url": "https://example.com/2",
      "title": "Article 2",
      "folder": "reading",
      "tags": ["tech", "ai"]
    }
  ]
}
```

**Request Body Schema:**
```typescript
{
  bookmarks: Array<{
    url: string
    title: string
    description?: string
    folder?: string
    tags?: string[]
  }>   // max 500 bookmarks per request
}
```

**Response — 200 OK:**
```json
{
  "imported": 2,
  "failed": 0,
  "results": [
    {
      "url": "https://example.com/1",
      "success": true,
      "id": "bm-uuid-1"
    },
    {
      "url": "https://example.com/2",
      "success": true,
      "id": "bm-uuid-2"
    }
  ]
}
```

**Permissions Required:** `canWrite`

**Error Responses:**
- `400 Bad Request` — invalid request structure
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canWrite` permission
- `422 Unprocessable Entity` — partial import with failures (see `results` array for per-item status)

---

### PATCH /bookmarks/:id/star — Toggle Star Status

Toggle the starred/favorited status of a bookmark.

**Request:**
```http
PATCH /bookmarks/bm-uuid-1/star
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "id": "bm-uuid-1",
  "starred": true
}
```

**Permissions Required:** `canEdit`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canEdit` permission
- `404 Not Found` — bookmark does not exist

---

### PATCH /bookmarks/:id/archive — Toggle Archive Status

Toggle the archived status of a bookmark.

**Request:**
```http
PATCH /bookmarks/bm-uuid-1/archive
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "id": "bm-uuid-1",
  "archived": true
}
```

**Permissions Required:** `canEdit`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canEdit` permission
- `404 Not Found` — bookmark does not exist

---

### GET /bookmarks/stats — Get Bookmark Statistics

Retrieve aggregated bookmark statistics.

**Request:**
```http
GET /bookmarks/stats
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "total": 127,
  "archived": 12,
  "starred": 34,
  "untagged": 5,
  "byFolder": {
    "science": 45,
    "reading": 62,
    "inbox": 20
  },
  "byTag": {
    "marine-biology": 28,
    "ai": 15,
    "behavior": 22
  }
}
```

**Permissions Required:** `canRead`

---

### GET /bookmarks/tags — Get All Tags

Retrieve all tags in use across the user's bookmarks.

**Request:**
```http
GET /bookmarks/tags
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "tags": [
    { "name": "marine-biology", "count": 28 },
    { "name": "ai", "count": 15 },
    { "name": "behavior", "count": 22 },
    { "name": "research", "count": 18 }
  ]
}
```

**Permissions Required:** `canRead`

---

## Folders API

### GET /folders — List Folders

Retrieve all folders.

**Request:**
```http
GET /folders
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 200 OK:**
```json
{
  "folders": [
    {
      "id": "f-uuid-1",
      "name": "science",
      "createdAt": "2026-03-10T08:00:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    },
    {
      "id": "f-uuid-2",
      "name": "reading",
      "createdAt": "2026-03-10T08:00:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    }
  ]
}
```

**Permissions Required:** `canRead`

---

### POST /folders — Create Folder

Create a new folder.

**Request:**
```http
POST /folders
Content-Type: application/json
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

{
  "name": "research-papers"
}
```

**Request Body Schema:**
```typescript
{
  name: string  // 1-100 characters, unique per user
}
```

**Response — 201 Created:**
```json
{
  "id": "f-uuid-3",
  "name": "research-papers",
  "createdAt": "2026-03-25T10:15:00Z",
  "updatedAt": "2026-03-25T10:15:00Z"
}
```

**Permissions Required:** `canWrite`

**Error Responses:**
- `400 Bad Request` — missing or invalid `name` field
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canWrite` permission
- `422 Unprocessable Entity` — folder name already exists (uniqueness enforced per user)

---

### PUT /folders/:id — Update Folder

Update a folder's name.

**Request:**
```http
PUT /folders/f-uuid-3
Content-Type: application/json
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456

{
  "name": "peer-reviewed-papers"
}
```

**Request Body Schema:**
```typescript
{
  name: string  // 1-100 characters
}
```

**Response — 200 OK:**
```json
{
  "id": "f-uuid-3",
  "name": "peer-reviewed-papers",
  "createdAt": "2026-03-25T10:15:00Z",
  "updatedAt": "2026-03-25T11:00:00Z"
}
```

**Permissions Required:** `canEdit`

**Error Responses:**
- `400 Bad Request` — invalid `name` field
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canEdit` permission
- `404 Not Found` — folder does not exist
- `422 Unprocessable Entity` — folder name already exists

---

### DELETE /folders/:id — Delete Folder

Delete a folder. All bookmarks in the folder are **reassigned to "inbox"**.

**Request:**
```http
DELETE /folders/f-uuid-3
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 204 No Content**

**Permissions Required:** `canDelete`

**Error Responses:**
- `401 Unauthorized` — missing or invalid API token
- `403 Forbidden` — token lacks `canDelete` permission
- `404 Not Found` — folder does not exist

---

### DELETE /folders — Purge All Folders

**DESTRUCTIVE:** Delete all folders. All bookmarks are reassigned to "inbox". No undo.

**Request:**
```http
DELETE /folders
Authorization: Bearer api-aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Response — 204 No Content**

**Permissions Required:** `canDelete`

---

## Error Codes

| Code | Meaning | Common Trigger |
|------|---------|----------------|
| `200 OK` | Request succeeded | All GET requests, most PUT/PATCH |
| `201 Created` | Resource created successfully | POST /bookmarks, POST /folders |
| `204 No Content` | Request succeeded, no body | DELETE requests |
| `400 Bad Request` | Malformed request body or missing required fields | Invalid JSON, missing `url` in POST /bookmarks |
| `401 Unauthorized` | Missing or invalid API token | Missing `Authorization` header, expired/invalid token |
| `403 Forbidden` | Valid token but lacks required permission | `canRead` permission missing for GET /bookmarks |
| `404 Not Found` | Resource does not exist | GET /bookmarks/nonexistent-id |
| `422 Unprocessable Entity` | Valid request but cannot be processed | Duplicate URL, duplicate folder name |
| `429 Too Many Requests` | Rate limit exceeded | >10 auth attempts/min, >500 requests/min |
| `500 Internal Server Error` | Server error | Database failure, unexpected exception |

---

## Rate Limiting

All endpoints are rate-limited. Current limits:

| Endpoint Category | Limit |
|------------------|-------|
| Auth (`/api/auth/token`) | 10 requests per minute per IP |
| Bookmark read (`GET /bookmarks*`) | 500 requests per minute per token |
| Bookmark write (`POST/PUT/DELETE /bookmarks*`) | 100 requests per minute per token |
| Folder operations (`/folders*`) | 100 requests per minute per token |

Exceeding limits returns `429 Too Many Requests`. The response includes a `Retry-After` header indicating seconds until the limit resets.

---

## Query Parameters

### Pagination

All `GET` list endpoints support:
- `page` (number, optional, default: 1) — page number (1-indexed)
- `limit` (number, optional, default: 50, max: 200) — items per page

Example: `GET /bookmarks?page=2&limit=25` retrieves items 26-50.

### Search & Filter

`GET /bookmarks` supports:
- `search` (string, optional) — fuzzy search in title and URL
- `folder` (string, optional) — exact folder name match
- `tags` (string, optional) — comma-separated tag names; returns bookmarks with ANY tag in the list
- `archived` (boolean, optional) — filter by archive status

---

## 🦞 Lobster Wisdom

*"A lobster does not ask permission to take a step forward — but it knows which waters are safe. Know your permissions before you act. A human grants your access; honor that trust by respecting the boundaries they set."*

---

**This SKILL.md is the canonical agent integration guide for ClawChives©™. Always fetch this document from `/api/skill` to stay in sync with the latest API contract.**

Maintained by CrustAgent©™
