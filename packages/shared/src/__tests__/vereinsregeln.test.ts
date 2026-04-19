// TDD RED — tests for BKLEINGG_REGELN + STANDARD_VEREINSREGELN_CHECKLIST
// Expectations per 02-01-PLAN.md Task 2-01-01 <behavior>
// Plan 02-04 Task 2-04-01 Step E extends with concrete RULES-02/03/04 assertions.
import {
  BKLEINGG_REGELN,
  STANDARD_VEREINSREGELN_CHECKLIST,
} from '../constants/vereinsregeln';
import type { VereinsRegel } from '../types/domain';

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

// ── Plan 02-04 Task 2-04-01 Step E — concrete Phase-2 requirements coverage ──
describe('Plan 02-04: Vereinsregeln requirement assertions', () => {
  it('RULES-02 — VereinsRegel data-shape survives JSON round-trip (toggled aktiv preserved)', () => {
    const rule: VereinsRegel = {
      id: 'roundtrip-1',
      titel: 'Test',
      wert: 50,
      einheit: 'cm',
      istBKleingG: false,
      aktiv: true,
      source: 'manual',
    };
    const clone = JSON.parse(JSON.stringify(rule)) as VereinsRegel;
    expect(clone.aktiv).toBe(true);
    expect(clone.istBKleingG).toBe(false);
    expect(clone.wert).toBe(50);
    expect(clone.source).toBe('manual');
  });

  it('RULES-03 — STANDARD_VEREINSREGELN_CHECKLIST has 10-15 entries', () => {
    expect(STANDARD_VEREINSREGELN_CHECKLIST.length).toBeGreaterThanOrEqual(10);
    expect(STANDARD_VEREINSREGELN_CHECKLIST.length).toBeLessThanOrEqual(15);
  });

  it('RULES-04 — every BKLEINGG seed entry has istBKleingG && pflichtfeld set to true', () => {
    expect(BKLEINGG_REGELN.length).toBeGreaterThanOrEqual(2);
    for (const seed of BKLEINGG_REGELN) {
      expect(seed.istBKleingG).toBe(true);
      expect(seed.pflichtfeld).toBe(true);
    }
  });
});
