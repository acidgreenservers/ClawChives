import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { X, Plus, Tag, Folder, Star, Archive } from "lucide-react";

import type { Bookmark, Folder as FolderType } from "../../lib/indexedDB";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookmark: Bookmark) => void;
  bookmark?: Bookmark | null;
  folders: FolderType[];
}

export function BookmarkModal({ isOpen, onClose, onSave, bookmark, folders }: BookmarkModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [starred, setStarred] = useState(false);
  const [archived, setArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setUrl(bookmark.url);
      setTitle(bookmark.title);
      setDescription(bookmark.description || "");
      setTags(bookmark.tags);
      setSelectedFolder(bookmark.folderId || "");
      setStarred(bookmark.starred);
      setArchived(bookmark.archived);
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

  const handleSave = () => {
    if (!url.trim()) return;

    const now = new Date().toISOString();

    // If editing existing bookmark, preserve id and createdAt
    const bookmarkData: Bookmark = bookmark ? {
      ...bookmark,
      url: url.trim(),
      title: title.trim() || "Untitled",
      description: description.trim() || undefined,
      tags,
      folderId: selectedFolder || undefined,
      starred,
      archived,
      updatedAt: now,
    } : {
      id: crypto.randomUUID(),
      url: url.trim(),
      title: title.trim() || "Untitled",
      description: description.trim() || undefined,
      tags,
      folderId: selectedFolder || undefined,
      starred,
      archived,
      createdAt: now,
      updatedAt: now,
    };

    onSave(bookmarkData);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {bookmark ? "Edit Bookmark" : "Add Bookmark"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                if (pastedText.startsWith("http")) {
                  handleUrlPaste(pastedText);
                }
              }}
              className="mt-1"
            />
            {isLoading && (
              <p className="text-xs text-slate-500 mt-1">Fetching metadata...</p>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Bookmark title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <Label htmlFor="folder">Folder</Label>
            <div className="relative mt-1">
              <select
                id="folder"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none bg-white"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <Folder className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-cyan-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={starred}
                onChange={(e) => setStarred(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
              />
              <div className="flex items-center gap-2 text-sm text-slate-700">
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
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Archive className={`w-4 h-4 ${archived ? "text-cyan-600" : ""}`} />
                Archived
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-cyan-700 hover:bg-cyan-800">
            {bookmark ? "Save Changes" : "Add Bookmark"}
          </Button>
        </div>
      </div>
    </div>
  );
}