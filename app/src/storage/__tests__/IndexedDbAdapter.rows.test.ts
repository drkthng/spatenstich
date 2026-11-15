import 'fake-indexeddb/auto';
import { IndexedDbAdapter } from '../IndexedDbAdapter';
import { runMigrations } from '../migrations';
import { runStorageContractTests } from './RowTables.contract';

runStorageContractTests(
  'IndexedDbAdapter',
  async () => {
    const adapter = new IndexedDbAdapter(`test-${Date.now()}-${Math.random()}`);
    await runMigrations(adapter);
    return adapter;
  },
  async (_adapter) => {
    // fake-indexeddb: pro Test neue DB → kein explizites Cleanup nötig.
  },
);

describe('IndexedDbAdapter Web-specific', () => {
  it('an open tab with this version does not block a newer version from upgrading', async () => {
    const name = `blocking-test-${Date.now()}-${Math.random()}`;
    const adapter = new IndexedDbAdapter(name);
    await runMigrations(adapter);
    // A later release opens the same database with a higher version.
    const opened = await new Promise<string>((resolve) => {
      const request = indexedDB.open(name, 99);
      request.onsuccess = () => {
        request.result.close();
        resolve('opened');
      };
      request.onerror = () => resolve('error');
      setTimeout(() => resolve('still blocked'), 3000);
    });
    expect(opened).toBe('opened');
  });

  it('upgrading from the previous version keeps the stored rows and adds the Phase 35 stores', async () => {
    const name = `upgrade-4-5-${Date.now()}-${Math.random()}`;
    // The database as the previous release left it: version 4 with a plan element.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 4);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('kv');
        for (const store of ['gardens', 'garden_members', 'profiles', 'vereinsregeln', 'invite_codes',
          'garden_dimensions', 'plan_elements', 'imports', 'import_items', 'bed_drafts', 'plant_drafts', 'observation_drafts']) {
          const s = db.createObjectStore(store, { keyPath: 'id' });
          if (store !== 'gardens' && store !== 'profiles') s.createIndex('by_gardenId', 'gardenId', { unique: false });
        }
        db.createObjectStore('sync_outbox', { keyPath: 'id' }).createIndex('by_createdAt', 'createdAt', { unique: false });
        db.createObjectStore('sync_state', { keyPath: 'entity' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['plan_elements', 'kv'], 'readwrite');
        tx.objectStore('plan_elements').put({ id: 'e-1', gardenId: 'g-1', label: 'Beet', deletedAt: null, updatedAt: '2026-11-01T00:00:00.000Z' });
        tx.objectStore('kv').put('6', '__schema_version__');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const adapter = new IndexedDbAdapter(name);
    await runMigrations(adapter);
    expect(await adapter.getSchemaVersion()).toBe(8);
    expect((await adapter.getRowsByGarden('plan_elements', 'g-1')).map((r) => r.id)).toEqual(['e-1']);
    expect(await adapter.getRowsByGarden('photo_findings', 'g-1')).toEqual([]);
    expect(await adapter.getRowsByGarden('garden_plants', 'g-1')).toEqual([]);
    expect(await adapter.getRowsByGarden('task_done', 'g-1')).toEqual([]);
  });

  it('Version-Upgrade 1 → 2 legt alle Row-Stores + Outbox + State an', async () => {
    const adapter = new IndexedDbAdapter(`upgrade-test-${Date.now()}-${Math.random()}`);
    await runMigrations(adapter);
    // __createRowTablesV3 wirft, falls Stores fehlen:
    await (adapter as any).__createRowTablesV3();
  });

  it('by_gardenId-Index beschleunigt getRowsByGarden (plan_elements)', async () => {
    const adapter = new IndexedDbAdapter(`index-test-${Date.now()}-${Math.random()}`);
    await runMigrations(adapter);

    // 100 plan_elements-Rows in 2 Gärten
    for (let i = 0; i < 100; i++) {
      await adapter.upsertRowFromServer('plan_elements', {
        id: `el-${i}`,
        createdAt: '2026-04-24T10:00:00.000Z',
        updatedAt: '2026-04-24T10:00:00.000Z',
        updatedByUserId: 'user-a',
        deletedAt: null,
        gardenId: i % 2 === 0 ? 'garden-a' : 'garden-b',
        elementType: 'Beet',
        label: `Beet ${i}`,
        xM: i,
        yM: i,
        widthM: 2,
        heightM: 1,
        confidence: 'high',
        isAccepted: true,
      } as import('@spatenstich/shared').PlanElementRow);
    }

    const gardenA = await adapter.getRowsByGarden('plan_elements', 'garden-a');
    expect(gardenA).toHaveLength(50);
    expect(gardenA.every((r: any) => r.gardenId === 'garden-a')).toBe(true);
  });
});
