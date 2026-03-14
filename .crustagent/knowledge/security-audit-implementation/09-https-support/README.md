# 09: HTTPS Support (TLS/SSL Encryption)

[![Priority](https://img.shields.io/badge/Priority-Medium-yellow)](#)
[![Complexity](https://img.shields.io/badge/Complexity-Low-green)](#)
[![Time](https://img.shields.io/badge/Time-2%20hours-blue)](#)

---

## Why This Matters

**Problem:** HTTP traffic is unencrypted:
- **Credentials sent in plaintext** - API tokens visible on network
- **Session hijacking** - Attackers can intercept and replay tokens
- **Man-in-the-middle** - Traffic can be modified in transit
- **Browser security warnings** - Modern browsers block HTTP origins

**Impact:** All authentication credentials and bookmark data transmitted insecurely.

**Solution:** Use HTTPS via reverse proxy (nginx, Caddy) for SSL termination.

---

## What This Implements

### HTTPS Architecture

```
Internet → nginx (HTTPS:443) → ClawChives API (HTTP:4242)
  ├─ nginx handles SSL/TLS termination
  ├─ nginx forwards requests to backend as HTTP
  ├─ ClawChives runs on localhost:4242 (not exposed)
  └─ All external traffic encrypted with TLS
```

### Why Reverse Proxy (Not Built-In HTTPS)?

**Option 1: Built-in HTTPS (Not Recommended)**
```javascript
import https from "https";
import fs from "fs";

const server = https.createServer({
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.cert"),
}, app);
```
**Issues:** Certificate management complex, no auto-renewal, performance overhead

**Option 2: Reverse Proxy (Recommended)**
- ✅ Automatic certificate management (Let's Encrypt)
- ✅ Performance (nginx optimized for TLS)
- ✅ Security (battle-tested SSL implementation)
- ✅ Flexibility (load balancing, caching, rate limiting)

---

## How It Works

### Deployment Scenarios

**1. LAN/Localhost (No HTTPS Required)**
```
Access: http://localhost:4242 or http://192.168.1.100:4242
Use case: Personal use, trusted network
Security: Low risk (traffic doesn't leave network)
```

**2. Public Internet (HTTPS Required)**
```
Access: https://clawchives.yoursite.com
Use case: Remote access, multi-user
Security: HIGH risk without HTTPS
Solution: nginx + Let's Encrypt
```

### nginx Configuration

**Simple HTTP → HTTPS redirect + proxy:**
```nginx
# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name clawchives.yoursite.com;
  return 301 https://$host$request_uri;
}

# HTTPS with SSL termination
server {
  listen 443 ssl http2;
  server_name clawchives.yoursite.com;

  # SSL certificate (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/clawchives.yoursite.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/clawchives.yoursite.com/privkey.pem;

  # SSL security settings
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Proxy to ClawChives API
  location / {
    proxy_pass http://localhost:4242;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## Implementation

See [nginx-example.conf](./nginx-example.conf) and [httpsRedirect.ts](./httpsRedirect.ts).

### Quick Setup

**1. Install nginx:**
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

**2. Configure nginx:**
```bash
sudo nano /etc/nginx/sites-available/clawchives
# Paste nginx-example.conf content

sudo ln -s /etc/nginx/sites-available/clawchives /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

**3. Get SSL certificate:**
```bash
sudo certbot --nginx -d clawchives.yoursite.com
# Follow prompts, certbot will auto-configure nginx
```

**4. Configure ClawChives:**
```bash
# .env
CORS_ORIGIN=https://clawchives.yoursite.com
NODE_ENV=production
```

---

## Testing

**Test 1: HTTP redirect**
```bash
curl -I http://clawchives.yoursite.com
# Expected: 301 Moved Permanently
# Location: https://clawchives.yoursite.com
```

**Test 2: HTTPS connection**
```bash
curl -I https://clawchives.yoursite.com
# Expected: 200 OK
# Strict-Transport-Security: max-age=31536000
```

**Test 3: SSL certificate**
```bash
openssl s_client -connect clawchives.yoursite.com:443 -servername clawchives.yoursite.com
# Verify: Certificate chain valid, TLS 1.3
```

---

## Next Steps

1. ✅ Review [README.md](./README.md), [nginx-example.conf](./nginx-example.conf)
2. ⬜ Install nginx and certbot
3. ⬜ Configure nginx with example config
4. ⬜ Obtain SSL certificate with certbot
5. ⬜ Update CORS_ORIGIN to HTTPS URL
6. ⬜ Test HTTP → HTTPS redirect
7. ⬜ Proceed to [10-migrations](../10-migrations/README.md)

---

## References

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
