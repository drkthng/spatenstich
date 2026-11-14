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
});
