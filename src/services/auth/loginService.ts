// User authentication service

import { getCurrentUser } from "../users";
import { AuthenticationError } from "../utils/errors";
import type { User } from "../types";

export async function authenticateWithKeyPair(
  publicKey: string,
  privateKey: string
): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new AuthenticationError("No user found. Please complete setup first.");
  }
  
  if (user.publicKey !== publicKey) {
    throw new AuthenticationError("Invalid public key");
  }
  
  // In a real implementation, verify the private key matches
  // For MVP, we'll just check that a private key was provided
  if (!privateKey || privateKey.length < 10) {
    throw new AuthenticationError("Invalid private key");
  }
  
  return user;
}

export async function logout(): Promise<void> {
  // Clear any in-memory state
  // In a real app, this might clear JWT tokens from memory
  console.log("User logged out");
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}