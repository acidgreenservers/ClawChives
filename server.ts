import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore — plain JS module, no type declarations
import { getCorsConfig } from './src/config/corsConfig.js';
import { apiLimiter, createAgentKeyRateLimiter } from './src/server/middleware/rateLimiter.js';
import { errorHandler } from './src/server/middleware/errorHandler.js';
import { httpsRedirect } from './src/server/middleware/httpsRedirect.js';
import { purgeExpiredTokens } from './src/server/db.js';
import { scheduleTokenCleanup } from './src/server/utils/tokenExpiry.js';
import { generateId, generateString } from './src/server/utils/crypto.js';
import db from './src/server/db.js';
import { createAuditLogger } from './src/server/utils/auditLogger.js';

import authRoutes         from './src/server/routes/auth.js';
import bookmarkRoutes     from './src/server/routes/bookmarks.js';
import folderRoutes       from './src/server/routes/folders.js';
import agentKeyRoutes     from './src/server/routes/agentKeys.js';
import settingsRoutes     from './src/server/routes/settings.js';
import lobsterSessionRoutes from './src/server/routes/lobsterSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT = parseInt(process.env.PORT ?? '4646', 10);

// ─── Export for tests ────────────────────────────────────────────────────────
const audit = createAuditLogger(db);
export { db, audit, generateId, generateString };
export const app = express();

// ─── Startup tasks ───────────────────────────────────────────────────────────
purgeExpiredTokens();
scheduleTokenCleanup(db);
audit.cleanup(90); // ⚡ Clean expired audit logs on startup
setInterval(() => audit.cleanup(90), 24 * 60 * 60 * 1000); // Daily cleanup

// ─── Trust proxy ─────────────────────────────────────────────────────────────
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(httpsRedirect);

app.use(helmet({
  strictTransportSecurity: process.env.ENFORCE_HTTPS === 'true' ? undefined : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:      ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:       ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:        ["'self'", 'data:', 'https:'],
      connectSrc:    ["'self'", 'wss:', 'ws:', 'https://r.jina.ai'],
      upgradeInsecureRequests: process.env.ENFORCE_HTTPS === 'true' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
  originAgentCluster:        false,
}));

app.use(cors(getCorsConfig()));
app.use(express.json());
app.use('/api', apiLimiter);

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Agent rate limiter (applied after requireAuth populates req.keyType)
const agentRateLimiter = createAgentKeyRateLimiter();
app.use('/api', agentRateLimiter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const counts = {
    bookmarks: (db.prepare('SELECT COUNT(*) as c FROM bookmarks').get() as any).c,
    folders:   (db.prepare('SELECT COUNT(*) as c FROM folders').get() as any).c,
    agentKeys: (db.prepare("SELECT COUNT(*) as c FROM agent_keys WHERE is_active = 1").get() as any).c,
  };
  res.json({
    success: true, service: 'ClawChives API', version: '2.0.0',
    mode: 'sqlite', uptime: process.uptime(), counts,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/bookmarks',         bookmarkRoutes);
app.use('/api/folders',           folderRoutes);
app.use('/api/agent-keys',        agentKeyRoutes);
app.use('/api/settings',          settingsRoutes);
app.use('/api/lobster-session',   lobsterSessionRoutes);

// ─── Static Files (Production) ────────────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
  maxAge: '1y',  // Default cache header for hashed assets
  immutable: true, // Tells browsers hashed assets never change
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      // Bypass cache for index.html — always fetch fresh on new releases
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      // Hashed assets (JS/CSS chunks) can be cached indefinitely
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// SPA catch-all: serve index.html for any non-API, non-asset route
// ⚠️ Do NOT change this regex — it prevents CSS/JS from being served as index.html
app.get(/^(?!\/api\/)(?!\/assets\/).*/, (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── 404 + Error Handler ─────────────────────────────────────────────────────
app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🦞 ClawChives v2 API running on port ${PORT}`);
  console.log(`   Health:      http://localhost:${PORT}/api/health`);
  console.log(`   Issue token: POST http://localhost:${PORT}/api/auth/token\n`);
});
