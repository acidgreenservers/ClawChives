import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { createAuditLogger } from '../utils/auditLogger.js';
import { calculateExpiry } from '../utils/tokenExpiry.js';
import { generateString } from '../utils/crypto.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { AuthSchemas } from '../validation/schemas.js';

const router = Router();
const audit = createAuditLogger(db);

function detectKeyType(key: string) {
  if (key?.startsWith('hu-'))  return 'human';
  if (key?.startsWith('lb-'))  return 'agent';
  if (key?.startsWith('api-')) return 'api';
  return null;
}

/** POST /api/auth/register */
router.post('/register', authLimiter, validateBody(AuthSchemas.register), (req, res) => {
  const { uuid, username, keyHash } = req.body;
  try {
    db.prepare('INSERT INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)').run(uuid, username, keyHash, new Date().toISOString());
    audit.log('AUTH_REGISTER', { actor: uuid, actor_type: 'human', action: 'register', outcome: 'success', resource: 'user', details: { username, user_uuid: uuid }, ip_address: req.ip, user_agent: req.headers['user-agent'] as string });
    res.status(201).json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed: users.username')) {
      return res.status(409).json({ success: false, error: 'Username already taken.' });
    }
    return res.status(409).json({ success: false, error: 'Failed to register user.' });
  }
});

/** POST /api/auth/token */
router.post('/token', authLimiter, validateBody(AuthSchemas.token), (req, res) => {
  const { type, uuid, keyHash, ownerKey } = req.body;
  const ttl = process.env.TOKEN_TTL_DEFAULT || '30d';
  const expiresAt = calculateExpiry(ttl);

  if (type === 'human') {
    let user: any;
    if (uuid)        user = db.prepare('SELECT * FROM users WHERE uuid = ?').get(uuid);
    else if (keyHash) user = db.prepare('SELECT * FROM users WHERE key_hash = ?').get(keyHash);

    if (!user) {
      audit.log('AUTH_FAILURE', { action: 'login', outcome: 'failure', actor_type: 'human', ip_address: req.ip, user_agent: req.headers['user-agent'] as string });
      return res.status(404).json({ success: false, error: 'Identity not registered on this node', suggestion: 'Try providing your username for better error details if this is a registration issue.' });
    }

    let keyMatch = false;
    try { keyMatch = crypto.timingSafeEqual(Buffer.from((user as any).key_hash), Buffer.from(keyHash)); } catch { keyMatch = false; }

    if (!keyMatch) {
      audit.log('AUTH_FAILURE', { action: 'login', outcome: 'failure', actor_type: 'human', ip_address: req.ip, user_agent: req.headers['user-agent'] as string, details: { user_uuid: (user as any).uuid } });
      return res.status(401).json({ success: false, error: 'Invalid identity key', suggestion: 'Ensure you are using the correct ClawKey©™ for this server instance.' });
    }

    const token = `api-${generateString(32)}`;
    db.prepare('INSERT INTO api_tokens (key, owner_key, owner_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(token, (user as any).uuid, 'human', new Date().toISOString(), expiresAt);
    audit.log('AUTH_SUCCESS', { actor: (user as any).uuid, actor_type: 'human', action: 'login', outcome: 'success', ip_address: req.ip, user_agent: req.headers['user-agent'] as string });
    return res.status(201).json({ success: true, data: { token, type: 'human', createdAt: new Date().toISOString(), expiresAt, user: { uuid: (user as any).uuid, username: (user as any).username } } });

  } else if (type === 'agent' || (ownerKey && detectKeyType(ownerKey) === 'agent')) {
    const agentKey = ownerKey;
    if (!agentKey?.startsWith('lb-')) return res.status(400).json({ success: false, error: 'Invalid agent key' });

    const agent = db.prepare('SELECT * FROM agent_keys WHERE api_key = ? AND is_active = 1').get(agentKey) as any;
    if (!agent) {
      audit.log('AUTH_FAILURE', { action: 'login', outcome: 'failure', actor_type: 'agent', ip_address: req.ip, user_agent: req.headers['user-agent'] as string });
      return res.status(401).json({ success: false, error: 'Invalid or revoked agent key' });
    }

    const token = `api-${generateString(32)}`;
    db.prepare('INSERT INTO api_tokens (key, owner_key, owner_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(token, agentKey, 'agent', new Date().toISOString(), expiresAt);
    audit.log('AUTH_SUCCESS', { actor: agent.id, actor_type: 'agent', action: 'login', outcome: 'success', ip_address: req.ip, user_agent: req.headers['user-agent'] as string });
    return res.status(201).json({ success: true, data: { token, type: 'agent', createdAt: new Date().toISOString(), expiresAt } });

  } else {
    return res.status(400).json({ success: false, error: 'Invalid authentication request' });
  }
});

/** GET /api/auth/validate */
router.get('/validate', requireAuth, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({ success: true, data: { valid: true, keyType: authReq.keyType, userUuid: authReq.userUuid } });
});

export default router;
