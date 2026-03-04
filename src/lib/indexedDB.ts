// IndexedDB utility for local storage
const DB_NAME = "ClawChivesDB";
const DB_VERSION = 5; // Bumped: added userKeys store

// Store names
const STORES = {
  BOOKMARKS: "bookmarks",
  FOLDERS: "folders",
  TAGS: "tags",
  AGENT_KEYS: "agent_keys",
  USER_KEYS: "user_keys",       // <-- NEW: stores identity keys separately from user record
  APPEARANCE_SETTINGS: "appearance_settings",
  PROFILE_SETTINGS: "profile_settings",
  USER: "user",
} as const;

// Types
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  tags: string[];
  folderId?: string;
  starred: boolean;
  archived: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

import type { AgentKey, ExpirationType } from "../types/agent";

export interface AppearanceSettings {
  theme: "light" | "dark" | "auto";
  layout: "grid" | "list" | "masonry";
  itemsPerPage: 12 | 24 | 48;
  sortBy: "dateAdded" | "title" | "starred";
  notifications: boolean;
  pwaUpdates: boolean;
  compactMode?: boolean;
  showFavicons?: boolean;
}

export interface ProfileSettings {
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
}

/** The user's account record — does NOT store sensitive key material */
export interface User {
  username: string;
  displayName: string;
  email?: string;
  uuid: string;
  avatar?: string;
  createdAt: string;
}

/** Stored in the userKeys store — keeps key material isolated from user record */
export interface UserKey {
  id: string;         // typically same as user uuid
  uuid: string;       // links back to User.uuid
  tokenHash: string;  // SHA-256 hash of the hu-<64chars> identity token (NEVER store plaintext)
  createdAt: string;
}

export interface DatabaseStats {
  totalBookmarks: number;
  totalFolders: number;
  uniqueTags: number;
  starredCount: number;
  archivedCount: number;
  totalKeys: number;
  totalSettings: number;
  totalSizeMB: number;
}

// ─── Database initialization ────────────────────────────────────────────────

export const resetDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => { console.log("Database deleted successfully"); resolve(); };
    request.onerror = () => { console.error("Error deleting database:", request.error); reject(request.error); };
    request.onblocked = () => { console.warn("Database deletion blocked - close all tabs and retry"); };
  });
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = request.error;
      if (error?.name === "VersionError") {
        reject(new Error(`Database version conflict. Current version is higher than ${DB_VERSION}. Please reset the database.`));
      } else {
        reject(new Error(`Failed to open database: ${error?.message}`));
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;

      // ── Helper: get or create a store, returns IDBObjectStore ──────────────
      const getOrCreate = (
        name: string,
        options: IDBObjectStoreParameters
      ): IDBObjectStore => {
        if (db.objectStoreNames.contains(name)) {
          return tx.objectStore(name); // use upgrade tx to get existing store
        }
        return db.createObjectStore(name, options);
      };

      // ── Helper: add index only if it doesn't already exist ─────────────────
      const ensureIndex = (
        store: IDBObjectStore,
        indexName: string,
        keyPath: string,
        options?: IDBIndexParameters
      ) => {
        if (!store.indexNames.contains(indexName)) {
          store.createIndex(indexName, keyPath, options);
        }
      };

      // ── bookmarks ───────────────────────────────────────────────────────────
      const bookmarkStore = getOrCreate(STORES.BOOKMARKS, { keyPath: "id" });
      ensureIndex(bookmarkStore, "url", "url", { unique: true });
      ensureIndex(bookmarkStore, "folderId", "folderId");
      ensureIndex(bookmarkStore, "starred", "starred");
      ensureIndex(bookmarkStore, "archived", "archived");
      ensureIndex(bookmarkStore, "tags", "tags", { multiEntry: true });

      // ── folders ─────────────────────────────────────────────────────────────
      const folderStore = getOrCreate(STORES.FOLDERS, { keyPath: "id" });
      ensureIndex(folderStore, "parentId", "parentId");

      // ── tags ────────────────────────────────────────────────────────────────
      const tagStore = getOrCreate(STORES.TAGS, { keyPath: "id" });
      ensureIndex(tagStore, "name", "name", { unique: true });

      // ── agent_keys ──────────────────────────────────────────────────────────
      const agentKeyStore = getOrCreate(STORES.AGENT_KEYS, { keyPath: "id" });
      ensureIndex(agentKeyStore, "apiKey", "apiKey", { unique: true });
      ensureIndex(agentKeyStore, "name", "name", { unique: false });
      ensureIndex(agentKeyStore, "isActive", "isActive");

      // ── user_keys (NEW in v5) ────────────────────────────────────────────────
      const userKeyStore = getOrCreate(STORES.USER_KEYS, { keyPath: "id" });
      ensureIndex(userKeyStore, "uuid", "uuid", { unique: true });

      // ── appearance_settings ─────────────────────────────────────────────────
      getOrCreate(STORES.APPEARANCE_SETTINGS, { keyPath: "id" });

      // ── profile_settings ────────────────────────────────────────────────────
      getOrCreate(STORES.PROFILE_SETTINGS, { keyPath: "id" });

      // ── user ────────────────────────────────────────────────────────────────
      const userStore = getOrCreate(STORES.USER, { keyPath: "uuid" });
      ensureIndex(userStore, "username", "username", { unique: true });
    };
  });
};

