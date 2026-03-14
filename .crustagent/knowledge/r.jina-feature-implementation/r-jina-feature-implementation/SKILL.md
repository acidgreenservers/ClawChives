---
name: r-jina-feature-implementation
description: Complete implementation guide for adding r.jina.ai support to ClawChives bookmark manager. Adds human-only r.jina Conversion checkbox to bookmark modals, URL transformation, proxy fetching, and database storage. Use when implementing the r.jina.ai integration feature for ClawChives.
---

# R Jina Feature Implementation

## Overview

This skill provides a complete implementation guide for adding r.jina.ai support to the ClawChives bookmark manager application. The feature allows human users to toggle a "r.jina Conversion" checkbox when adding/editing bookmarks, which transforms URLs by prepending `https://r.jina.ai/` and stores the Jina URL for on-demand fetching.

**Core Philosophy:**
- **Humans** make explicit decisions about which URLs to convert (via checkbox)
- **Agents (lb-keys)** can READ Jina URLs but CANNOT create them (granular data control)
- **Storage strategy:** Store only the Jina URL (not content), fetch on-demand like regular URLs
- **Dual-layer UI:** Single-click for normal URL, right-click for r.jina.ai conversion option

**Key Features:**
- Human-only r.jina Conversion checkbox in bookmark modals
- URL transformation with `https://r.jina.ai/` prefix
- Jina URL stored in database, content fetched on-demand
- Dual-click UX: Left-click = normal URL, Right-click = Jina option
- Agent keys can READ bookmarks with jina_url but CANNOT toggle conversion
- No proxy endpoint needed (URLs fetched client-side via RestAdapter)

## Implementation Workflow

### 1. Database Schema Updates

**Task:** Add Jina URL field to bookmarks table and update TypeScript interfaces.

**When to use this skill:**
- Adding new database fields to existing tables
- Updating TypeScript interfaces for new data structures
- Creating database migration scripts

**Steps:**
1. Add `jina_url` column to bookmarks table (nullable TEXT)
2. Update TypeScript interfaces in `src/types/index.ts` and `src/services/types/index.ts`
3. Update server.js schema creation SQL

**Code Implementation:**

```sql
-- Add Jina URL field to bookmarks table
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT DEFAULT NULL;

-- Optional index for filtering by jina_url existence
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url) WHERE jina_url IS NOT NULL;
```

**Why minimal schema changes?**
- jina_url is optional (nullable)
- No content storage (URL only)
- No extra tables for caching/logging needed for MVP
- Single column = minimal database footprint

```typescript
// In src/types/index.ts and src/services/types/index.ts
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  favicon?: string;
  tags: string[];
  folderId?: string;
  starred: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt?: string;
  jinaUrl?: string; // NEW FIELD: Stores https://r.jina.ai/{original_url}
                     // Content is NOT stored; fetched on-demand via regular fetch()
}
```

**Storage Strategy:**
- ✅ Store ONLY the Jina URL (string, ~200 bytes per bookmark)
- ❌ Do NOT store fetched content in database
- Content is fetched on-demand when user selects "View r.jina" option
- This keeps the database lean and content always fresh

### 2. Frontend Component Updates

**Task:** Add r.jina Conversion checkbox to BookmarkModal and implement dual-click UX for BookmarkCard.

**When to use this skill:**
- Adding r.jina checkbox to BookmarkModal during creation/editing
- Implementing context menu (right-click) on BookmarkCard
- Fetching content on-demand when user selects Jina option

**Steps:**
1. Add checkbox UI to BookmarkModal
2. Implement state management for Jina conversion flag
3. Update BookmarkCard to show context menu on right-click
4. Add on-demand fetch logic for Jina URLs

**Code Implementation:**

