// TDD RED — tests for BKLEINGG_REGELN + STANDARD_VEREINSREGELN_CHECKLIST
// Expectations per 02-01-PLAN.md Task 2-01-01 <behavior>
import {
  BKLEINGG_REGELN,
  STANDARD_VEREINSREGELN_CHECKLIST,
} from '../constants/vereinsregeln';

describe('BKLEINGG_REGELN', () => {
  it('has at least 2 entries', () => {
    expect(BKLEINGG_REGELN.length).toBeGreaterThanOrEqual(2);
  });

  it('every entry has istBKleingG === true', () => {
    for (const item of BKLEINGG_REGELN) {
      expect(item.istBKleingG).toBe(true);
    }
  });

  it('every entry has pflichtfeld === true', () => {
    for (const item of BKLEINGG_REGELN) {
      expect(item.pflichtfeld).toBe(true);
    }
  });

  it('every entry has a unique id', () => {
    const ids = BKLEINGG_REGELN.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the "one-third Nutzgarten" rule', () => {
    const match = BKLEINGG_REGELN.find((e) => e.id === 'bkleingg_one_third');
    expect(match).toBeDefined();
  });
});

describe('STANDARD_VEREINSREGELN_CHECKLIST', () => {
  it('has between 10 and 15 entries (D-09)', () => {
    expect(STANDARD_VEREINSREGELN_CHECKLIST.length).toBeGreaterThanOrEqual(10);
    expect(STANDARD_VEREINSREGELN_CHECKLIST.length).toBeLessThanOrEqual(15);
  });

  it('every entry has a unique id', () => {
    const ids = STANDARD_VEREINSREGELN_CHECKLIST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has istBKleingG === false (user-defined, not BKleingG)', () => {
    for (const item of STANDARD_VEREINSREGELN_CHECKLIST) {
      expect(item.istBKleingG).toBe(false);
    }
  });
});
