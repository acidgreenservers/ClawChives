// New user setup service

import { saveUser } from "../users";
import { saveProfileSettings } from "../settings";
import { generateRandomString } from "../utils/database";
import type { User } from "../types";

export interface SetupData {
  username: string;
  displayName: string;
  avatar?: string;
}

export async function setupNewUser(data: SetupData): Promise<User> {
  const uuid = crypto.randomUUID();
  const publicKey = `pub_${generateRandomString(64)}`;
  
  const user: User = {
    username: data.username.trim(),
    displayName: data.displayName.trim() || data.username.trim(),
    uuid,
    publicKey,
    avatar: data.avatar,
    createdAt: new Date().toISOString(),
  };
  
  await saveUser(user);
  await saveProfileSettings({
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
  });
  
  return user;
}

export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  // In a real implementation, this would use Web Crypto API
  return {
    publicKey: `pub_${generateRandomString(64)}`,
    privateKey: `priv_${generateRandomString(128)}`,
  };
}