```tsx
// ===== BookmarkModal.tsx =====
// Add to state
const [jinaConversion, setJinaConversion] = useState(false);

// Add checkbox UI (human-only, above save button)
{req.keyType === 'human' && (
  <div className="flex items-center gap-2 pt-4 border-t border-red-500/20 dark:border-red-500/30">
    <input
      type="checkbox"
      id="jinaConversion"
      checked={jinaConversion}
      onChange={(e) => setJinaConversion(e.target.checked)}
      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
    />
    <label htmlFor="jinaConversion" className="text-sm text-slate-700 dark:text-slate-300">
      🦞 r.jina.ai Conversion (on-demand fetch)
    </label>
  </div>
)}

// Update handleSave logic
const handleSave = async () => {
  // ... existing validation ...

  // Generate Jina URL if checkbox is checked
  let finalJinaUrl = null;
  if (jinaConversion && url) {
    // Validate URL is HTTP(S)
    try {
      new URL(url);
      finalJinaUrl = `https://r.jina.ai/${url}`;
    } catch {
      throw new Error("Invalid URL format");
    }
  }

  const bookmarkData: Bookmark = {
    // ... existing fields ...
    jinaUrl: finalJinaUrl, // Store only the URL, not content
  };

  onSave(bookmarkData);
};

// ===== BookmarkCard.tsx =====
// Add context menu handler
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();

  // Show context menu with options
  const menuOptions = [
    { label: "Open URL", action: () => window.open(bookmark.url, '_blank') },
  ];

  // If Jina URL exists, offer to open it
  if (bookmark.jinaUrl) {
    menuOptions.push({
      label: "Open r.jina.ai Version",
      action: () => window.open(bookmark.jinaUrl, '_blank')
    });
  } else if (hasHumanAccess) {
    // If no Jina URL but user is human, suggest converting
    menuOptions.push({
      label: "Convert to r.jina.ai (Edit bookmark)",
      action: () => openEditModal(bookmark)
    });
  }

  // Show menu at cursor position
  showContextMenu(e.clientX, e.clientY, menuOptions);
};

// Apply to bookmark card
<div
  onClick={() => window.open(bookmark.url, '_blank')}
  onContextMenu={handleContextMenu}
  className="cursor-pointer hover:opacity-80"
>
  {/* Card content */}
</div>
```

**UX Flow:**
```
User sees bookmark in dashboard
  ↓
Single-click → Opens original URL (normal behavior)
  ↓
Right-click → Context menu:
  - "Open URL" → original bookmark.url
  - "Open r.jina.ai Version" → bookmark.jinaUrl (if exists)
  - "Convert to r.jina.ai" → Opens edit modal (if user is human)
```

### 3. Backend API Development

**Task:** Update bookmark endpoints to store Jina URLs. NO proxy endpoint needed—content fetched client-side.

**When to use this skill:**
- Updating existing bookmark POST/PUT endpoints to handle jina_url field
- Adding validation for Jina URL format
- Ensuring agent keys can READ but NOT CREATE/UPDATE jina_url

**Key Insight:**
- ❌ DO NOT create `/api/proxy/jina` endpoint
- ✅ Jina URLs are fetched client-side (browser fetch to r.jina.ai)
- ✅ Server only stores the jina_url string in database
- ✅ Agent keys cannot set jina_url (requireHuman check on bookmark creation)

**Steps:**
1. Update BookmarkSchemas to include jinaUrl field
2. Update POST /api/bookmarks to accept jinaUrl (human-only validation)
3. Update PUT /api/bookmarks/:id to accept jinaUrl (human-only validation)
4. No new endpoints needed

**Code Implementation:**

```javascript
// Update src/validation/schemas.js
const BookmarkSchemas = {
  create: {
    properties: {
      url: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      folderId: { type: ['string', 'null'] },
      starred: { type: 'boolean' },
      archived: { type: 'boolean' },
      jinaUrl: {
        type: ['string', 'null'],
        pattern: '^https://r\\.jina\\.ai/', // Validate format
        description: 'Optional Jina URL (human-only, must start with https://r.jina.ai/)'
      }
    },
    required: ['url', 'title'],
    additionalProperties: false
  },
  update: {
    properties: {
      // ... existing fields ...
      jinaUrl: {
        type: ['string', 'null'],
        pattern: '^https://r\\.jina\\.ai/',
        description: 'Optional Jina URL (human-only)'
      }
    },
    additionalProperties: false
  }
};

