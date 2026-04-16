import * as SQLite from 'expo-sqlite';
import type { StorageAdapter } from '@spatenstich/shared';

const SCHEMA_VERSION_KEY = '__schema_version__';

export class SqliteAdapter implements StorageAdapter {
  private dbPromise: Promise<SQLite.SQLiteDatabase>;

  constructor(dbName: string) {
    this.dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(dbName);
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
      );
      return db;
    })();
  }

  async get(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync(
      'INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      key,
      value,
    );
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.dbPromise;
    const rows = prefix
      ? await db.getAllAsync<{ key: string }>('SELECT key FROM kv WHERE key LIKE ?', `${prefix}%`)
      : await db.getAllAsync<{ key: string }>('SELECT key FROM kv');
    return rows.map((r) => r.key);
  }

  async getSchemaVersion(): Promise<number> {
    const v = await this.get(SCHEMA_VERSION_KEY);
    return v ? Number(v) : 0;
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.set(SCHEMA_VERSION_KEY, String(version));
  }
}
