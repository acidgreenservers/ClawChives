import { useRef } from "react";
import { ChevronLeft, ChevronRight, Bookmark, FolderOpen, Tag } from "lucide-react";
import type { Bookmark as BookmarkType, Folder } from "../../services/types";

interface DashboardViewProps {
  bookmarks: BookmarkType[];
  folders: Folder[];
}

function getFaviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return ""; }
}

function MiniCard({ bookmark, onClick }: { bookmark: BookmarkType; onClick: () => void }) {
  const favicon = getFaviconUrl(bookmark.url);
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 rounded-xl p-3 cursor-pointer hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {favicon
            ? <img src={favicon} alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <span className="text-sm">🦞</span>
          }
        </div>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
          {bookmark.title || "Untitled"}
        </span>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{bookmark.url}</p>
    </div>
  );
}

function ScrollSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: BookmarkType[];
  emptyText: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (ref.current) {
      ref.current.scrollBy({ left: dir === "right" ? 230 : -230, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          {emptyText}
        </div>
      ) : (
        <div className="relative group/section">
          {/* Scroll container */}
          <div
            ref={ref}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((b) => (
              <MiniCard key={b.id} bookmark={b} onClick={() => window.open(b.url, "_blank", "noopener")} />
            ))}
          </div>

          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity z-10"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity z-10"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardView({ bookmarks, folders }: DashboardViewProps) {
  const allTags = [...new Set(bookmarks.flatMap((b) => b.tags))];
  const pinnedFolder = folders.find((f) => f.name === "Pinned");

  const recent = [...bookmarks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  const pins = pinnedFolder
    ? bookmarks.filter((b) => b.folderIds?.includes(pinnedFolder.id)).slice(0, 10)
    : [];
  const favorites = bookmarks.filter((b) => b.starred).slice(0, 10);

  const stats = [
    { label: "Pinchmarks", value: bookmarks.length, icon: Bookmark, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700/50" },
    { label: "Pods", value: folders.length, icon: FolderOpen, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50" },
    { label: "Tags", value: allTags.length, icon: Tag, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-700/50" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-5 flex items-center gap-4 ${bg}`}>
            <div className={`p-2 rounded-xl ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll Sections */}
      <ScrollSection
        title="🕐 Recently Pinched"
        items={recent}
        emptyText="No Pinchmarks yet — go pinch something!"
      />
      <ScrollSection
        title="📌 Top Pins"
        items={pins}
        emptyText="No Pins yet — pin a Pinchmark to see it here"
      />
      <ScrollSection
        title="⭐ Favorites"
        items={favorites}
        emptyText="Star a Pinchmark to add it to Favorites"
      />
    </div>
  );
}
