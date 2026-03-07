import { useState, useEffect } from "react";
import { X, Trash2, Folder } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface FolderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** undefined = create mode */
  folder?: { id: string; name: string; color?: string } | null;
  /** Bookmark count inside this pod */
  bookmarkCount?: number;
  onSave: (data: { name: string; color: string }) => void;
  onDelete?: () => void;
}

const PRESET_COLORS = [
  "#06b6d4", "#d97706", "#ef4444", "#8b5cf6",
  "#10b981", "#f59e0b", "#3b82f6", "#ec4899",
];

export function FolderEditModal({
  isOpen,
  onClose,
  folder,
  bookmarkCount = 0,
  onSave,
  onDelete,
}: FolderEditModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#06b6d4");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPinnedPod = folder?.name === "Pinned";
  const hasPins = isPinnedPod && bookmarkCount > 0;

  useEffect(() => {
    if (!isOpen) return;
    setName(folder?.name ?? "");
    setColor(folder?.color ?? "#06b6d4");
    setConfirmDelete(false);
  }, [isOpen, folder]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
    onClose();
  };

  const handleDeleteClick = () => {
    if (hasPins) return; // protected
    if (bookmarkCount > 0) {
      setConfirmDelete(true);
    } else {
      onDelete?.();
      onClose();
    }
  };

  const handleConfirmDelete = () => {
    onDelete?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/70 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-red-500/30 dark:border-red-500/50">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {folder ? "Edit Pod" : "New Pod"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="folder-name" className="text-slate-700 dark:text-slate-300">
              Pod Name
            </Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research, Reading List…"
              className="mt-1 dark:bg-slate-800 dark:border-slate-600"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-red-500 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Pod color preview */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span>Preview</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{name || "Pod Name"}</span>
          </div>

          {/* Warning / Confirm delete */}
          {confirmDelete && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 space-y-2">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                ⚠️ This Pod contains {bookmarkCount} Pinchmark{bookmarkCount !== 1 ? "s" : ""}.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Deleting it will un-Pod them, but won't delete the Pinchmarks themselves.
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  Delete Pod
                </Button>
              </div>
            </div>
          )}

          {/* Pinned Pod protection notice */}
          {hasPins && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/40">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                📌 Remove all pins from your Pinchmarks first before deleting the <strong>Pinned</strong> Pod.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-red-500/20 dark:border-red-500/30">
          {folder && onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={hasPins}
              className={`gap-1.5 ${hasPins ? "text-slate-300 dark:text-slate-600 cursor-not-allowed" : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"}`}
            >
              <Trash2 className="w-4 h-4" />
              Delete Pod
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!name.trim()}
              className="bg-cyan-700 hover:bg-cyan-800 text-white"
            >
              {folder ? "Save Pod" : "Create Pod"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
