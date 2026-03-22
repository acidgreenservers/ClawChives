import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from '@/shared/ui/input';
import { useFolderCounts } from "@/hooks/useFolderCounts";
import { FolderEditModal } from "./FolderEditModal";
import { InteractiveBrand } from '@/shared/branding/InteractiveBrand';
import { SidebarNav, type NavTab } from "./SidebarNav";
import { FolderList, type FolderItem } from "./FolderList";

interface SidebarProps {
  folders: FolderItem[];
  selectedFolder: string | null;
  filterType: NavTab;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onFilterChange: (filter: NavTab) => void;
  onAddFolder: (name: string) => void;
  onEditFolder: (id: string, data: { name: string; color: string }) => void;
  onDeleteFolder: (id: string) => void;
  bookmarkCounts: {
    all: number;
    starred: number;
    archived: number;
    tags: number;
  };
}

export function Sidebar({
  folders,
  selectedFolder,
  filterType,
  searchQuery,
  onSearchChange,
  onSelectFolder,
  onFilterChange,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  bookmarkCounts,
}: SidebarProps) {
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ── Fetch true folder counts from backend ──
  const { data: folderCountsMap } = useFolderCounts();

  const handleFolderSave = (data: { name: string; color: string }) => {
    if (isCreating) {
      onAddFolder(data.name);
    } else if (editingFolder) {
      onEditFolder(editingFolder.id, data);
    }
    setFolderModalOpen(false);
    setEditingFolder(null);
  };

  const handleFolderDelete = () => {
    if (editingFolder) {
      onDeleteFolder(editingFolder.id);
    }
    setFolderModalOpen(false);
    setEditingFolder(null);
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setIsCreating(true);
    setFolderModalOpen(true);
  };

  const openEditFolder = (folder: FolderItem) => {
    setEditingFolder(folder);
    setIsCreating(false);
    setFolderModalOpen(true);
  };

  const folderBookmarkCount = useCallback(
    (folderId: string) => folderCountsMap?.[folderId] ?? 0,
    [folderCountsMap]
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <InteractiveBrand 
          showIcon={true} 
          onClick={() => {
            onSelectFolder(null);
            onFilterChange("dashboard");
          }} 
        />
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav
          filterType={filterType}
          selectedFolder={selectedFolder}
          onFilterChange={onFilterChange}
          onSelectFolder={onSelectFolder}
          bookmarkCounts={bookmarkCounts}
        />

        <FolderList
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={onSelectFolder}
          openCreateFolder={openCreateFolder}
          openEditFolder={openEditFolder}
          folderBookmarkCount={folderBookmarkCount}
        />
      </div>

      {/* Folder Edit Modal */}
      <FolderEditModal
        isOpen={folderModalOpen}
        onClose={() => { setFolderModalOpen(false); setEditingFolder(null); }}
        folder={isCreating ? null : editingFolder}
        bookmarkCount={editingFolder ? folderBookmarkCount(editingFolder.id) : 0}
        onSave={handleFolderSave}
        onDelete={editingFolder ? handleFolderDelete : undefined}
      />
    </div>
  );
}