// Bookmark search and filtering

import { getAllBookmarks } from "./bookmarkService";
import type { Bookmark } from "../types";

export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  const lowerQuery = query.toLowerCase();
  
  return bookmarks.filter(
    b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      b.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export async function filterByTags(tags: string[]): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.filter(b => 
    tags.every(tag => b.tags.includes(tag))
  );
}

export async function filterByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Bookmark[]> {
  const bookmarks = await getAllBookmarks();
  return bookmarks.filter(b => {
    const created = new Date(b.createdAt);
    return created >= startDate && created <= endDate;
  });
}

export async function advancedSearch(filters: {
  query?: string;
  tags?: string[];
  folderId?: string;
  starred?: boolean;
  archived?: boolean;
}): Promise<Bookmark[]> {
  let bookmarks = await getAllBookmarks();
  
  if (filters.query) {
    const lowerQuery = filters.query.toLowerCase();
    bookmarks = bookmarks.filter(
      b =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.description?.toLowerCase().includes(lowerQuery) ||
        b.url.toLowerCase().includes(lowerQuery)
    );
  }
  
  if (filters.tags && filters.tags.length > 0) {
    bookmarks = bookmarks.filter(b =>
      filters.tags!.every(tag => b.tags.includes(tag))
    );
  }
  
  if (filters.folderId) {
    bookmarks = bookmarks.filter(b => b.folderIds?.includes(filters.folderId as string));
  }
  
  if (filters.starred !== undefined) {
    bookmarks = bookmarks.filter(b => b.starred === filters.starred);
  }
  
  if (filters.archived !== undefined) {
    bookmarks = bookmarks.filter(b => b.archived === filters.archived);
  }
  
  return bookmarks;
}