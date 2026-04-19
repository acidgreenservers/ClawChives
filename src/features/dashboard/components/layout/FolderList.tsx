import { useRef, useState, useMemo } from "react";
import { Plus, Pencil, Search, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  const [searchQuery, setSearchQuery] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredFolders = useMemo(() => {
    return folders.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, searchQuery]);

  const virtualizer = useVirtualizer({
    count: filteredFolders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Height of each pod item
    overscan: 5,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Pods header — always visible, never shrinks */}
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

      {/* Pod Search */}
      {folders.length > 5 && (
        <div className="px-3 mb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Pods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-md focus:ring-1 focus:ring-cyan-500 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Folder list — virtualized for large libraries */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {folders.length === 0 ? (
          <div className="px-3">
            <button
              onClick={openCreateFolder}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-dashed border-slate-300 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              New Pod
            </button>
          </div>
        ) : filteredFolders.length === 0 ? (
          <p className="px-4 py-3 text-xs text-slate-500 italic">No pods match your search</p>
        ) : (
          <div 
            ref={parentRef} 
            className="h-full overflow-y-auto"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const folder = filteredFolders[virtualItem.index];
                return (
                  <div
                    key={folder.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className="px-3"
                  >
                    <div
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