// ─── Generic CRUD ────────────────────────────────────────────────────────────

const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const add = async <T>(storeName: string, data: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).add(data);
    req.onsuccess = () => resolve(data);
    req.onerror = () => {
      // Provide friendlier error messages for constraint violations
      if (req.error?.name === "ConstraintError") {
        reject(new Error(`A record with this unique value already exists in '${storeName}'.`));
      } else {
        reject(req.error);
      }
    };
  });
};

const update = async <T>(storeName: string, data: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(data);
    req.onerror = () => reject(req.error);
  });
};

const remove = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// ─── Bookmark operations ──────────────────────────────────────────────────────

export const bookmarks = {
  getAll: () => getAll<Bookmark>(STORES.BOOKMARKS),
  add: (bookmark: Bookmark) => add(STORES.BOOKMARKS, bookmark),
  update: (bookmark: Bookmark) => update(STORES.BOOKMARKS, bookmark),
  delete: (id: string) => remove(STORES.BOOKMARKS, id),
  getByFolder: async (folderId: string): Promise<Bookmark[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BOOKMARKS, "readonly");
      const req = tx.objectStore(STORES.BOOKMARKS).index("folderId").getAll(folderId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  getStarred: async (): Promise<Bookmark[]> => {
    const all = await getAll<Bookmark>(STORES.BOOKMARKS);
    return all.filter((b) => b.starred);
  },
  getArchived: async (): Promise<Bookmark[]> => {
    const all = await getAll<Bookmark>(STORES.BOOKMARKS);
    return all.filter((b) => b.archived);
  },
  search: async (query: string): Promise<Bookmark[]> => {
    const all = await getAll<Bookmark>(STORES.BOOKMARKS);
    const q = query.toLowerCase();
    return all.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
    );
  },
};

// ─── Folder operations ────────────────────────────────────────────────────────

export const folders = {
  getAll: () => getAll<Folder>(STORES.FOLDERS),
  add: (folder: Folder) => add(STORES.FOLDERS, folder),
  update: (folder: Folder) => update(STORES.FOLDERS, folder),
  delete: (id: string) => remove(STORES.FOLDERS, id),
  getByParent: async (parentId?: string): Promise<Folder[]> => {
    const all = await getAll<Folder>(STORES.FOLDERS);
    return all.filter((f) => f.parentId === parentId);
  },
};

// ─── Tag operations ───────────────────────────────────────────────────────────

export const tags = {
  getAll: () => getAll<Tag>(STORES.TAGS),
  add: (tag: Tag) => add(STORES.TAGS, tag),
  update: (tag: Tag) => update(STORES.TAGS, tag),
  delete: (id: string) => remove(STORES.TAGS, id),
  getByName: async (name: string): Promise<Tag | undefined> => {
    const all = await getAll<Tag>(STORES.TAGS);
    return all.find((t) => t.name === name);
  },
};

