import { Router } from 'express';
import db from '../db.js';
import { createAuditLogger } from '../utils/auditLogger.js';
import { generateId } from '../utils/crypto.js';
import { parseFolder } from '../utils/parsers.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { FolderSchemas } from '../validation/schemas.js';

const router = Router();
const audit = createAuditLogger(db);

/** GET /api/folders */
router.get('/', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  const rows = db.prepare('SELECT * FROM folders WHERE user_uuid = ? ORDER BY created_at ASC').all(authReq.userUuid);
  res.json({ success: true, data: rows.map(parseFolder) });
});

/** POST /api/folders */
router.post('/', requireAuth, requirePermission('canWrite'), validateBody(FolderSchemas.create), (req, res) => {
  const authReq = req as AuthRequest;
  const { name } = req.body;
  const folder = { id: req.body.id ?? generateId(), user_uuid: authReq.userUuid, name, parent_id: req.body.parentId ?? null, color: req.body.color ?? '#06b6d4', created_at: new Date().toISOString() };
  db.prepare('INSERT INTO folders (id, user_uuid, name, parent_id, color, created_at) VALUES (@id, @user_uuid, @name, @parent_id, @color, @created_at)').run(folder);
  audit.log('FOLDER_CREATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'create', outcome: 'success', resource: 'folder', details: { folder_id: folder.id, name: folder.name } });
  res.status(201).json({ success: true, data: parseFolder(db.prepare('SELECT * FROM folders WHERE id = ? AND user_uuid = ?').get(folder.id, authReq.userUuid)) });
});

/** PUT /api/folders/:id */
router.put('/:id', requireAuth, requirePermission('canEdit'), validateBody(FolderSchemas.update), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT * FROM folders WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Folder not found' });
  const updated = { name: req.body.name ?? row.name, color: req.body.color ?? row.color, parent_id: req.body.parentId !== undefined ? req.body.parentId : row.parent_id, id: req.params.id, user_uuid: authReq.userUuid };
  db.prepare('UPDATE folders SET name=@name, color=@color, parent_id=@parent_id WHERE id=@id AND user_uuid=@user_uuid').run(updated);
  audit.log('FOLDER_UPDATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'folder', details: { folder_id: req.params.id } });
  res.json({ success: true, data: parseFolder(db.prepare('SELECT * FROM folders WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid)) });
});

/** DELETE /api/folders/:id */
router.delete('/:id', requireAuth, requirePermission('canDelete'), (req, res) => {
  const authReq = req as AuthRequest;
  const info = db.prepare('DELETE FROM folders WHERE id = ? AND user_uuid = ?').run(req.params.id, authReq.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: 'Folder not found' });
  audit.log('FOLDER_DELETED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'delete', outcome: 'success', resource: 'folder', details: { folder_id: req.params.id } });
  res.json({ success: true });
});

/** DELETE /api/folders (purge all) */
router.delete('/', requireAuth, requirePermission('canDelete'), (req, res) => {
  const authReq = req as AuthRequest;
  const info = db.prepare('DELETE FROM folders WHERE user_uuid = ?').run(authReq.userUuid);
  audit.log('FOLDERS_PURGED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'delete', outcome: 'success', resource: 'folder', details: { count: info.changes } });
  res.json({ success: true, count: info.changes });
});

export default router;
