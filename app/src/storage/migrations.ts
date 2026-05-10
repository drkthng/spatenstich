import type { StorageAdapter } from '@spatenstich/shared';

export interface LocalMigration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
}

// Adapter-specific hook: both adapter classes implement this method in addition
// to the StorageAdapter interface. The migration calls it via optional-property
// access so that the StorageAdapter interface stays clean.
interface RowTableCreator {
  __createRowTablesV3?: () => Promise<void>;
  __createRowTablesV4?: () => Promise<void>;
  __createRowTablesV5?: () => Promise<void>;
}

// Phase 1: initial bootstrap migration (no local schema needed yet,
// but the mechanism is active and tested).
// Phase 2 (v2): KV-Store needs no structural migration.
// Profile-Keys ('profile', 'vereinsregeln') are created on first set().
// Pitfall 6 (02-RESEARCH.md): consistent key convention — JSON blobs, no flat keys.
export const MIGRATIONS: LocalMigration[] = [
  { version: 1, up: async () => { /* Bootstrap — no schema beyond kv */ } },
  {
    version: 2,
    up: async (_adapter) => {
      // Phase 2: KV-Store needs no structural migration.
      // Profile-Keys ('profile', 'vereinsregeln') are created on first set().
      // Pitfall 6 (02-RESEARCH.md): consistent key convention — JSON blobs, no flat keys.
    },
  },
  {
    version: 3,
    up: async (adapter) => {
      // Phase 3 (Plan 03-02): Row-Tables + sync_outbox + sync_state creation.
      // The actual DDL/ObjectStore-creation is delegated to the concrete adapter,
      // because SQLite (DDL) and IndexedDB (objectStore) have different semantics.
      const creator = adapter as StorageAdapter & RowTableCreator;
      if (typeof creator.__createRowTablesV3 === 'function') {
        await creator.__createRowTablesV3();
      } else {
        throw new Error(
          'Migration v3 requires adapter to implement __createRowTablesV3(). ' +
          'Update SqliteAdapter/IndexedDbAdapter.',
        );
      }
    },
  },
  {
    version: 4,
    up: async (adapter) => {
      // Phase 4 (Plan 04-01): garden_dimensions + plan_elements Row-Tables.
      const creator = adapter as StorageAdapter & RowTableCreator;
      if (typeof creator.__createRowTablesV4 === 'function') {
        await creator.__createRowTablesV4();
      } else {
        throw new Error(
          'Migration v4 requires adapter to implement __createRowTablesV4(). ' +
          'Update SqliteAdapter/IndexedDbAdapter.',
        );
      }
    },
  },
  {
    version: 5,
    up: async (adapter) => {
      // Phase 6: import draft Row-Tables (imports, import_items, bed_drafts, plant_drafts, observation_drafts).
      const creator = adapter as StorageAdapter & RowTableCreator;
      if (typeof creator.__createRowTablesV5 === 'function') {
        await creator.__createRowTablesV5();
      } else {
        throw new Error(
          'Migration v5 requires adapter to implement __createRowTablesV5(). ' +
          'Update SqliteAdapter/IndexedDbAdapter.',
        );
      }
    },
  },
];

export async function runMigrations(adapter: StorageAdapter): Promise<void> {
  const current = await adapter.getSchemaVersion();
  const pending = MIGRATIONS
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);
  for (const m of pending) {
    await m.up(adapter);
    await adapter.setSchemaVersion(m.version);
  }
}