// ─── User operations ──────────────────────────────────────────────────────────

/** Get all users stored in the database (multi-user support) */
export const getAllUsers = async (): Promise<User[]> => {
  return getAll<User>(STORES.USER);
};

/** Get a specific user by UUID */
export const getUserByUUID = async (uuid: string): Promise<User | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USER, "readonly");
    const req = tx.objectStore(STORES.USER).get(uuid);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

/** Get user by username */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  const users = await getAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null;
};

/** Get the current user (deprecated - use getUserByUUID for multi-user) */
export const getUser = async (): Promise<User | null> => {
  const users = await getAllUsers();
  return users.length > 0 ? users[0] : null;
};

/** Check if a username is already taken — uses scan, not index, for migration safety */
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const users = await getAll<User>(STORES.USER);
  return users.some((u) => u.username.toLowerCase() === username.toLowerCase());
};

/** Save or update the user record (does NOT include key material) */
export const saveUser = async (user: User): Promise<User> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USER, "readwrite");
    const req = tx.objectStore(STORES.USER).put(user);
    req.onsuccess = () => resolve(user);
    req.onerror = () => {
      if (req.error?.name === "ConstraintError") {
        reject(new Error(`Username "${user.username}" is already taken. Please choose a different username.`));
      } else {
        reject(req.error);
      }
    };
  });
};

/** Delete the user record */
export const deleteUser = async (uuid: string): Promise<void> => {
  return remove(STORES.USER, uuid);
};

// ─── User Key operations ──────────────────────────────────────────────────────

/** Save an identity key for a user, in the dedicated userKeys store */
export const saveUserKey = async (userKey: UserKey): Promise<UserKey> => {
  return update(STORES.USER_KEYS, userKey); // put so it can be overwritten on re-setup
};

/** Get the identity key hash for a given user UUID — uses scan, not index, for migration safety */
export const getUserKey = async (uuid: string): Promise<UserKey | null> => {
  const keys = await getAll<UserKey>(STORES.USER_KEYS);
  return keys.find((k) => k.uuid === uuid) ?? null;
};

/** Verify a plaintext token against stored hash for a user */
export const verifyUserToken = async (uuid: string, plaintextToken: string): Promise<boolean> => {
  const { verifyToken } = await import("./crypto");
  const userKey = await getUserKey(uuid);
  if (!userKey) return false;
  return verifyToken(plaintextToken, userKey.tokenHash);
};

/** Delete the identity key for a user (e.g., on account wipe) */
export const deleteUserKey = async (uuid: string): Promise<void> => {
  const key = await getUserKey(uuid);
  if (key) await remove(STORES.USER_KEYS, key.id);
};

// ─── Agent Key operations ─────────────────────────────────────────────────────

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
}

export const getAllAgentKeys = async (): Promise<AgentKey[]> => {
  return getAll<AgentKey>(STORES.AGENT_KEYS);
};

export const saveAgentKey = async (data: {
  name: string;
  description?: string;
  permissions: AgentKey["permissions"];
  expirationType: ExpirationType;
  expirationDate?: string;
  rateLimit?: number;
}): Promise<AgentKey> => {
  // Check for duplicate name (soft warning — names aren't required to be unique, just informational)
  const existing = await getAllAgentKeys();
  const nameTaken = existing.some((k) => k.name.toLowerCase() === data.name.toLowerCase() && k.isActive);
  if (nameTaken) {
    throw new Error(`An active agent key named "${data.name}" already exists. Choose a different name.`);
  }

  const apiKey = `ag-${generateRandomString(64)}`;
  const agentKey: AgentKey = {
    id: crypto.randomUUID(),
    name: data.name,
    description: data.description,
    apiKey,
    permissions: data.permissions,
    expirationType: data.expirationType,
    expirationDate: data.expirationDate,
    rateLimit: data.rateLimit,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastUsed: null,
  };
  return add(STORES.AGENT_KEYS, agentKey);
};

export const deleteAgentKey = async (id: string): Promise<void> => {
  return remove(STORES.AGENT_KEYS, id);
};

