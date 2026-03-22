import * as React from "react";
import { useState } from "react";
import { Star, Archive, Trash2, Pencil, ExternalLink, Clock } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { ConfirmModal } from '@/shared/ui/LobsterModal';
import type { Bookmark, IconSize } from "@/services/types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  layout?: "grid" | "list";
  iconSize?: IconSize;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (bookmark: Bookmark) => void;
  onToggleArchive: (bookmark: Bookmark) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
}

const tagColors = [
  "bg-cyan-100 text-cyan-800",
  "bg-amber-100 text-amber-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-rose-100 text-rose-800",
  "bg-blue-100 text-blue-800",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

function getFaviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const BookmarkCard = React.memo((props: BookmarkCardProps) => {
  const {
    bookmark,
    layout = "grid",
    onEdit,
    onDelete,
    onToggleStar,
    onToggleArchive,
    onDragStart,
  } = props;
  
  const faviconUrl = getFaviconUrl(bookmark.url);
  const userKeyType = sessionStorage.getItem("cc_key_type") || "unknown";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCardClick = () => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  // List view layout
  if (layout === "list") {
    return (
      <div
        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer flex items-center gap-4 relative"
        draggable={!!onDragStart}
        onDragStart={(e) => onDragStart?.(e, bookmark.id)}
        onClick={handleCardClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-50"
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); }}
            />
            <div
              className="fixed z-[51] bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/70 rounded-xl shadow-2xl py-2 min-w-[200px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(bookmark.url, '_blank', "noopener,noreferrer"); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
              >
                🌐 Open URL
              </button>
              {userKeyType === 'human' && (
                <>
                  {bookmark.jinaUrl ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(bookmark.jinaUrl!, '_blank', "noopener,noreferrer"); }}
                      className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium transition-colors border-t border-red-500/10 dark:border-red-500/20"
                    >
                      🦞 Open r.jina.ai Version
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(`https://r.jina.ai/${bookmark.url}`, '_blank', "noopener,noreferrer"); }}
                      className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium transition-colors border-t border-red-500/10 dark:border-red-500/20"
                    >
                      🦞 Open in r.jina.ai
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Favicon */}
        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="w-5 h-5" onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }} />
          ) : (
            <span className="text-lg">🦞</span>
          )}
        </div>

        {/* Title + URL */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
            {bookmark.title || "Untitled"}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block hover:text-cyan-600">
            {bookmark.url}
          </span>
        </div>

        {/* Tags (max 2, hidden on mobile) */}
        {bookmark.tags.length > 0 && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0 flex-wrap gap-1">
            {bookmark.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full ${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp (hidden on mobile) */}
        <span className="hidden lg:flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(bookmark.createdAt)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-600"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bookmark);
            }}
            title="Edit Pinchmark"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${bookmark.starred ? "text-amber-500" : "text-slate-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(bookmark);
            }}
            title={bookmark.starred ? "Unstar" : "Star"}
          >
            <Star className={`w-3.5 h-3.5 ${bookmark.starred ? "fill-current" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => onDelete(bookmark.id)}
          title="Delete Pinchmark?"
          message={`Are you sure you want to delete "${bookmark.title || "Untitled"}"? This cannot be undone.`}
          confirmLabel="Delete Pinchmark"
          cancelLabel="Keep it"
          variant="danger"
        />
      </div>
    );
  }

  return (
    <div
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer relative"
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, bookmark.id)}
      onClick={handleCardClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-50" 
            onClick={(e) => { e.stopPropagation(); setContextMenu(null); }} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); }} 
          />
          <div
            className="fixed z-[51] bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/70 rounded-xl shadow-2xl py-2 min-w-[200px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(bookmark.url, '_blank', "noopener,noreferrer"); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            >
              🌐 Open URL
            </button>
            {userKeyType === 'human' && (
              <>
                {bookmark.jinaUrl ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(bookmark.jinaUrl!, '_blank', "noopener,noreferrer"); }}
                    className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium transition-colors border-t border-red-500/10 dark:border-red-500/20"
                  >
                    🦞 Open r.jina.ai Version
                  </button>
                ) : (
                     <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu(null); window.open(`https://r.jina.ai/${bookmark.url}`, '_blank', "noopener,noreferrer"); }}
                    className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium transition-colors border-t border-red-500/10 dark:border-red-500/20"
                  >
                    🦞 Open in r.jina.ai
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="w-6 h-6" onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }} />
          ) : (
            <span className="text-2xl">🦞</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-slate-900 dark:text-slate-50 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors"
          >
            {bookmark.title || "Untitled"}
          </h3>
          <span
            className="text-sm text-slate-500 dark:text-slate-400 truncate hover:text-cyan-600 flex items-center gap-1 max-w-full"
          >
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-cyan-600 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {bookmark.url}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </span>
        </div>
      </div>

      {bookmark.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
          {bookmark.description}
        </p>
      )}

      {bookmark.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
          {bookmark.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              +{bookmark.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(bookmark.createdAt)}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Edit */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-600"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(bookmark);
            }}
            title="Edit Pinchmark"
          >
            <Pencil className="w-4 h-4" />
          </Button>

          {/* Star */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${bookmark.starred ? "text-amber-500" : "text-slate-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(bookmark);
            }}
            title={bookmark.starred ? "Unstar" : "Star"}
          >
            <Star className={`w-4 h-4 ${bookmark.starred ? "fill-current" : ""}`} />
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${bookmark.archived ? "text-cyan-600" : "text-slate-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleArchive(bookmark);
            }}
            title={bookmark.archived ? "Unarchive" : "Archive"}
          >
            <Archive className="w-4 h-4" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(bookmark.id)}
        title="Delete Pinchmark?"
        message={`Are you sure you want to delete "${bookmark.title || "Untitled"}"? This cannot be undone.`}
        confirmLabel="Delete Pinchmark"
        cancelLabel="Keep it"
        variant="danger"
      />
    </div>
  );
}, (prev, next) => {
  // Only re-render if essential props change
  return (
    prev.bookmark.id === next.bookmark.id &&
    prev.bookmark.updatedAt === next.bookmark.updatedAt &&
    prev.layout === next.layout
  );
});