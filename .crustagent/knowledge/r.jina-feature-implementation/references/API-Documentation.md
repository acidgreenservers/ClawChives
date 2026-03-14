# r.jina.ai Integration API Documentation

## Overview

This document provides comprehensive API documentation for the r.jina.ai integration in ClawChives bookmark manager. The integration adds a proxy endpoint that allows human users to access r.jina.ai content through the ClawChives API while maintaining security controls.

## REST API Endpoints

### 1. r.jina.ai Proxy Endpoint

**Endpoint:** `POST /api/bookmarks/r.jina`

**Description:** Proxy endpoint that fetches and processes content from r.jina.ai URLs

**Authentication:** Required - Human-only access control

**Request Format:**

```json
{
  "url": "https://r.jina.ai/http://example.com/article",
  "agentKey": "optional-agent-key"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The r.jina.ai URL to fetch content from |
| `agentKey` | string | No | Agent key for agent access (restricted) |

**Response Format (Success):**

```json
{
  "success": true,
  "data": {
    "content": "Extracted content from the r.jina.ai URL",
    "metadata": {
      "sourceUrl": "https://r.jina.ai/http://example.com/article",
      "fetchedAt": "2024-01-15T10:30:00Z",
      "contentLength": 15420,
      "contentType": "text/html"
    }
  }
}
```

**Response Format (Error):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "Invalid r.jina.ai URL format",
    "details": "URL must start with https://r.jina.ai/"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | URL is not a valid r.jina.ai URL |
| `UNAUTHORIZED` | 401 | User is not authenticated or is an agent |
| `FORBIDDEN` | 403 | Agent access denied for this endpoint |
| `FETCH_ERROR` | 500 | Failed to fetch content from r.jina.ai |
| `TIMEOUT` | 504 | Request to r.jina.ai timed out |

### 2. Bookmark Creation with r.jina Conversion

**Endpoint:** `POST /api/bookmarks`

**Description:** Create a new bookmark with optional r.jina.ai conversion

**Authentication:** Required

**Request Format:**

```json
{
  "url": "http://example.com/article",
  "title": "Example Article",
  "description": "An example article",
  "tags": ["example", "article"],
  "convertToJina": true
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The original URL to bookmark |
| `title` | string | Yes | Title of the bookmark |
| `description` | string | No | Description of the bookmark |
| `tags` | array | No | Array of tag strings |
| `convertToJina` | boolean | No | Whether to convert URL to r.jina.ai format |

**Response Format:**

```json
{
  "success": true,
  "data": {
    "id": "bookmark-123",
    "url": "https://r.jina.ai/http://example.com/article",
    "title": "Example Article",
    "description": "An example article",
    "tags": ["example", "article"],
    "createdAt": "2024-01-15T10:30:00Z",
    "convertedToJina": true
  }
}
```

## Authentication and Authorization

### Human-Only Access Control

The r.jina.ai proxy endpoint enforces human-only access through the following mechanisms:

1. **User Agent Verification:** Check for human user agents
2. **Session Validation:** Verify active user session
3. **Permission Checking:** Ensure user has bookmark management permissions
4. **Agent Key Restrictions:** Block or restrict agent key usage

### Permission Requirements

- **Read Access:** Required for all r.jina.ai endpoints
- **Bookmark Management:** Required for bookmark creation with conversion
- **Admin Access:** Required for system-level r.jina.ai operations

## Integration Points

### 1. Bookmark Service Integration

The r.jina.ai feature integrates with the existing bookmark service through:

- **URL Conversion Logic:** Automatic conversion of URLs to r.jina.ai format
- **Content Extraction:** Using r.jina.ai for content processing
- **Database Storage:** Storing converted URLs and metadata

### 2. Frontend Integration

Frontend components integrate with the r.jina.ai API through:

- **BookmarkModal:** Checkbox for r.jina conversion
- **BookmarkList:** Display of converted bookmarks
- **Settings:** Configuration options for r.jina.ai behavior

### 3. Database Integration

Database schema extensions for r.jina.ai support:

```sql
-- Add to bookmarks table
ALTER TABLE bookmarks ADD COLUMN converted_to_jina BOOLEAN DEFAULT FALSE;
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT;
```

## Security Considerations

### 1. URL Validation

All r.jina.ai URLs must be validated to ensure they:

- Start with `https://r.jina.ai/`
- Contain a valid target URL
- Do not contain malicious content

### 2. Rate Limiting

Implement rate limiting for r.jina.ai requests:

- **Per User:** Maximum 100 requests per hour
- **Per IP:** Maximum 500 requests per hour
- **Global:** Maximum 1000 requests per minute

### 3. Content Filtering

Filter and sanitize content from r.jina.ai responses:

- Remove potentially harmful scripts
- Validate content length
- Check for malicious patterns

## Usage Examples

### Example 1: Fetching r.jina.ai Content

```bash
curl -X POST https://api.clawchives.com/api/bookmarks/r.jina \
  -H "Authorization: Bearer user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://r.jina.ai/http://example.com/article"
  }'
```

### Example 2: Creating Bookmark with Conversion

```bash
curl -X POST https://api.clawchives.com/api/bookmarks \
  -H "Authorization: Bearer user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://example.com/article",
    "title": "Example Article",
    "convertToJina": true
  }'
```

### Example 3: Error Handling

```javascript
fetch('/api/bookmarks/r.jina', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer user-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'invalid-url'
  })
})
.then(response => response.json())
.then(data => {
  if (!data.success) {
    console.error('Error:', data.error.message);
    // Handle specific error codes
    if (data.error.code === 'INVALID_URL') {
      // Show user-friendly error message
    }
  }
});
```

## Monitoring and Logging

### Required Log Entries

1. **Request Logging:**
   - Timestamp
   - User ID
   - Requested URL
   - Response status
   - Response time

2. **Error Logging:**
   - Error code and message
   - Stack trace (for server errors)
   - User context
   - Request details

3. **Security Events:**
   - Unauthorized access attempts
   - Rate limit violations
   - Suspicious URL patterns

### Metrics to Monitor

- Request volume and success rate
- Response times and timeouts
- Error rates by error type
- User adoption of r.jina conversion
- Agent access attempts

## Future Enhancements

### Planned Features

1. **Batch Processing:** Support for multiple r.jina.ai URLs in single request
2. **Caching:** Implement content caching to reduce r.jina.ai API calls
3. **Advanced Filtering:** More sophisticated content filtering options
4. **Analytics:** Usage analytics and reporting
5. **Webhooks:** Notifications for r.jina.ai content updates

### API Versioning

Future API versions will maintain backward compatibility while adding new features:

- **v1:** Current implementation
- **v2:** Planned enhancements with improved performance
- **v3:** Advanced features and enterprise capabilities