export const revokeAgentKey = async (id: string): Promise<void> => {
  const agents = await getAll<AgentKey>(STORES.AGENT_KEYS);
  const agent = agents.find((a) => a.id === id);
  if (agent) {
    agent.isActive = false;
    await update(STORES.AGENT_KEYS, agent);
  }
};

/** Validate an agent key — checks existence, active status, and expiry */
export const validateAgentKey = async (apiKey: string): Promise<{ valid: boolean; reason?: string; key?: AgentKey }> => {
  const agents = await getAllAgentKeys();
  const key = agents.find((k) => k.apiKey === apiKey);

  if (!key) return { valid: false, reason: "Agent key not found" };
  if (!key.isActive) return { valid: false, reason: "Agent key has been revoked" };

  if (key.expirationType !== "never" && key.expirationDate) {
    if (new Date(key.expirationDate) < new Date()) {
      return { valid: false, reason: "Agent key has expired" };
    }
  }

  return { valid: true, key };
};

// ─── Appearance Settings ──────────────────────────────────────────────────────

export const getAppearanceSettings = async (): Promise<AppearanceSettings | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.APPEARANCE_SETTINGS, "readonly");
    const req = tx.objectStore(STORES.APPEARANCE_SETTINGS).get("default");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

export const saveAppearanceSettings = async (settings: AppearanceSettings): Promise<AppearanceSettings> => {
  const db = await openDB();
  const data = { ...settings, id: "default" };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.APPEARANCE_SETTINGS, "readwrite");
    const req = tx.objectStore(STORES.APPEARANCE_SETTINGS).put(data);
    req.onsuccess = () => resolve(data);
    req.onerror = () => reject(req.error);
  });
};

// ─── Profile Settings ─────────────────────────────────────────────────────────

export const getProfileSettings = async (): Promise<ProfileSettings | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROFILE_SETTINGS, "readonly");
    const req = tx.objectStore(STORES.PROFILE_SETTINGS).get("default");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
};

export const saveProfileSettings = async (settings: ProfileSettings): Promise<ProfileSettings> => {
  const db = await openDB();
  const data = { ...settings, id: "default" };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROFILE_SETTINGS, "readwrite");
    const req = tx.objectStore(STORES.PROFILE_SETTINGS).put(data);
    req.onsuccess = () => resolve(data);
    req.onerror = () => reject(req.error);
  });
};

// ─── Database Stats & Utilities ───────────────────────────────────────────────

export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  const [bookmarksList, foldersList, tagsList, keysList] = await Promise.all([
    bookmarks.getAll(),
    folders.getAll(),
    tags.getAll(),
    getAllAgentKeys(),
  ]);
  const settings = await Promise.all([getProfileSettings(), getAppearanceSettings()]);

  return {
    totalBookmarks: bookmarksList.length,
    totalFolders: foldersList.length,
    uniqueTags: tagsList.length,
    starredCount: bookmarksList.filter((b) => b.starred).length,
    archivedCount: bookmarksList.filter((b) => b.archived).length,
    totalKeys: keysList.length,
    totalSettings: settings.filter(Boolean).length,
    totalSizeMB: (bookmarksList.length * 512 + foldersList.length * 128 + keysList.length * 256) / 1024 / 1024,
  };
};

export const clearDatabase = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length === 0) { resolve(); return; }
    const tx = db.transaction(storeNames, "readwrite");
    storeNames.forEach((name) => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const IndexedDB = {
  bookmarks,
  folders,
  tags,
  // User (multi-user support)
  getUser,              // deprecated - returns first user
  getAllUsers,
  getUserByUUID,
  getUserByUsername,
  saveUser,
  deleteUser,
  isUsernameTaken,
  // User Keys (separate from user record)
  saveUserKey,
  getUserKey,
  deleteUserKey,
  verifyUserToken,      // secure token verification with hashing
  // Agent Keys
  getAllAgentKeys,
  saveAgentKey,
  deleteAgentKey,
  revokeAgentKey,
  validateAgentKey,
  // Settings
  getAppearanceSettings,
  saveAppearanceSettings,
  getProfileSettings,
  saveProfileSettings,
  // DB Utils
  resetDatabase,
  getDatabaseStats,
  clearDatabase,
};