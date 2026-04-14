import * as React from "react";
import { Star, Archive, Trash2, Pencil, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ConfirmModal } from "@/shared/ui/LobsterModal";
import { BookmarkContextMenu } from "./BookmarkContextMenu";
import { getFaviconUrl, getTagColor, formatRelativeTime } from "./bookmarkCardUtils";
import type { Bookmark } from "@/services/types";

export interface BookmarkCardGridProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (bookmark: Bookmark) => void;
  onToggleArchive: (bookmark: Bookmark) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  userKeyType: string;
}

export const BookmarkCardGrid = React.memo((props: BookmarkCardGridProps) => {
  const {
    bookmark,
    onEdit,
    onDelete,
    onToggleStar,
    onToggleArchive,
    onDragStart,
    userKeyType,
  } = props;

  const faviconUrl = getFaviconUrl(bookmark.url);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);

  const handleCardClick = () => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer relative"
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, bookmark.id!)}
      onClick={handleCardClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <BookmarkContextMenu
        bookmark={bookmark}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        userKeyType={userKeyType}
      />

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-6 h-6"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-2xl">🦞</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
            {bookmark.title || "Untitled"}
          </h3>
          <span className="text-sm text-slate-500 dark:text-slate-400 truncate hover:text-cyan-600 flex items-center gap-1 max-w-full">
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
          {formatRelativeTime(bookmark.createdAt!)}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <Archive className={`w-4 h-4 ${bookmark.archived ? "fill-current" : ""}`} />
          </Button>

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

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(bookmark.id!)}
        title="Delete Pinchmark?"
        message={`Are you sure you want to delete "${bookmark.title || "Untitled"}"? This cannot be undone.`}
        confirmLabel="Delete Pinchmark"
        cancelLabel="Keep it"
        variant="danger"
      />
    </div>
  );
}, (prev, next) => {
  return (
    prev.bookmark.id === next.bookmark.id &&
    prev.bookmark.updatedAt === next.bookmark.updatedAt
  );
});
