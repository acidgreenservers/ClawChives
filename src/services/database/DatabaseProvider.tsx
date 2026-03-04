/**
 * DatabaseProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the application with the correct database adapter based on
 * the VITE_DATABASE build-time environment variable.
 *
 *   VITE_DATABASE=INDEXEDDB  → IndexedDBAdapter (default, no server needed)
 *   VITE_DATABASE=SQLITE     → RestAdapter (requires server.js running)
 *
 * Usage:
 *   const db = useDatabaseAdapter();
 *   const bookmarks = await db.getBookmarks();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { IDatabaseAdapter } from "./adapter";
import { IndexedDBAdapter } from "./indexeddb/IndexedDBAdapter";
import { RestAdapter } from "./rest/RestAdapter";

const DatabaseContext = createContext<IDatabaseAdapter | null>(null);

/** Returns the active database adapter. Throws if called outside <DatabaseProvider>. */
export function useDatabaseAdapter(): IDatabaseAdapter {
  const adapter = useContext(DatabaseContext);
  if (!adapter) {
    throw new Error("useDatabaseAdapter must be used within a <DatabaseProvider>");
  }
  return adapter;
}

/** The active database mode — useful for showing UI hints (e.g., "Synced via API") */
export function useDatabaseMode(): "INDEXEDDB" | "SQLITE" {
  const mode = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_DATABASE ?? "INDEXEDDB").toUpperCase();
  return mode === "SQLITE" ? "SQLITE" : "INDEXEDDB";
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const adapter = useMemo<IDatabaseAdapter>(() => {
    const env = (import.meta as unknown as { env: Record<string, string> }).env;
    const mode = (env.VITE_DATABASE ?? "INDEXEDDB").toUpperCase();

    if (mode === "SQLITE") {
      console.info("[ClawChives] Database mode: REST/SQLite → server.js");
      return new RestAdapter();
    }

    console.info("[ClawChives] Database mode: IndexedDB (offline/static)");
    return new IndexedDBAdapter();
  }, []);

  return (
    <DatabaseContext.Provider value={adapter}>
      {children}
    </DatabaseContext.Provider>
  );
}
