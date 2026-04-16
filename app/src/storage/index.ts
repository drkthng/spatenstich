import { Platform } from 'react-native';
import { SqliteAdapter } from './SqliteAdapter';
import { IndexedDbAdapter } from './IndexedDbAdapter';
import type { StorageAdapter } from '@spatenstich/shared';

export const storage: StorageAdapter = Platform.select({
  web: new IndexedDbAdapter('spatenstich-db') as StorageAdapter,
  default: new SqliteAdapter('spatenstich.db'),
})!;
export { runMigrations } from './migrations';
export type { StorageAdapter } from '@spatenstich/shared';
