import { useRef, useEffect, useState, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookmarkCard } from "./BookmarkCard";
import { Clock } from "lucide-react";
import type { Bookmark } from "@/services/types";

// Estimate heights
const ESTIMATED_CARD_HEIGHT = 200;
const HEADER_HEIGHT = 48;

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

type GridItem = 
  | { type: 'header'; label: string; date: Date }
  | { type: 'row'; bookmarks: Bookmark[] };

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

  // ── Grouping Logic ──
  const gridItems = useMemo(() => {
    if (bookmarks.length === 0) return [];

    const sorted = [...bookmarks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groups: { [key: string]: Bookmark[] } = {};
    const items: GridItem[] = [];

    sorted.forEach(bm => {
      const date = new Date(bm.createdAt);
      const now = new Date();
      let label = "Earlier";
      
      if (date.toDateString() === now.toDateString()) {
        label = "Recently Pinched";
      } else {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
          label = "Yesterday";
        } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
          label = "This Week";
        }
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(bm);
    });

    const labels = ["Recently Pinched", "Yesterday", "This Week", "Earlier"];
    labels.forEach(label => {
      if (groups[label] && groups[label].length > 0) {
        items.push({ type: 'header', label, date: new Date(groups[label][0].createdAt) });
        // Chunk bookmarks into rows
        const bms = groups[label];
        for (let i = 0; i < bms.length; i += columnCount) {
          items.push({ type: 'row', bookmarks: bms.slice(i, i + columnCount) });
        }
      }
    });

    return items;
  }, [bookmarks, columnCount]);

  // Initialize virtualizer for the mixed items
  const virtualizer = useVirtualizer({
    count: gridItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => 
      gridItems[index]?.type === 'header' ? HEADER_HEIGHT : ESTIMATED_CARD_HEIGHT,
    overscan: 2,
    measureElement:
      typeof window !== "undefined"
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
  });

  // ── Trigger infinite scroll ──
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      onFetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, onFetchNextPage]);

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-20">
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
    <div className="h-full flex flex-col min-h-0">
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = gridItems[virtualItem.index];

            if (item.type === 'header') {
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="px-4 py-3 sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-10 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800"
                >
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                  ... (columnCount > 1 ? { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` } : {})
                }}
                className={`grid grid-cols-1 md:grid-cols-${columnCount} gap-4 px-4 py-3`}
              >
                {item.bookmarks.map((bookmark) => (
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

        {/* Infinite Scroll Sentinel */}
        <div ref={sentinelRef} className="py-8 flex items-center justify-center">
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
      </div>
    </div>
  );
}