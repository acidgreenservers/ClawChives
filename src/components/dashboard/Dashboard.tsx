import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Plus, Settings, LogOut, Database, Menu, X } from "lucide-react";
import { BookmarkGrid } from "./BookmarkGrid";
import { Sidebar } from "./Sidebar";
import { BookmarkModal } from "./BookmarkModal";
import { DashboardView } from "./DashboardView";
import { TagsView } from "./TagsView";
import { AlertModal } from "../ui/LobsterModal";
import { useDatabaseAdapter } from "../../services/database/DatabaseProvider";
import { generateUUID } from "../../lib/crypto";
import type { Bookmark, Folder } from "../../services/types";
import { User } from "../../App";

type NavTab = "dashboard" | "all" | "starred" | "tags" | "archived";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onGoToSettings: () => void;
  onShowDatabaseStats: () => void;
}

export function Dashboard({ user, onLogout, onGoToSettings, onShowDatabaseStats }: DashboardProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(() => sessionStorage.getItem("cc_selected_folder"));
  const [activeTab, setActiveTab] = useState<NavTab>(() => (sessionStorage.getItem("cc_active_tab") as NavTab) || "dashboard");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; variant?: "info" | "error" } | null>(null);

  const showAlert = (title: string, message: string, variant: "info" | "error" = "error") =>
    setAlertModal({ title, message, variant });

  const db = useDatabaseAdapter();

  useEffect(() => {
    if (db) loadData();
  }, [db]);

  const loadData = async () => {
    if (!db) return;
    try {
      const [allBookmarks, allFolders] = await Promise.all([
        db.getBookmarks(),
        db.getFolders(),
      ]);
      setBookmarks(allBookmarks);
      setFolders(allFolders);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  /** ── Bookmark handlers ── */
  const handleAddBookmark = () => { setEditingBookmark(null); setIsModalOpen(true); };
  const handleEditBookmark = (bookmark: Bookmark) => { setEditingBookmark(bookmark); setIsModalOpen(true); };

  const handleSaveBookmark = async (bookmark: Bookmark) => {
    if (!db) return;
    try {
      const isExisting = bookmarks.some((b) => b.id === bookmark.id);
      if (isExisting) { await db.updateBookmark(bookmark); } else { await db.saveBookmark(bookmark); }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      showAlert("Pinch Failed", "Failed to save Pinchmark. Please try again.");
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!db) return;
    try { await db.deleteBookmark(id); await loadData(); }
    catch (error) { console.error("Failed to delete bookmark:", error); showAlert("Delete Failed", "Failed to delete. Please try again."); }
  };

  const handleToggleStar = async (bookmark: Bookmark) => {
    if (!db) return;
    try { await db.updateBookmark({ ...bookmark, starred: !bookmark.starred, updatedAt: new Date().toISOString() }); await loadData(); }
    catch (error) { console.error("Failed to toggle star:", error); }
  };

  const handleToggleArchive = async (bookmark: Bookmark) => {
    if (!db) return;
    try { await db.updateBookmark({ ...bookmark, archived: !bookmark.archived, updatedAt: new Date().toISOString() }); await loadData(); }
    catch (error) { console.error("Failed to toggle archive:", error); }
  };

  /** ── Folder handlers ── */
  const handleAddFolder = async (name: string) => {
    if (!db) return;
    try {
      await db.saveFolder({ id: generateUUID(), name, color: "#06b6d4", createdAt: new Date().toISOString() });
      await loadData();
    } catch (error) { console.error("Failed to add folder:", error); showAlert("Pod Failed", "Failed to create Pod."); }
  };

  const handleEditFolder = async (id: string, data: { name: string; color: string }) => {
    if (!db) return;
    try {
      const existing = folders.find((f) => f.id === id);
      if (!existing) return;
      await db.updateFolder({ ...existing, name: data.name, color: data.color });
      await loadData();
    } catch (error) { console.error("Failed to update folder:", error); showAlert("Pod Failed", "Failed to update Pod."); }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteFolder(id);
      if (selectedFolder === id) {
        setSelectedFolder(null);
        sessionStorage.removeItem("cc_selected_folder");
      }
      await loadData();
    } catch (error) { console.error("Failed to delete folder:", error); showAlert("Pod Failed", "Failed to delete Pod."); }
  };

  const handleSelectFolder = (id: string | null) => {
    setSelectedFolder(id);
    if (id) sessionStorage.setItem("cc_selected_folder", id);
    else sessionStorage.removeItem("cc_selected_folder");
  };

  /** ── Tag filter ── */
  const handleSelectTag = (tag: string) => {
    setTagFilter(tag);
    setActiveTab("all");
    setSelectedFolder(null);
  };

  /** ── Delete tag (strip from all bookmarks) ── */
  const handleDeleteTag = async (tag: string) => {
    if (!db) return;
    try {
      const attached = bookmarks.filter((b) => b.tags.includes(tag));
      await Promise.all(
        attached.map((b) =>
          db.updateBookmark({ ...b, tags: b.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() })
        )
      );
      await loadData();
    } catch (error) {
      console.error("Failed to delete tag:", error);
      showAlert("Tag Delete Failed", "Failed to delete tag. Please try again.");
    }
  };

  /** ── Filtered bookmarks ── */
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = selectedFolder ? bookmark.folderId === selectedFolder : true;
    const matchesFilter =
      activeTab === "all" ||
      (activeTab === "starred" && bookmark.starred) ||
      (activeTab === "archived" && bookmark.archived);

    const matchesTag = tagFilter ? bookmark.tags.includes(tagFilter) : true;

    return matchesSearch && matchesFolder && matchesFilter && matchesTag;
  });

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    sessionStorage.setItem("cc_active_tab", tab);
    setSelectedFolder(null);
    sessionStorage.removeItem("cc_selected_folder");
    setTagFilter(null);
  };

  const showGrid = activeTab !== "dashboard" && activeTab !== "tags";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg text-slate-700 dark:text-slate-300"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          filterType={activeTab}
          onSelectFolder={handleSelectFolder}
          onFilterChange={handleTabChange}
          onAddFolder={handleAddFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          bookmarkCounts={{
            all: bookmarks.length,
            starred: bookmarks.filter((b) => b.starred).length,
            archived: bookmarks.filter((b) => b.archived).length,
          }}
          bookmarks={bookmarks}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b-2 border-cyan-600 dark:border-red-500 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search pinchmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {user && (
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Hello, {user.username}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowDatabaseStats}
                className="text-amber-600 dark:text-amber-400 border border-amber-500 dark:border-amber-500/60 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Database className="w-4 h-4 mr-2" />
                Database
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoToSettings}
                className="text-cyan-700 dark:text-cyan-400 border border-cyan-600 dark:border-cyan-500/60 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-red-600 dark:text-red-400 border border-red-500 dark:border-red-500/60 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button onClick={handleAddBookmark} className="bg-cyan-700 hover:bg-cyan-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Pinchmark
              </Button>
            </div>
          </div>

          {/* Tag filter chip */}
          {tagFilter && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Filtered by tag:</span>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-700/50">
                {tagFilter}
                <button onClick={() => setTagFilter(null)} className="hover:text-sky-900 dark:hover:text-sky-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "dashboard" && (
            <DashboardView
              bookmarks={bookmarks}
              folders={folders}
            />
          )}
          {activeTab === "tags" && (
            <TagsView
              bookmarks={bookmarks}
              onSelectTag={handleSelectTag}
              onDeleteTag={handleDeleteTag}
            />
          )}
          {showGrid && (
            <div className="p-6">
              <BookmarkGrid
                bookmarks={filteredBookmarks}
                onEdit={handleEditBookmark}
                onDelete={handleDeleteBookmark}
                onToggleStar={handleToggleStar}
                onToggleArchive={handleToggleArchive}
              />
            </div>
          )}
        </div>
      </main>

      {/* Pinchmark Modal */}
      <BookmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBookmark}
        bookmark={editingBookmark}
        folders={folders}
        onFoldersRefresh={loadData}
      />

      {/* Global Alert Modal */}
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