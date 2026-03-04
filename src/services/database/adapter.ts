/**
 * IDatabaseAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared interface implemented by both the IndexedDB adapter (static / GitHub
 * Pages mode) and the REST adapter (Docker / SQLite mode).
 *
 * Components NEVER import a concrete adapter directly — they use the
 * `useDatabaseAdapter()` hook from DatabaseProvider.tsx, which resolves the
 * correct adapter at build time via VITE_DATABASE.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Bookmark, Folder, AgentKey, AppearanceSettings, ProfileSettings } from "../types";

export interface IDatabaseAdapter {
  // ── Bookmarks ──────────────────────────────────────────────────────────────
  getBookmarks(): Promise<Bookmark[]>;
  getBookmark(id: string): Promise<Bookmark | null>;
  saveBookmark(bookmark: Bookmark): Promise<Bookmark>;
  updateBookmark(bookmark: Bookmark): Promise<Bookmark>;
  deleteBookmark(id: string): Promise<void>;

  // ── Folders ────────────────────────────────────────────────────────────────
  getFolders(): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<Folder>;
  updateFolder(folder: Folder): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;

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
