import { Plus, Pencil } from "lucide-react";
import { Button } from '@/shared/ui/button';

export interface FolderItem {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

interface FolderListProps {
  folders: FolderItem[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  openCreateFolder: () => void;
  openEditFolder: (folder: FolderItem) => void;
  folderBookmarkCount: (folderId: string) => number;
}

export function FolderList({
  folders,
  selectedFolder,
  onSelectFolder,
  openCreateFolder,
  openEditFolder,
  folderBookmarkCount,
}: FolderListProps) {
  return (
    <>
      <div className="flex items-center justify-between px-3 mt-4 mb-2 shrink-0">
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
        <div className="flex-1 overflow-y-auto min-h-0">
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
                }}
                className="flex items-center justify-between gap-3 flex-1 px-3 py-2 text-sm font-medium text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: folder.color ?? "#06b6d4" }}
                  />
                  <span className="truncate">{folder.name}</span>
                </div>
                <span className={`text-xs flex-shrink-0 px-2 py-0.5 rounded-full ${
                  selectedFolder === folder.id
                    ? "bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}>
                  {folderBookmarkCount(folder.id)}
                </span>
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
        </div>
      )}
    </>
  );
}
