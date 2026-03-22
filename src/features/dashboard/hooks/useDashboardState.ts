import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDatabaseAdapter } from "@/services/database/DatabaseProvider";
import { useInfiniteBookmarks } from "@/hooks/useInfiniteBookmarks";
import { useBookmarkStats } from "@/hooks/useBookmarkStats";
import { useTags } from "@/hooks/useTags";
import { FOLDER_COUNTS_QUERY_KEY } from "@/hooks/useFolderCounts";
import { useSidebarSearch } from "@/hooks/useSidebarSearch";
import { useDebounce, sortBookmarks } from '@/shared/lib/utils';
import type { SortBy } from '@/shared/lib/utils';
import { generateUUID } from '@/shared/lib/crypto';
import type { Bookmark, Folder } from "@/services/types";

export type NavTab = "dashboard" | "all" | "starred" | "tags" | "archived";

export const useDashboardState = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(() => sessionStorage.getItem("cc_selected_folder"));
  const [activeTab, setActiveTab] = useState<NavTab>(() => (sessionStorage.getItem("cc_active_tab") as NavTab) || "dashboard");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; variant?: "info" | "error" } | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(() => (sessionStorage.getItem("cc_sort_by") as SortBy) || "date-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (sessionStorage.getItem("cc_view_mode") as "grid" | "list") || "grid");

  const db = useDatabaseAdapter();
  const queryClient = useQueryClient();

  const {
    flatBookmarks,
    updateBookmark,
    saveBookmark,
    deleteBookmark,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteBookmarks();

  const { data: stats } = useBookmarkStats();
  const { data: allTags } = useTags();
  const debouncedQuery = useDebounce(searchQuery, 300);
  const filteredFolders = useSidebarSearch(folders, searchQuery);

  const loadFolders = async () => {
    if (!db) return;
    try {
      const allFolders = await db.getFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [db]);

  useEffect(() => {
    if (!db) return;
    queryClient.prefetchQuery({
      queryKey: FOLDER_COUNTS_QUERY_KEY,
      queryFn: () => db.getFolderCounts(),
    });
  }, [db, queryClient]);

  const handleSortChange = (sort: SortBy) => {
    setSortBy(sort);
    sessionStorage.setItem("cc_sort_by", sort);
  };

  const handleViewChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    sessionStorage.setItem("cc_view_mode", mode);
  };

  const handleSaveBookmark = async (bookmark: Bookmark) => {
    try {
      const isExisting = flatBookmarks.some((b) => b.id === bookmark.id);
      if (isExisting) {
        updateBookmark(bookmark);
      } else {
        saveBookmark(bookmark);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      setAlertModal({ title: "Pinch Failed", message: "Failed to save Pinchmark.", variant: "error" });
    }
  };

  const handleSelectFolder = (id: string | null) => {
    setSelectedFolder(id);
    if (id) {
      sessionStorage.setItem("cc_selected_folder", id);
      setActiveTab("all");
      sessionStorage.setItem("cc_active_tab", "all");
    } else {
      sessionStorage.removeItem("cc_selected_folder");
    }
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    sessionStorage.setItem("cc_active_tab", tab);
    setSelectedFolder(null);
    sessionStorage.removeItem("cc_selected_folder");
    setTagFilter(null);
  };

  const handleAddFolder = async (name: string) => {
    if (!db) return;
    try {
      await db.saveFolder({ id: generateUUID(), name, color: "#06b6d4", createdAt: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      await loadFolders();
    } catch (error) {
      console.error("Failed to add folder:", error);
      setAlertModal({ title: "Pod Failed", message: "Failed to create Pod.", variant: "error" });
    }
  };

  const handleEditFolder = async (id: string, data: { name: string; color: string }) => {
    if (!db) return;
    try {
      const existing = folders.find((f) => f.id === id);
      if (!existing) return;
      await db.updateFolder({ ...existing, name: data.name, color: data.color });
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      await loadFolders();
    } catch (error) {
      console.error("Failed to update folder:", error);
      setAlertModal({ title: "Pod Failed", message: "Failed to update Pod.", variant: "error" });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteFolder(id);
      queryClient.invalidateQueries({ queryKey: FOLDER_COUNTS_QUERY_KEY });
      if (selectedFolder === id) {
        setSelectedFolder(null);
        sessionStorage.removeItem("cc_selected_folder");
      }
      await loadFolders();
    } catch (error) {
      console.error("Failed to delete folder:", error);
      setAlertModal({ title: "Pod Failed", message: "Failed to delete Pod.", variant: "error" });
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      const attached = flatBookmarks.filter((b) => b.tags.includes(tag));
      await Promise.all(
        attached.map((b) =>
          updateBookmark({
            ...b,
            tags: b.tags.filter((t) => t !== tag),
            updatedAt: new Date().toISOString(),
          })
        )
      );
    } catch (error) {
      console.error("Failed to delete tag:", error);
      setAlertModal({ title: "Tag Delete Failed", message: "Failed to delete tag.", variant: "error" });
    }
  };

  const filteredBookmarks = useMemo(
    () =>
      sortBookmarks(
        flatBookmarks.filter((bookmark) => {
          const lowerQuery = debouncedQuery.toLowerCase();
          const matchesSearch =
            bookmark.title.toLowerCase().includes(lowerQuery) ||
            bookmark.url.toLowerCase().includes(lowerQuery) ||
            bookmark.description?.toLowerCase().includes(lowerQuery) ||
            bookmark.tags?.some((t) => t.toLowerCase().includes(lowerQuery));

          const matchesFolder = selectedFolder ? bookmark.folderId === selectedFolder : true;
          const matchesFilter =
            activeTab === "all" ||
            (activeTab === "starred" && bookmark.starred) ||
            (activeTab === "archived" && bookmark.archived);
          const matchesTag = tagFilter ? bookmark.tags.includes(tagFilter) : true;

          return matchesSearch && matchesFolder && matchesFilter && matchesTag;
        }),
        sortBy
      ),
    [flatBookmarks, debouncedQuery, selectedFolder, activeTab, tagFilter, sortBy]
  );

  return {
    folders,
    selectedFolder,
    activeTab,
    tagFilter,
    searchQuery,
    isModalOpen,
    editingBookmark,
    sidebarOpen,
    alertModal,
    sortBy,
    viewMode,
    flatBookmarks,
    filteredFolders,
    filteredBookmarks,
    stats,
    allTags,
    tagsCount: allTags?.length ?? 0,
    hasNextPage,
    isFetchingNextPage,
    setSearchQuery,
    setSidebarOpen,
    setTagFilter,
    setIsModalOpen,
    setEditingBookmark,
    setAlertModal,
    handleSortChange,
    handleViewChange,
    handleSaveBookmark,
    handleSelectFolder,
    handleTabChange,
    handleAddFolder,
    handleEditFolder,
    handleDeleteFolder,
    handleDeleteTag,
    fetchNextPage,
    deleteBookmark,
    updateBookmark,
    loadFolders
  };
};
