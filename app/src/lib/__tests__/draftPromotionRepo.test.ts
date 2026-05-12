// Phase 6.5 Plan 01: Wave-0 test scaffold for draftPromotionRepo.
// Tests filled in by Plan 02. Stubs use it.todo() to mark coverage targets.
// Pattern: gardenPlanRepo.test.ts (mock storage + authStore + SyncTriggers).
//
// Covers:
//   Crit-3 (promote → plan_element + provenance)
//   Crit-4 (dismiss → deletedAt)
//   Pitfall-3 (observation_drafts MUST NOT write plan_elements)
//   DRAFT-01, DRAFT-02 (importedFrom provenance on promoted plan_elements)

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('draftPromotionRepo > promoteBedDraft', () => {
  it.todo('throws when mode !== account (drafts are account-only)');
  it.todo('writes plan_elements insert with importedFrom = importItemId');
  it.todo('writes plan_elements row with elementType = "Beet" and confidence mapped from draft.confidence (>=0.8 → high, >=0.6 → medium, else → low)');
  it.todo('writes bed_drafts update with status="promoted" + promotedAt = now');
  it.todo('calls scheduleWriteDebounced() exactly once after both writes');
});

describe('draftPromotionRepo > promotePlantDraft', () => {
  it.todo('links to parent bed plan_element via provenance.parentBedId when parentBedElement provided');
  it.todo('creates plan_element with elementType = "Pflanze"');
});

describe('draftPromotionRepo > promoteObservationDraft (Pitfall-3)', () => {
  it.todo('does NOT write plan_elements — only updates observation_drafts to status=promoted');
});

describe('draftPromotionRepo > dismissDraft (Crit-4)', () => {
  it.todo('writes update with deletedAt = now for bed_drafts');
  it.todo('writes update with deletedAt = now for plant_drafts');
  it.todo('writes update with deletedAt = now for observation_drafts');
  it.todo('throws when mode !== account');
});
