import { SqliteAdapter } from './SqliteAdapter';
import type { StorageAdapter } from '@spatenstich/shared';

let _storage: StorageAdapter | null = null;

function createStorage(): StorageAdapter {
  if (_storage) return _storage;
  _storage = new SqliteAdapter('spatenstich.db');
  return _storage;
}

export const storage: StorageAdapter = new Proxy({} as StorageAdapter, {
  get(_target, prop, receiver) {
    return Reflect.get(createStorage(), prop, receiver);
  },
});
export { runMigrations } from './migrations';
export type { StorageAdapter } from '@spatenstich/shared';
