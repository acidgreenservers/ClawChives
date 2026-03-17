# 🦞 ClawChives

<div align="center">

```
  ██████╗██╗      █████╗ ██╗    ██╗ ██████╗██╗  ██╗██╗██╗   ██╗███████╗███████╗
 ██╔════╝██║     ██╔══██╗██║    ██║██╔════╝██║  ██║██║██║   ██║██╔════╝██╔════╝
 ██║     ██║     ███████║██║ █╗ ██║██║     ███████║██║██║   ██║█████╗  ███████╗
 ██║     ██║     ██╔══██║██║███╗██║██║     ██╔══██║██║╚██╗ ██╔╝██╔══╝  ╚════██║
 ╚██████╗███████╗██║  ██║╚███╔███╔╝╚██████╗██║  ██║██║ ╚████╔╝ ███████╗███████║
  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚══════╝
```

*Your Sovereign Pinchmark Library — where Humans and AI Lobsters collaborate to scuttle the web.*

</div>

---

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Phase](https://img.shields.io/badge/Phase-3_Feature_Expansion-blue?style=for-the-badge)](#)

---

## 📜 Table of Contents

<details>
<summary>Unfurl the Scroll 📜</summary>

- [About](#-about)
- [Architecture](#-architecture)
- [Screenshots](#-screenshots)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Docker)](#-quick-start-docker)
  - [Expanded Setup Instructions](#-expanded-setup-instructions)
  - [Public Deployment (Cloudflare Tunnel)](#️-public-deployment-cloudflare-tunnel)
- [Key System](#-key-system)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Related Documentation](#-related-documentation)
- [Contributing](#-contributing)
- [Security](#-security)

</details>

---

## 📌 About

**ClawChives** is a privacy-first, self-hostable **pinchmark** (bookmark) manager designed for the Human-Agent ecosystem. It stores your pinchmarks in an integrated SQLite backend, with a sovereign identity system that uses cryptographic key files instead of usernames and passwords. No cloud. No landlords. Your reef, your rules.

**Core Features:**
- 🔐 ShellCryption Auth — login with a generated JSON identity file or use One-Field Login with just your ClawKey©™
- 🤖 Lobster Key System — issue granular `lb-` API keys to your AI agents and scripts
- 🗄️ SQLite Bedrock — fast, reliable, zero-dependency backend for persistent local storage
- 🐳 Docker-First — fully containerized with named volume mounts for seamless self-hosting
- 🌊 Liquid Metal Theming — stunning circular-reveal View Transition on every theme switch
- 🦞 r.jina.ai Reading Mode — transform Pinchmarks to LLM-friendly markdown on-demand
- 🐚 Locked Shell UI — rigid, consistent interface layout that never shifts

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Client ["🌐 Browser"]
        UI[React / Tailwind UI]
        Auth["Auth Module\nSetupWizard + LoginForm"]
        Provider["DatabaseProvider\nuseDatabase() hook"]
        REST[RestAdapter]
        Theme[ThemeProvider\nLiquid Metal Toggle]
    end

    subgraph Server ["🖥️ server.js (Express)"]
        API["REST API\nPort 4646"]
        DB[(SQLite db.sqlite)]
    end

    UI --> Auth
    UI --> Theme
    UI --> Provider
    Provider --> REST
    REST -->|"fetch + Bearer token"| API
    API --> DB
```

---

## 📸 Screenshots

<details>
<summary>Expand To View Screenshots</summary>

![Landing Page](src/assets/landing-light.png)

![Landing Page](src/assets/landing-dark.png)

![Gateway](src/assets/gateway-light.png)

![Gateway](src/assets/gateway-dark.png)

![Dashboard](src/assets/dashboard-light.png)

![Dashboard](src/assets/dashboard-dark.png)

![Add Pinchmark](src/assets/add-light.png)

![Add Pinchmark](src/assets/add-dark.png)

![Settings](src/assets/settings-light.png)

![Settings](src/assets/settings-dark.png)

![Login](src/assets/login-light.png)

![Login](src/assets/login-dark.png)

![Setup Wizard](src/assets/wizard-light.png)

![Setup Wizard](src/assets/wizard-dark.png)

</details>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+
- **npm** v10+
- **Docker & Docker Compose** *(for containerized deployment)*

---

### 🐳 Quick Start (Docker)

**Simplest path:** Three commands, running everywhere.

```bash
# 1. Clone and enter directory
git clone <repo> && cd ClawChives

# 2. Start the container
docker compose up -d

# 3. Open browser
open http://localhost:4545
```

**That's it.** All data persists to `./data/db.sqlite` on your host.

> **Note:** Or use npm instead — see **Expanded Setup Instructions** below for details.

---

### 🛠️ Expanded Setup Instructions

<details>
<summary>View full npm & Docker setup guides</summary>

#### Running with npm

**Install dependencies first:**
```bash
npm install
```

**Production Commands (The Great Scuttle):**
- **Start All**: `npm run scuttle:prod-start` (Builds frontend, then starts API + Frontend on `0.0.0.0`)
- **Stop All**: `npm run scuttle:prod-stop`
- **Reset DB**: `npm run scuttle:reset` (DANGER: Deletes prod reef)

**Development Commands (The Coral Nursery):**
- **Start All**: `npm run scuttle:dev-start` (API + Frontend w/ HMR on `localhost`)
- **Stop All**: `npm run scuttle:dev-stop`
- **Reset DB**: `npm run scuttle:reset-dev` (Scuttles dev reef)

**Utility Scripts:**
- **Start API Only**: `npm run start:api`
- **Frontend Dev Only**: `npm run dev`
- **Build Bundle**: `npm run build`
- **Preview Build**: `npm run preview`
- **Lint TypeScript**: `npm run lint`
- **Run Tests**: `npm test`

---

#### Running with Docker (Detailed)

**Option A: Production (Pull from GHCR) ⚓**

Use this for a stable, sovereign deployment. It pulls the latest pre-built images from GitHub Container Registry.

```bash
docker compose up -d
```

**Option B: Development & Testing (Build Locally) 🛠️**

Use this if you are modifying the source code and want to test changes immediately.

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

**Environment Variables Reference:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Runtime mode (production or development) |
| `PORT` | `4545` | Container internal port (mapped to host port in compose) |
| `DATA_DIR` | `/app/data` | Where SQLite database is stored (bind mount) |
| `DB_ENCRYPTION_KEY` | `""` (empty) | AES-256 encryption key. Leave empty for plaintext, or set to `openssl rand -base64 32` |
| `PUID` | `1000` | Linux user ID for file permissions (get with `id -u`) |
| `PGID` | `1000` | Linux group ID for file permissions (get with `id -g`) |
| `CORS_ORIGIN` | `""` (unset) | Restrict API access to specific origin (for reverse proxy setup only) |

**Monitoring & Maintenance:**

```bash
# View logs in real-time
docker compose logs -f

# Stop the stack
docker compose down

# Restart the stack
docker compose restart

# View database file location
ls -lah ./data/db.sqlite

# Backup your database
cp ./data/db.sqlite ./data/db.sqlite.backup
```

> [!IMPORTANT]
> **Data Sovereignty & Persistence**:
> All pinchmarks and agent identities are stored in local bind mounts on your host machine for maximum visibility and ease of backup.
> - **Production**: `./data/db.sqlite`
> - **Development**: `./data-dev/db.sqlite`
>
> These directories can be directly backed up or migrated. If they don't exist, Docker will create them (root-owned) when the container starts. Recommend creating them beforehand with desired permissions: `mkdir -p data && chown $USER:$USER data`

</details>

---

### ☁️ Public Deployment (Cloudflare Tunnel)

<details>
<summary>Expose ClawChives publicly via CF Tunnel (with HTTPS, no port forwarding)</summary>

**Ready to deploy publicly?** Your app is already configured for CF Tunnel. Here's exactly what to set.

#### 1. Install Cloudflare Tunnel

```bash
# macOS
brew install cloudflared

# Linux (Debian/Ubuntu)
curl https://pkg.cloudflare.com/cloudflare-release-key.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/linux $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-main.list
sudo apt-get update && sudo apt-get install cloudflared

# Or download binary
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x ./cloudflared
```

#### 2. Authenticate

```bash
cloudflared tunnel login
# This opens a browser to authenticate with your Cloudflare account
```

#### 3. Create Tunnel

```bash
cloudflared tunnel create claw-chives
# Returns: Tunnel credentials saved in ~/.cloudflared/...json
```

#### 4. Configure Tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: claw-chives
credentials-file: ~/.cloudflared/<your-id>.json

ingress:
  - hostname: claw-chives.your-domain.com
    service: http://localhost:4646
  - service: http_status:404
```

Replace:
- `claw-chives.your-domain.com` — your desired domain
- `<your-id>.json` — the credentials file from step 3 (find it with `ls ~/.cloudflared/`)

#### 5. Set Environment Variables

Add these to your `.env` or Docker environment:

```bash
# Trust the CF Tunnel proxy headers (reads real client IP)
TRUST_PROXY=true

# Lock CORS to your CF domain only
CORS_ORIGIN=https://claw-chives.your-domain.com

# Enable HTTPS redirect (optional — CF handles HTTPS, but good for defense-in-depth)
ENFORCE_HTTPS=true

# Database encryption (strongly recommended)
DB_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

**For Docker:** Add these to `docker-compose.yml` environment section:

```yaml
environment:
  - TRUST_PROXY=true
  - CORS_ORIGIN=https://claw-chives.your-domain.com
  - ENFORCE_HTTPS=true
  - DB_ENCRYPTION_KEY=<your-key-from-openssl-command>
```

#### 6. Run Tunnel

```bash
# Development: Run tunnel in foreground (see logs)
cloudflared tunnel run claw-chives

# Production: Run tunnel as systemd service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

#### 7. Route DNS (Cloudflare Dashboard)

In Cloudflare DNS settings for your domain:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `CNAME` | `claw-chives` | `claw-chives.cfargotunnel.com` | ☁️ Proxied |

#### 8. Verify

```bash
# Test the tunnel
curl https://claw-chives.your-domain.com/api/health

# Should return:
# { "success": true, "service": "ClawChives API", "version": "2.0.0", ... }
```

#### Environment Variables Summary

| Variable | Value | Notes |
|----------|-------|-------|
| `TRUST_PROXY` | `true` | Tells Express to read real client IP from CF headers |
| `CORS_ORIGIN` | `https://claw-chives.your-domain.com` | Locks API access to your CF domain |
| `ENFORCE_HTTPS` | `true` | Redirect HTTP → HTTPS (CF already provides HTTPS) |
| `DB_ENCRYPTION_KEY` | `<base64-key>` | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | `production` | Standard Node env |
| `PORT` | `4646` | Internal port (unchanged) |

#### What You Get

✅ **HTTPS** — CF provides free TLS certificates
✅ **Real Client IP** — Audit logs show actual IPs (not CF gateway)
✅ **Rate Limiting** — Preserved (per-agent limits still work)
✅ **Database Encryption** — AES-256 at rest
✅ **CORS Protection** — Only your domain can access API
✅ **Zero Port Forwarding** — CF Tunnel handles all networking

#### Troubleshooting

```bash
# Check tunnel status
cloudflared tunnel list

# View tunnel logs
cloudflared tunnel run claw-chives --loglevel debug

# Test API accessibility
curl -v https://claw-chives.your-domain.com/api/health

# Check CORS headers
curl -i -H "Origin: https://claw-chives.your-domain.com" \
  https://claw-chives.your-domain.com/api/health
```

> [!TIP]
> **Not ready for public?** Skip this section and keep using Docker Compose locally. You can add CF Tunnel anytime — just set the env vars above when you're ready.

</details>

---

## 💡 What's Next?

After your first login:
1. **Create Folders** — Organize pinchmarks by category
2. **Add Pinchmarks** — Drag-and-drop or paste URLs
3. **Enable AI Integration** — Generate Lobster keys in Settings for your agents
4. **Customize Theme** — Use the Liquid Metal toggle in appearance settings

**Need more?** See the full documentation links below.

---

## 🔑 Key System

ClawChives uses a **prefix-based identity token system** — no passwords, no usernames stored on a server. Your key file is your identity.

| Prefix | Type | Usage |
|---|---|---|
| `hu-` | **Human Key** | Your personal identity. 64 characters. Supports **One-Field Login**. |
| `lb-` | **Lobster/Agent Key** | For your AI agents and scripts. 64 characters. Generated in Settings. |
| `api-` | **Session Token** | Short-lived REST API bearer. 32 characters. Auto-issued on login. |

> [!CAUTION]
> Your `hu-` key file is the **only** way to access your ClawChive. Keep it safe. If you lose it, it cannot be recovered.

**See [BLUEPRINT.md](./BLUEPRINT.md#-key-system-architecture) for full auth architecture and token lifecycle details.**

---

## 📂 Project Structure

```
src/
├── components/           # Feature-scoped UI (auth, dashboard, settings)
├── services/             # Business logic + database adapter
├── hooks/                # React custom hooks (useAuth, etc.)
├── lib/                  # Utilities (crypto, API client, export/import)
├── types/                # TypeScript interfaces
└── server/               # Backend (Express, SQLite, routes, middleware)
```

**For complete directory breakdown with all files and descriptions:**
→ See [BLUEPRINT.md § Directory Structure](./BLUEPRINT.md#-complete-directory-structure)

---

## 🛠️ Available Scripts

| Script | Ports | Accessible | Description |
|---|---|---|---|
| `npm run scuttle:prod-start` | 4545 (UI), 4646 (API) | `0.0.0.0` (LAN) | 🦞 Builds frontend, starts API + UI production servers |
| `npm run scuttle:dev-start` | 4545 (UI), 4646 (API) | `localhost` only | Hatch development environment (API + UI w/ HMR) |
| `npm run scuttle:prod-stop` | — | — | Kill the API and UI server processes |
| `npm run scuttle:reset` | — | — | Scuttle the production database (DANGER) |
| `npm run scuttle:reset-dev` | — | — | Scuttle the development database |
| `npm run start:api` | 4646 | `0.0.0.0` | Start only the Express API server |
| `npm run dev` | 4545 | `localhost` only | Vite dev server with HMR |
| `npm run build` | — | — | Build production bundle (`npm run build` required before `scuttle:prod-start`) |
| `npm run preview` | 4545 | `localhost` only | Serve the production `dist/` locally for testing |
| `npm run lint` | — | — | ESLint check across all `.ts` / `.tsx` files |

---

## 📚 Related Documentation

| Document | Purpose |
|---|---|
| [**BLUEPRINT.md**](./BLUEPRINT.md) | Architecture, patterns, constraints, API endpoints, component design |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Development guidelines, code standards, workflow |
| [**SECURITY.md**](./SECURITY.md) | Security policy, vulnerability reporting, hardening guides |
| [**ROADMAP.md**](./ROADMAP.md) | Current and future development direction |

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## 🛡️ Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and key security practices.

---

<div align="center">

```
       _..._
     .'     '.      HATCH YOUR CLAWCHIVE.
    /  _   _  \     RECLAIM YOUR LINKS.
    | (q) (p) |     PUNCH THE CLOUD.
    (_   Y   _)
     '.__W__.'
     _.'   '._
    (         )
     '._ _ .-'
        'u'
```

*Maintained with 🦞 by Lucas*

</div>
