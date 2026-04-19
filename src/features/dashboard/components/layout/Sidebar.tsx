import { useState, useCallback } from "react";
import { Search, X, LogOut, Database } from "lucide-react";
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { useFolderCounts } from "@/hooks/useFolderCounts";
import { FolderEditModal } from "./FolderEditModal";
import { InteractiveBrand } from '@/shared/branding/InteractiveBrand';
import { SidebarNav, type NavTab, type SettingsTab } from "./SidebarNav";
import { FolderList, type FolderItem } from "./FolderList";
import { SortDropdown } from "../views/SortDropdown";
import { ViewToggle } from "../views/ViewToggle";
import type { SortBy } from '@/shared/lib/utils';

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
  // Mobile controls
  showGridControls?: boolean;
  sortBy?: SortBy;
  onSortChange?: (sort: SortBy) => void;
  viewMode?: "grid" | "list";
  onViewChange?: (mode: "grid" | "list") => void;
  onGoToSettings?: () => void;
  onLogout?: () => void;
  onShowDatabaseStats?: () => void;
  // Settings mode
  settingsMode?: boolean;
  activeSettingsTab?: SettingsTab;
  onSettingsTabChange?: (tab: SettingsTab) => void;
  onGoToDashboard?: () => void;
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
  showGridControls,
  sortBy,
  onSortChange,
  viewMode,
  onViewChange,
  onGoToSettings,
  onLogout,
  onShowDatabaseStats,
  settingsMode,
  activeSettingsTab,
  onSettingsTabChange,
  onGoToDashboard,
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
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900">
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

      {/* Search Bar — dashboard only */}
      {!settingsMode && (
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
      )}

      {/* Sort / View controls — mobile only, dashboard only */}
      {!settingsMode && showGridControls && sortBy && onSortChange && viewMode && onViewChange && (
        <div className="md:hidden px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <SortDropdown sortBy={sortBy} onChange={onSortChange} />
          <ViewToggle viewMode={viewMode} onChange={onViewChange} />
        </div>
      )}

      {/* Main Sidebar Layout */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 shrink-0">
          <SidebarNav
            filterType={filterType}
            selectedFolder={selectedFolder}
            onFilterChange={onFilterChange}
            onSelectFolder={onSelectFolder}
            bookmarkCounts={bookmarkCounts}
            settingsMode={settingsMode}
            activeSettingsTab={activeSettingsTab}
            onSettingsTabChange={onSettingsTabChange}
            onGoToSettings={!settingsMode ? onGoToSettings : undefined}
            onGoToDashboard={settingsMode ? onGoToDashboard : undefined}
          />
        </div>

        {!settingsMode && (
          <div className="flex-1 min-h-0 flex flex-col px-3 pb-3">
            <FolderList
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              openCreateFolder={openCreateFolder}
              openEditFolder={openEditFolder}
              folderBookmarkCount={folderBookmarkCount}
            />
          </div>
        )}
      </div>

      {/* Action buttons — mobile only, dashboard only */}
      {!settingsMode && (onGoToSettings || onLogout || onShowDatabaseStats) && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-1.5">
          {onShowDatabaseStats && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDatabaseStats}
              className="justify-start text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Database className="w-4 h-4 mr-2" />
              Database
            </Button>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      )}

      {/* Folder Edit Modal — dashboard only */}
      {!settingsMode && (
        <FolderEditModal
          isOpen={folderModalOpen}
          onClose={() => { setFolderModalOpen(false); setEditingFolder(null); }}
          folder={isCreating ? null : editingFolder}
          bookmarkCount={editingFolder ? folderBookmarkCount(editingFolder.id) : 0}
          onSave={handleFolderSave}
          onDelete={editingFolder ? handleFolderDelete : undefined}
        />
      )}
    </div>
  );
}