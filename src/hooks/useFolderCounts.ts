/**
 * useFolderCounts — Fetch bookmark counts per folder
 * ─────────────────────────────────────────────────────────────────────
 * Accurate counts from the backend, including non-loaded bookmarks.
 * Debounced staleTime (500ms) to reduce thrashing on rapid mutations.
 * Cached for 1 minute to reuse data across component remounts.
 */

import { useQuery } from '@tanstack/react-query';
import { useDatabaseAdapter } from '../services/database/DatabaseProvider';

export const FOLDER_COUNTS_QUERY_KEY = ['bookmarks', 'folder-counts'];

export function useFolderCounts() {
  const db = useDatabaseAdapter();
  return useQuery({
    queryKey: FOLDER_COUNTS_QUERY_KEY,
    queryFn: () => db!.getFolderCounts(),
    enabled: !!db,
    staleTime: 0, // Invalidate immediately to show updated counts after moves
    gcTime: 60000,  // Keep in cache for 60s (reuse across remounts)
  });
}
