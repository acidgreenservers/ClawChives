import { useState, useEffect, useRef } from "react";
import { generateUUID } from "@/shared/lib/crypto";
import type { Bookmark, Folder as FolderType } from "@/services/types";

export interface UseBookmarkFormProps {
  bookmark?: Bookmark | null;
  folders: FolderType[];
  isOpen: boolean;
  onSave: (bookmark: Bookmark) => void;
  onClose: () => void;
  db: any; // Database adapter instance
  onFoldersRefresh?: () => void;
}

export function useBookmarkForm({
  bookmark,
  folders,
  isOpen,
  onSave,
  onClose,
  db,
  onFoldersRefresh,
}: UseBookmarkFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [starred, setStarred] = useState(false);
  const [archived, setArchived] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jinaConversion, setJinaConversion] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

      const isPinnedFolder = folders.find((f) => f.name === "Pinned" && f.id === bookmark.folderId);
      setPinned(!!isPinnedFolder);
    } else {
      resetForm();
    }
  }, [bookmark, isOpen, folders]);

  // Auto-fetch metadata when URL is entered
  useEffect(() => {
    if (!url.trim() || !url.startsWith("http")) return;

    // Do not overwrite if we already have both a title and description, or if the URL matches the initial bookmark URL
    if (bookmark && url === bookmark.url) return;

    // Clear any pending fetch
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Set a new timeout for debounced fetch
    debounceTimer.current = setTimeout(() => {
      handleUrlPaste(url);
    }, 800);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [url, bookmark]);

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setDescription("");
    setTags([]);
    setSelectedFolder("");
    setStarred(false);
    setArchived(false);
    setPinned(false);
    setJinaConversion(false);
  };

  const handleUrlPaste = async (pastedText: string, forceOverride = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pastedText)}`);
      const data = await response.json();
      if (data.data) {
        if (forceOverride) {
          setTitle(data.data.title || "");
          setDescription(data.data.description || "");
        } else {
          setTitle((prev) => prev ? prev : (data.data.title || ""));
          setDescription((prev) => prev ? prev : (data.data.description || ""));
        }
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
    } else if (!jinaConversion && bookmark?.jinaUrl) {
      finalJinaUrl = null;
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

  return {
    formState: {
      url, setUrl,
      title, setTitle,
      description, setDescription,
      tags, setTags,
      selectedFolder, setSelectedFolder,
      starred, setStarred,
      archived, setArchived,
      pinned, setPinned,
      isLoading,
      jinaConversion, setJinaConversion
    },
    handleUrlPaste,
    handleSave,
    resetForm
  };
}
