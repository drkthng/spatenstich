// TDD RED — tests for lookupKlimazone + PLZ_KLIMAZONE_MAP
// Expectations per 02-01-PLAN.md Task 2-01-01 <behavior>
import { lookupKlimazone, PLZ_KLIMAZONE_MAP, KLIMAZONEN } from '../constants/klimazonen';

describe('klimazonen', () => {
  it('KLIMAZONEN has 7 zones', () => {
    expect(KLIMAZONEN).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('lookupKlimazone("12043") resolves to Klimazone 4 (Berlin Neukölln)', () => {
    expect(lookupKlimazone('12043')).toBe(4);
  });

  it('lookupKlimazone("80331") resolves to a valid Klimazone in 1..7 (München Altstadt)', () => {
    const z = lookupKlimazone('80331');
    expect(z).not.toBeNull();
    expect(KLIMAZONEN).toContain(z);
  });

  it('lookupKlimazone("00000") returns null (unknown PLZ)', () => {
    expect(lookupKlimazone('00000')).toBeNull();
  });

  it('lookupKlimazone rejects invalid PLZ format', () => {
    expect(lookupKlimazone('123')).toBeNull();
    expect(lookupKlimazone('abcde')).toBeNull();
    expect(lookupKlimazone('123456')).toBeNull();
    expect(lookupKlimazone('')).toBeNull();
  });

  it('PLZ_KLIMAZONE_MAP has at least 100 entries', () => {
    expect(Object.keys(PLZ_KLIMAZONE_MAP).length).toBeGreaterThanOrEqual(100);
  });

  it('every value in PLZ_KLIMAZONE_MAP is a valid Klimazone (1..7)', () => {
    for (const value of Object.values(PLZ_KLIMAZONE_MAP)) {
      expect(KLIMAZONEN).toContain(value);
    }
  });
});
