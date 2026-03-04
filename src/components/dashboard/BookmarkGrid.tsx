import { BookmarkCard } from "./BookmarkCard";

import type { Bookmark } from "../../types";

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleArchive: (id: string) => void;
}

export function BookmarkGrid({ 
  bookmarks, 
  onEdit, 
  onDelete, 
  onToggleStar, 
  onToggleArchive 
}: BookmarkGridProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <p className="text-lg font-medium">No bookmarks found</p>
        <p className="text-sm mt-1">Add your first bookmark to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </div>
  );
}