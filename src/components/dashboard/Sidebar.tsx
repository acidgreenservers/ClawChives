import { useState, useCallback } from "react";
import { Plus, Folder, Star, Archive, LayoutDashboard, Tag, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { FolderEditModal } from "./FolderEditModal";
import { InteractiveBrand } from "../Branding/InteractiveBrand";

interface FolderItem {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

type NavTab = "dashboard" | "all" | "starred" | "tags" | "archived";

interface SidebarProps {
  folders: FolderItem[];
  selectedFolder: string | null;
  filterType: NavTab;
  onSelectFolder: (folderId: string | null) => void;
  onFilterChange: (filter: NavTab) => void;
  onAddFolder: (name: string) => void;
  onEditFolder: (id: string, data: { name: string; color: string }) => void;
  onDeleteFolder: (id: string) => void;
  bookmarkCounts: {
    all: number;
    starred: number;
    archived: number;
  };
  bookmarks: { folderId?: string }[];
}

export function Sidebar({
  folders,
  selectedFolder,
  filterType,
  onSelectFolder,
  onFilterChange,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  bookmarkCounts,
  bookmarks,
}: SidebarProps) {
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const inactiveBadge = "text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full";

  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "Dashboard",
      icon: LayoutDashboard,
      active: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      badge: null,
    },
    {
      id: "all" as NavTab,
      label: "All Pinchmarks",
      icon: Folder,
      active: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.all,
    },
    {
      id: "starred" as NavTab,
      label: "Starred",
      icon: Star,
      active: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.starred,
    },
    {
      id: "tags" as NavTab,
      label: "Tags",
      icon: Tag,
      active: "bg-sky-700 text-white dark:bg-sky-800 dark:text-white",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      badge: null,
    },
    {
      id: "archived" as NavTab,
      label: "Archived",
      icon: Archive,
      active: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300",
      inactive: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
      activeBadge: "text-xs bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 px-2 py-0.5 rounded-full",
      badge: bookmarkCounts.archived,
    },
  ];

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
    (folderId: string) => bookmarks.filter((b) => b.folderId === folderId).length,
    [bookmarks]
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

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon, active, inactive, badge, activeBadge }) => {
            const isActive = selectedFolder === null && filterType === id;
            return (
              <button
                key={id}
                onClick={() => {
                  onSelectFolder(null);
                  onFilterChange(id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? active : inactive}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
                {badge !== null && badge !== undefined && (
                  <span className={isActive && activeBadge ? activeBadge : inactiveBadge}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Pods Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pods
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400"
              onClick={openCreateFolder}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {folders.length === 0 ? (
            <button
              onClick={openCreateFolder}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-dashed border-slate-300 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              New Pod
            </button>
          ) : (
            <nav className="space-y-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`group/pod flex items-center gap-0 rounded-lg transition-colors ${
                    selectedFolder === folder.id
                      ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectFolder(folder.id);
                      onFilterChange("all");
                    }}
                    className="flex items-center gap-3 flex-1 px-3 py-2 text-sm font-medium text-left"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: folder.color ?? "#06b6d4" }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  {/* Edit Pod button shown on hover */}
                  <button
                    onClick={() => openEditFolder(folder)}
                    className="opacity-0 group-hover/pod:opacity-100 transition-opacity p-1.5 mr-1 rounded text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                    title="Edit Pod"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </nav>
          )}
        </div>
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