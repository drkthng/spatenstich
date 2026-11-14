import type { StorageAdapter, GardenRow } from '@spatenstich/shared';

/**
 * Parametrisierter Contract-Test: dieselbe Testsuite läuft gegen beide Adapter.
 * Nyquist I-2 Grundlage: atomic writeWithOutbox, FIFO-Outbox, Soft-Delete-Filter.
 *
 * Diese Datei exportiert nur die Suite-Factory.
 * Die eigentlichen Tests werden in SqliteAdapter.rows.test.ts und
 * IndexedDbAdapter.rows.test.ts per Adapter instanziiert.
 */
export function runStorageContractTests(
  name: string,
  createAdapter: () => Promise<StorageAdapter>,
  teardown: (adapter: StorageAdapter) => Promise<void>,
): void {
  describe(`StorageAdapter Contract: ${name}`, () => {
    let adapter: StorageAdapter;

    const sampleGarden = (overrides: Partial<GardenRow> = {}): GardenRow => ({
      id: '00000000-0000-0000-0000-000000000001',
      createdAt: '2026-04-24T10:00:00.000Z',
      updatedAt: '2026-04-24T10:00:00.000Z',
      updatedByUserId: 'user-a',
      deletedAt: null,
      name: 'Testgarten',
      ownerUserId: 'user-a',
      ...overrides,
    });

    beforeEach(async () => { adapter = await createAdapter(); });
    afterEach(async () => { await teardown(adapter); });

    describe('KV backwards compatibility', () => {
      it('set/get/delete/list behält Phase-1-Verhalten', async () => {
        await adapter.set('profile', '{"name":"Dirk"}');
        expect(await adapter.get('profile')).toBe('{"name":"Dirk"}');
        expect(await adapter.list()).toContain('profile');
        await adapter.delete('profile');
        expect(await adapter.get('profile')).toBeNull();
      });
    });

    describe('Row CRUD', () => {
      it('writeWithOutbox speichert Row + Outbox-Eintrag atomar', async () => {
        const row = sampleGarden();
        await adapter.writeWithOutbox('gardens', row, {
          entity: 'gardens',
          rowId: row.id,
          operation: 'insert',
          payload: row as unknown as Record<string, unknown>,
        });
        const loaded = await adapter.getRow<GardenRow>('gardens', row.id);
        expect(loaded).toMatchObject({ id: row.id, name: 'Testgarten' });
        const outbox = await adapter.listOutboxEntries();
        expect(outbox).toHaveLength(1);
        expect(outbox[0]).toMatchObject({ entity: 'gardens', rowId: row.id, operation: 'insert' });
      });

      it('getRow mit includeDeleted=false versteckt soft-deleted Rows', async () => {
        const row = sampleGarden({ deletedAt: '2026-04-24T11:00:00.000Z' });
        await adapter.upsertRowFromServer('gardens', row);
        expect(await adapter.getRow<GardenRow>('gardens', row.id)).toBeNull();
        expect(
          await adapter.getRow<GardenRow>('gardens', row.id, { includeDeleted: true }),
        ).not.toBeNull();
      });

      it('getRowsByGarden gibt nur Rows der angegebenen garden_id zurück', async () => {
        const g1 = sampleGarden({ id: 'g-1' });
        const g2 = sampleGarden({ id: 'g-2' });
        await adapter.upsertRowFromServer('gardens', g1);
        await adapter.upsertRowFromServer('gardens', g2);
        const rowsG1 = await adapter.getRowsByGarden<GardenRow>('gardens', 'g-1');
        // gardens-Tabelle: garden_id == id (Sonderfall)
        expect(rowsG1.map((r) => r.id)).toEqual(['g-1']);
      });

      it('upsertRowFromServer erzeugt KEINEN Outbox-Eintrag (sonst Ping-Pong)', async () => {
        await adapter.upsertRowFromServer('gardens', sampleGarden());
        expect(await adapter.listOutboxEntries()).toHaveLength(0);
      });
    });

    describe('Outbox FIFO', () => {
      it('listOutboxEntries ist aufsteigend nach created_at sortiert', async () => {
        for (let i = 0; i < 3; i++) {
          const row = sampleGarden({ id: `g-${i}` });
          await adapter.writeWithOutbox('gardens', row, {
            entity: 'gardens', rowId: row.id, operation: 'insert', payload: row as unknown as Record<string, unknown>,
          });
          // kleine künstliche Zeitverzögerung im Adapter via Date.now() sicherstellen
        }
        const outbox = await adapter.listOutboxEntries();
        expect(outbox).toHaveLength(3);
        expect(outbox[0]!.rowId).toBe('g-0');
        expect(outbox[2]!.rowId).toBe('g-2');
      });

      it('deleteOutboxEntry entfernt nur den angegebenen Eintrag', async () => {
        const row = sampleGarden();
        await adapter.writeWithOutbox('gardens', row, {
          entity: 'gardens', rowId: row.id, operation: 'insert', payload: row as unknown as Record<string, unknown>,
        });
        const [entry] = await adapter.listOutboxEntries();
        await adapter.deleteOutboxEntry(entry!.id);
        expect(await adapter.listOutboxEntries()).toHaveLength(0);
      });

      it('updateOutboxEntry erhöht attempts + schreibt lastError', async () => {
        const row = sampleGarden();
        await adapter.writeWithOutbox('gardens', row, {
          entity: 'gardens', rowId: row.id, operation: 'insert', payload: row as unknown as Record<string, unknown>,
        });
        const [entry] = await adapter.listOutboxEntries();
        await adapter.updateOutboxEntry(entry!.id, { attempts: 2, lastError: 'network' });
        const [updated] = await adapter.listOutboxEntries();
        expect(updated!.attempts).toBe(2);
        expect(updated!.lastError).toBe('network');
      });
    });

    describe('sync_state', () => {
      it('getSyncState → null für unbekannte Entity', async () => {
        expect(await adapter.getSyncState('gardens')).toBeNull();
      });

      it('setSyncState + getSyncState roundtrip', async () => {
        await adapter.setSyncState({
          entity: 'gardens',
          lastPullAt: '2026-04-24T12:00:00.000Z',
          lastPushAt: null,
        });
        const state = await adapter.getSyncState('gardens');
        expect(state?.lastPullAt).toBe('2026-04-24T12:00:00.000Z');
      });

      it('clearSyncState forgets every cursor', async () => {
        await adapter.setSyncState({ entity: 'gardens', lastPullAt: '2026-04-24T12:00:00.000Z', lastPushAt: null });
        await adapter.clearSyncState();
        expect(await adapter.getSyncState('gardens')).toBeNull();
      });
    });

    // Phase 33
    describe('one outbox entry per row', () => {
      it('a second write to the same row replaces the waiting entry', async () => {
        for (const name of ['eins', 'zwei']) {
          const row = sampleGarden({ name });
          await adapter.writeWithOutbox('gardens', row, {
            entity: 'gardens', rowId: row.id, operation: 'update', payload: row as unknown as Record<string, unknown>,
          });
        }
        const outbox = await adapter.listOutboxEntries();
        expect(outbox).toHaveLength(1);
        expect(outbox[0]!.payload['name']).toBe('zwei');
      });

      it('updateOutboxEntry stores the time of the next attempt', async () => {
        const row = sampleGarden();
        await adapter.writeWithOutbox('gardens', row, {
          entity: 'gardens', rowId: row.id, operation: 'update', payload: {},
        });
        const [entry] = await adapter.listOutboxEntries();
        await adapter.updateOutboxEntry(entry!.id, { attempts: 1, lastError: 'x', nextAttemptAt: '2026-04-24T12:00:05.000Z' });
        const [stored] = await adapter.listOutboxEntries();
        expect(stored).toMatchObject({ attempts: 1, lastError: 'x', nextAttemptAt: '2026-04-24T12:00:05.000Z' });
      });
    });

    describe('rows from the server', () => {
      const fromServer = (overrides: Partial<GardenRow> = {}): GardenRow =>
        sampleGarden({ serverUpdatedAt: '2026-04-24T10:00:01.000000+00:00', ...overrides });

      it('a new row is stored and reported', async () => {
        const written = await adapter.upsertRowsFromServer('gardens', [fromServer()]);
        expect(written).toEqual([sampleGarden().id]);
        expect(await adapter.getRow('gardens', sampleGarden().id)).toBeTruthy();
      });

      it('the version already stored is not written again', async () => {
        await adapter.upsertRowsFromServer('gardens', [fromServer()]);
        expect(await adapter.upsertRowsFromServer('gardens', [fromServer()])).toEqual([]);
      });

      it('a row with a waiting local change is left alone', async () => {
        const local = sampleGarden({ name: 'lokal' });
        await adapter.writeWithOutbox('gardens', local, {
          entity: 'gardens', rowId: local.id, operation: 'update', payload: {},
        });
        const written = await adapter.upsertRowsFromServer('gardens', [
          fromServer({ name: 'Server', updatedAt: '2026-04-24T11:00:00.000Z' }),
        ]);
        expect(written).toEqual([]);
        expect((await adapter.getRow<GardenRow>('gardens', local.id))?.name).toBe('lokal');
      });

      it('an older server row does not replace a later local edit, unless forced', async () => {
        await adapter.upsertRowFromServer('gardens', sampleGarden({ name: 'später', updatedAt: '2026-04-24T11:00:00.000Z' }));
        const older = fromServer({ name: 'Server', updatedAt: '2026-04-24T10:30:00+00:00' });
        expect(await adapter.upsertRowsFromServer('gardens', [older])).toEqual([]);
        expect((await adapter.getRow<GardenRow>('gardens', older.id))?.name).toBe('später');
        expect(await adapter.upsertRowsFromServer('gardens', [older], { force: true })).toEqual([older.id]);
        expect((await adapter.getRow<GardenRow>('gardens', older.id))?.name).toBe('Server');
      });

      it('edit times compare by instant, whatever the notation', async () => {
        await adapter.upsertRowFromServer('gardens', sampleGarden({ updatedAt: '2026-04-24T10:00:00.000Z' }));
        const same = fromServer({ name: 'gleichzeitig', updatedAt: '2026-04-24T10:00:00+00:00' });
        expect(await adapter.upsertRowsFromServer('gardens', [same])).toEqual([same.id]);
      });
    });

    describe('replaceRowsForGarden and clearAll', () => {
      const member = (userId: string) => ({
        id: `g-1:${userId}`, gardenId: 'g-1', userId, role: 'member' as const,
        createdAt: '2026-04-24T10:00:00.000Z', updatedAt: '2026-04-24T10:00:00.000Z',
        updatedByUserId: userId, deletedAt: null,
      });

      it('the given list replaces what was stored for the garden', async () => {
        expect(await adapter.replaceRowsForGarden('garden_members', 'g-1', [member('a'), member('b')])).toBe(true);
        expect(await adapter.replaceRowsForGarden('garden_members', 'g-1', [member('a'), member('b')])).toBe(false);
        expect(await adapter.replaceRowsForGarden('garden_members', 'g-1', [member('a')])).toBe(true);
        const rows = await adapter.getRowsByGarden('garden_members', 'g-1');
        expect(rows.map((r) => r.id)).toEqual(['g-1:a']);
      });

      it('clearAll removes rows, outbox and cursors but keeps the schema version', async () => {
        const row = sampleGarden();
        await adapter.writeWithOutbox('gardens', row, {
          entity: 'gardens', rowId: row.id, operation: 'update', payload: {},
        });
        await adapter.setSyncState({ entity: 'gardens', lastPullAt: 'x', lastPushAt: null });
        const version = await adapter.getSchemaVersion();
        await adapter.clearAll();
        expect(await adapter.getAllRows('gardens', { includeDeleted: true })).toHaveLength(0);
        expect(await adapter.listOutboxEntries()).toHaveLength(0);
        expect(await adapter.getSyncState('gardens')).toBeNull();
        expect(await adapter.getSchemaVersion()).toBe(version);
      });
    });
  });
}
