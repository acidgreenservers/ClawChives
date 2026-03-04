/**
 * IndexedDBAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements IDatabaseAdapter using the existing src/lib/indexedDB.ts layer.
 * This is the default adapter (VITE_DATABASE=INDEXEDDB).
 * Works fully offline — no server required. Ideal for GitHub Pages deployments.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { IDatabaseAdapter } from "../adapter";
import type { AgentKey, AppearanceSettings, ProfileSettings } from "../../types";
import type { Bookmark, Folder } from "../../../lib/indexedDB";
import type { AgentKey as IDBAgentKey } from "../../../types/agent";
import * as IDB from "../../../lib/indexedDB";

export class IndexedDBAdapter implements IDatabaseAdapter {
  // ── Bookmarks ──────────────────────────────────────────────────────────────

  async getBookmarks(): Promise<Bookmark[]> {
    return IDB.bookmarks.getAll();
  }

  async getBookmark(id: string): Promise<Bookmark | null> {
    const all = await IDB.bookmarks.getAll();
    return all.find((b) => b.id === id) ?? null;
  }

  async saveBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return IDB.bookmarks.add(bookmark);
  }

  async updateBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return IDB.bookmarks.update(bookmark);
  }

  async deleteBookmark(id: string): Promise<void> {
    return IDB.bookmarks.delete(id);
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  async getFolders(): Promise<Folder[]> {
    return IDB.folders.getAll();
  }

  async saveFolder(folder: Folder): Promise<Folder> {
    return IDB.folders.add(folder);
  }

  async updateFolder(folder: Folder): Promise<Folder> {
    return IDB.folders.update(folder);
  }

  async deleteFolder(id: string): Promise<void> {
    return IDB.folders.delete(id);
  }

  // ── Agent Keys ─────────────────────────────────────────────────────────────
  // Note: AgentKey types between src/services/types and src/types/agent differ
  // slightly. We treat the indexedDB layer as the source of truth here.

  async getAgentKeys(): Promise<AgentKey[]> {
    const keys = await IDB.getAllAgentKeys();
    // Normalize lastUsed: null → undefined to match IDatabaseAdapter's AgentKey
    return keys.map((k) => ({ ...k, lastUsed: k.lastUsed ?? undefined })) as AgentKey[];
  }

  async saveAgentKey(key: AgentKey): Promise<AgentKey> {
    const stored = await IDB.saveAgentKey({
      name:           key.name,
      description:    key.description,
      permissions:    key.permissions as IDBAgentKey["permissions"],
      expirationType: key.expirationType as IDBAgentKey["expirationType"],
      expirationDate: key.expirationDate,
      rateLimit:      key.rateLimit,
    });
    return { ...stored, lastUsed: stored.lastUsed ?? undefined } as AgentKey;
  }

  async revokeAgentKey(id: string): Promise<void> {
    return IDB.revokeAgentKey(id);
  }

  async deleteAgentKey(id: string): Promise<void> {
    return IDB.deleteAgentKey(id);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getAppearanceSettings(): Promise<AppearanceSettings | null> {
    return IDB.getAppearanceSettings() as Promise<AppearanceSettings | null>;
  }

  async saveAppearanceSettings(settings: AppearanceSettings): Promise<void> {
    await IDB.saveAppearanceSettings(settings as IDB.AppearanceSettings);
  }

  async getProfileSettings(): Promise<ProfileSettings | null> {
    return IDB.getProfileSettings();
  }

  async saveProfileSettings(settings: ProfileSettings): Promise<void> {
    await IDB.saveProfileSettings(settings);
  }
}
