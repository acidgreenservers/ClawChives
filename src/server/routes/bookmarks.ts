import { Router } from 'express';
import db from '../db.js';
import { createAuditLogger } from '../utils/auditLogger.js';
import { generateId } from '../utils/crypto.js';
import { parseBookmark } from '../utils/parsers.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { BookmarkSchemas } from '../validation/schemas.js';

const router = Router();
const audit = createAuditLogger(db);

/** GET /api/bookmarks */
router.get('/', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  let sql = 'SELECT * FROM bookmarks WHERE user_uuid = ?';
  const params: unknown[] = [authReq.userUuid];

  if (req.query.starred === 'true')   { sql += ' AND starred = 1'; }
  if (req.query.archived === 'true')  { sql += ' AND archived = 1'; }
  if (req.query.folderId)             { sql += ' AND folder_id = ?'; params.push(req.query.folderId); }
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    sql += ' AND (title LIKE ? OR url LIKE ? OR description LIKE ?)';
    params.push(q, q, q);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows.map(parseBookmark) });
});

/** GET /api/bookmarks/:id */
router.get('/:id', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid);
  if (!row) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  res.json({ success: true, data: parseBookmark(row) });
});

/** POST /api/bookmarks */
router.post('/', requireAuth, requirePermission('canWrite'), validateBody(BookmarkSchemas.create), (req, res) => {
  const authReq = req as AuthRequest;
  const { url, title } = req.body;

  const existing = db.prepare('SELECT id, title FROM bookmarks WHERE url = ? AND user_uuid = ?').get(url, authReq.userUuid);
  if (existing) return res.status(409).json({ success: false, error: `A bookmark for "${url}" already exists`, existing });

  // 🛡️ jinaUrl human-only field check (inline — not middleware level)
  if (req.body.jinaUrl !== undefined && authReq.keyType !== 'human') {
    return res.status(403).json({ success: false, error: 'Agent keys cannot create bookmarks with r.jina.ai conversion. Only human users can set jinaUrl.' });
  }

  const now = new Date().toISOString();
  const bookmark = {
    id:          req.body.id ?? generateId(),
    user_uuid:   authReq.userUuid,
    url, title,
    description: req.body.description ?? '',
    favicon:     req.body.favicon ?? '',
    tags:        JSON.stringify(req.body.tags ?? []),
    folder_id:   req.body.folderId ?? null,
    starred:     req.body.starred ? 1 : 0,
    archived:    req.body.archived ? 1 : 0,
    color:       req.body.color ?? null,
    jina_url:    req.body.jinaUrl ?? null,
    created_at:  req.body.createdAt ?? now,
    updated_at:  now,
  };

  db.prepare('INSERT INTO bookmarks (id,user_uuid,url,title,description,favicon,tags,folder_id,starred,archived,color,jina_url,created_at,updated_at) VALUES (@id,@user_uuid,@url,@title,@description,@favicon,@tags,@folder_id,@starred,@archived,@color,@jina_url,@created_at,@updated_at)').run(bookmark);

  audit.log('BOOKMARK_CREATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'create', outcome: 'success', resource: 'bookmark', details: { bookmark_id: bookmark.id, title: bookmark.title } });

  if (req.body.jinaUrl && authReq.keyType === 'human') {
    audit.log('bookmark_jina_conversion_set', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'create', outcome: 'success', resource: 'bookmark', details: { bookmark_id: bookmark.id, jina_url: req.body.jinaUrl } });
  }

  res.status(201).json({ success: true, data: parseBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(bookmark.id, authReq.userUuid)) });
});

