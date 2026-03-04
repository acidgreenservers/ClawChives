// Shared database utility functions


import { DatabaseError } from "./errors";

export async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new DatabaseError(`Transaction failed: ${request.error?.message}`));
  });
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return executeTransaction(storeName, "readonly", (store) => store.getAll());
}

export async function addToStore<T>(storeName: string, data: T): Promise<T> {
  await executeTransaction(storeName, "readwrite", (store) => store.add(data));
  return data;
}

export async function updateInStore<T>(storeName: string, data: T): Promise<T> {
  await executeTransaction(storeName, "readwrite", (store) => store.put(data));
  return data;
}

export async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  await executeTransaction(storeName, "readwrite", (store) => store.delete(key));
}

export async function getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return executeTransaction(storeName, "readonly", (store) => store.get(key));
}

export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Import openDatabase from connection (circular dependency handled by index)
let dbInstance: IDBDatabase | null = null;

export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  const { openDB } = await import("../database/connection");
  dbInstance = await openDB();
  return dbInstance;
}