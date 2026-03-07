// Shared type definitions

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  tags: string[];
  folderId?: string;
  starred: boolean;
  archived: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
  jinaUrl?: string; // Stores https://r.jina.ai/{original_url} (fetched client-side)
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface AgentKey {
  id: string;
  name: string;
  description?: string;
  apiKey: string;
  permissions: {
    level: string;
    canRead: boolean;
    canWrite: boolean;
    canEdit: boolean;
    canMove: boolean;
    canDelete: boolean;
  };
  expirationType: string;
  expirationDate?: string;
  rateLimit?: number;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "auto";
  layout: "grid" | "list" | "masonry";
  itemsPerPage: 12 | 24 | 48;
  sortBy: "dateAdded" | "title" | "starred";
  notifications: boolean;
  pwaUpdates: boolean;
  compactMode?: boolean;
  showFavicons?: boolean;
}

export interface ProfileSettings {
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
}

export interface User {
  username: string;
  displayName: string;
  uuid: string;
  publicKey?: string;
  avatar?: string;
  createdAt: string;
}