// Database version management and migrations

import { DB_NAME } from "../utils/constants";
import { DatabaseError } from "../utils/errors";

export async function resetDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve();
    };

    request.onerror = () => {
      reject(new DatabaseError(`Error deleting database: ${request.error?.message}`));
    };

    request.onblocked = () => {
      console.warn("Database deletion blocked - closing all connections");
    };
  });
}

export async function getDatabaseVersion(): Promise<number> {
  const databases = await indexedDB.databases();
  const db = databases.find(d => d.name === DB_NAME);
  return db?.version || 0;
}

export async function migrateDatabase(fromVersion: number, toVersion: number): Promise<void> {
  console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);
  
  // Add migration logic here when needed
  // Example: if (fromVersion < 2) { /* migration to v2 */ }
  // if (fromVersion < 3) { /* migration to v3 */ }
  
  console.log("Migration completed");
}

export function shouldResetDatabase(currentVersion: number, targetVersion: number): boolean {
  return currentVersion > targetVersion;
}