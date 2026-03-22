import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Search, X, Filter } from "lucide-react";
import type { BookmarkFilters } from "@/services/types";

interface SearchBarProps {
  filters: BookmarkFilters;
  onFiltersChange: (filters: BookmarkFilters) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search bookmarks by title, URL, or tags..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-10"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onFiltersChange({ ...filters, starred: !filters.starred })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filters.starred
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          ⭐ Starred
        </button>
        <button
          onClick={() => onFiltersChange({ ...filters, archived: !filters.archived })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filters.archived
              ? "bg-cyan-100 text-cyan-800"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          📁 Archived
        </button>
      </div>
    </div>
  );
}