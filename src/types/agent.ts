// Agent type definitions

export type PermissionLevel = "READ" | "WRITE" | "EDIT" | "MOVE" | "FULL";

export type ExpirationType = "never" | "30days" | "90days" | "1year" | "custom";

export interface AgentPermission {
  level: PermissionLevel;
  canRead: boolean;
  canWrite: boolean;
  canEdit: boolean;
  canMove: boolean;
  canDelete: boolean;
}

export interface AgentKey {
  id: string;
  name: string;
  description?: string;
  permissions: AgentPermission;
  apiKey: string; // Hashed in production, stored plain for MVP
  expirationType: ExpirationType;
  expirationDate?: string;
  rateLimit?: number; // Requests per minute, undefined = unlimited
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
}

export interface AgentKeyFormData {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  expirationType: ExpirationType;
  customExpirationDate?: string;
  rateLimit: number;
}

export const PERMISSION_CONFIGS: Record<PermissionLevel, AgentPermission> = {
  READ: {
    level: "READ",
    canRead: true,
    canWrite: false,
    canEdit: false,
    canMove: false,
    canDelete: false,
  },
  WRITE: {
    level: "WRITE",
    canRead: true,
    canWrite: true,
    canEdit: false,
    canMove: false,
    canDelete: false,
  },
  EDIT: {
    level: "EDIT",
    canRead: true,
    canWrite: true,
    canEdit: true,
    canMove: false,
    canDelete: false,
  },
  MOVE: {
    level: "MOVE",
    canRead: true,
    canWrite: true,
    canEdit: true,
    canMove: true,
    canDelete: false,
  },
  FULL: {
    level: "FULL",
    canRead: true,
    canWrite: true,
    canEdit: true,
    canMove: true,
    canDelete: true,
  },
};

export const PERMISSION_INFO: Record<PermissionLevel, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  READ: {
    label: "Read Only",
    description: "Can read bookmarks and folders. Cannot create, modify, or delete.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "📖",
  },
  WRITE: {
    label: "Write",
    description: "Can create new bookmarks and folders. Cannot modify or delete.",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: "✏️",
  },
  EDIT: {
    label: "Edit",
    description: "Can read, write, and modify bookmarks/folders. Cannot delete.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: "🔧",
  },
  MOVE: {
    label: "Move",
    description: "Can read, write, edit, and move items. Cannot permanently delete.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: "📁",
  },
  FULL: {
    label: "Full Access",
    description: "Complete control over all bookmark operations.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "🔑",
  },
};