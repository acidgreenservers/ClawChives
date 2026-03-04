// Database connection logic

import { DB_NAME, DB_VERSION } from "../utils/constants";
import { VersionError, DatabaseError } from "../utils/errors";

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = request.error;
      if (error?.name === "VersionError") {
        reject(new VersionError(
          `Database version conflict. Current version is higher than ${DB_VERSION}. Please reset the database.`
        ));
      } else {
        reject(new DatabaseError(`Failed to open database: ${error?.message}`));
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
      
      // Schema creation is handled by migrations
      const { createSchema } = require("./schema");
      createSchema(db, oldVersion);
    };
  });
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getDB(): IDBDatabase | null {
  return dbInstance;
}