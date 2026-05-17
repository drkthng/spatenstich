// Phase 8 Plan 02: Filled validator tests (RED→GREEN). Fixtures live in __fixtures__/.
// Analog: app/src/lib/__tests__/importValidator.test.ts (fixture-based ajv validator tests).

import { validatePlantBundle } from '../plant-db-v1';
import fullPayload from './__fixtures__/plant-db-v1.full.json';
import invalidSelfCompanion from './__fixtures__/plant-db-v1.invalid-self-companion.json';
import invalidUnknownSlug from './__fixtures__/plant-db-v1.invalid-unknown-slug.json';
import invalidGartenplaner from './__fixtures__/plant-db-v1.invalid-gartenplaner.json';

describe('plant-db-v1 validator', () => {
  describe('validatePlantBundle — schema validation', () => {
    it('accepts valid full bundle (schemaVersion + ≥80 plants + companions)', () => {
      const result = validatePlantBundle(fullPayload);
      if (!result.ok) console.error('Validation errors:', result.errors);
      expect(result.ok).toBe(true);
    });

    it('rejects missing schemaVersion', () => {
      const invalid = { plants: [], companions: [] };
      const result = validatePlantBundle(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' ')).toMatch(/schemaVersion/);
    });

    it('rejects schemaVersion !== "plant-db.v1"', () => {
      const invalid = { ...fullPayload, schemaVersion: 'plant-db.v2' };
      const result = validatePlantBundle(invalid);
      expect(result.ok).toBe(false);
    });

    it('rejects invalid category enum (e.g. "Vegetable" instead of "Gemüse")', () => {
      const invalid = {
        ...fullPayload,
        plants: [
          { ...(fullPayload as any).plants[0], category: 'Vegetable' },
          ...(fullPayload as any).plants.slice(1),
        ],
      };
      const result = validatePlantBundle(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' ')).toMatch(/category|enum/);
    });

    it('rejects invalid sunRequirement enum', () => {
      const invalid = {
        ...fullPayload,
        plants: [
          { ...(fullPayload as any).plants[0], sunRequirement: 'full-sun' },
          ...(fullPayload as any).plants.slice(1),
        ],
      };
      const result = validatePlantBundle(invalid);
      expect(result.ok).toBe(false);
    });

    it('rejects forbidden dataSource literal "gartenplaner" (PLANT-DB-09 license gate)', () => {
      const result = validatePlantBundle(invalidGartenplaner);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' ')).toMatch(/dataSource|enum/);
    });
  });

  describe('validatePlantBundle — cross-reference checks', () => {
    it('rejects companion with unknown plantASlug', () => {
      const result = validatePlantBundle(invalidUnknownSlug);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.errors.join(' ')).toMatch(/unknown plantASlug|unknown plantBSlug/);
    });

    it('rejects companion with unknown plantBSlug', () => {
      // Same fixture covers this — see __fixtures__/plant-db-v1.invalid-unknown-slug.json
      // (it has two companions, one with unknown plantASlug, one with unknown plantBSlug).
      const result = validatePlantBundle(invalidUnknownSlug);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const errs = result.errors.join(' ');
        expect(errs).toMatch(/unknown plantBSlug/);
      }
    });

    it('rejects self-companion (plantASlug === plantBSlug)', () => {
      const result = validatePlantBundle(invalidSelfCompanion);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' ')).toMatch(/self-companion forbidden/);
    });

    it('rejects duplicate canonical pair across both directions (a→b and b→a count as one)', () => {
      const bundle = JSON.parse(JSON.stringify(fullPayload));
      bundle.companions = [
        {
          plantASlug: 'plant-001',
          plantBSlug: 'plant-002',
          relationship: 'companion',
          source: 'own-research',
          notes: null,
        },
        {
          plantASlug: 'plant-002',
          plantBSlug: 'plant-001',
          relationship: 'companion',
          source: 'own-research',
          notes: null,
        },
      ];
      const result = validatePlantBundle(bundle);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(' ')).toMatch(/duplicate companion pair/);
    });
  });

  describe('validatePlantBundle — defensive input handling', () => {
    it('handles non-object input gracefully (returns ok:false, not throw)', () => {
      const result = validatePlantBundle('not an object');
      expect(result.ok).toBe(false);
    });

    it('handles null input gracefully (returns ok:false)', () => {
      const result = validatePlantBundle(null);
      expect(result.ok).toBe(false);
    });
  });
});
