// Phase 8 Plan 03: Filled smoke tests (RED→GREEN). Plan 01 placed 16 stub entries; this plan turns them into real assertions.
// Analog: app/src/lib/__tests__/i18n.review-keys.test.ts (anchor-test idiom over imported JSON).

import bundle from '../data/plants.json';
import { validatePlantBundle } from '../validators/plant-db-v1';

type Plant = (typeof bundle)['plants'][number];
type Companion = (typeof bundle)['companions'][number];

const ALLOWED_DATA_SOURCES = new Set(['gardeneus', 'garden-planner', 'own-research', 'merged']);

describe('plants.json — Phase 8 smoke tests', () => {
  describe('PLANT-DB-01 — bundle shape + count', () => {
    it('validates against plant-db.v1 schema (ajv)', () => {
      const result = validatePlantBundle(bundle);
      if (!result.ok) console.error('Validation errors:', result.errors);
      expect(result.ok).toBe(true);
    });

    it('has schemaVersion "plant-db.v1"', () => {
      expect(bundle.schemaVersion).toBe('plant-db.v1');
    });

    it('contains at least 80 plants', () => {
      expect(bundle.plants.length).toBeGreaterThanOrEqual(80);
    });

    it('every plant has unique slug', () => {
      const slugs = bundle.plants.map((p: Plant) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('every plant has non-empty nameDe + family + category from allowed enum', () => {
      const allowedCategories = new Set(['Gemüse', 'Kraut', 'Beere', 'Obstbaum', 'Blume']);
      for (const p of bundle.plants as Plant[]) {
        expect(p.nameDe.length).toBeGreaterThan(0);
        expect(p.family.length).toBeGreaterThan(0);
        expect(allowedCategories.has(p.category)).toBe(true);
      }
    });
  });

  describe('PLANT-DB-02 — companion canonical storage', () => {
    it('no companion is a self-reference (plantASlug !== plantBSlug)', () => {
      for (const c of bundle.companions as Companion[]) {
        expect(c.plantASlug).not.toBe(c.plantBSlug);
      }
    });

    it('every companion plantASlug + plantBSlug refers to an existing plant slug', () => {
      const slugs = new Set(bundle.plants.map((p: Plant) => p.slug));
      for (const c of bundle.companions as Companion[]) {
        expect(slugs.has(c.plantASlug)).toBe(true);
        expect(slugs.has(c.plantBSlug)).toBe(true);
      }
    });

    it('every companion pair appears at most once across both directions (a→b and b→a)', () => {
      const seen = new Set<string>();
      for (const c of bundle.companions as Companion[]) {
        const key =
          c.plantASlug < c.plantBSlug
            ? `${c.plantASlug}:${c.plantBSlug}`
            : `${c.plantBSlug}:${c.plantASlug}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('PLANT-DB-08 — Anker-Tests (well-known plant facts)', () => {
    it('Tomate has family "Solanaceae"', () => {
      const tomate = (bundle.plants as Plant[]).find((p) => p.slug === 'tomate');
      expect(tomate).toBeDefined();
      expect(tomate?.family).toBe('Solanaceae');
    });

    it('Erdbeere has family "Rosaceae"', () => {
      const e = (bundle.plants as Plant[]).find((p) => p.slug === 'erdbeere');
      expect(e).toBeDefined();
      expect(e?.family).toBe('Rosaceae');
    });

    it('Buschbohne is nitrogenFixing=true', () => {
      const b = (bundle.plants as Plant[]).find((p) => p.slug === 'busch-bohne');
      expect(b).toBeDefined();
      expect(b?.nitrogenFixing).toBe(true);
    });

    it('Apfel is perennial=true', () => {
      const a = (bundle.plants as Plant[]).find((p) => p.slug === 'apfel');
      expect(a).toBeDefined();
      expect(a?.perennial).toBe(true);
    });

    it('Tomate-Basilikum is a companion pair (any direction)', () => {
      const pair = (bundle.companions as Companion[]).find(
        (c) =>
          (c.plantASlug === 'tomate' && c.plantBSlug === 'basilikum') ||
          (c.plantASlug === 'basilikum' && c.plantBSlug === 'tomate'),
      );
      expect(pair).toBeDefined();
      expect(pair?.relationship).toBe('companion');
    });
  });

  describe('PLANT-DB-09 — license-hygiene gate', () => {
    it('every plant.dataSource is one of allowed enums (gardeneus | garden-planner | own-research | merged)', () => {
      for (const p of bundle.plants as Plant[]) {
        expect(ALLOWED_DATA_SOURCES.has(p.dataSource)).toBe(true);
      }
    });

    it('no plant.dataSource is the literal "gartenplaner" (forbidden)', () => {
      for (const p of bundle.plants as Plant[]) {
        expect(p.dataSource).not.toBe('gartenplaner');
      }
    });

    it('every companion.source is one of allowed enums', () => {
      for (const c of bundle.companions as Companion[]) {
        expect(ALLOWED_DATA_SOURCES.has(c.source)).toBe(true);
      }
    });
  });
});
