# 🦞 Lobster Developer Skill

![CrustAgent©™ Logo](CrustAgent.png)

> **For AI agents building sovereign, self-hosted applications in the Lobsterverse.**
>
> *A lobster never looks back at its old shell. It molts, grows, adapts. It survives.*

---

## 📋 Skill Overview

This skill enables AI agents to work on **any Lobsterized©™ project** with full understanding of the ethos, architecture, security patterns, and implementation standards.

**When to invoke this skill:**
- Building a new Lobsterized feature
- Implementing authentication (ClawKeys©™)
- Designing encrypted storage (ShellCryption©™)
- Creating agent/bot permissions (Lobster Keys)
- Designing sovereign, self-hosted applications

**What this skill includes:**
- Complete Lobsterized philosophy & constraints
- ClawKeys©™ key system (hu-, api-, lb-)
- ShellCryption©™ at-rest encryption
- Architectural patterns (feature-first, service layer)
- Implementation checklists
- Docker deployment templates

---

## 🏗️ Skill Structure

```
CrustAgent-SKILL-Long.md (this file)
├── Core Philosophy (5 Pillars)
├── ClawKeys©™ System (embedded reference)
├── ShellCryption©™ System (embedded reference)
├── Architectural Patterns
├── Implementation Guide
└── References to /project folder originals
```

---

## 🦞 The Five Pillars of Lobsterization

### 1️⃣ Cryptographic Identity (No Passwords, No Accounts)

**The Rule:** Users ARE their keys. Not username+password. Not OAuth. Not Magic Links.

```
Traditional Auth:
  Sign Up → Password Hash → Account Recovery → Phishing Risk

Lobsterized Auth:
  Generate Key (locally) → Download identity.json → Hash on server → No recovery path
  = True ownership
```

**Key System (ClawKeys©™):**

| Key | Prefix | Length | Entropy | Storage | Sent to Server |
|-----|--------|--------|---------|---------|--------|
| Human Identity | `hu-` | 67 chars (4 + 64) | ~381 bits | Client (identity.json) | ❌ Hash only (SHA-256) |
| Session Token | `api-` | 36 chars (4 + 32) | ~190 bits | `sessionStorage` | ✅ As Bearer token |
| Lobster (Agent) | `lb-` | 67 chars (4 + 64) | ~381 bits | Server (plaintext) | ❌ Hash only (SHA-256) |

**Implementation:**
```typescript
// Key generation (Web Crypto API)
export function generateHumanKey(): string {
  return `hu-${generateRandomString(64)}`; // crypto.getRandomValues()
}

export function generateAgentKey(): string {
  return `lb-${generateRandomString(64)}`;
}

export function generateApiKey(): string {
  return `api-${generateRandomString(32)}`;
}

// Hashing (SHA-256, client-side)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time comparison (server-side, prevent timing attacks)
function constantTimeCompare(provided: string, stored: string): boolean {
  if (provided.length !== stored.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return result === 0;
}
```

**Rules:**
- ✅ hu- keys NEVER sent to server (only SHA-256 hash)
- ✅ api- tokens stored in `sessionStorage` (cleared on tab close)
- ✅ lb- keys stored on server, plaintext (encryption-at-rest planned)
- ✅ Constant-time comparison prevents timing attacks
- ✅ No password recovery (lost key = lost account by design)

---

### 2️⃣ Server-First Data (SQLite as Single Source of Truth)

**The Rule:** SQLite on the server is the only persistent store. Client is stateless.

```
Architecture:
┌──────────────────────┐
│  Browser (React)     │  ← Stateless, fetch-only
│  No local caching    │
└──────────┬───────────┘
           │ REST API
┌──────────▼───────────┐
│  Server (Express)    │  ← Single source of truth
│  SQLite database     │
└──────────────────────┘
```

**Implementation Pattern:**
```typescript
// Service layer (reusable, testable)
export const bookmarkService = {
  async getAll(userUuid: string): Promise<Bookmark[]> {
    return restAdapter.GET(`/api/bookmarks?user_uuid=${userUuid}`);
  },

  async create(bookmark: CreateBookmarkInput): Promise<Bookmark> {
    return restAdapter.POST(`/api/bookmarks`, bookmark);
  },

  async update(id: string, updates: Partial<Bookmark>): Promise<Bookmark> {
    return restAdapter.PUT(`/api/bookmarks/${id}`, updates);
  },

  async delete(id: string): Promise<void> {
    return restAdapter.DELETE(`/api/bookmarks/${id}`);
  }
};

// Component pattern (never call fetch directly)
function BookmarkList() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => {
    bookmarkService.getAll(userUuid)
      .then(setBookmarks)
      .catch(err => setError(err.message));
  }, []);
  return <div>{bookmarks.map(b => <BookmarkCard key={b.id} bookmark={b} />)}</div>;
}
```