// Update POST /api/bookmarks endpoint (in server.js)
app.post('/api/bookmarks', requireAuth, validateBody(BookmarkSchemas.create), async (req, res) => {
  const { userUuid, keyType, agentPermissions } = req;

  // Check: Only humans can set jinaUrl
  if (req.body.jinaUrl && keyType !== 'human') {
    return res.status(403).json({
      success: false,
      error: 'Agent keys cannot create bookmarks with r.jina.ai conversion. Only human users can set jinaUrl.'
    });
  }

  try {
    const bookmarkId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Validate jinaUrl format if provided
    if (req.body.jinaUrl) {
      try {
        new URL(req.body.jinaUrl);
        if (!req.body.jinaUrl.startsWith('https://r.jina.ai/')) {
          throw new Error('Invalid format');
        }
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid jinaUrl format. Must start with https://r.jina.ai/'
        });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO bookmarks (
        id, user_uuid, url, title, description, favicon, tags,
        folder_id, starred, archived, color, created_at, updated_at, jina_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      bookmarkId,
      userUuid,
      req.body.url,
      req.body.title,
      req.body.description || '',
      req.body.favicon || '',
      JSON.stringify(req.body.tags || []),
      req.body.folderId || null,
      req.body.starred ? 1 : 0,
      req.body.archived ? 1 : 0,
      req.body.color || null,
      now,
      now,
      req.body.jinaUrl || null  // NEW FIELD
    );

    res.status(201).json({ success: true, data: { id: bookmarkId, ...req.body, createdAt: now } });
  } catch (error) {
    console.error('Bookmark creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Similar update for PUT /api/bookmarks/:id
// (follows same pattern: requireAuth, human-only check for jinaUrl changes)
```

### 4. Security & Permission Controls

**Task:** Implement human-only access control for jinaUrl creation/updates. Agents can READ jina_url field but NOT set it.

**When to use this skill:**
- Adding jinaUrl human-only checks to bookmark endpoints
- Validating Jina URL format
- Ensuring proper audit logging

**Key Security Model:**
```
Humans (keyType='human'):
  ✅ Can CREATE bookmarks with jinaUrl
  ✅ Can UPDATE jinaUrl on existing bookmarks
  ✅ Can DELETE bookmarks with jinaUrl
  ✅ Can READ all bookmarks (including those with jinaUrl)

Agents (keyType='lb-*'):
  ❌ CANNOT CREATE bookmarks with jinaUrl
  ❌ CANNOT UPDATE jinaUrl field
  ✅ CAN READ bookmarks (and see jinaUrl field in response)
  ✅ Can fetch from jinaUrl on client-side if present
```

**Steps:**
1. Add `requireHuman` check to bookmark POST/PUT endpoints (if jinaUrl provided)
2. Validate Jina URL format in schemas
3. Add audit logging for jinaUrl changes
4. Ensure agent keys cannot bypass restrictions

**Code Implementation:**

```javascript
// CRITICAL: In POST /api/bookmarks and PUT /api/bookmarks/:id

// Check: Only humans can set jinaUrl
if (req.body.jinaUrl && req.keyType !== 'human') {
  return res.status(403).json({
    success: false,
    error: 'Agent keys cannot set r.jina.ai conversion. Only human users can manage jinaUrl.'
  });
}

// Validate jinaUrl format
if (req.body.jinaUrl) {
  if (!req.body.jinaUrl.startsWith('https://r.jina.ai/')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid jinaUrl. Must start with https://r.jina.ai/'
    });
  }

  // Validate the URL is properly formatted
  try {
    new URL(req.body.jinaUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid jinaUrl format'
    });
  }
}

// Audit logging (add to auditLogger)
if (req.body.jinaUrl && req.keyType === 'human') {
  auditLogger.log({
    event: 'bookmark_jina_conversion_set',
    user_uuid: req.userUuid,
    bookmark_id: bookmarkId,
    jina_url: req.body.jinaUrl,
    timestamp: new Date().toISOString()
  });
}

// GET /api/bookmarks response includes jinaUrl (no filtering)
// This allows agents to READ jina_url but they cannot SET it
```

**Rate Limiting Note:**
Your existing `apiLimiter` and `authLimiter` (in src/middleware/rateLimiter.js) already handle:
- `authLimiter`: Prevents brute-force on /api/auth/* endpoints (login, register)
- `apiLimiter`: General rate limit on all /api/* routes

**r.jina.ai feature does NOT need additional rate limiting** because:
- Content is fetched client-side (not server-side proxy)
- No new endpoints are added
- Existing apiLimiter protects bookmark creation/updates
- Agent keys already have strict permissions

### 5. CSP Configuration (CRITICAL)

**Task:** Update Content Security Policy to allow client-side fetches to r.jina.ai

**⚠️ WITHOUT THIS CHANGE, THE FEATURE WILL NOT WORK!**

The ClawChives API server uses Helmet.js to set CSP headers. The current `connectSrc` directive only allows connections to `'self'`, `wss:`, and `ws:`, which **BLOCKS** client-side `fetch()` calls to `https://r.jina.ai`.

**Current Configuration (server.js ~line 730):**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],  // ❌ BLOCKS r.jina.ai
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Required Update:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://r.jina.ai"],  // ✅ ALLOWS r.jina.ai
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Why This Is Necessary:**

