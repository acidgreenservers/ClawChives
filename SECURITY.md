# 🛡️ Security Policy — ClawChives

[![Security](https://img.shields.io/badge/Security-Key%20Based%20Auth-red?style=for-the-badge)](#)
[![Reporting](https://img.shields.io/badge/Reporting-Responsible%20Disclosure-orange?style=for-the-badge)](#)

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
| `hu-` | Human Identity Key | App login | Browser IndexedDB (SHA-256 hashed) |
| `ag-` | Agent Key | Automated agent access | Server DB (`agent_keys` table) |
| `api-` | REST Token | API session access | Server DB (`api_tokens` table) |

---

## 🔒 Security Practices

<details>
<summary>Client-Side (IndexedDB mode)</summary>

- `hu-` tokens are **never stored in plaintext** — only their SHA-256 hash is saved in IndexedDB.
- `sessionStorage` is used for session state (`cc_authenticated`, `cc_view`) — clears automatically on tab close.
- No cookies. No third-party tracking. No remote analytics.

</details>

<details>
<summary>Server-Side (SQLite mode)</summary>

- The server **never receives** your `hu-` identity key. Auth validation always stays in the browser.
- `ag-` and `api-` keys are validated server-side via the `Authorization: Bearer` header.
- Revoked keys are rejected at the middleware layer before reaching any route handler.
- Agent keys with `expirationType != "never"` are automatically rejected past their expiry date.
- SQLite uses **WAL journal mode** and **foreign key enforcement** for data integrity.
- `CORS_ORIGIN` environment variable restricts which origins can reach the API.

</details>

<details>
<summary>Docker Security</summary>

- The API container runs on **Node 20 Alpine** — minimal attack surface.
- SQLite data is in a named Docker volume (`sqlite_data`) — not exposed on the host filesystem by default.
- API only exposes port `4242`. The frontend never directly exposes the database.
- `NODE_ENV=production` disables development stack traces in API error responses.

</details>

---

## ⚠️ Known Limitations

> These are accepted trade-offs for the current development phase.

- **Single-user only** — no multi-user support per instance currently.
- **No HTTPS enforcement** — use a reverse proxy (Nginx + Certbot) for public deployments.
- **Rate limiting is stored but not enforced** — `rateLimit` on agent keys is recorded but not yet checked on each request.
- **No refresh token rotation** — `api-` tokens persist until manually revoked.

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
- [ ] Restrict port `4242` to localhost, proxy via Nginx/Caddy
- [ ] Regularly rotate `api-` tokens via `POST /api/auth/token`
- [ ] Revoke unused agent keys in **Settings → Agent Permissions**
- [ ] Back up the `sqlite_data` Docker volume regularly
- [ ] Store `clawchives_identity_key.json` in a **secure, offline location**
