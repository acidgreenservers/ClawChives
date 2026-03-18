/**
 * useInfiniteBookmarks — React Query infinite scroll hook
 * ──────────────────────────────────────────────────────────────
 * Manages paginated bookmark fetching with automatic cache updates.
 * Mutations (star, delete, edit, archive) update the cache directly
 * without requiring a full refetch.
 *
 * Usage:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage, ...rest } = useInfiniteBookmarks();
 */

import { useInfiniteQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useDatabaseAdapter } from "../services/database/DatabaseProvider";
import { BOOKMARKS_PAGE_SIZE } from "../services/queryClient";
import type { Bookmark } from "../services/types";

const BOOKMARKS_QUERY_KEY = ["bookmarks", "infinite"];

export function useInfiniteBookmarks() {
  const db = useDatabaseAdapter();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: BOOKMARKS_QUERY_KEY,
    queryFn: async ({ pageParam = 0 }) => {
      if (!db) return [];
      return db.getBookmarks(BOOKMARKS_PAGE_SIZE, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < BOOKMARKS_PAGE_SIZE) {
        return undefined; // No more pages
      }
      return allPages.length * BOOKMARKS_PAGE_SIZE;
    },
    enabled: !!db,
    initialPageParam: 0,
  });

  // ── Mutation: Update bookmark (star, archive, edit) ──
  const updateMutation = useMutation({
    mutationFn: async (updatedBookmark: Bookmark) => {
      if (!db) throw new Error("DB not available");
      return db.updateBookmark(updatedBookmark);
    },
    onMutate: async (updatedBookmark) => {
      // Optimistically update cache
      queryClient.setQueriesData(
        { queryKey: BOOKMARKS_QUERY_KEY },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: Bookmark[]) =>
              page.map((b) => (b.id === updatedBookmark.id ? updatedBookmark : b))
            ),
          };
        }
      );
    },
  });

  // ── Mutation: Save new bookmark ──
  const saveMutation = useMutation({
    mutationFn: async (newBookmark: Bookmark) => {
      if (!db) throw new Error("DB not available");
      return db.saveBookmark(newBookmark);
    },
    onSuccess: (savedBookmark) => {
      // Add to first page cache
      queryClient.setQueriesData(
        { queryKey: BOOKMARKS_QUERY_KEY },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: [
              [savedBookmark, ...oldData.pages[0]].slice(0, BOOKMARKS_PAGE_SIZE),
              ...oldData.pages.slice(1),
            ],
          };
        }
      );
    },
  });

  // ── Mutation: Delete bookmark ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!db) throw new Error("DB not available");
      return db.deleteBookmark(id);
    },
    onMutate: async (deletedId) => {
      // Optimistically remove from cache
      queryClient.setQueriesData(
        { queryKey: BOOKMARKS_QUERY_KEY },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages
              .map((page: Bookmark[]) => page.filter((b) => b.id !== deletedId))
              .filter((page: Bookmark[]) => page.length > 0),
          };
        }
      );
    },
  });

  // ── Flatten pages for UI ──
  const flatBookmarks = query.data?.pages.flat() ?? [];

  return {
    ...query,
    flatBookmarks,
    updateBookmark: updateMutation.mutate,
    saveBookmark: saveMutation.mutate,
    deleteBookmark: deleteMutation.mutate,
    isUpdating: updateMutation.isPending,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
