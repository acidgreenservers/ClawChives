// IndexedDB utility for local storage
const DB_NAME = "ClawChivesDB";
const DB_VERSION = 4; // Increased to handle version conflicts

// Store names
const STORES = {
  BOOKMARKS: "bookmarks",
  FOLDERS: "folders",
  TAGS: "tags",
  AGENT_KEYS: "agent_keys",
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

export interface User {
  username: string;
  displayName: string;
  email?: string;
  uuid: string;
  publicKey?: string;
  avatar?: string;
  token?: string;
  createdAt: string;
}




// Database reset function - deletes and recreates the database
export const resetDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve();
    };

    request.onerror = () => {
      console.error("Error deleting database:", request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("Database deletion blocked - closing all connections");
      // Force close all connections
      indexedDB.databases().then((databases) => {
        databases.forEach((db) => {
          if (db.name === DB_NAME) {
            // Database will be deleted once all connections are closed
          }
        });
      });
    };
  });
};

// Database initialization
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = request.error;
      if (error?.name === "VersionError") {
        // Version conflict - database exists with higher version
        console.error("Version conflict: Database version is higher than requested");
        reject(new Error(`Database version conflict. Current version is higher than ${DB_VERSION}. Please reset the database.`));
      } else {
        reject(new Error(`Failed to open database: ${error?.message}`));
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);

      // Create bookmarks store
      if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
        const bookmarkStore = db.createObjectStore(STORES.BOOKMARKS, { keyPath: "id" });
        bookmarkStore.createIndex("url", "url", { unique: true });
        bookmarkStore.createIndex("folderId", "folderId");
        bookmarkStore.createIndex("starred", "starred");
        bookmarkStore.createIndex("archived", "archived");
        bookmarkStore.createIndex("tags", "tags", { multiEntry: true });
      }

      // Create folders store
      if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
        const folderStore = db.createObjectStore(STORES.FOLDERS, { keyPath: "id" });
        folderStore.createIndex("parentId", "parentId");
      }

      // Create tags store
      if (!db.objectStoreNames.contains(STORES.TAGS)) {
        const tagStore = db.createObjectStore(STORES.TAGS, { keyPath: "id" });
        tagStore.createIndex("name", "name", { unique: true });
      }

      // Create agent keys store
      if (!db.objectStoreNames.contains(STORES.AGENT_KEYS)) {
        const agentKeyStore = db.createObjectStore(STORES.AGENT_KEYS, { keyPath: "id" });
        agentKeyStore.createIndex("apiKey", "apiKey", { unique: true });
        agentKeyStore.createIndex("isActive", "isActive");
      }

      // Create appearance settings store
      if (!db.objectStoreNames.contains(STORES.APPEARANCE_SETTINGS)) {
        db.createObjectStore(STORES.APPEARANCE_SETTINGS, { keyPath: "id" });
      }

      // Create profile settings store
      if (!db.objectStoreNames.contains(STORES.PROFILE_SETTINGS)) {
        db.createObjectStore(STORES.PROFILE_SETTINGS, { keyPath: "id" });
      }

      // Create user store
      if (!db.objectStoreNames.contains(STORES.USER)) {
        db.createObjectStore(STORES.USER, { keyPath: "uuid" });
      }
    };
  });
};

// Generic CRUD operations
const getAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const add = async <T>(storeName: string, data: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
};

const update = async <T>(storeName: string, data: T): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
};

