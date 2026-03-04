// Folder CRUD operations

import { STORES } from "../utils/constants";
import { ValidationError } from "../utils/errors";
import { 
  getAllFromStore, 
  addToStore, 
  updateInStore, 
  deleteFromStore, 
  getFromStore 
} from "../utils/database";
import type { Folder } from "../types";

export async function saveFolder(folder: Folder): Promise<Folder> {
  if (!folder.name || !folder.id) {
    throw new ValidationError("Folder must have name and id");
  }
  return addToStore(STORES.FOLDERS, folder);
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return getFromStore<Folder>(STORES.FOLDERS, id);
}

export async function getAllFolders(): Promise<Folder[]> {
  return getAllFromStore<Folder>(STORES.FOLDERS);
}

export async function updateFolder(folder: Folder): Promise<Folder> {
  if (!folder.id) {
    throw new ValidationError("Folder must have an id");
  }
  return updateInStore(STORES.FOLDERS, folder);
}

export async function deleteFolder(id: string): Promise<void> {
  deleteFromStore(STORES.FOLDERS, id);
}