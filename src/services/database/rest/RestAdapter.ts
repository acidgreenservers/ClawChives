/**
 * RestAdapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements IDatabaseAdapter by making authenticated fetch() calls to the
 * ClawChives Express API (server.js).
 *
 * Active when VITE_DATABASE=SQLITE.
 *
 * Authentication: Every request attaches the user's api- token from
 * sessionStorage as `Authorization: Bearer <token>`.
 *
 * The API base URL is read from VITE_API_URL (default: http://localhost:4242).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { IDatabaseAdapter } from "../adapter";
import type { Bookmark, Folder, AgentKey, AppearanceSettings, ProfileSettings } from "../../types";

// @ts-ignore: Vite replaces this at build-time
const API_BASE = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4242").replace(/\/$/, "");

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return sessionStorage.getItem("cc_api_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  const json = await res.json();
  return json.data as T;
}

export class RestAdapter implements IDatabaseAdapter {
  // ── Bookmarks ──────────────────────────────────────────────────────────────

  getBookmarks(): Promise<Bookmark[]> {
    return request<Bookmark[]>("/api/bookmarks");
  }

  getBookmark(id: string): Promise<Bookmark | null> {
    return request<Bookmark>(`/api/bookmarks/${id}`).catch(() => null);
  }

  async saveBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return request<Bookmark>("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify(bookmark),
    });
  }

  async updateBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return request<Bookmark>(`/api/bookmarks/${bookmark.id}`, {
      method: "PUT",
      body: JSON.stringify(bookmark),
    });
  }

  async deleteBookmark(id: string): Promise<void> {
    await request<void>(`/api/bookmarks/${id}`, { method: "DELETE" });
  }

  async deleteAllBookmarks(): Promise<void> {
    await request<void>("/api/bookmarks", { method: "DELETE" });
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  getFolders(): Promise<Folder[]> {
    return request<Folder[]>("/api/folders");
  }

  async saveFolder(folder: Folder): Promise<Folder> {
    return request<Folder>("/api/folders", {
      method: "POST",
      body: JSON.stringify(folder),
    });
  }

  async updateFolder(folder: Folder): Promise<Folder> {
    return request<Folder>(`/api/folders/${folder.id}`, {
      method: "PUT",
      body: JSON.stringify(folder),
    });
  }

  async deleteFolder(id: string): Promise<void> {
    await request<void>(`/api/folders/${id}`, { method: "DELETE" });
  }

  // ── Agent Keys ─────────────────────────────────────────────────────────────

  getAgentKeys(): Promise<AgentKey[]> {
    return request<AgentKey[]>("/api/agent-keys");
  }

  async saveAgentKey(key: AgentKey): Promise<AgentKey> {
    return request<AgentKey>("/api/agent-keys", {
      method: "POST",
      body: JSON.stringify(key),
    });
  }

  async revokeAgentKey(id: string): Promise<void> {
    await request<void>(`/api/agent-keys/${id}/revoke`, { method: "PATCH" });
  }

  async deleteAgentKey(id: string): Promise<void> {
    await request<void>(`/api/agent-keys/${id}`, { method: "DELETE" });
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  getAppearanceSettings(): Promise<AppearanceSettings | null> {
    return request<AppearanceSettings>("/api/settings/appearance").catch(() => null);
  }

  async saveAppearanceSettings(settings: AppearanceSettings): Promise<void> {
    await request<void>("/api/settings/appearance", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  getProfileSettings(): Promise<ProfileSettings | null> {
    return request<ProfileSettings>("/api/settings/profile").catch(() => null);
  }

  async saveProfileSettings(settings: ProfileSettings): Promise<void> {
    await request<void>("/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }
}
