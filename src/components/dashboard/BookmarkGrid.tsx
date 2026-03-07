import { BookmarkCard } from "./BookmarkCard";

import type { Bookmark } from "../../services/types";

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (bookmark: Bookmark) => void;
  onToggleArchive: (bookmark: Bookmark) => void;
  onTogglePin: (bookmark: Bookmark) => void;
  pinnedFolderId?: string;
}

export function BookmarkGrid({ 
  bookmarks, 
  onEdit, 
  onDelete, 
  onToggleStar, 
  onToggleArchive,
  onTogglePin,
  pinnedFolderId
}: BookmarkGridProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 dark:text-slate-500">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 border-2 border-dashed border-slate-200 dark:border-slate-700">
          <span className="text-4xl select-none">🦞</span>
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Pinchmarks Caught</p>
        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">Pinch a URL and add it to your collection</p>
        <p className="text-sm mt-1 text-slate-400 dark:text-slate-500 italic">Or have your Lobster Pinch it for you!</p>
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
          onTogglePin={onTogglePin}
          pinnedFolderId={pinnedFolderId}
        />
      ))}
    </div>
  );
}