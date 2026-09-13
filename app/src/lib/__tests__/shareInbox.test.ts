// Phase 20 Plan 03 Task 3 (DEPLOY-04) — RED: shareInbox liest/leert die
// IndexedDB-Inbox, die der Service Worker (app/sw-src.js) mit der rohen
// IndexedDB-API beschreibt. Dieselben Konstanten (Datenbank/Store/Schluessel)
// wie im Worker — der Vertrag zwischen beiden Seiten.
import 'fake-indexeddb/auto';
import {
  readAndClear,
  clear,
  SHARE_DB_NAME,
  SHARE_STORE_NAME,
  SHARE_KEY,
} from '../shareInbox';

// Schreibt einen Eintrag über die ROHE IndexedDB-API — genau wie der Service
// Worker es tut (sw-src.js importiert `idb` bewusst nicht, siehe RESEARCH).
function writeRawShareEntry(entry: { text: string; receivedAt: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const openReq = indexedDB.open(SHARE_DB_NAME, 1);
    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
        db.createObjectStore(SHARE_STORE_NAME);
      }
    };
    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction(SHARE_STORE_NAME, 'readwrite');
      tx.objectStore(SHARE_STORE_NAME).put(entry, SHARE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    openReq.onerror = () => reject(openReq.error);
  });
}

describe('shareInbox', () => {
  it('readAndClear() liefert null, wenn nichts vorhanden ist, und wirft nicht', async () => {
    await expect(readAndClear()).resolves.toBeNull();
  });

  it('readAndClear() liefert den zuletzt geteilten Eintrag und leert die Inbox danach', async () => {
    await writeRawShareEntry({ text: '{"hello":"world"}', receivedAt: 1234 });

    const first = await readAndClear();
    expect(first).toEqual({ text: '{"hello":"world"}', receivedAt: 1234 });

    const second = await readAndClear();
    expect(second).toBeNull();
  });

  it('clear() leert die Inbox ohne zu lesen', async () => {
    await writeRawShareEntry({ text: 'irrelevant', receivedAt: 1 });
    await clear();
    const result = await readAndClear();
    expect(result).toBeNull();
  });
});
