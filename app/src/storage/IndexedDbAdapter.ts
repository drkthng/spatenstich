import { openDB, type IDBPDatabase } from 'idb';
import type { StorageAdapter } from '@spatenstich/shared';

const STORE = 'kv';
const SCHEMA_VERSION_KEY = '__schema_version__';

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbName: string) {
    this.dbPromise = openDB(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }

  async get(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    const v = await db.get(STORE, key);
    return typeof v === 'string' ? v : (v ?? null);
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE, value, key);
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE, key);
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.dbPromise;
    const keys = (await db.getAllKeys(STORE)) as string[];
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async getSchemaVersion(): Promise<number> {
    const v = await this.get(SCHEMA_VERSION_KEY);
    return v ? Number(v) : 0;
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.set(SCHEMA_VERSION_KEY, String(version));
  }
}
