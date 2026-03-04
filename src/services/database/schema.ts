// Database schema definition

import { STORES } from "../utils/constants";

export function createSchema(db: IDBDatabase, _oldVersion: number): void {
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
}