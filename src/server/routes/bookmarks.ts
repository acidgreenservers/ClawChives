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

const BOOKMARK_SELECT = `
  SELECT b.*, jc.url as jina_conversion_url
  FROM bookmarks b
  LEFT JOIN jina_conversions jc
    ON b.id = jc.bookmark_id AND b.user_uuid = jc.user_uuid
`;

/** Helper: Insert a single bookmark with duplicate check, jinaUrl guard, and transaction */
function insertBookmark(
  authReq: AuthRequest,
  input: Record<string, unknown> & { url: string; title: string; jinaUrl?: string | null }
): { bookmark: any } | { error: string; status: number } {
  // Duplicate URL check
  const existing = db.prepare('SELECT id, title FROM bookmarks WHERE url = ? AND user_uuid = ?').get(input.url, authReq.userUuid);
  if (existing) {
    return { error: `A bookmark for "${input.url}" already exists`, status: 409 };
  }

  // 🛡️ jinaUrl human-only field check
  if (input.jinaUrl !== undefined && authReq.keyType !== 'human') {
    return { error: 'Agent keys cannot create bookmarks with r.jina.ai conversion. Only human users can set jinaUrl.', status: 403 };
  }

  const now = new Date().toISOString();
  const bookmark = {
    id:          (input.id as string) ?? generateId(),
    user_uuid:   authReq.userUuid,
    url:         input.url,
    title:       input.title,
    description: (input.description as string) ?? '',
    favicon:     (input.favicon as string) ?? '',
    tags:        JSON.stringify((input.tags as string[]) ?? []),
    folder_id:   (input.folderId as string) ?? null,
    starred:     (input.starred as boolean) ? 1 : 0,
    archived:    (input.archived as boolean) ? 1 : 0,
    color:       (input.color as string) ?? null,
    created_at:  (input.createdAt as string) ?? now,
    updated_at:  now,
  };

  const doCreate = db.transaction((bookmarkData: any, jinaUrl: string | null) => {
    db.prepare('INSERT INTO bookmarks (id,user_uuid,url,title,description,favicon,tags,folder_id,starred,archived,color,created_at,updated_at) VALUES (@id,@user_uuid,@url,@title,@description,@favicon,@tags,@folder_id,@starred,@archived,@color,@created_at,@updated_at)').run(bookmarkData);
    if (jinaUrl) {
      db.prepare('INSERT INTO jina_conversions (bookmark_id, user_uuid, url, created_at) VALUES (?, ?, ?, ?)').run(bookmarkData.id, bookmarkData.user_uuid, jinaUrl, bookmarkData.created_at);
    }
  });

  doCreate(bookmark, (input.jinaUrl as string) ?? null);

  audit.log('BOOKMARK_CREATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'create', outcome: 'success', resource: 'bookmark', details: { bookmark_id: bookmark.id, title: bookmark.title } });

  if (input.jinaUrl && authReq.keyType === 'human') {
    audit.log('bookmark_jina_conversion_set', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'create', outcome: 'success', resource: 'bookmark', details: { bookmark_id: bookmark.id, jina_url: input.jinaUrl } });
  }

  // Fetch and return the created bookmark
  const created = db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(bookmark.id, authReq.userUuid);
  return { bookmark: parseBookmark(created) };
}

/** GET /api/bookmarks */
router.get('/', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  let sql = `${BOOKMARK_SELECT} WHERE b.user_uuid = ?`;
  const params: unknown[] = [authReq.userUuid];

  if (req.query.starred === 'true')   { sql += ' AND b.starred = 1'; }
  if (req.query.archived === 'true')  { sql += ' AND b.archived = 1'; }
  if (req.query.folderId)             { sql += ' AND b.folder_id = ?'; params.push(req.query.folderId); }
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    sql += ' AND (b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?)';
    params.push(q, q, q);
  }
  sql += ' ORDER BY b.created_at DESC';

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows.map(parseBookmark) });
});

/** GET /api/bookmarks/folder-counts — Get bookmark count for each folder */
router.get('/folder-counts', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  const rows = db.prepare(`
    SELECT folder_id, COUNT(*) as count
    FROM bookmarks
    WHERE user_uuid = ?
    GROUP BY folder_id
  `).all(authReq.userUuid) as Array<{ folder_id: string | null; count: number }>;

  // Build map: folderId -> count (null folder_id maps to 'uncategorized')
  const counts: Record<string, number> = {};
  rows.forEach(row => {
    if (row.folder_id) {
      counts[row.folder_id] = row.count;
    }
  });

  res.json({ success: true, data: counts });
});

