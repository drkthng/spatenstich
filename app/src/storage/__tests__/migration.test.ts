// Wave 0 stub — asserts migration v2 is registered.
// Extended in downstream plans once profile KV contract stabilizes.
import { MIGRATIONS } from '../migrations';

describe('migrations (Wave 0 stub)', () => {
  it('includes version 1 and version 2 entries', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toContain(1);
    expect(versions).toContain(2);
  });

  it('version 6 drops the pull cursors (Phase 33)', async () => {
    const cleared = jest.fn().mockResolvedValue(undefined);
    const v6 = MIGRATIONS.find((m) => m.version === 6);
    expect(v6).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await v6!.up({ clearSyncState: cleared } as any);
    expect(cleared).toHaveBeenCalledTimes(1);
  });

  it('version 7 creates the stores for photo findings and garden plants (Phase 35)', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const v7 = MIGRATIONS.find((entry) => entry.version === 7);
    expect(v7).toBeTruthy();
    await v7!.up({ __createRowTablesV7: create } as never);
    expect(create).toHaveBeenCalledTimes(1);
    // An adapter that cannot create them must not pass silently.
    await expect(v7!.up({} as never)).rejects.toThrow(/v7/);
  });
});