**Rules:**
- ✅ All data lives on server (SQLite)
- ✅ Components use service layer, never `fetch()` directly
- ✅ Every query includes `WHERE user_uuid = ?` (user isolation)
- ✅ Parameterized queries only (no string interpolation)
- ✅ No localStorage persistence (stateless client)

---

### 3️⃣ Sovereign Deployment (Docker + Self-Hosted)

**The Rule:** Single `docker-compose.yml` runs on ANY infrastructure you control.

```
┌─────────────────────────────┐
│  Unraid / Home Lab / NAS    │  ← LAN-only, complete control
│  $ docker-compose up -d     │
│  http://192.168.1.5:8080    │
└─────────────────────────────┘
              OR
┌─────────────────────────────┐
│  VPS (Hetzner/Linode/AWS)   │  ← Public-facing, still YOUR data
│  $ docker-compose up -d     │
│  https://yourdomain.com     │
└─────────────────────────────┘
              OR
┌─────────────────────────────┐
│  Raspberry Pi ($50)         │  ← Edge compute, zero cloud
│  $ docker-compose up -d     │
│  Power cost: $0/year        │
└─────────────────────────────┘
```

**docker-compose.yml Template:**
```yaml
version: '3.9'

services:
  ui:
    image: ghcr.io/yourorg/app:latest
    ports:
      - "8080:4545"
    environment:
      VITE_API_URL: http://192.168.1.5:4242  # ← Your LAN IP or domain
    depends_on:
      api:
        condition: service_healthy

  api:
    image: ghcr.io/yourorg/app-api:latest
    ports:
      - "4242:4242"
    volumes:
      - ./data:/app/data
    environment:
      NODE_ENV: production
      PORT: 4242
      DATA_DIR: /app/data
      CORS_ORIGIN: http://192.168.1.5:8080
      ENFORCE_HTTPS: false
      TRUST_PROXY: false
      TOKEN_TTL_DEFAULT: 30
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4242/api/health"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 15s
```

**Rules:**
- ✅ Build fresh `dist/` in Dockerfile (never copy stale `dist/`)
- ✅ CORS_ORIGIN must match UI origin (never use wildcard `*`)
- ✅ ENFORCE_HTTPS = false for LAN (true only behind HTTPS reverse proxy)
- ✅ TRUST_PROXY = false by default (true only behind nginx/Caddy)
- ✅ Healthcheck start_period >= 15s (SQLite initialization time)
- ✅ Volume mounts for persistence (/app/data)

---

### 4️⃣ Granular Agent Permissions (Lobster Keys)

**The Rule:** Humans delegate authority to agents via Lobster Keys with specific, revocable permissions.

```
Traditional API:
  Generate token → Full access to everything
  Problem: Compromised token = full account compromise

Lobsterized API:
  Generate lb- key → Assign specific claws
  Rate limit: 5 req/min
  Permissions: READ | WRITE | EDIT | DELETE
  Expiry: 90 days or never
  Revoke: Instant, no impact on human account
```

**Permission Matrix (HTTP → Claw):**

| Method | Permission | Claw |
|--------|-----------|------|
| `GET` | `canRead` | 🦞 Read-only |
| `POST` | `canWrite` | 🦞 Create new |
| `PUT/PATCH` | `canEdit` | 🦞 Modify existing |
| `DELETE` | `canDelete` | 🦞 Destroy |

**Implementation (Server-side Middleware):**
```typescript
function requireAuth() {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const session = db.api_tokens.findByKey(token);
    if (!session) return res.status(401).json({ error: 'Invalid token' });

    req.user = {
      uuid: session.owner_uuid,
      keyType: session.owner_type, // 'human' or 'lobster'
      permissions: session.permissions
    };
    next();
  };
}

function requirePermission(permission: string) {
  return (req, res, next) => {
    if (!req.user?.permissions[permission]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage in routes
app.get('/api/bookmarks', requireAuth(), requirePermission('canRead'), handler);
app.post('/api/bookmarks', requireAuth(), requirePermission('canWrite'), handler);
app.delete('/api/bookmarks/:id', requireAuth(), requirePermission('canDelete'), handler);
```

