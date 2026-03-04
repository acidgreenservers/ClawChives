// Shared constants for all services

export const DB_NAME = "ClawChivesDB";
export const DB_VERSION = 4;

export const STORES = {
  BOOKMARKS: "bookmarks",
  FOLDERS: "folders",
  TAGS: "tags",
  AGENT_KEYS: "agent_keys",
  APPEARANCE_SETTINGS: "appearance_settings",
  PROFILE_SETTINGS: "profile_settings",
  USER: "user",
} as const;

export const PERMISSIONS = {
  READ: "read",
  WRITE: "write",
  EDIT: "edit",
  MOVE: "move",
  DELETE: "delete",
  FULL: "full",
} as const;

export const LAYOUTS = ["grid", "list", "masonry"] as const;
export const THEMES = ["light", "dark", "auto"] as const;
export const SORT_OPTIONS = ["dateAdded", "title", "starred"] as const;
export const ITEMS_PER_PAGE = [12, 24, 48] as const;