const remove = async (storeName: string, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Bookmark operations
export const bookmarks = {
  getAll: () => getAll<Bookmark>(STORES.BOOKMARKS),
  add: (bookmark: Bookmark) => add(STORES.BOOKMARKS, bookmark),
  update: (bookmark: Bookmark) => update(STORES.BOOKMARKS, bookmark),
  delete: (id: string) => remove(STORES.BOOKMARKS, id),
  getByFolder: async (folderId: string): Promise<Bookmark[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKMARKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index("folderId");
      const request = index.getAll(folderId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  getStarred: async (): Promise<Bookmark[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKMARKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index("starred");
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  getArchived: async (): Promise<Bookmark[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKMARKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index("archived");
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  search: async (query: string): Promise<Bookmark[]> => {
    const bookmarks = await getAll<Bookmark>(STORES.BOOKMARKS);
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.description?.toLowerCase().includes(lowerQuery) ||
        b.url.toLowerCase().includes(lowerQuery) ||
        b.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },
};

// Folder operations
export const folders = {
  getAll: () => getAll<Folder>(STORES.FOLDERS),
  add: (folder: Folder) => add(STORES.FOLDERS, folder),
  update: (folder: Folder) => update(STORES.FOLDERS, folder),
  delete: (id: string) => remove(STORES.FOLDERS, id),
  getByParent: async (parentId?: string): Promise<Folder[]> => {
    const folders = await getAll<Folder>(STORES.FOLDERS);
    return folders.filter((f) => f.parentId === parentId);
  },
};

// Tag operations
export const tags = {
  getAll: () => getAll<Tag>(STORES.TAGS),
  add: (tag: Tag) => add(STORES.TAGS, tag),
  update: (tag: Tag) => update(STORES.TAGS, tag),
  delete: (id: string) => remove(STORES.TAGS, id),
  getByName: async (name: string): Promise<Tag | undefined> => {
    const tags = await getAll<Tag>(STORES.TAGS);
    return tags.find((t) => t.name === name);
  },
};

// Agent key operations
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
  const apiKey = `claw_${generateRandomString(32)}`;
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

// Appearance settings operations
export const getAppearanceSettings = async (): Promise<AppearanceSettings | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.APPEARANCE_SETTINGS, "readonly");
    const store = transaction.objectStore(STORES.APPEARANCE_SETTINGS);
    const request = store.get("default");

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveAppearanceSettings = async (
  settings: AppearanceSettings
): Promise<AppearanceSettings> => {
  const db = await openDB();
  const dataWithId = { ...settings, id: "default" };
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.APPEARANCE_SETTINGS, "readwrite");
    const store = transaction.objectStore(STORES.APPEARANCE_SETTINGS);
    const request = store.put(dataWithId);

    request.onsuccess = () => resolve(dataWithId);
    request.onerror = () => reject(request.error);
  });
};

// Profile settings operations
export const getProfileSettings = async (): Promise<ProfileSettings | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILE_SETTINGS, "readonly");
    const store = transaction.objectStore(STORES.PROFILE_SETTINGS);
    const request = store.get("default");

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveProfileSettings = async (
  settings: ProfileSettings
): Promise<ProfileSettings> => {
  const db = await openDB();
  const dataWithId = { ...settings, id: "default" };
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILE_SETTINGS, "readwrite");
    const store = transaction.objectStore(STORES.PROFILE_SETTINGS);
    const request = store.put(dataWithId);

    request.onsuccess = () => resolve(dataWithId);
    request.onerror = () => reject(request.error);
  });
};

// User operations
export const getUser = async (): Promise<User | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.USER, "readonly");
    const store = transaction.objectStore(STORES.USER);
    const request = store.getAll();

    request.onsuccess = () => {
      const users = request.result;
      resolve(users.length > 0 ? users[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveUser = async (user: User): Promise<User> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.USER, "readwrite");
    const store = transaction.objectStore(STORES.USER);
    const request = store.put(user);

    request.onsuccess = () => resolve(user);
    request.onerror = () => reject(request.error);
  });
};

// Utility function to generate random string
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
export const getDatabaseStats = async (): Promise<DatabaseStats> => {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    let itemCount = 0;
    const storeNames = Array.from(db.objectStoreNames);
    
    if (storeNames.length === 0) {
        resolve({
            totalBookmarks: 0,
            totalFolders: 0,
            uniqueTags: 0,
            starredCount: 0,
            archivedCount: 0,
            totalKeys: 0,
            totalSettings: 0,
            totalSizeMB: 0
        });
        return;
    }

    const transaction = db.transaction(storeNames, "readonly");
    
    let completedRequests = 0;
    
    storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        countRequest.onsuccess = async () => {
            itemCount += countRequest.result;
            completedRequests++;
            if (completedRequests === storeNames.length) {
                // Rough estimation of size, since we can't easily quantify indexedDB size accurately without iterating all data.
                const allKeys = await getAllAgentKeys();
                const allSettings = await Promise.all([
                  getProfileSettings(),
                  getAppearanceSettings()
                ]);

                // To compute proper counts relying on internal logic 
                const bookmarksList = await bookmarks.getAll()
                const foldersList = await folders.getAll()
                const tagsList = await tags.getAll()

                resolve({
                    totalBookmarks: bookmarksList.length,
                    totalFolders: foldersList.length,
                    uniqueTags: tagsList.length,
                    starredCount: bookmarksList.filter((b: any) => b.starred).length,
                    archivedCount: bookmarksList.filter((b: any) => b.archived).length,
                    totalKeys: allKeys.length,
                    totalSettings: allSettings.filter(Boolean).length,
                    totalSizeMB: itemCount * 512 / 1024 / 1024,
                });
            }
        };
        
        countRequest.onerror = () => reject(countRequest.error);
    });
  });
};

export const clearDatabase = async (): Promise<void> => {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length === 0) {
        resolve();
        return;
    }
    const transaction = db.transaction(storeNames, "readwrite");

    storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const IndexedDB = {
  bookmarks,
  folders,
  tags,
  getAllAgentKeys,
  saveAgentKey,
  deleteAgentKey,
  revokeAgentKey,
  getAppearanceSettings,
  saveAppearanceSettings,
  getProfileSettings,
  saveProfileSettings,
  getUser,
  saveUser,
  resetDatabase,
  getDatabaseStats,
  clearDatabase
};