/** PUT /api/bookmarks/:id */
router.put('/:id', requireAuth, requirePermission('canEdit'), validateBody(BookmarkSchemas.update), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Bookmark not found' });

  // 🛡️ jinaUrl human-only field check
  if (req.body.jinaUrl !== undefined && authReq.keyType !== 'human') {
    return res.status(403).json({ success: false, error: 'Agent keys cannot set r.jina.ai conversion. Only human users can manage jinaUrl.' });
  }

  const updated = {
    url:         req.body.url         ?? row.url,
    title:       req.body.title       ?? row.title,
    description: req.body.description ?? row.description,
    favicon:     req.body.favicon     ?? row.favicon,
    tags:        JSON.stringify(req.body.tags ?? JSON.parse(row.tags)),
    folder_id:   req.body.folderId    !== undefined ? req.body.folderId : row.folder_id,
    starred:     req.body.starred     !== undefined ? (req.body.starred ? 1 : 0) : row.starred,
    archived:    req.body.archived    !== undefined ? (req.body.archived ? 1 : 0) : row.archived,
    color:       req.body.color       !== undefined ? req.body.color : row.color,
    jina_url:    req.body.jinaUrl     !== undefined ? req.body.jinaUrl : row.jina_url,
    updated_at:  new Date().toISOString(),
    id:          req.params.id,
    user_uuid:   authReq.userUuid,
  };

  db.prepare('UPDATE bookmarks SET url=@url, title=@title, description=@description, favicon=@favicon, tags=@tags, folder_id=@folder_id, starred=@starred, archived=@archived, color=@color, jina_url=@jina_url, updated_at=@updated_at WHERE id=@id AND user_uuid=@user_uuid').run(updated);
  audit.log('BOOKMARK_UPDATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id } });

  if (Object.prototype.hasOwnProperty.call(req.body, 'jinaUrl') && authReq.keyType === 'human' && req.body.jinaUrl !== row.jina_url) {
    audit.log('bookmark_jina_conversion_set', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id, jina_url: req.body.jinaUrl } });
  }

  res.json({ success: true, data: parseBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid)) });
});

/** DELETE /api/bookmarks/:id */
router.delete('/:id', requireAuth, requirePermission('canDelete'), (req, res) => {
  const authReq = req as AuthRequest;
  const info = db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_uuid = ?').run(req.params.id, authReq.userUuid);
  if (info.changes === 0) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  audit.log('BOOKMARK_DELETED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'delete', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id } });
  res.json({ success: true });
});

/** DELETE /api/bookmarks (purge all) */
router.delete('/', requireAuth, requirePermission('canDelete'), (req, res) => {
  const authReq = req as AuthRequest;
  const info = db.prepare('DELETE FROM bookmarks WHERE user_uuid = ?').run(authReq.userUuid);
  audit.log('BOOKMARKS_PURGED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'delete', outcome: 'success', resource: 'bookmark', details: { count: info.changes } });
  res.json({ success: true, count: info.changes });
});

/** PATCH /api/bookmarks/:id/star */
router.patch('/:id/star', requireAuth, requirePermission('canEdit'), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT starred FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  const newStarred = row.starred ? 0 : 1;
  db.prepare('UPDATE bookmarks SET starred = ?, updated_at = ? WHERE id = ? AND user_uuid = ?').run(newStarred, new Date().toISOString(), req.params.id, authReq.userUuid);
  const result = parseBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid));
  audit.log('BOOKMARK_STARRED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id, starred: result?.starred } });
  res.json({ success: true, data: result });
});

/** PATCH /api/bookmarks/:id/archive */
router.patch('/:id/archive', requireAuth, requirePermission('canEdit'), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare('SELECT archived FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  const newArchived = row.archived ? 0 : 1;
  db.prepare('UPDATE bookmarks SET archived = ?, updated_at = ? WHERE id = ? AND user_uuid = ?').run(newArchived, new Date().toISOString(), req.params.id, authReq.userUuid);
  const result = parseBookmark(db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_uuid = ?').get(req.params.id, authReq.userUuid));
  audit.log('BOOKMARK_ARCHIVED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id, archived: result?.archived } });
  res.json({ success: true, data: result });
});

export default router;
