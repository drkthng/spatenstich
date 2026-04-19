// Wave 0 stub — asserts migration v2 is registered.
// Extended in downstream plans once profile KV contract stabilizes.
import { MIGRATIONS } from '../migrations';

describe('migrations (Wave 0 stub)', () => {
  it('includes version 1 and version 2 entries', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toContain(1);
    expect(versions).toContain(2);
  });
});