1. **Client-Side Fetch:** When the browser executes `fetch('https://r.jina.ai/...')`, it checks the CSP `connect-src` directive
2. **Browser Enforcement:** If r.jina.ai is not in the allowed list, the browser BLOCKS the request with a CSP violation error
3. **Console Error:** You'll see: `Refused to connect to 'https://r.jina.ai/...' because it violates the following Content Security Policy directive: "connect-src 'self' wss: ws:"`

**What connect-src Controls:**
- `fetch()` requests
- `XMLHttpRequest` (legacy AJAX)
- `WebSocket` connections
- `EventSource` (Server-Sent Events)

**Security Implications:**
- ✅ **Safe:** r.jina.ai is a legitimate service designed for client-side use
- ✅ **Scoped:** Only allows connections to r.jina.ai, not arbitrary domains
- ✅ **No CORS bypass:** This doesn't affect your API's CORS (which controls INBOUND requests to your server)

**Testing CSP Configuration:**

```javascript
// Test in browser console after updating CSP
fetch('https://r.jina.ai/https://example.com')
  .then(res => res.text())
  .then(content => console.log('✅ CSP allows r.jina.ai:', content.substring(0, 100)))
  .catch(err => console.error('❌ CSP blocked r.jina.ai:', err));
```

**Common Mistakes to Avoid:**

❌ **DON'T** add `https:` to `connectSrc` (allows ALL HTTPS domains)
```javascript
connectSrc: ["'self'", "https:"]  // TOO PERMISSIVE
```

✅ **DO** add specific domain only:
```javascript
connectSrc: ["'self'", "wss:", "ws:", "https://r.jina.ai"]  // CORRECT
```

---

### 6. Testing & Verification

**Task:** Test jinaUrl field storage, human-only validation, and client-side fetching.

**When to use this skill:**
- Testing bookmark creation with jinaUrl
- Testing agent key restrictions
- Testing client-side fetch of Jina URLs
- Manual testing of context menu UX

**Steps:**
1. Test POST /api/bookmarks with jinaUrl (human should succeed, agent should fail)
2. Test PUT /api/bookmarks/:id with jinaUrl changes
3. Test Jina URL validation (format check)
4. Test GET /api/bookmarks returns jinaUrl field
5. Test browser fetch to r.jina.ai works client-side
6. Test context menu UX (right-click on bookmark)

**Test Examples:**

