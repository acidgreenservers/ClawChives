export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  favicon?: string;
  tags: string[];
  folderId?: string;
  starred: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt?: string;
  jinaUrl?: string | null; // Stored in jina_conversions table (human-only, LEFT JOIN)
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
}

export interface SetupData {
  username: string;
  displayName: string;
  key: string;
  avatar?: string;
}

export interface BookmarkFilters {
  starred?: boolean;
  archived?: boolean;
  folderId?: string;
  tags?: string[];
  search?: string;
}