// Phase 6.5 Plan 01: Wave-0 test scaffold — Pitfall-1 idempotency.
// Tests filled in by Plan 02 (draftPromotionRepo implementation).
// Pattern: gardenPlanRepo.test.ts (mock storage + authStore + SyncTriggers).
//
// Covers:
//   Pitfall-1 (double-promote → idempotent: returns existing plan_element,
//   does NOT write duplicate plan_elements row or duplicate bed_drafts status update).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('draftPromotionRepo idempotency', () => {
  it.todo('returns existing plan_element when one already exists with importedFrom === importItemId and deletedAt === null');
  it.todo('does NOT call writeWithOutbox for plan_elements insert when duplicate detected');
  it.todo('does NOT call writeWithOutbox for bed_drafts update when duplicate detected');
});
