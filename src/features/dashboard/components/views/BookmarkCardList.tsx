import * as React from "react";
import { Star, Link as LinkIcon, Archive, Trash2, Pencil, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ConfirmModal } from "@/shared/ui/LobsterModal";
import { BookmarkContextMenu } from "./BookmarkContextMenu";
import { getFaviconUrl, getTagColor, formatRelativeTime } from "./bookmarkCardUtils";
import type { Bookmark } from "@/services/types";

export interface BookmarkCardListProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (bookmark: Bookmark) => void;
  onToggleArchive: (bookmark: Bookmark) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  userKeyType: string;
}

export const BookmarkCardList = React.memo((props: BookmarkCardListProps) => {
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

  const pinchCardClick = (_e: React.MouseEvent) => {
    if (confirmOpen) return;
    
    // Hard-shell validation: Only allow http/https to prevent XSS via javascript: uris
    const isSafe = bookmark.url.startsWith('http://') || bookmark.url.startsWith('https://');
    if (isSafe) {
      window.open(bookmark.url, "_blank", "noopener,noreferrer");
    } else {
      console.warn("Blocked unsafe URL navigation:", bookmark.url);
    }
  };

  return (
    <div
      className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700 transition-all cursor-pointer relative"
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, bookmark.id!)}
      onClick={pinchCardClick}
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

      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
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
          <LinkIcon className="w-6 h-6 text-slate-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50 truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
            {bookmark.title || "Untitled"}
          </h3>
          {bookmark.starred && <Star className="w-4 h-4 text-amber-500 fill-current" />}
          {bookmark.archived && <Archive className="w-4 h-4 text-cyan-600" />}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate hover:text-cyan-600 flex items-center gap-1">
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
        </p>

        <div className="flex items-center gap-4 mt-2">
          {bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bookmark.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(bookmark.createdAt!)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-600"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bookmark);
          }}
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-amber-500"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(bookmark);
          }}
          title={bookmark.starred ? "Unstar" : "Star"}
        >
          <Star className={`w-4 h-4 ${bookmark.starred ? "fill-current text-amber-500" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-600"
          onClick={(e) => {
            e.stopPropagation();
            onToggleArchive(bookmark);
          }}
          title={bookmark.archived ? "Unarchive" : "Archive"}
        >
          <Archive className={`w-4 h-4 ${bookmark.archived ? "text-cyan-600 fill-current" : ""}`} />
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
    prev.bookmark.updatedAt === next.bookmark.updatedAt &&
    prev.bookmark.starred === next.bookmark.starred &&
    prev.bookmark.archived === next.bookmark.archived
  );
});
