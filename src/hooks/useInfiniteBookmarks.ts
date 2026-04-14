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
import { BOOKMARK_STATS_QUERY_KEY } from "./useBookmarkStats";
import { FOLDER_COUNTS_QUERY_KEY } from "./useFolderCounts";
import { TAGS_QUERY_KEY } from "./useTags";
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
    onSettled: () => {
      // Invalidate stats if starred/archived/folder changed
      queryClient.invalidateQueries({ queryKey: BOOKMARK_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
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
    onSettled: () => {
      // Invalidate stats — total count increased
      queryClient.invalidateQueries({ queryKey: BOOKMARK_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
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
    onSettled: () => {
      // Invalidate stats — total count decreased
      queryClient.invalidateQueries({ queryKey: BOOKMARK_STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
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
