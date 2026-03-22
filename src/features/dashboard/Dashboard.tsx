import { Menu, X } from "lucide-react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardHome } from "./components/views/DashboardHome";
import { TagsView } from "./components/views/TagsView";
import { BookmarkGrid } from "./components/views/BookmarkGrid";
import { BookmarkModal } from "./components/modals/BookmarkModal";
import { AlertModal } from '@/shared/ui/LobsterModal';
import { useDashboardState, NavTab } from "./hooks/useDashboardState";
import { User } from "@/App";

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
    loadFolders
  } = useDashboardState();

  const showGrid = activeTab !== "dashboard" && activeTab !== "tags";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Menu Button + Overlay */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg text-slate-700 dark:text-slate-300"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-30"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          folders={filteredFolders}
          selectedFolder={selectedFolder}
          filterType={activeTab}
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
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
        />

        <div className="flex-1 overflow-auto">
          {activeTab === "dashboard" && (
            <DashboardHome
              bookmarks={flatBookmarks}
              folders={folders}
              stats={stats}
              allTags={allTags}
            />
          )}
          {activeTab === "tags" && (
            <TagsView
              bookmarks={flatBookmarks}
              onSelectTag={setTagFilter}
              onDeleteTag={handleDeleteTag}
            />
          )}
          {showGrid && (
            <div className="p-6">
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