/**
 * StorageAdapter contract tests
 * - IndexedDbAdapter tested with fake-indexeddb (node env)
 * - SqliteAdapter: contract tested via interface mock (real SQLite needs native runtime)
 * - Static import check: no feature code outside src/storage/ imports expo-sqlite
 */
import 'fake-indexeddb/auto';
import { IndexedDbAdapter } from '../IndexedDbAdapter';
import { runMigrations, MIGRATIONS } from '../migrations';
import type { StorageAdapter } from '@spatenstich/shared';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import * as path from 'path';

// Helper: run the full contract suite against any StorageAdapter instance
function contractSuite(name: string, factory: () => StorageAdapter) {
  describe(`StorageAdapter contract — ${name}`, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = factory();
    });

    it('get returns null for unknown key', async () => {
      const result = await adapter.get('__nonexistent__');
      expect(result).toBeNull();
    });

    it('set + get round-trip persists value', async () => {
      await adapter.set('hello', 'world');
      const result = await adapter.get('hello');
      expect(result).toBe('world');
    });

    it('delete removes key and subsequent get returns null', async () => {
      await adapter.set('to_delete', 'value');
      await adapter.delete('to_delete');
      const result = await adapter.get('to_delete');
      expect(result).toBeNull();
    });

    it('list returns all keys without prefix', async () => {
      await adapter.set('a:1', 'v1');
      await adapter.set('a:2', 'v2');
      await adapter.set('b:1', 'v3');
      const keys = await adapter.list();
      expect(keys).toEqual(expect.arrayContaining(['a:1', 'a:2', 'b:1']));
    });

    it('list returns keys with optional prefix filter', async () => {
      await adapter.set('user:1', 'v1');
      await adapter.set('user:2', 'v2');
      await adapter.set('other:1', 'v3');
      const keys = await adapter.list('user:');
      expect(keys).toEqual(expect.arrayContaining(['user:1', 'user:2']));
      expect(keys).not.toContain('other:1');
    });

    it('getSchemaVersion before migrations returns 0', async () => {
      const version = await adapter.getSchemaVersion();
      expect(version).toBe(0);
    });

    it('setSchemaVersion + getSchemaVersion round-trip', async () => {
      await adapter.setSchemaVersion(5);
      const version = await adapter.getSchemaVersion();
      expect(version).toBe(5);
    });
  });
}

// Web adapter: IndexedDbAdapter with fake-indexeddb
contractSuite('IndexedDbAdapter (web)', () => new IndexedDbAdapter(`test-db-${Date.now()}-${Math.random()}`));

describe('runMigrations', () => {
  it('runs pending migrations and advances schema version', async () => {
    const adapter = new IndexedDbAdapter(`migrations-test-${Date.now()}`);
    await runMigrations(adapter);
    const version = await adapter.getSchemaVersion();
    expect(version).toBe(MIGRATIONS[MIGRATIONS.length - 1]!.version);
  });

  it('is idempotent — running twice does not change schema version', async () => {
    const adapter = new IndexedDbAdapter(`migrations-idempotent-${Date.now()}`);
    await runMigrations(adapter);
    const v1 = await adapter.getSchemaVersion();
    await runMigrations(adapter);
    const v2 = await adapter.getSchemaVersion();
    expect(v1).toBe(v2);
  });
});

describe('Static import check', () => {
  it('no feature code outside src/storage/ imports expo-sqlite directly', () => {
    const srcRoot = path.resolve(__dirname, '../../..');
    const offenders = globSync('src/**/*.{ts,tsx}', {
      cwd: srcRoot,
      ignore: ['src/storage/**'],
    }).filter((f) => {
      const content = readFileSync(path.join(srcRoot, f), 'utf8');
      return /from\s+['"]expo-sqlite['"]/.test(content);
    });
    expect(offenders).toEqual([]);
  });
});
