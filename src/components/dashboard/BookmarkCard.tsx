import * as React from "react";
import { Star, Archive, Trash2, ExternalLink, Clock } from "lucide-react";
import { Button } from "../ui/button";

import type { Bookmark } from "../../types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  layout?: "grid" | "list";
  iconSize?: "small" | "medium" | "large";
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleArchive: (id: string) => void;
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

export function BookmarkCard({ 
  bookmark, 
  onEdit, 
  onDelete, 
  onToggleStar, 
  onToggleArchive,
  onDragStart
}: BookmarkCardProps) {
  const faviconUrl = getFaviconUrl(bookmark.url);

  return (
    <div 
      className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-cyan-300 transition-all cursor-pointer"
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, bookmark.id)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
            className="font-semibold text-slate-900 truncate hover:text-cyan-700 transition-colors"
            onClick={() => onEdit(bookmark)}
          >
            {bookmark.title || "Untitled"}
          </h3>
          <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-slate-500 truncate hover:text-cyan-600 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {bookmark.url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {bookmark.description && (
        <p 
          className="text-sm text-slate-600 line-clamp-2 mb-3"
          onClick={() => onEdit(bookmark)}
        >
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
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              +{bookmark.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(bookmark.createdAt)}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${bookmark.starred ? "text-amber-500" : "text-slate-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(bookmark.id);
            }}
          >
            <Star className={`w-4 h-4 ${bookmark.starred ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${bookmark.archived ? "text-cyan-600" : "text-slate-400"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleArchive(bookmark.id);
            }}
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this bookmark?")) {
                onDelete(bookmark.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}