/**
 * IDatabaseAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared interface implemented by the REST adapter (Docker / SQLite mode).
 *
 * Components use the `useDatabaseAdapter()` hook instead of hardcoded
 * imports to interact with the database.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Bookmark, Folder, AgentKey, AppearanceSettings, ProfileSettings } from "../types";

export interface IDatabaseAdapter {
  // ── Bookmarks ──────────────────────────────────────────────────────────────
  getBookmarks(limit?: number, offset?: number): Promise<Bookmark[]>;
  getBookmark(id: string): Promise<Bookmark | null>;
  getBookmarkStats(): Promise<{ total: number; starred: number; archived: number }>;
  saveBookmark(bookmark: Bookmark): Promise<Bookmark>;
  saveBulkBookmarks(bookmarks: Bookmark[]): Promise<{ imported: number; failed: number; errors: { url: string; reason: string }[] }>;
  updateBookmark(bookmark: Bookmark): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<void>;
  deleteAllBookmarks(): Promise<void>;

  // ── Folders ────────────────────────────────────────────────────────────────
  getFolders(): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<Folder>;
  updateFolder(folder: Folder): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  deleteAllFolders(): Promise<void>;

  // ── Agent Keys ─────────────────────────────────────────────────────────────
  getAgentKeys(): Promise<AgentKey[]>;
  saveAgentKey(key: AgentKey): Promise<AgentKey>;
  revokeAgentKey(id: string): Promise<void>;
  deleteAgentKey(id: string): Promise<void>;

  // ── Settings ───────────────────────────────────────────────────────────────
  getAppearanceSettings(): Promise<AppearanceSettings | null>;
  saveAppearanceSettings(settings: AppearanceSettings): Promise<void>;
  getProfileSettings(): Promise<ProfileSettings | null>;
  saveProfileSettings(settings: ProfileSettings): Promise<void>;
}
