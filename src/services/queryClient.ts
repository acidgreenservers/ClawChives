/**
 * React Query Client Configuration
 * ────────────────────────────────────────────────────────────────
 * Centralized QueryClient setup for infinite scroll and caching
 * strategy.
 *
 * - Cache time: 1 hour
 * - Stale time: 5 minutes
 * - Retry: 2 times on network failure
 * - 50 items per page for infinite scroll
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
      retry: 2,
    },
  },
});

export const BOOKMARKS_PAGE_SIZE = 50;
