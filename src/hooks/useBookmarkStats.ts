/**
 * useBookmarkStats — Fetch total bookmark counts
 * ─────────────────────────────────────────────────────────────────────
 * Independent of infinite scroll pagination.
 * Always refetches on any bookmark mutation (staleTime: 0).
 */

import { useQuery } from '@tanstack/react-query';
import { useDatabaseAdapter } from '../services/database/DatabaseProvider';

export const BOOKMARK_STATS_QUERY_KEY = ['bookmarks', 'stats'];

export function useBookmarkStats() {
  const db = useDatabaseAdapter();
  return useQuery({
    queryKey: BOOKMARK_STATS_QUERY_KEY,
    queryFn: () => db!.getBookmarkStats(),
    enabled: !!db,
    staleTime: 0, // Always consider stale — rely on invalidation
  });
}
