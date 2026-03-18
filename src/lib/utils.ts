import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useState } from "react"
import type { Bookmark } from "../services/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Aggregates tags from an array of bookmarks and returns them sorted by count (descending).
 * @param bookmarks Array of bookmarks to aggregate tags from.
 * @returns An array of [tag, count] tuples.
 */
export function aggregateTags(bookmarks: Bookmark[]): [string, number][] {
  const tagMap = new Map<string, number>();
  bookmarks.forEach((b) => {
    b.tags.forEach((t) => tagMap.set(t, (tagMap.get(t) ?? 0) + 1));
  });

  return [...tagMap.entries()].sort((a, b) => b[1] - a[1]);
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
