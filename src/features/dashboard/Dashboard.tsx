import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardHome } from "./components/views/DashboardHome";
import { TagsView } from "./components/views/TagsView";
import { BookmarkGrid } from "./components/views/BookmarkGrid";
import { BookmarkModal } from "./components/modals/BookmarkModal";
import { AlertModal } from '@/shared/ui/LobsterModal';
import { useDashboardState, NavTab } from "./hooks/useDashboardState";
import { User } from "@/App";
import { useRef, useCallback, useEffect } from "react";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onGoToSettings: () => void;
  onShowDatabaseStats: () => void;
}

export function Dashboard({ user, onLogout, onGoToSettings, onShowDatabaseStats }: DashboardProps) {
  const {
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
    tagsCount,
    fetchNextPage,
    deleteBookmark,
    updateBookmark,
    loadFolders,
    sidebarWidth,
    setSidebarWidth,
    isResizable
  } = useDashboardState();

  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      setSidebarWidth(mouseMoveEvent.clientX);
    }
  }, [setSidebarWidth]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const showGrid = activeTab !== "dashboard" && activeTab !== "tags";

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-50 py-0"
        />
      )}

      {/* Sidebar - FIXED to the left viewport wall */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: sidebarOpen ? `${isResizable ? sidebarWidth : 256}px` : undefined }}
      >
        <Sidebar
          folders={filteredFolders}
          selectedFolder={selectedFolder}
          filterType={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectFolder={handleSelectFolder}
          onFilterChange={(tab: NavTab) => handleTabChange(tab as NavTab)}
          onAddFolder={handleAddFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          bookmarkCounts={{
            all: stats?.total ?? 0,
            starred: stats?.starred ?? 0,
            archived: stats?.archived ?? 0,
            tags: tagsCount,
          }}
          showGridControls={showGrid}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          viewMode={viewMode}
          onViewChange={handleViewChange}
          onGoToSettings={onGoToSettings}
          onLogout={onLogout}
          onShowDatabaseStats={onShowDatabaseStats}
        />
      </aside>

      {/* Sidebar Resizer Handle - Desktop Only */}
      {isResizable && sidebarOpen && (
        <div
          onMouseDown={startResizing}
          className="hidden md:block fixed top-0 bottom-0 w-1.5 z-50 cursor-col-resize group bg-transparent hover:bg-cyan-500/30 transition-colors"
          style={{ left: `${sidebarWidth - 3}px` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-px bg-transparent group-hover:bg-cyan-500 transition-colors" />
        </div>
      )}

      {/* Main Content Area - Shifted by padding on desktop */}
      <main 
        className="h-full w-full flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden relative"
        style={{ paddingLeft: sidebarOpen ? `${isResizable ? sidebarWidth : 256}px` : 0 }}
      >
        <Header
          user={user}
          onGoToSettings={onGoToSettings}
          onLogout={onLogout}
          onShowDatabaseStats={onShowDatabaseStats}
          onAddBookmark={() => { setEditingBookmark(null); setIsModalOpen(true); }}
          showGridControls={showGrid}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          viewMode={viewMode}
          onViewChange={handleViewChange}
          tagFilter={tagFilter}
          onClearTagFilter={() => setTagFilter(null)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 min-h-0 relative">
          {activeTab === "dashboard" && (
            <div className="h-full overflow-y-auto">
              <DashboardHome
                bookmarks={flatBookmarks.filter((b) => !b.archived)}
                folders={folders}
                stats={stats}
                allTags={allTags}
              />
            </div>
          )}
          {activeTab === "tags" && (
            <div className="h-full overflow-y-auto">
              <TagsView
                bookmarks={flatBookmarks.filter((b) => !b.archived)}
                onSelectTag={setTagFilter}
                onDeleteTag={handleDeleteTag}
              />
            </div>
          )}
          {showGrid && (
            <div className="h-full p-6">
              <BookmarkGrid
                bookmarks={filteredBookmarks}
                layout={viewMode}
                onEdit={(b) => { setEditingBookmark(b); setIsModalOpen(true); }}
                onDelete={deleteBookmark}
                onToggleStar={(b) => updateBookmark({ ...b, starred: !b.starred })}
                onToggleArchive={(b) => updateBookmark({ ...b, archived: !b.archived })}
                onFetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage ?? false}
                isFetchingNextPage={isFetchingNextPage}
              />
            </div>
          )}
        </div>
      </main>

      <BookmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBookmark}
        bookmark={editingBookmark}
        folders={folders}
        onFoldersRefresh={loadFolders}
      />

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title ?? ""}
        message={alertModal?.message ?? ""}
        variant={alertModal?.variant ?? "error"}
      />
    </div>
  );
}