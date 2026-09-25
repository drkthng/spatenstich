// Liest/leert die IndexedDB-Inbox des Web Share Target — Phase 20 Plan 03
// Task 3 (DEPLOY-04). app/sw-src.js (POST /share-target-Handler) schreibt in
// dieselbe Datenbank/Store/Schluessel-Kombination mit der ROHEN IndexedDB-API
// (der Worker wird nicht durch Metro gebuendelt, kein Paket-Import dort) —
// diese Konstanten sind der Vertrag zwischen beiden Seiten. Aendert sich einer
// der drei Werte, muss die Aenderung auf BEIDEN Seiten passieren.
//
// Muster: app/src/storage/IndexedDbAdapter.ts (idb-Import + benannte
// Store-Konstanten).
import { openDB, type IDBPDatabase } from 'idb';

export const SHARE_DB_NAME = 'spatenstich-share';
export const SHARE_STORE_NAME = 'inbox';
export const SHARE_KEY = 'latest';
const SHARE_DB_VERSION = 1;

export interface ShareInboxEntry {
  text: string;
  receivedAt: number;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function openShareDb(): Promise<IDBPDatabase> {
  return openDB(SHARE_DB_NAME, SHARE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
        db.createObjectStore(SHARE_STORE_NAME);
      }
    },
  });
}

/**
 * Liest den zuletzt geteilten Eintrag und leert die Inbox danach. Ein zweiter
 * Aufruf liefert null. Auf Nicht-Web-Plattformen (kein indexedDB) sowie bei
 * einer leeren Inbox liefert die Funktion null, ohne zu werfen.
 */
export async function readAndClear(): Promise<ShareInboxEntry | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const db = await openShareDb();
    try {
      const entry = (await db.get(SHARE_STORE_NAME, SHARE_KEY)) as
        | ShareInboxEntry
        | undefined;
      if (entry) {
        await db.delete(SHARE_STORE_NAME, SHARE_KEY);
      }
      return entry ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Leert die Inbox ohne zu lesen (z.B. Datenschutz-Aufräumen nach Anzeige). */
export async function clear(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openShareDb();
    try {
      await db.delete(SHARE_STORE_NAME, SHARE_KEY);
    } finally {
      db.close();
    }
  } catch {
    // Kein Werfen — Aufräumen ist best-effort.
  }
}