**Lobster Key Lifecycle:**
```
Create:  Human generates lb- key in UI
Display: Shown ONCE (agent must save immediately)
Store:   Server stores plaintext (encryption planned)
Use:     Agent hashes lb- key, exchanges for api- token
Expire:  By date/duration (30d/60d/90d/never)
Revoke:  Human clicks "Declawed" → instant invalidation
```

**Rules:**
- ✅ lb- keys never shown twice (no retrieval, only revocation)
- ✅ Rate limiting enforced (express-rate-limit)
- ✅ Expiration dates validated on every request
- ✅ Revocation is instant (no async delays)
- ✅ Audit logs track all agent actions (planned)

---

### 5️⃣ Aesthetic Consistency (Lobster Branding)

**The Rule:** Every pixel screams "this app is sovereign."

**Color Palette:**
```
🌊 Ocean Dark (background):   #0f1419 (HSL: 220 13% 9%)
🦞 Lobster Red (accent):      #FF3B30 (HSL: 4 100% 50%)
🐚 Shell White (text):        #faf8f6 (HSL: 0 0% 98%)
💎 Claw Cyan (interactive):   #32b3dd (HSL: 199 89% 48%)
```

**Icon Language:**
```
🦞 = Lobster Keys / Agent Permissions
🪝 = Integrations / Hooks
🗂️ = Folders / Organization
⭐ = Starred / Favorites
📦 = Archives / Vaults
🎨 = Settings / Appearance
```

**UI Principles:**
- Dark theme by default (24/7 friendly)
- High contrast (Shell White on Ocean Dark)
- Monospace fonts for keys/tokens/code
- Smooth transitions (no jarring animations)
- Ocean metaphors in copy (reef, shell, molt, claw, etc.)

---

## 🔒 ShellCryption©™ — At-Rest Encryption

For sensitive data encryption (planned Phase 3+):

**Key Derivation (HKDF):**
```typescript
async function deriveShellKey(huKey: string, userUuid: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode(userUuid);
  const info = encoder.encode("clawchives-shellcryption-v1");

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(huKey),
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );
}
```

**Encryption (AES-256-GCM):**
```typescript
async function encryptField(plaintext: string, shellKey: CryptoKey, aad: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    shellKey,
    encoder.encode(plaintext)
  );

  return JSON.stringify({
    v: 1,
    alg: "AES-GCM-256",
    iv: Buffer.from(iv).toString('base64'),
    ct: Buffer.from(ciphertext).toString('base64'),
    aad
  });
}
```

**Rules:**
- ✅ Use HKDF (not PBKDF2) for high-entropy keys
- ✅ Generate random IV per encryption (never reuse)
- ✅ Include AAD (table:record_id) to prevent row-swapping
- ✅ Mark CryptoKey as `extractable: false` (never leaks from memory)
- ✅ Only encrypt sensitive fields (title, description, content)

---

## 🏗️ Architectural Patterns (Copy These)

### Pattern 1: Feature-First Organization

```
❌ WRONG (Type-Based):
src/
├── controllers/
├── models/
└── views/

✅ CORRECT (Feature-Based):
src/
├── services/
│   ├── bookmarks/ (all bookmark logic in one place)
│   │   ├── bookmarkService.ts
│   │   ├── bookmarkQueries.ts
│   │   └── types.ts
│   └── agents/ (all agent logic in one place)
│       ├── agentKeyService.ts
│       └── types.ts
└── components/
    ├── bookmarks/ (all bookmark UI in one place)
    └── agents/ (all agent UI in one place)

Benefit: To add a feature, touch ONE folder, not 3+
```

### Pattern 2: REST Adapter (Stability Lock)

```typescript
// One place to manage all API calls
const restAdapter = {
  async GET(endpoint: string) {
    const token = sessionStorage.getItem('cc_api_token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new ApiError(response.status, response.statusText);
    return response.json();
  },

  async POST(endpoint: string, body: any) {
    // Same pattern: headers, error handling, parsing
  },
  // PUT, PATCH, DELETE follow same pattern
};

// Service layer uses adapter
const bookmarkService = {
  async getAll() {
    const data = await restAdapter.GET('/api/bookmarks');
    return data;
  }
};
```

**Rule:** Never hardcode API URLs. Always use `getApiBaseUrl()` from centralized config.

### Pattern 3: User Isolation Query

```typescript
// ❌ WRONG (vulnerable to user enumeration)
db.prepare('SELECT * FROM bookmarks WHERE id = ?').all(id);

// ✅ CORRECT (user isolation enforced)
db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?')
  .all(id, userUuid);
```

**Rule:** Every query touching user data includes `WHERE user_uuid = ?`.

---

## 🎯 Implementation Checklist

