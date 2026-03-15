import { Router } from 'express';
import db from '../db.js';
import { createAuditLogger } from '../utils/auditLogger.js';
import { generateId, generateString } from '../utils/crypto.js';
import { calculateExpiry } from '../utils/tokenExpiry.js';
import { parseAgentKey } from '../utils/parsers.js';
import { requireAuth, requireHuman, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AgentKeySchemas } from '../validation/schemas.js';

const router = Router();
const audit = createAuditLogger(db);

/** GET /api/agent-keys */
router.get('/', requireAuth, requireHuman, (req, res) => {
  const authReq = req as AuthRequest;
  const rows = db.prepare('SELECT * FROM agent_keys WHERE user_uuid = ? ORDER BY created_at DESC').all(authReq.userUuid);
  res.json({ success: true, data: rows.map(parseAgentKey) });
});

/** POST /api/agent-keys */
router.post('/', requireAuth, requireHuman, validateBody(AgentKeySchemas.create), (req, res) => {
  const authReq = req as AuthRequest;
  const { name } = req.body;

  const dup = db.prepare('SELECT id FROM agent_keys WHERE name = ? AND is_active = 1 AND user_uuid = ?').get(name, authReq.userUuid);
  if (dup) return res.status(409).json({ success: false, error: `An active agent key named "${name}" already exists` });

  let expDate = null;
  if (req.body.expirationType && req.body.expirationType !== 'never') {
    expDate = calculateExpiry(req.body.expirationType);
  }

  const key = {
    id:              req.body.id ?? generateId(),
    user_uuid:       authReq.userUuid,
    name,
    description:     req.body.description ?? null,
    api_key:         req.body.apiKey ?? `lb-${generateString(64)}`,
    permissions:     JSON.stringify(req.body.permissions ?? {}),
    expiration_type: req.body.expirationType ?? 'never',
    expiration_date: expDate,
    rate_limit:      req.body.rateLimit ?? null,
    is_active:       1,
    created_at:      new Date().toISOString(),
    last_used:       null,
  };

  db.prepare('INSERT INTO agent_keys (id,user_uuid,name,description,api_key,permissions,expiration_type,expiration_date,rate_limit,is_active,created_at,last_used) VALUES (@id,@user_uuid,@name,@description,@api_key,@permissions,@expiration_type,@expiration_date,@rate_limit,@is_active,@created_at,@last_used)').run(key);
  audit.log('AGENT_KEY_CREATED', { actor: authReq.userUuid, actor_type: 'human', resource: key.id, action: 'create', outcome: 'success', ip_address: req.ip, user_agent: String(req.headers['user-agent'] ?? ''), details: { name: key.name } });

  res.status(201).json({ success: true, data: parseAgentKey(db.prepare('SELECT * FROM agent_keys WHERE id = ? AND user_uuid = ?').get(key.id, authReq.userUuid)) });
});

/** PATCH /api/agent-keys/:id/revoke */
router.patch('/:id/revoke', requireAuth, requireHuman, (req, res) => {
  const authReq = req as AuthRequest;
  const now = new Date().toISOString();
  const info = db.prepare('UPDATE agent_keys SET is_active = 0, revoked_at = ?, revoked_by = ? WHERE id = ? AND user_uuid = ?').run(now, authReq.userUuid, req.params.id, authReq.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: 'Agent key not found' });
  audit.log('AGENT_KEY_REVOKED', { actor: authReq.userUuid, actor_type: 'human', resource: String(req.params.id), action: 'revoke', outcome: 'success', ip_address: req.ip, user_agent: String(req.headers['user-agent'] ?? '') });
  res.json({ success: true });
});

/** DELETE /api/agent-keys/:id */
router.delete('/:id', requireAuth, requireHuman, (req, res) => {
  const authReq = req as AuthRequest;
  const info = db.prepare('DELETE FROM agent_keys WHERE id = ? AND user_uuid = ?').run(req.params.id, authReq.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: 'Agent key not found' });
  res.json({ success: true });
});

export default router;
