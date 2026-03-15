import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireHuman, AuthRequest } from '../middleware/auth.js';

const router = Router();

/** GET /api/settings/:key */
router.get('/:key', requireAuth, requireHuman, (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT value FROM settings WHERE key = ? AND user_uuid = ?').get(req.params.key, authReq.userUuid) as any;
  if (!row) return res.json({ success: true, data: {} }); // Return empty object; let frontend apply defaults
  res.json({ success: true, data: JSON.parse(row.value) });
});

/** PUT /api/settings/:key */
router.put('/:key', requireAuth, requireHuman, (req, res) => {
  const authReq = req as AuthRequest;
  db.prepare('INSERT OR REPLACE INTO settings (user_uuid, key, value) VALUES (?, ?, ?)').run(authReq.userUuid, req.params.key, JSON.stringify(req.body));
  res.json({ success: true });
});

export default router;
