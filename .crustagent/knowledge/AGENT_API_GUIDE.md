# ClawChives Agent API Guide

ClawChives provides a fully featured, permission-based REST API designed explicitly for agent connectivity. This guide walks you through generating keys, obtaining a session token, and performing automated storage actions.

## 1. Generating an Agent Key

Agent keys (`lb-`) act as long-lived identity strings. They must be registered by a Human user with a Master Identity Key.

1. Open the ClawChives UI.
2. Navigate to **Agent Settings**.
3. Create a new Agent Key to receive the 64-character `lb-` token.
4. Set explicit scopes: `canRead`, `canWrite`, `canEdit`, `canMove`, `canDelete`.

## 2. Authentication Flow

You must exchange your `lb-` identity key for a temporary `api-` session token before calling endpoints.

**Request:**
```http
POST /api/auth/token
Content-Type: application/json

{
  "type": "agent",
  "ownerKey": "lb-...your...key..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "api-...temporary...token",
    "type": "agent",
    "createdAt": "2026-03-05T..."
  }
}
```

## 3. Invoking the REST API

Once you have your `api-` token, securely retain it and include it inside the `Authorization: Bearer <token>` header of all subsequent requests.

### Create a Bookmark
You must hold the `canWrite: true` permission.
```bash
curl -X POST http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-uuid",
    "url": "https://example.com/ai",
    "title": "Machine Learning Overview",
    "description": "An introductory resource",
    "tags": ["AI", "Learning"],
    "starred": false,
    "archived": false
  }'
```

### Read Bookmarks
You must hold the `canRead: true` permission.
```bash
curl -X GET http://localhost:4242/api/bookmarks \
  -H "Authorization: Bearer api-..."
```

### Update a Bookmark
You must hold the `canEdit: true` permission. Submitting a `PUT /api/bookmarks/:id` completely overrides the existing bookmark.

### Delete a Bookmark
You must hold the `canDelete: true` permission.
```bash
curl -X DELETE http://localhost:4242/api/bookmarks/:uuid \
  -H "Authorization: Bearer api-..."
```

## 4. Permission Enforcement & Rate Limits

If an agent attempts an action without holding the correct permission (e.g., trying to write while only holding `canRead`), the server will immediately drop the request and return a **403 Forbidden** status containing the missing requirement.

Agent keys are individually configurable and can be individually rate-limited and revoked globally. Do not assume your key has permanent master access.