```javascript
// Test 1: Human can create bookmark with jinaUrl
test('Human user can create bookmark with jinaUrl', async () => {
  const response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer human-api-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://example.com',
      title: 'Example',
      jinaUrl: 'https://r.jina.ai/https://example.com'
    })
  });
  expect(response.status).toBe(201);
  const data = await response.json();
  expect(data.data.jinaUrl).toBe('https://r.jina.ai/https://example.com');
});

// Test 2: Agent key CANNOT create bookmark with jinaUrl
test('Agent key cannot set jinaUrl on bookmark creation', async () => {
  const response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer lb-agent-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://example.com',
      title: 'Example',
      jinaUrl: 'https://r.jina.ai/https://example.com'
    })
  });
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toContain('Agent keys cannot set r.jina');
});

// Test 3: Agent can READ bookmarks with jinaUrl
test('Agent key can READ bookmarks with jinaUrl', async () => {
  const response = await fetch('/api/bookmarks', {
    headers: {
      'Authorization': 'Bearer lb-agent-key'
    }
  });
  expect(response.status).toBe(200);
  const data = await response.json();
  // Verify jinaUrl field is included in response
  if (data.data.some(b => b.jinaUrl)) {
    expect(data.data.find(b => b.jinaUrl).jinaUrl).toMatch(/^https:\/\/r\.jina\.ai\//);
  }
});

// Test 4: Invalid jinaUrl format is rejected
test('Invalid jinaUrl format is rejected', async () => {
  const response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer human-api-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://example.com',
      title: 'Example',
      jinaUrl: 'https://example.com'  // Missing r.jina.ai prefix
    })
  });
  expect(response.status).toBe(400);
});

// Test 5: Client-side fetch of Jina URL (browser console test)
test('Browser can fetch from r.jina.ai URL', async () => {
  const jinaUrl = 'https://r.jina.ai/https://example.com';
  const response = await fetch(jinaUrl);
  expect(response.ok).toBe(true);
  const content = await response.text();
  expect(content.length).toBeGreaterThan(0);
});
```

## Key Design Decisions (Refined from v1)

### What Changed?

| Aspect | Original Design | Refined Design | Why? |
|--------|-----------------|-----------------|------|
| **Storage** | Store both URL + content in DB | Store URL only | Keeps DB lean, content always fresh |
| **Proxy Endpoint** | Server-side `/api/proxy/jina` | Client-side fetch | Reduces server load, simpler architecture |
| **Agent Access** | Full restrictions on agents | Agents can READ, not CREATE | Agents need access to data they manage |
| **Rate Limiting** | New r.jina-specific limits | Use existing apiLimiter | No new endpoints = no new limits needed |
| **Caching** | Content caching in DB | No caching | URLs are short, content fetched on-demand |
| **Database** | Multi-table schema (logs, config, cache) | Single column (jina_url) | MVP: only store the URL, nothing else |
| **UI** | Checkbox only | Dual-click context menu | Better UX: left-click normal, right-click jina |

### Minimal MVP Checklist (Phase 1)

✅ **Must Have:**
- [ ] **🔥 CRITICAL:** Add `https://r.jina.ai` to CSP `connectSrc` in server.js (~line 730)
- [ ] Add `jina_url` column to bookmarks table (server.js schema migration)
- [ ] Update Bookmark TypeScript interface (src/types/index.ts + src/services/types/index.ts)
- [ ] Add jinaUrl checkbox to BookmarkModal (human-only, conditional render)
- [ ] Update POST /api/bookmarks to handle jinaUrl (validation + human-only check)
- [ ] Update PUT /api/bookmarks/:id to handle jinaUrl (validation + human-only check)
- [ ] Update BookmarkSchemas validation (src/validation/schemas.js - jinaUrl field)
- [ ] Update GET /api/bookmarks to return jinaUrl (already automatic with new column)
- [ ] Add context menu to BookmarkCard (right-click handler with Jina option)
- [ ] Test CSP allows fetch to r.jina.ai (browser console test)
- [ ] Test human can create/edit jinaUrl (POST/PUT with human token)
- [ ] Test agent cannot create/edit jinaUrl (POST/PUT with lb- key, expect 403)
- [ ] Test agent can READ jinaUrl field (GET with lb- key, verify field present)
- [ ] Test invalid jinaUrl format rejected (POST with wrong URL format, expect 400)

