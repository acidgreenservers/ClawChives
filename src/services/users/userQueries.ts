// Complex user queries

import { getAllUsers } from "./userService";
import type { User } from "../types";

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export async function searchUsers(query: string): Promise<User[]> {
  const users = await getAllUsers();
  const lowerQuery = query.toLowerCase();
  return users.filter(
    u => 
      u.username.toLowerCase().includes(lowerQuery) ||
      u.displayName.toLowerCase().includes(lowerQuery)
  );
}

export async function getUserStats(): Promise<{
  totalUsers: number;
  createdToday: number;
}> {
  const users = await getAllUsers();
  const today = new Date().toDateString();
  
  return {
    totalUsers: users.length,
    createdToday: users.filter(u => new Date(u.createdAt).toDateString() === today).length,
  };
}