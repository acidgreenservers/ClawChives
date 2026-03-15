// Row parsers — convert snake_case SQLite rows to camelCase API responses
// Extracted from server.js lines 282-322

export function parseBookmark(row: any) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags ?? '[]'),
    starred: Boolean(row.starred),
    archived: Boolean(row.archived),
    folderId: row.folder_id,
    jinaUrl: row.jina_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // remove snake_case dupes
    folder_id: undefined,
    jina_url: undefined,
    created_at: undefined,
    updated_at: undefined,
    user_uuid: undefined,
  };
}

export function parseFolder(row: any) {
  if (!row) return null;
  return {
    ...row,
    parentId: row.parent_id,
    createdAt: row.created_at,
    parent_id: undefined,
    created_at: undefined,
    user_uuid: undefined,
  };
}

export function parseAgentKey(row: any) {
  if (!row) return null;
  return {
    ...row,
    permissions: JSON.parse(row.permissions ?? '{}'),
    isActive: Boolean(row.is_active),
    expirationType: row.expiration_type,
    expirationDate: row.expiration_date,
    rateLimit: row.rate_limit,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    apiKey: row.api_key,
    // remove snake_case dupes
    is_active: undefined,
    expiration_type: undefined,
    expiration_date: undefined,
    rate_limit: undefined,
    created_at: undefined,
    last_used: undefined,
    user_uuid: undefined,
    api_key: undefined,
  };
}
