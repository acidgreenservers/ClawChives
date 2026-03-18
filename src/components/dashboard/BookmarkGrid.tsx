import { useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { BookmarkCard } from "./BookmarkCard";

import type { Bookmark } from "../../services/types";

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (bookmark: Bookmark) => void;
  onToggleArchive: (bookmark: Bookmark) => void;
  onFetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function BookmarkGrid({
  bookmarks,
  onEdit,
  onDelete,
  onToggleStar,
  onToggleArchive,
  onFetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: BookmarkGridProps) {
  const { ref: sentinelRef, inView } = useInView();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Trigger infinite scroll when sentinel comes into view ──
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      onFetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, onFetchNextPage]);

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
    <>
      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
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

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="mt-8 flex items-center justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            Loading more Pinchmarks...
          </div>
        )}
        {!hasNextPage && bookmarks.length > 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No more Pinchmarks</p>
        )}
      </div>
    </>
  );
}