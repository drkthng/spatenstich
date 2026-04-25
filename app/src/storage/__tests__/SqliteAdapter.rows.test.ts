import { SqliteAdapter } from '../SqliteAdapter';
import { runMigrations } from '../migrations';
import { runStorageContractTests } from './RowTables.contract';

// expo-sqlite is mocked via jest-expo preset; SqliteAdapter works in Node test env
// via the jest-expo mock which provides an in-memory SQLite implementation.

runStorageContractTests(
  'SqliteAdapter',
  async () => {
    const adapter = new SqliteAdapter(`test-${Date.now()}.db`);
    await runMigrations(adapter);
    return adapter;
  },
  async (_adapter) => {
    // SQLite in-memory: pro Test neue DB-Datei → kein Teardown nötig
  },
);

// Zusätzliche SQLite-spezifische Tests (nicht im Contract-Set):
describe('SqliteAdapter SQLite-specific', () => {
  it('parallele writeWithOutbox-Aufrufe werden serialisiert (EXCLUSIVE-Lock)', async () => {
    const adapter = new SqliteAdapter(`test-parallel-${Date.now()}.db`);
    await runMigrations(adapter);
    const writes = Array.from({ length: 10 }, (_, i) =>
      adapter.writeWithOutbox(
        'gardens',
        {
          id: `g-${i}`,
          createdAt: '2026-04-24T10:00:00.000Z',
          updatedAt: '2026-04-24T10:00:00.000Z',
          updatedByUserId: 'user-a',
          deletedAt: null,
          name: `G${i}`,
          ownerUserId: 'user-a',
        },
        { entity: 'gardens', rowId: `g-${i}`, operation: 'insert', payload: {} },
      ),
    );
    await Promise.all(writes);
    expect(await adapter.listOutboxEntries()).toHaveLength(10);
  });
});
