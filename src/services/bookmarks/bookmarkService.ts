// Bookmark CRUD operations

import { STORES } from "../utils/constants";
import { ValidationError } from "../utils/errors";
import { 
  getAllFromStore, 
  addToStore, 
  updateInStore, 
  deleteFromStore, 
  getFromStore,
  executeTransaction 
} from "../utils/database";
import type { Bookmark } from "../types";

export async function saveBookmark(bookmark: Bookmark): Promise<Bookmark> {
  if (!bookmark.url || !bookmark.title || !bookmark.id) {
    throw new ValidationError("Bookmark must have url, title, and id");
  }
  return addToStore(STORES.BOOKMARKS, bookmark);
}

export async function getBookmark(id: string): Promise<Bookmark | undefined> {
  return getFromStore<Bookmark>(STORES.BOOKMARKS, id);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  return getAllFromStore<Bookmark>(STORES.BOOKMARKS);
}

export async function updateBookmark(bookmark: Bookmark): Promise<Bookmark> {
  if (!bookmark.id) {
    throw new ValidationError("Bookmark must have an id");
  }
  return updateInStore(STORES.BOOKMARKS, bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  deleteFromStore(STORES.BOOKMARKS, id);
}

export async function getBookmarksByFolder(folderId: string): Promise<Bookmark[]> {
  return executeTransaction(STORES.BOOKMARKS, "readonly", (store) => {
    const index = store.index("folderId");
    return index.getAll(folderId);
  });
}

export async function getStarredBookmarks(): Promise<Bookmark[]> {
  return executeTransaction(STORES.BOOKMARKS, "readonly", (store) => {
    const index = store.index("starred");
    return index.getAll();
  });
}

export async function getArchivedBookmarks(): Promise<Bookmark[]> {
  return executeTransaction(STORES.BOOKMARKS, "readonly", (store) => {
    const index = store.index("archived");
    return index.getAll();
  });
}

export async function toggleStar(id: string): Promise<void> {
  const bookmark = await getBookmark(id);
  if (bookmark) {
    bookmark.starred = !bookmark.starred;
    await updateBookmark(bookmark);
  }
}

export async function toggleArchive(id: string): Promise<void> {
  const bookmark = await getBookmark(id);
  if (bookmark) {
    bookmark.archived = !bookmark.archived;
    await updateBookmark(bookmark);
  }
}