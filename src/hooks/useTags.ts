/**
 * useTags — Fetch all unique tags from the database
 * ─────────────────────────────────────────────────────────────────────
 * Accurate list of all tags for the user, bypassing infinite pagination.
 * Used for accurate stats and global tag management.
 */

import { useQuery } from '@tanstack/react-query';
import { useDatabaseAdapter } from '../services/database/DatabaseProvider';

export const TAGS_QUERY_KEY = ['bookmarks', 'tags'];

export function useTags() {
  const db = useDatabaseAdapter();
  return useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: () => db!.getTags(),
    enabled: !!db,
    staleTime: 0, // Immediately stale on mutations
    gcTime: 60000,  // Cache for 1 minute
  });
}
