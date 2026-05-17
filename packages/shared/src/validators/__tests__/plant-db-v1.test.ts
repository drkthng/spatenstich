// Phase 8 Plan 01: Wave-0 test scaffold for plant-db-v1 validator.
// Tests filled in by Plan 02 (Wave 1). Stubs use it.todo() to mark coverage targets.
// Analog: app/src/lib/__tests__/importValidator.test.ts (validate happy + reject + cross-ref + null cases).

describe('plant-db-v1 validator', () => {
  describe('validatePlantBundle — schema validation', () => {
    it.todo('accepts valid full bundle (schemaVersion + ≥80 plants + companions)');
    it.todo('rejects missing schemaVersion');
    it.todo('rejects schemaVersion !== "plant-db.v1"');
    it.todo('rejects invalid category enum (e.g. "Vegetable" instead of "Gemüse")');
    it.todo('rejects invalid sunRequirement enum');
    it.todo('rejects forbidden dataSource literal "gartenplaner" (PLANT-DB-09 license gate)');
  });

  describe('validatePlantBundle — cross-reference checks (Wave 1)', () => {
    it.todo('rejects companion with unknown plantASlug (slug not in plants[].slug set)');
    it.todo('rejects companion with unknown plantBSlug');
    it.todo('rejects self-companion (plantASlug === plantBSlug)');
    it.todo('rejects duplicate canonical pair across both directions (a→b and b→a count as one)');
  });

  describe('validatePlantBundle — defensive input handling', () => {
    it.todo('handles non-object input gracefully (returns ok:false, not throw)');
    it.todo('handles null input gracefully (returns ok:false)');
  });
});