❌ **Skip for MVP (Phase 2+):**
- Caching system
- Audit logging tables
- Configuration endpoints
- Separate rate limiting
- Content storage
- Advanced filtering
- Batch operations

## Troubleshooting

### Issue 1: "Refused to connect to 'https://r.jina.ai'" (CSP Error)

**Symptom:** Browser console shows CSP violation error when trying to fetch Jina URLs

**Error Message:**
```
Refused to connect to 'https://r.jina.ai/https://example.com' because it violates
the following Content Security Policy directive: "connect-src 'self' wss: ws:"
```

**Solution:**
1. Check server.js line ~730 for Helmet CSP configuration
2. Verify `connectSrc` includes `"https://r.jina.ai"`
3. Restart API server after changes (docker-compose restart claw-chives-api)
4. Hard refresh browser (Ctrl+Shift+R) to clear CSP cache

**Verification:**
```javascript
// Run in browser console
fetch('https://r.jina.ai/https://example.com')
  .then(res => console.log('✅ CSP allows r.jina.ai'))
  .catch(err => console.error('❌ CSP blocked:', err));
```

---

### Issue 2: Agent Key Creating Bookmark with jinaUrl (403 Expected)

**Symptom:** Agent successfully creates bookmark with jinaUrl when it should be blocked

**Root Cause:** Missing human-only check in POST /api/bookmarks

**Solution:**
Add this check BEFORE database insertion in server.js:
```javascript
if (req.body.jinaUrl && req.keyType !== 'human') {
  return res.status(403).json({
    success: false,
    error: 'Agent keys cannot set r.jina.ai conversion.'
  });
}
```

---

### Issue 3: jinaUrl Not Saved to Database

**Symptom:** Checkbox works in UI but jinaUrl field is null in database

**Possible Causes:**
1. Column not added to database (check: `SELECT * FROM pragma_table_info('bookmarks') WHERE name='jina_url';`)
2. INSERT statement missing jina_url field
3. Validation rejecting jinaUrl (check browser Network tab for 400 errors)

**Solution:**
```sql
-- Check if column exists
SELECT * FROM pragma_table_info('bookmarks') WHERE name='jina_url';

-- If missing, add it
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT DEFAULT NULL;
```

---

### Issue 4: Context Menu Not Appearing on Right-Click

**Symptom:** Right-clicking bookmark card doesn't show context menu

**Root Cause:** Default browser context menu not prevented

**Solution:**
Ensure `handleContextMenu` calls `e.preventDefault()` FIRST:
```javascript
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();  // ← CRITICAL: Must be first line
  // ... rest of handler
};
```

---

### Issue 5: CORS Error When Fetching from r.jina.ai

**Symptom:** Browser shows CORS error when opening Jina URL

**Important:** This is a **browser limitation**, not a ClawChives bug:
- Browsers may block `fetch()` to r.jina.ai if user navigates away during fetch
- Use `window.open(bookmark.jinaUrl, '_blank')` instead for best UX
- r.jina.ai's CORS policy allows browser requests, but timing matters

**Recommended Implementation:**
```javascript
// ✅ CORRECT: Open in new tab (no CORS issue)
action: () => window.open(bookmark.jinaUrl, '_blank')

// ❌ AVOID: Fetch in background then display (may hit CORS timing issues)
action: async () => {
  const response = await fetch(bookmark.jinaUrl);  // May fail
  const content = await response.text();
  showModal(content);
}
```

---

## Resources

### references/
Documentation and reference material:

- **API-Documentation.md** - REST API specifications (to be updated with jinaUrl field details)
- **Frontend-Implementation-Guide.md** - Step-by-step frontend implementation
- **Security-Guidelines.md** - Human-only access control and security measures
- **Testing-Strategy.md** - Comprehensive testing approach
- **Troubleshooting-Guide.md** - Common issues and solutions

### assets/
UI templates and configuration files:

- **Documentation/** - Implementation checklists and deployment guides