// Bookmark tag management

import { getAllBookmarks, updateBookmark } from "./bookmarkService";
import type { Tag } from "../types";

export async function addTagToBookmark(bookmarkId: string, tag: string): Promise<void> {
  const bookmark = await getAllBookmarks().then(b => b.find(b => b.id === bookmarkId));
  if (bookmark && !bookmark.tags.includes(tag)) {
    bookmark.tags.push(tag);
    await updateBookmark(bookmark);
  }
}

export async function removeTagFromBookmark(bookmarkId: string, tag: string): Promise<void> {
  const bookmark = await getAllBookmarks().then(b => b.find(b => b.id === bookmarkId));
  if (bookmark) {
    bookmark.tags = bookmark.tags.filter(t => t !== tag);
    await updateBookmark(bookmark);
  }
}

export async function getTagStats(): Promise<Tag[]> {
  const bookmarks = await getAllBookmarks();
  const tagMap = new Map<string, number>();
  
  bookmarks.forEach(b => {
    b.tags.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });
  
  return Array.from(tagMap.entries()).map(([name, count], index) => ({
    id: `tag-${index}`,
    name,
    count,
  }));
}

export async function renameTag(oldName: string, newName: string): Promise<void> {
  const bookmarks = await getAllBookmarks();
  const updates = bookmarks
    .filter(b => b.tags.includes(oldName))
    .map(b => ({
      ...b,
      tags: b.tags.map(t => t === oldName ? newName : t),
    }));
  
  await Promise.all(updates.map(updateBookmark));
}

export async function mergeTags(sourceTag: string, targetTag: string): Promise<void> {
  const bookmarks = await getAllBookmarks();
  const updates = bookmarks
    .filter(b => b.tags.includes(sourceTag))
    .map(b => {
      const tags = [...b.tags.filter(t => t !== sourceTag)];
      if (!tags.includes(targetTag)) {
        tags.push(targetTag);
      }
      return { ...b, tags };
    });
  
  await Promise.all(updates.map(updateBookmark));
}