import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { BookmarkModal } from "./BookmarkModal";
import { FolderModal } from "./FolderModal";
import { ConfirmModal } from "./ConfirmModal";
import { BookmarkCard } from "./BookmarkCard";
import { Plus, Search, Grid, LayoutGrid, FolderPlus, List } from "lucide-react";
import type { Bookmark, Folder } from "../../services/types";

const MOCK_FOLDERS: Folder[] = [
  { id: "1", name: "Development", color: "#E63946", createdAt: new Date().toISOString() },
  { id: "2", name: "Design", color: "#457B9D", createdAt: new Date().toISOString() },
  { id: "3", name: "Reading", color: "#2A9D8F", createdAt: new Date().toISOString() },
];

const MOCK_BOOKMARKS: Bookmark[] = [
  {
    id: "1",
    url: "https://react.dev",
    title: "React Documentation",
    description: "The official React documentation for building user interfaces.",
    favicon: "https://react.dev/favicon.ico",
    tags: ["dev", "frontend", "javascript"],
    folderId: "1",
    starred: true,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    url: "https://tailwindcss.com",
    title: "Tailwind CSS",
    description: "Rapidly build modern websites without ever leaving your HTML.",
    favicon: "https://tailwindcss.com/favicon.ico",
    tags: ["css", "design", "utility"],
    folderId: "2",
    starred: false,
    archived: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    url: "https://github.com",
    title: "GitHub",
    description: "Where the world builds software. Millions of developers and companies build, ship, and maintain their software on GitHub.",
    favicon: "https://github.com/favicon.ico",
    tags: ["dev", "git", "collaboration"],
    folderId: "1",
    starred: true,
    archived: false,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export function BookmarkDashboard() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(MOCK_BOOKMARKS);
  const [folders, setFolders] = useState<Folder[]>(MOCK_FOLDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editBookmark, setEditBookmark] = useState<Bookmark | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  // View settings
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [gridStyle, setGridStyle] = useState<"symmetrical" | "bento">("symmetrical");
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">("medium");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = !selectedFolder || b.folderId === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  const handleSaveBookmark = (bookmark: Bookmark) => {
    if (editBookmark) {
      setBookmarks(bookmarks.map((b) => b.id === bookmark.id ? bookmark : b));
    } else {
      setBookmarks([bookmark, ...bookmarks]);
    }
    setEditBookmark(undefined);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      setBookmarks(bookmarks.filter((b) => b.id !== deleteTarget));
      setDeleteTarget(null);
    }
  };

  const handleToggleStar = (bookmark: Bookmark) => {
    setBookmarks(bookmarks.map((b) =>
      b.id === bookmark.id ? { ...b, starred: !b.starred, updatedAt: new Date().toISOString() } : b
    ));
  };

  const handleToggleArchive = (bookmark: Bookmark) => {
    setBookmarks(bookmarks.map((b) =>
      b.id === bookmark.id ? { ...b, archived: !b.archived, updatedAt: new Date().toISOString() } : b
    ));
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditBookmark(bookmark);
    setIsBookmarkModalOpen(true);
  };

  const handleCreateFolder = (folder: { name: string; color: string }) => {
    const newFolder: Folder = {
      id: Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
      ...folder,
    };
    setFolders([...folders, newFolder]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("bookmarkId", id);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const bookmarkId = e.dataTransfer.getData("bookmarkId");
    if (bookmarkId) {
      setBookmarks(bookmarks.map((b) => 
        b.id === bookmarkId ? { ...b, folderId } : b
      ));
    }
  };

  const allTags = Array.from(new Set(bookmarks.flatMap((b) => b.tags)));

  const gridCols = gridStyle === "bento" 
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[200px]"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">🦞</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">ClawChives</h1>
        </div>

        <div className="space-y-2 mb-6">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              !selectedFolder ? "bg-cyan-100 text-cyan-800" : "hover:bg-gray-100"
            }`}
          >
            All Bookmarks
          </button>
          <button
            onClick={() => setSelectedFolder("starred")}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              selectedFolder === "starred" ? "bg-cyan-100 text-cyan-800" : "hover:bg-gray-100"
            }`}
          >
            <span className="text-amber-400">★</span> Starred
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Folders</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsFolderModalOpen(true)}>
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                draggable
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                  selectedFolder === folder.id ? "bg-cyan-100 text-cyan-800" : "hover:bg-gray-100"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: folder.color }}
                />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {bookmarks.filter((b) => b.folderId === folder.id).length}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full cursor-pointer hover:bg-cyan-100 hover:text-cyan-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-50">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {selectedFolder 
              ? folders.find((f) => f.id === selectedFolder)?.name || "Bookmarks"
              : selectedFolder === "starred" 
              ? "Starred" 
              : "All Bookmarks"}
          </h1>
          <p className="text-gray-600">{filteredBookmarks.length} bookmarks</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={layout === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {layout === "grid" && (
            <div className="flex gap-2">
              <Button
                variant={gridStyle === "symmetrical" ? "default" : "outline"}
                size="sm"
                onClick={() => setGridStyle("symmetrical")}
              >
                Grid
              </Button>
              <Button
                variant={gridStyle === "bento" ? "default" : "outline"}
                size="sm"
                onClick={() => setGridStyle("bento")}
              >
                Bento
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-4">
            <Label className="text-sm">Icon Size:</Label>
            <select
              value={iconSize}
              onChange={(e) => setIconSize(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="small">S</option>
              <option value="medium">M</option>
              <option value="large">L</option>
            </select>
          </div>

          <Button
            onClick={() => {
              setEditBookmark(undefined);
              setIsBookmarkModalOpen(true);
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bookmark
          </Button>
        </div>

        {/* Bookmarks */}
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No bookmarks found</p>
            <p className="text-sm">Add your first bookmark to get started</p>
          </div>
        ) : (
          <div className={layout === "grid" ? gridCols : "flex flex-col gap-4"}>
            {filteredBookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                layout={layout}
                iconSize={iconSize}
                onEdit={(b) => handleEdit(b)}
                onDelete={handleDelete}
                onToggleStar={handleToggleStar}
                onToggleArchive={handleToggleArchive}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => {
          setIsBookmarkModalOpen(false);
          setEditBookmark(undefined);
        }}
        onSave={handleSaveBookmark}
        folders={folders}
        bookmark={editBookmark}
      />

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleCreateFolder}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Bookmark?"
        message="This action cannot be undone. The bookmark will be permanently removed from your library."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}