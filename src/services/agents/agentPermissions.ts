// Permission validation

import { PERMISSIONS } from "../utils/constants";
import type { AgentKey } from "../types";

export enum Permission {
  READ = "read",
  WRITE = "write",
  EDIT = "edit",
  MOVE = "move",
  DELETE = "delete",
  FULL = "full",
}

export function hasPermission(agentKey: AgentKey, action: string): boolean {
  if (!agentKey.isActive) return false;
  
  const { permissions } = agentKey;
  
  // Full access grants all permissions
  if (permissions.level === PERMISSIONS.FULL) return true;
  
  switch (action) {
    case PERMISSIONS.READ:
      return permissions.canRead;
    case PERMISSIONS.WRITE:
      return permissions.canWrite;
    case PERMISSIONS.EDIT:
      return permissions.canEdit;
    case PERMISSIONS.MOVE:
      return permissions.canMove;
    case PERMISSIONS.DELETE:
      return permissions.canDelete;
    default:
      return false;
  }
}

export function validatePermission(perm: Permission, action: string): boolean {
  return perm === Permission.FULL || perm === action;
}

export function getRequiredPermission(action: string): Permission {
  switch (action) {
    case "read":
    case "get":
    case "list":
      return Permission.READ;
    case "create":
    case "add":
    case "save":
      return Permission.WRITE;
    case "update":
    case "edit":
    case "modify":
      return Permission.EDIT;
    case "move":
      return Permission.MOVE;
    case "delete":
    case "remove":
      return Permission.DELETE;
    default:
      return Permission.READ;
  }
}

export function checkAgentKeyExpiry(agentKey: AgentKey): boolean {
  if (agentKey.expirationType === "never") return true;
  
  if (agentKey.expirationDate) {
    return new Date(agentKey.expirationDate) > new Date();
  }
  
  return false;
}