import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useState } from "react"
import type { Bookmark } from "@/services/types";

export type SortBy = "date-desc" | "date-asc" | "name-asc" | "name-desc"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Aggregates tags from an array of bookmarks and returns them sorted by count (descending).
 * @param bookmarks Array of bookmarks to aggregate tags from.
 * @returns An array of [tag, count] tuples.
 */
export function aggregateTags(bookmarks: Bookmark[]): [string, number][] {
  // Using a null-prototype object for faster key lookups than Map
  const tagObj: Record<string, number> = Object.create(null);

  // Traditional for-loops for performance over forEach
  const len = bookmarks.length;
  for (let i = 0; i < len; i++) {
    const tags = bookmarks[i].tags;
    const tagsLen = tags.length;
    for (let j = 0; j < tagsLen; j++) {
      const t = tags[j];
      tagObj[t] = (tagObj[t] || 0) + 1;
    }
  }

  // Pre-allocate entries array and sort
  const entries = Object.keys(tagObj).map(key => [key, tagObj[key]] as [string, number]);
  return entries.sort((a, b) => b[1] - a[1]);
}

/**
 * Sorts bookmarks by the specified criteria.
 * @param bookmarks Array of bookmarks to sort.
 * @param sortBy Sort criteria: date-desc (default), date-asc, name-asc, name-desc.
 * @returns A new sorted array.
 */
export function sortBookmarks(bookmarks: Bookmark[], sortBy: SortBy): Bookmark[] {
  return [...bookmarks].sort((a, b) => {
    switch (sortBy) {
      case "date-desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date-asc":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name-asc":  return (a.title || "").localeCompare(b.title || "");
      case "name-desc": return (b.title || "").localeCompare(a.title || "");
      default: return 0;
    }
  });
}

/**
 * useDebounce — Debounces a value with optional callback (300ms default)
 * Used to delay search input processing and reduce unnecessary queries.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
