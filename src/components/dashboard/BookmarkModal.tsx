import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { X, Plus, Tag, Folder, Star, Archive } from "lucide-react";
import { generateUUID } from "../../lib/crypto";
import { useDatabaseAdapter } from "../../services/database/DatabaseProvider";

import type { Bookmark, Folder as FolderType } from "../../services/types";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookmark: Bookmark) => void;
  bookmark?: Bookmark | null;
  folders: FolderType[];
  onFoldersRefresh?: () => void;
}

const LOBSTER_TAG_COLORS = [
  {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-800 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-700/50",
    hover: "hover:text-cyan-900 dark:hover:text-cyan-100"
  },
  {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-700/50",
    hover: "hover:text-amber-900 dark:hover:text-amber-100"
  },
  {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-200 dark:border-red-700/50",
    hover: "hover:text-red-900 dark:hover:text-red-100"
  }
];

function getTagColor(tag: string) {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LOBSTER_TAG_COLORS[hash % LOBSTER_TAG_COLORS.length];
}

export function BookmarkModal({ isOpen, onClose, onSave, bookmark, folders, onFoldersRefresh }: BookmarkModalProps) {
  const db = useDatabaseAdapter();
  const userKeyType = sessionStorage.getItem("cc_key_type") || "unknown";

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [starred, setStarred] = useState(false);
  const [archived, setArchived] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jinaConversion, setJinaConversion] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setUrl(bookmark.url);
      setTitle(bookmark.title);
      setDescription(bookmark.description || "");
      setTags(bookmark.tags);
      setSelectedFolder(bookmark.folderId || "");
      setStarred(bookmark.starred);
      setArchived(bookmark.archived);
      setJinaConversion(!!bookmark.jinaUrl);
      // Detect if currently in Pinned folder
      const isPinnedFolder = folders.find((f) => f.name === "Pinned" && f.id === bookmark.folderId);
      setPinned(!!isPinnedFolder);
    } else {
      resetForm();
    }
  }, [bookmark, isOpen]);

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setDescription("");
    setTags([]);
    setTagInput("");
    setSelectedFolder("");
    setStarred(false);
    setArchived(false);
    setPinned(false);
    setJinaConversion(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleUrlPaste = async (pastedText: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pastedText)}`);
      const data = await response.json();
      if (data.data) {
        setTitle(data.data.title || title);
        setDescription(data.data.description || description);
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) return;
    if (!db) return;

    const now = new Date().toISOString();
    let finalFolderId = selectedFolder || undefined;

    // Pin logic: if pinned, ensure "Pinned" pod exists
    if (pinned) {
      let pinnedFolder = folders.find((f) => f.name === "Pinned");
      if (!pinnedFolder) {
        const newFolder: FolderType = {
          id: generateUUID(),
          name: "Pinned",
          color: "#ef4444",
          createdAt: now,
        };
        await db.saveFolder(newFolder);
        onFoldersRefresh?.();
        finalFolderId = newFolder.id;
      } else {
        finalFolderId = pinnedFolder.id;
      }
    }

    let finalJinaUrl = undefined;
    if (jinaConversion && url.trim()) {
      try {
        new URL(url.trim());
        finalJinaUrl = `https://r.jina.ai/${url.trim()}`;
      } catch {
        console.error("Invalid URL format for r.jina");
      }
    }

    const bookmarkData: Bookmark = bookmark ? {
      ...bookmark,
      url: url.trim(),
      title: title.trim() || "Untitled",
      description: description.trim() || undefined,
      tags,
      folderId: finalFolderId,
      starred,
      archived,
      jinaUrl: finalJinaUrl !== undefined ? finalJinaUrl : bookmark?.jinaUrl,
      updatedAt: now,
    } : {
      id: generateUUID(),
      url: url.trim(),
      title: title.trim() || "Untitled",
      description: description.trim() || undefined,
      tags,
      folderId: finalFolderId,
      starred,
      archived,
      jinaUrl: finalJinaUrl,
      createdAt: now,
      updatedAt: now,
    };

    onSave(bookmarkData);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/70 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/30 dark:border-red-500/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {bookmark ? "Edit Pinchmark" : "Add Pinchmark"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {bookmark ? "Adjust your pinch" : "Pinch a URL into your collection"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {/* URL */}
          <div>
            <Label htmlFor="url" className="text-slate-700 dark:text-white">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                if (pastedText.startsWith("http")) handleUrlPaste(pastedText);
              }}
              className="mt-1 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            {isLoading && (
              <p className="text-xs text-cyan-500 dark:text-cyan-400 mt-1 flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full" />
                Fetching metadata…
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-slate-700 dark:text-white">Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Pinchmark title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">Description</Label>
            <textarea
              id="description"
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none"
            />
          </div>

          {/* Folder */}
          <div>
            <Label htmlFor="folder" className="text-slate-700 dark:text-slate-300">Pod</Label>
            <div className="relative mt-1">
              <select
                id="folder"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">No Pod</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <Folder className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-slate-700 dark:text-white">Tags</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
                  }}
                  className="pl-10 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddTag} className="px-3 dark:border-slate-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => {
                  const color = getTagColor(tag);
                  return (
                    <span key={tag} className={`inline-flex items-center gap-1 px-2 py-1 ${color.bg} ${color.text} rounded-full text-sm border ${color.border}`}>
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className={color.hover}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* r.jina.ai Conversion (Human-only) */}
          {userKeyType === 'human' && (
            <div className="flex items-center gap-2 pt-4 border-t border-red-500/20 dark:border-red-500/30">
              <input
                type="checkbox"
                id="jinaConversion"
                checked={jinaConversion}
                onChange={(e) => setJinaConversion(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
              />
              <label htmlFor="jinaConversion" className="text-sm font-medium text-amber-600 dark:text-amber-500">
                🦞 r.jina.ai Conversion (on-demand fetch)
              </label>
            </div>
          )}

          {/* Checkboxes: Starred / Archived / Pinned */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-red-500/20 dark:border-red-500/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={starred}
                onChange={(e) => setStarred(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
              />
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Star className={`w-4 h-4 ${starred ? "fill-amber-500 text-amber-500" : ""}`} />
                Starred
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
              />
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Archive className={`w-4 h-4 ${archived ? "text-cyan-600" : ""}`} />
                Archived
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
              />
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className={`text-base leading-none ${pinned ? "grayscale-0" : "grayscale opacity-50"}`}>📌</span>
                Pinned
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-red-500/20 dark:border-red-500/30">
          <Button variant="outline" onClick={onClose} className="flex-1 dark:border-slate-600 dark:text-slate-300">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            {bookmark ? "Save Pinchmark" : "Pinch It! 🦞"}
          </Button>
        </div>
      </div>
    </div>
  );
}