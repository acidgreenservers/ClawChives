import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Plus, Settings, LogOut, Database, Menu, X } from "lucide-react";
import { BookmarkGrid } from "./BookmarkGrid";
import { Sidebar } from "./Sidebar";
import { BookmarkModal } from "./BookmarkModal";
import * as IndexedDB from "../../lib/indexedDB";

interface DashboardProps {
  onLogout: () => void;
  onGoToSettings: () => void;
  onShowDatabaseStats: () => void;
}

export function Dashboard({ onLogout, onGoToSettings, onShowDatabaseStats }: DashboardProps) {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "starred" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allBookmarks = await IndexedDB.bookmarks.getAll();
    const allFolders = await IndexedDB.folders.getAll();
    setBookmarks(allBookmarks);
    setFolders(allFolders);
  };

  const handleAddBookmark = () => {
    setEditingBookmark(null);
    setIsModalOpen(true);
  };

  const handleEditBookmark = (bookmark: any) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  };

  const handleSaveBookmark = async (bookmark: any) => {
    await IndexedDB.bookmarks.add(bookmark);
    await loadData();
    setIsModalOpen(false);
  };

  const handleDeleteBookmark = async (id: string) => {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      await IndexedDB.bookmarks.delete(id);
      await loadData();
    }
  };

  const handleToggleStar = async (bookmark: any) => {
    await IndexedDB.bookmarks.add({ ...bookmark, starred: !bookmark.starred });
    await loadData();
  };

  const handleToggleArchive = async (bookmark: any) => {
    await IndexedDB.bookmarks.add({ ...bookmark, archived: !bookmark.archived });
    await loadData();
  };

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = selectedFolder ? bookmark.folderId === selectedFolder : true;
    const matchesFilter =
      filterType === "all" ||
      (filterType === "starred" && bookmark.starred) ||
      (filterType === "archived" && bookmark.archived);

    return matchesSearch && matchesFolder && matchesFilter;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          filterType={filterType}
          onSelectFolder={setSelectedFolder}
          onFilterChange={setFilterType}
          onAddFolder={async (name) => {
            const newFolder = {
              id: crypto.randomUUID(),
              name,
              color: "#06b6d4",
              createdAt: new Date().toISOString(),
            };
            await IndexedDB.folders.add(newFolder);
            await loadData();
          }}
          bookmarkCounts={{
            all: bookmarks.length,
            starred: bookmarks.filter((b) => b.starred).length,
            archived: bookmarks.filter((b) => b.archived).length,
          }}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowDatabaseStats}
                className="text-slate-600"
              >
                <Database className="w-4 h-4 mr-2" />
                Database
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoToSettings}
                className="text-slate-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button onClick={handleAddBookmark} className="bg-cyan-700 hover:bg-cyan-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Bookmark
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <BookmarkGrid
            bookmarks={filteredBookmarks}
            onEdit={handleEditBookmark}
            onDelete={handleDeleteBookmark}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
          />
        </div>
      </main>

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBookmark}
        bookmark={editingBookmark}
        folders={folders}
      />
    </div>
  );
}