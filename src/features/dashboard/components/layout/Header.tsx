import { Search, Settings, LogOut, Database, Plus, X } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { SortDropdown } from "../views/SortDropdown";
import { ViewToggle } from "../views/ViewToggle";
import type { SortBy } from '@/shared/lib/utils';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  user: { username: string } | null;
  onGoToSettings: () => void;
  onLogout: () => void;
  onShowDatabaseStats: () => void;
  onAddBookmark: () => void;
  showGridControls: boolean;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  tagFilter: string | null;
  onClearTagFilter: () => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  user,
  onGoToSettings,
  onLogout,
  onShowDatabaseStats,
  onAddBookmark,
  showGridControls,
  sortBy,
  onSortChange,
  viewMode,
  onViewChange,
  tagFilter,
  onClearTagFilter
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b-2 border-cyan-600 dark:border-red-500 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 text-sm md:text-base"
            />
          </div>

          <div className="md:hidden flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onGoToSettings} className="text-cyan-700 dark:text-cyan-400 p-1.5">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-red-600 dark:text-red-400 p-1.5">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {showGridControls && (
              <div className="flex items-center gap-2">
                <SortDropdown sortBy={sortBy} onChange={onSortChange} />
                <ViewToggle viewMode={viewMode} onChange={onViewChange} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="hidden md:block">
            {user && (
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Hello, {user.username}
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
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
            <Button onClick={onAddBookmark} className="bg-cyan-700 hover:bg-cyan-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Pinchmark
            </Button>
          </div>

          <Button onClick={onAddBookmark} className="md:hidden bg-cyan-700 hover:bg-cyan-800 text-white p-2 h-auto">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {tagFilter && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Filtered by tag:</span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-700/50">
            {tagFilter}
            <button onClick={onClearTagFilter} className="hover:text-sky-900 dark:hover:text-sky-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}
    </header>
  );
}
