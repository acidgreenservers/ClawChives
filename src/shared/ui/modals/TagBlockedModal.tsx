import { X, Tag } from "lucide-react";
import { Button } from "../button";
import { ModalContainer } from "./ModalContainer";
import type { Bookmark } from "@/services/types";

interface TagBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: string;
  attachedBookmarks: Bookmark[];
}

export function TagBlockedModal({
  isOpen,
  onClose,
  tag,
  attachedBookmarks,
}: TagBlockedModalProps) {
  if (!isOpen) return null;

  return (
    <ModalContainer borderColor="border-amber-500/50 dark:border-amber-500/70" maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-amber-500/30 dark:border-amber-500/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Tag Still Attached 🦞
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Remove the tag from all Pinchmarks first
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm font-medium rounded-full border border-amber-200 dark:border-amber-700/50">
            <Tag className="w-3.5 h-3.5" />
            {tag}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            is pinched to {attachedBookmarks.length} Pinchmark{attachedBookmarks.length !== 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          To delete this tag, first remove it from the following Pinchmarks by editing each one:
        </p>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {attachedBookmarks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                <span className="text-sm">🦞</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                  {b.title || "Untitled"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{b.url}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex p-6 border-t border-amber-500/20 dark:border-amber-500/30">
        <Button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
        >
          Got it, I'll clean the reef first 🦞
        </Button>
      </div>
    </ModalContainer>
  );
}
