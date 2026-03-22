import { useRef, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookmarkCard } from "./BookmarkCard";

import type { Bookmark } from "@/services/types";

// Estimate card height — bookmark cards with title, URL, description, tags, actions
const ESTIMATED_CARD_HEIGHT = 200;

// Calculate responsive column count based on viewport width
const getColumnCount = () => {
  if (typeof window === "undefined") return 4;
  const width = window.innerWidth;
  if (width >= 1280) return 4; // xl
  if (width >= 1024) return 3; // lg
  if (width >= 768) return 2; // md
  return 1; // sm
};

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  layout?: "grid" | "list";
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
  layout = "grid",
  onEdit,
  onDelete,
  onToggleStar,
  onToggleArchive,
  onFetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: BookmarkGridProps) {
  const { ref: sentinelRef, inView } = useInView();
  const parentRef = useRef<HTMLDivElement>(null);
  const [rawColumnCount, setRawColumnCount] = useState(getColumnCount());

  // Force single column in list mode
  const columnCount = layout === "list" ? 1 : rawColumnCount;

  // Update column count on window resize
  useEffect(() => {
    const handleResize = () => setRawColumnCount(getColumnCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate number of rows (each row contains `columnCount` bookmarks)
  const rowCount = Math.ceil(bookmarks.length / columnCount);

  // Initialize virtualizer for rows
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 2, // Render 2 extra rows above/below viewport
    measureElement:
      typeof window !== "undefined"
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
  });

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
        ref={parentRef}
        className="h-[calc(100vh-200px)] overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowStart = virtualRow.index * columnCount;
            const rowBookmarks = bookmarks.slice(
              rowStart,
              rowStart + columnCount
            );

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4"
              >
                {rowBookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    layout={layout}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStar={onToggleStar}
                    onToggleArchive={onToggleArchive}
                  />
                ))}
              </div>
            );
          })}
        </div>
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