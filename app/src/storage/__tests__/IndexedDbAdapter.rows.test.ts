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
