// Phase 6.5 Plan 01: Wave-0 component-test scaffold for ImportReview screen.
// Tests filled in by Plan 03 (review.tsx screen + DraftReviewCard).
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).
//
// Covers:
//   Crit-2 (sectioned render: Beete / Pflanzen / Beobachtungen mit counts,
//   empty-state, TrafficLightBadge mapping, Annehmen/Verwerfen/Fertig actions).

describe('ImportReview', () => {
  it.todo('renders three sections: Beete, Pflanzen, Beobachtungen with counts');
  it.todo('shows empty-state message when all draft arrays are empty');
  it.todo('shows TrafficLightBadge with state=green for confidence >= 0.8 drafts');
  it.todo('shows TrafficLightBadge with state=red for confidence < 0.6 drafts');
  it.todo('clicking Annehmen on a bed-card calls promoteBedDraft with the draft and importItemId');
  it.todo('clicking Verwerfen on any card calls dismissDraft with the correct entity name');
  it.todo('clicking Fertig navigates to /(app) via router.replace');
});
