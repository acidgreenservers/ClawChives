import { useState } from "react";
import { Plus, Folder, Star, Archive } from "lucide-react";
import { Button } from "../ui/button";

interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface SidebarProps {
  folders: Folder[];
  selectedFolder: string | null;
  filterType: "all" | "starred" | "archived";
  onSelectFolder: (folderId: string | null) => void;
  onFilterChange: (filter: "all" | "starred" | "archived") => void;
  onAddFolder: (name: string) => void;
  bookmarkCounts: {
    all: number;
    starred: number;
    archived: number;
  };
}

export function Sidebar({
  folders,
  selectedFolder,
  filterType,
  onSelectFolder,
  onFilterChange,
  onAddFolder,
  bookmarkCounts,
}: SidebarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🦞</span>
          <span className="font-bold text-lg text-slate-900">ClawChives</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">
          <button
            onClick={() => {
              onSelectFolder(null);
              onFilterChange("all");
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFolder === null && filterType === "all"
                ? "bg-cyan-100 text-cyan-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <Folder className="w-4 h-4" />
              All Bookmarks
            </div>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
              {bookmarkCounts.all}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFolder(null);
              onFilterChange("starred");
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFolder === null && filterType === "starred"
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4" />
              Starred
            </div>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
              {bookmarkCounts.starred}
            </span>
          </button>

          <button
            onClick={() => {
              onSelectFolder(null);
              onFilterChange("archived");
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFolder === null && filterType === "archived"
                ? "bg-cyan-100 text-cyan-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <Archive className="w-4 h-4" />
              Archived
            </div>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">
              {bookmarkCounts.archived}
            </span>
          </button>
        </nav>

        {folders.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Folders
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-700"
                onClick={() => setShowNewFolder(!showNewFolder)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showNewFolder && (
              <div className="px-3 mb-2">
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddFolder();
                    if (e.key === "Escape") setShowNewFolder(false);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
              </div>
            )}

            <nav className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onSelectFolder(folder.id);
                    onFilterChange("all");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFolder === folder.id
                      ? "bg-cyan-100 text-cyan-900"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}