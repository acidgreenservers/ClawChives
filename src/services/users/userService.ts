// User CRUD operations

import { STORES } from "../utils/constants";
import { ValidationError } from "../utils/errors";
import { getAllFromStore, addToStore, updateInStore, deleteFromStore, getFromStore } from "../utils/database";
import type { User } from "../types";

export async function saveUser(user: User): Promise<User> {
  if (!user.username || !user.displayName || !user.uuid) {
    throw new ValidationError("User must have username, displayName, and uuid");
  }
  return addToStore(STORES.USER, user);
}

export async function getUser(uuid: string): Promise<User | undefined> {
  return getFromStore<User>(STORES.USER, uuid);
}

export async function getAllUsers(): Promise<User[]> {
  return getAllFromStore<User>(STORES.USER);
}

export async function updateUser(user: User): Promise<User> {
  if (!user.uuid) {
    throw new ValidationError("User must have a uuid");
  }
  return updateInStore(STORES.USER, user);
}

export async function deleteUser(uuid: string): Promise<void> {
  deleteFromStore(STORES.USER, uuid);
}

export async function getCurrentUser(): Promise<User | null> {
  const users = await getAllUsers();
  return users.length > 0 ? users[0] : null;
}