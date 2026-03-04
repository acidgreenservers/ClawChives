/**
 * DatabaseProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the application with the database adapter.
 * Uses RestAdapter exclusively, connecting to the Express API (server.js).
 *
 * Usage:
 *   const db = useDatabaseAdapter();
 *   const bookmarks = await db.getBookmarks();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { IDatabaseAdapter } from "./adapter";
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
  return "SQLITE";
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const adapter = useMemo<IDatabaseAdapter>(() => {
    console.info("[ClawChives] Database mode: REST/SQLite → server.js");
    return new RestAdapter();
  }, []);

  return (
    <DatabaseContext.Provider value={adapter}>
      {children}
    </DatabaseContext.Provider>
  );
}