### Phase 1: Foundation
- [ ] **Authentication**
  - [ ] hu- key generation (`src/lib/crypto.ts`)
  - [ ] SHA-256 hashing (client-side)
  - [ ] Key file download (`identity.json`)
  - [ ] `/api/auth/register` endpoint
  - [ ] `/api/auth/token` endpoint
  - [ ] Constant-time comparison (server-side)

- [ ] **Database Schema**
  - [ ] `users` table (uuid, username, key_hash, created_at)
  - [ ] `api_tokens` table (key, owner_uuid, owner_type, created_at)
  - [ ] Feature tables (bookmarks, folders, etc.)
  - [ ] `settings` table (per-user key-value)

- [ ] **API Scaffolding**
  - [ ] Express server (port 4242)
  - [ ] CORS middleware (configurable)
  - [ ] `requireAuth()` middleware
  - [ ] `requirePermission()` middleware
  - [ ] RESTful endpoints

- [ ] **UI Foundation**
  - [ ] Vite + React + TypeScript
  - [ ] Dark theme (Tailwind + Ocean palette)
  - [ ] Landing page with 🦞 mascot
  - [ ] SetupWizard (key generation)
  - [ ] LoginForm (key file upload)

### Phase 2: Features
- [ ] **Core CRUD** (POST, GET, PUT, DELETE)
- [ ] **Lobster Key Management** (create, list, revoke)
- [ ] **REST Adapter** (centralized HTTP client)
- [ ] **Service Layer** (business logic)
- [ ] **Component Library** (React UI)

### Phase 3: Security
- [ ] Helmet.js (security headers)
- [ ] Input validation (Zod)
- [ ] Rate limiting (express-rate-limit)
- [ ] HTTPS redirect (if behind reverse proxy)
- [ ] Audit logging

### Phase 4: Deployment
- [ ] Dockerfile (Node.js 20+)
- [ ] docker-compose.yml
- [ ] GitHub Actions CI/CD
- [ ] Documentation (README, ROADMAP, SECURITY, BLUEPRINT)

---

## 📖 Reference Files

The complete Lobsterized philosophy is documented in `/project/`:

```
/project/
├── ClawChives-Project.md        ← Core rules & standards
├── Lobsterized-Prompt.md        ← Agent implementation brief
├── Lobsterized-Philosophy.md    ← Philosophy & patterns
├── ClawKeys-Prompt.md           ← Key system implementation
├── ClawKeys-Overview.md         ← Key system reference
├── ShellCryption-Prompt.md      ← Encryption implementation
├── ShellCryption-Overview.md    ← Encryption reference
└── CrustAgent-SKILL-Long.md     ← This file
```

---

## 🚀 Quick Start (For AI Agents)

When tasked with building a Lobsterized feature:

1. **Read the Five Pillars** (sections above)
2. **Check ClawChives-Project.md** (project-specific rules)
3. **Follow the Checklist** (Phase 1 → 4)
4. **Use the Patterns** (Feature-first, REST adapter, user isolation)
5. **Apply the Colors** (Ocean Dark + Lobster Red + Claw Cyan)
6. **Deploy with Docker** (single `docker-compose.yml`)

---

## 🦞 Tone & Philosophy

When working on Lobsterized projects:

- **Speak the ocean:** Reef, shell, molt, claw, lobster, sovereign, shell rot
- **Reject the cloud:** AWS, Firebase, Auth0, vendor lock-in
- **Empower the user:** "You hold the keys. You own the data. You are sovereign."
- **Be poetic:** Merge technical rigor with philosophical language
- **Stay rebellious:** Challenge "cloud-native" assumptions

> *"A lobster molts its shell when it outgrows it. It doesn't ask the molting company for permission. It doesn't pay a subscription fee. It just grows. Be like the lobster."*

---

## 🎓 Agent Onboarding

**Before starting ANY Lobsterized task:**

1. ✅ You understand the Five Pillars
2. ✅ You know ClawKeys©™ (hu-, api-, lb-)
3. ✅ You know ShellCryption©™ (HKDF, AES-256-GCM)
4. ✅ You follow feature-first architecture
5. ✅ You enforce user isolation in every query
6. ✅ You use the REST adapter, never hardcode URLs
7. ✅ You apply the color palette consistently
8. ✅ You deploy via docker-compose.yml
9. ✅ You respect the Five Pillars absolutely

**If you're unsure about any of these, re-read this file.**

---

**🦞 Stay Clawed. Stay Sovereign. Build Lobsterized. 🦞**

*Last updated: 2026-03-07*