/** GET /api/bookmarks/stats — Return total counts for all, starred, archived */
router.get('/stats', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN starred = 1 THEN 1 ELSE 0 END) AS starred,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) AS archived
    FROM bookmarks
    WHERE user_uuid = ?
  `).get(authReq.userUuid) as { total: number; starred: number; archived: number };

  res.json({ success: true, data: { total: row.total, starred: row.starred, archived: row.archived } });
});

/** GET /api/bookmarks/:id */
router.get('/:id', requireAuth, requirePermission('canRead'), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(req.params.id, authReq.userUuid);
  if (!row) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  res.json({ success: true, data: parseBookmark(row) });
});

/** POST /api/bookmarks */
router.post('/', requireAuth, requirePermission('canWrite'), validateBody(BookmarkSchemas.create), (req, res) => {
  const authReq = req as AuthRequest;
  const result = insertBookmark(authReq, req.body);

  if ('error' in result) {
    return res.status(result.status).json({ success: false, error: result.error });
  }

  res.status(201).json({ success: true, data: result.bookmark });
});

/** PUT /api/bookmarks/:id */
router.put('/:id', requireAuth, requirePermission('canEdit'), validateBody(BookmarkSchemas.update), (req, res) => {
  const authReq = req as AuthRequest;
  const row = db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(req.params.id, authReq.userUuid) as any;
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
    updated_at:  new Date().toISOString(),
    id:          req.params.id,
    user_uuid:   authReq.userUuid,
  };

  const doUpdate = db.transaction((updatedData: any, jinaUrl: string | null | undefined) => {
    db.prepare('UPDATE bookmarks SET url=@url, title=@title, description=@description, favicon=@favicon, tags=@tags, folder_id=@folder_id, starred=@starred, archived=@archived, color=@color, updated_at=@updated_at WHERE id=@id AND user_uuid=@user_uuid').run(updatedData);

    if (jinaUrl === null) {
      db.prepare('DELETE FROM jina_conversions WHERE bookmark_id = ? AND user_uuid = ?').run(updatedData.id, updatedData.user_uuid);
    } else if (jinaUrl !== undefined) {
      db.prepare('INSERT INTO jina_conversions (bookmark_id, user_uuid, url, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(bookmark_id) DO UPDATE SET url=excluded.url, created_at=excluded.created_at').run(updatedData.id, updatedData.user_uuid, jinaUrl, new Date().toISOString());
    }
  });

  doUpdate(updated, req.body.jinaUrl);

  audit.log('BOOKMARK_UPDATED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id } });

  if (Object.prototype.hasOwnProperty.call(req.body, 'jinaUrl') && authReq.keyType === 'human' && req.body.jinaUrl !== (row.jina_conversion_url ?? row.jina_url)) {
    audit.log('bookmark_jina_conversion_set', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id, jina_url: req.body.jinaUrl } });
  }

  res.json({ success: true, data: parseBookmark(db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(req.params.id, authReq.userUuid)) });
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
  const result = parseBookmark(db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(req.params.id, authReq.userUuid));
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
  const result = parseBookmark(db.prepare(`${BOOKMARK_SELECT} WHERE b.id = ? AND b.user_uuid = ?`).get(req.params.id, authReq.userUuid));
  audit.log('BOOKMARK_ARCHIVED', { actor: authReq.userUuid, actor_type: authReq.keyType, action: 'update', outcome: 'success', resource: 'bookmark', details: { bookmark_id: req.params.id, archived: result?.archived } });
  res.json({ success: true, data: result });
});

/** POST /api/bookmarks/bulk — Bulk import via Lobster key or agent */
router.post('/bulk', requireAuth, requirePermission('canWrite'), (req, res) => {
  const authReq = req as AuthRequest;
  const { bookmarks } = req.body;

  if (!Array.isArray(bookmarks)) {
    return res.status(400).json({ success: false, error: 'body.bookmarks must be an array' });
  }

  if (bookmarks.length > 1000) {
    return res.status(400).json({ success: false, error: 'Batch size exceeds maximum of 1000 items' });
  }

  let imported = 0;
  const errors: { url: string; reason: string }[] = [];

  for (const item of bookmarks) {
    const parsed = BookmarkSchemas.create.safeParse(item);
    if (!parsed.success) {
      const url = (item as any)?.url ?? '(unknown)';
      const reason = parsed.error.issues[0]?.message ?? 'Invalid bookmark format';
      errors.push({ url, reason });
      continue;
    }

    const result = insertBookmark(authReq, parsed.data);
    if ('error' in result) {
      errors.push({ url: parsed.data.url, reason: result.error });
    } else {
      imported++;
    }
  }

  // Accumulate errors to session if X-Session-Id header present
  const sessionId = req.headers['x-session-id'] as string | undefined;
  if (sessionId && errors.length > 0) {
    try {
      const session = db.prepare(
        'SELECT id, errors_json, error_count FROM import_sessions WHERE id = ? AND user_uuid = ? AND closed_at IS NULL'
      ).get(sessionId, authReq.userUuid) as any;

      if (session) {
        const existing = JSON.parse(session.errors_json || '[]');
        const updated = [...existing, ...errors];
        db.prepare('UPDATE import_sessions SET errors_json = ?, error_count = ? WHERE id = ?')
          .run(JSON.stringify(updated), session.error_count + errors.length, sessionId);
      }
    } catch (e: any) {
      // Silently fail if session tracking breaks; don't let it break the import response
      console.warn('[Lobster Session] Failed to accumulate errors to session:', e.message);
    }
  }

  audit.log('BOOKMARKS_BULK_IMPORTED', {
    actor: authReq.userUuid,
    actor_type: authReq.keyType,
    action: 'create',
    outcome: 'success',
    resource: 'bookmark',
    details: { imported, failed: errors.length, total: bookmarks.length, sessionId: sessionId ?? null },
  });

  res.status(207).json({ success: true, imported, failed: errors.length, errors });
});

export default router;
