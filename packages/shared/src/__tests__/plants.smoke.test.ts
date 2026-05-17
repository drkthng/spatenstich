// Phase 8 Plan 01: Wave-0 test scaffold for plants.json smoke tests.
// Tests filled in by Plan 03 (Wave 2 after JSON data lands). Stubs use it.todo().
// Analog: app/src/lib/__tests__/i18n.review-keys.test.ts (import + anchor-key assertions).

describe('plants.json — Phase 8 smoke tests', () => {
  describe('PLANT-DB-01 — bundle shape + count', () => {
    it.todo('validates against plant-db.v1 schema (ajv)');
    it.todo('has schemaVersion "plant-db.v1"');
    it.todo('contains at least 80 plants');
    it.todo('every plant has unique slug');
    it.todo('every plant has non-empty nameDe + family + category from allowed enum');
  });

  describe('PLANT-DB-02 — companion canonical storage', () => {
    it.todo('no companion is a self-reference (plantASlug !== plantBSlug)');
    it.todo('every companion plantASlug + plantBSlug refers to an existing plant slug');
    it.todo('every companion pair appears at most once across both directions (a→b and b→a)');
  });

  describe('PLANT-DB-08 — Anker-Tests (well-known plant facts)', () => {
    it.todo('Tomate has family "Solanaceae"');
    it.todo('Erdbeere has family "Rosaceae"');
    it.todo('Buschbohne is nitrogenFixing=true');
    it.todo('Apfel is perennial=true');
    it.todo('Tomate-Basilikum is a companion pair (any direction)');
  });

  describe('PLANT-DB-09 — license-hygiene gate', () => {
    it.todo('every plant.dataSource is one of allowed enums (gardeneus | garden-planner | own-research | merged)');
    it.todo('no plant.dataSource is the literal "gartenplaner" (forbidden)');
    it.todo('every companion.source is one of allowed enums');
  });
});
