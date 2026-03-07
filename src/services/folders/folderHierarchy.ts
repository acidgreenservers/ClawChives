// Folder hierarchy management

import { getAllFolders, updateFolder } from "./folderService";
import type { Folder } from "../types";

export async function getFoldersByParent(parentId?: string): Promise<Folder[]> {
  const folders = await getAllFolders();
  return folders.filter(f => f.parentId === parentId);
}

export async function getFolderTree(): Promise<Folder[]> {
  const folders = await getAllFolders();
  const folderMap = new Map<string, Folder & { children: Folder[] }>();
  
  // Initialize all folders with empty children array
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });
  
  const rootFolders: (Folder & { children: Folder[] })[] = [];
  
  // Build tree structure
  folders.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(folderWithChildren);
    } else {
      rootFolders.push(folderWithChildren);
    }
  });
  
  return rootFolders;
}

export async function getFolderPath(folderId: string): Promise<Folder[]> {
  const folders = await getAllFolders();
  const folderMap = new Map<string, Folder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const path: Folder[] = [];
  let currentFolder = folderMap.get(folderId);
  
  while (currentFolder) {
    path.unshift(currentFolder);
    currentFolder = (currentFolder.parentId && folderMap.has(currentFolder.parentId))
      ? folderMap.get(currentFolder.parentId)
      : undefined;
  }
  
  return path;
}

export async function moveFolder(folderId: string, newParentId?: string): Promise<void> {
  const folders = await getAllFolders();
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) return;
  
  // Prevent circular references
  if (newParentId) {
    const path = await getFolderPath(newParentId);
    if (path.some(f => f.id === folderId)) {
      throw new Error("Cannot move folder into its own subtree");
    }
  }
  
  folder.parentId = newParentId;
  await updateFolder(folder);
}