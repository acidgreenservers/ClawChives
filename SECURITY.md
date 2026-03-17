# 🛡️ Security Policy — ClawChives

[![Security](https://img.shields.io/badge/Security-Key%20Based%20Auth-red?style=for-the-badge)](#)
[![Reporting](https://img.shields.io/badge/Reporting-Responsible%20Disclosure-orange?style=for-the-badge)](#)

---

## 📋 Table of Contents

<details>
<summary>Click to expand</summary>

- [Security Model Overview](#-security-model-overview)
- [Security Practices](#-security-practices)
- [Database Encryption](#-database-encryption)
- [Known Limitations](#️-known-limitations)
- [Attack Surface & Threat Model](#-attack-surface--threat-model)
- [Reporting a Vulnerability](#-reporting-a-vulnerability)
- [Self-Hosted Hardening Checklist](#️-self-hosted-hardening-checklist)

</details>

---

## 🔑 Security Model Overview

ClawChives uses a **key-file identity system** — there are no passwords or accounts on a remote server.

```
┌──────────────────────────────────────────────────────────┐
│  Identity Key File: clawchives_identity_key.json         │
│                                                          │
│  {                                                       │
│    "username": "your-username",                          │
│    "uuid":     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",   │
│    "token":    "hu-[64 random chars]"                    │
│  }                                                       │
│                                                          │
│  ⚠️  This file IS your password. Losing it = lockout.   │
│  ⚠️  Never share it. Never commit it to version control. │
└──────────────────────────────────────────────────────────┘
```

### Key Types

| Prefix | Type | Scope | Storage |
|---|---|---|---|
| `hu-` | Human Identity Key | One-Field login lookup | Server DB (`key_hash` UNIQUE index) |
| `lb-` | Agent Key | Automated agent access | Server DB (`agent_keys` table) |
| `api-` | REST Token | API session access | Server DB (`api_tokens` table) |

> [!TIP]
> See [BLUEPRINT.md § Key System Architecture](./BLUEPRINT.md) for full technical details on key generation, storage, and rotation.

---

## 🔒 Security Practices

<details>
<summary>Client-Side (Session Memory)</summary>

- `hu-` tokens are **never stored in plaintext** and are never sent to the server.
- The `hu-` string is immediately hashed on the client using SHA-256 and exchanged via `POST /api/auth/token` for a short-lived `api-` bearer token.
- `sessionStorage` is used for session state (`cc_authenticated`, `cc_view`) — clears automatically on tab close to prevent token theft.

</details>

<details>
<summary>Server-Side (Express & SQLite)</summary>

- **`requireAuth`**: Validates the `api-` token via the SQLite `api_tokens` table. It immediately injects `req.agentPermissions` for downstream handlers based on whether the token belongs to a human or an `lb-` agent key.
- **`requireHuman`**: Restricts sensitive configuration routes (`/api/settings`, `/api/agent-keys`) to human tokens only. Lobster keys cannot mutate system configuration.
- **Key Uniqueness**: `key_hash` is strictly enforced as `UNIQUE` to support collision-free one-field lookups.
- **`requirePermission(action)`**: Generates strict locks (e.g., `canWrite`, `canDelete`) around all CRUD routes based on the Granular Custom permissions assigned to the underlying `lb-` key.
- SQLite uses **WAL journal mode** and **foreign key enforcement** for data integrity.

</details>

<details>
<summary>Docker Security</summary>

- The API container runs on **Node 22** — minimal attack surface.
- SQLite data is in a named Docker volume (`sqlite_data`) — not exposed on the host filesystem by default.
- API only exposes port `4646`. The frontend never directly exposes the database.
- `NODE_ENV=production` disables development stack traces in API error responses.

</details>

---

## 🔐 Database Encryption

ClawChives supports **AES-256 encryption at rest** via SQLCipher. This protects your pinchmarks and agent keys if the database file is stolen.

### Enabling Encryption

Generate a secure encryption key:

```bash
DB_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo $DB_ENCRYPTION_KEY
```

**Using npm:**

```bash
export DB_ENCRYPTION_KEY=your-generated-key-here
npm run scuttle:dev-start
```

**Using Docker:**

Edit `docker-compose.yml` and set the environment variable:

```yaml
environment:
  - DB_ENCRYPTION_KEY=your-generated-key-here
```

Then restart:

```bash
docker compose up -d --build
```

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_ENCRYPTION_KEY` | `""` (empty) | AES-256 encryption key. Leave empty for plaintext (default). |

> [!IMPORTANT]
> **First-Time Encryption**: If you have an existing plaintext database and enable encryption, ClawChives will automatically migrate it. Your data is preserved.

### Migration from Plaintext

Encryption happens automatically when you set `DB_ENCRYPTION_KEY`:

1. ClawChives detects an unencrypted database
2. Creates a temporary backup
3. Encrypts all data in-place
4. Verification completes transparently

No manual migration steps required.

### Key Rotation

To rotate your encryption key:

1. Generate a new key: `openssl rand -base64 32`
2. Update `DB_ENCRYPTION_KEY` in your environment
3. Restart the application
4. ClawChives re-encrypts the database with the new key

> [!CAUTION]
> **Key Management**: Keep your `DB_ENCRYPTION_KEY` safe. If you lose it, your data becomes inaccessible. Store it separately from this repository (e.g., in a password manager or secrets vault).

---

## ⚠️ Known Limitations

> These are accepted trade-offs for the current development phase.

- **Single-user only** — no multi-user support per instance currently.
- **No HTTPS enforcement** — use a reverse proxy (Nginx + Certbot) for public deployments.
- **Rate limiting is stored but not enforced** — `rateLimit` on agent keys is recorded but not yet checked on each request.
- **No refresh token rotation** — `api-` tokens persist until manually revoked.

---

## 📊 Attack Surface & Threat Model

### OWASP Coverage Checklist

| Threat | Status | Implementation | Details |
|---|---|---|---|
| **SQL Injection** | ✅ Mitigated | Parameterized queries via better-sqlite3 | All database access uses prepared statements; no string concatenation |
| **Cross-Site Scripting (XSS)** | ✅ Mitigated | React auto-escapes; no `innerHTML` | All user input is rendered safely; no dangling HTML injection vectors |
| **Cross-Site Request Forgery (CSRF)** | ✅ Mitigated | Bearer token auth (not cookies) | No session cookies; tokens require explicit `Authorization` header |
| **Authentication Bypass** | ✅ Mitigated | Constant-time key comparison | Token comparison uses timing-safe functions; no timing attacks |
| **Authorization Bypass** | ✅ Mitigated | `requirePermission()` on all routes | Granular permissions enforced per action; admin routes restricted to humans |
| **Data Leakage** | ✅ Mitigated | Session storage cleared on tab close | `sessionStorage` tokens evaporate; no persistent credential storage |
| **Rate Limiting** | ⚠️ Partial | Recorded but not enforced | `rateLimit` field on agent keys exists; enforcement is roadmapped |

### Key Leakage Vectors

| Key Type | Storage | Risk | Mitigation |
|---|---|---|---|
| `hu-` tokens | Client memory only (sessionStorage) | Stolen if browser compromised | Never sent to server; cleared on tab close |
| `api-` tokens | Server DB with expiration | Stolen if DB breached | Short-lived; can be rotated via `POST /api/auth/token` |
| `lb-` keys | Server DB, revocable per-agent | Leaked in logs/backups | Revocable in Settings; audit logs track usage |

### Attack Scenarios & Mitigations

#### Scenario 1: "Someone stole my identity key file"

**Risk**: Attacker can log in as you and access all your pinchmarks.

**Mitigations**:
- The key file is protected by the filesystem permissions on your computer
- If compromised, immediately revoke all `api-` and `lb-` tokens in Settings
- Generate a new `hu-` key by running SetupWizard and re-registering
- Back up your identity key offline (secure location like a password manager)

#### Scenario 2: "Someone intercepted my `api-` token in transit"

**Risk**: Attacker can impersonate you on the network.

**Mitigations**:
- Always use HTTPS in production (reverse proxy + TLS required)
- `api-` tokens are short-lived and can be rotated frequently
- `sessionStorage` clears on tab close, preventing token theft from browser memory
- Use VPN or private networks for sensitive operations

#### Scenario 3: "Someone breaks into my Docker container"

**Risk**: Attacker gains access to the running process and database.

**Mitigations**:
- Enable database encryption (`DB_ENCRYPTION_KEY`) so the data is unreadable without the key
- Run Docker with `NODE_ENV=production` to disable stack traces
- Restrict port 4646 to localhost; expose via Nginx/Caddy TLS only
- Use Docker security options: read-only root filesystem, dropped capabilities, seccomp profiles
- Regularly rotate encryption keys and API tokens

#### Scenario 4: "My database file was stolen from backups"

**Risk**: Raw SQLite database could be examined offline.

**Mitigations**:
- Database encryption makes the file unreadable without `DB_ENCRYPTION_KEY`
- Store backups encrypted at rest (encrypted volumes, S3 with server-side encryption)
- Never commit `DB_ENCRYPTION_KEY` to version control
- Keep backup locations as secure as the original

#### Scenario 5: "An AI agent leaked my `lb-` key in logs"

**Risk**: Malicious agent uses your key to read/write bookmarks.

**Mitigations**:
- Revoke the leaked `lb-` key immediately in Settings → Agent Permissions
- Audit logs show all actions performed with that key (timestamp + details)
- Generate a new key for the agent with fresh permissions
- Implement request-level rate limiting (roadmap item) to catch abuse early

---

## 🚨 Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report privately:

1. **Email**: Reach out to the maintainer directly (see GitHub profile).
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. **Response time**: We aim to acknowledge within 72 hours.
4. **Credit**: Reporters are acknowledged in release notes (anonymity respected on request).

---

## 🛡️ Self-Hosted Hardening Checklist

Before exposing ClawChives to the public internet:

- [ ] Place the API behind **Nginx or Caddy with TLS (HTTPS)**
- [ ] Set `CORS_ORIGIN` to your specific frontend domain, **not** `*`
- [ ] Restrict port `4646` to localhost, proxy via Nginx/Caddy
- [ ] Enable database encryption via `DB_ENCRYPTION_KEY`
- [ ] Regularly rotate `api-` tokens via `POST /api/auth/token`
- [ ] Revoke unused agent keys in **Settings → Agent Permissions**
- [ ] Back up the `sqlite_data` Docker volume regularly
- [ ] Store `clawchives_identity_key.json` in a **secure, offline location**
- [ ] Review audit logs for unusual agent activity
- [ ] Keep `Node.js` and dependencies updated regularly

---

## 🔗 Cross-References

- **Full key system details**: See [BLUEPRINT.md § Key System Architecture](./BLUEPRINT.md)
- **Data flow & architecture**: See [BLUEPRINT.md § Data Flow](./BLUEPRINT.md)
- **Deployment instructions**: See [README.md § Running with Docker](./README.md)
- **Contribution security standards**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **ClawStack security alignment**: See [CRUSTSECURITY.md](./CRUSTSECURITY.md)
