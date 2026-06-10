import { SqliteAdapter } from './SqliteAdapter';
import type { StorageAdapter } from '@spatenstich/shared';

let _storage: StorageAdapter | null = null;

function createStorage(): StorageAdapter {
  if (_storage) return _storage;
  _storage = new SqliteAdapter('spatenstich.db');
  return _storage;
}

// set/has/getOwnPropertyDescriptor müssen ebenfalls an den echten Adapter delegieren —
// ohne set-Trap landen Zuweisungen (z.B. jest.spyOn) im leeren Dummy-Target und werden
// vom get-Trap nie wieder gelesen (Spy-Installation schlägt still fehl).
export const storage: StorageAdapter = new Proxy({} as StorageAdapter, {
  get(_target, prop, receiver) {
    return Reflect.get(createStorage(), prop, receiver);
  },
  set(_target, prop, value) {
    return Reflect.set(createStorage(), prop, value);
  },
  has(_target, prop) {
    return Reflect.has(createStorage(), prop);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(createStorage(), prop);
  },
  defineProperty(_target, prop, descriptor) {
    return Reflect.defineProperty(createStorage(), prop, descriptor);
  },
});
export { runMigrations } from './migrations';
export type { StorageAdapter } from '@spatenstich/shared';
