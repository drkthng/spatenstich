// Phase 6.5 Plan 01: Wave-0 component-test scaffold for ImportReview auto-promote.
// Tests filled in by Plan 03 (Auto-Promote toggle in review.tsx).
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).
//
// Covers:
//   Crit-5 (Auto-Promote >= 0.8 batch promote: triggers per-draft promoteBedDraft,
//   skips low-confidence, forward-only on toggle-off, shows promoting indicator).

describe('ImportReview auto-promote', () => {
  it.todo('toggling Auto-Promote on calls promoteBedDraft for every pending bed-draft with confidence >= 0.8');
  it.todo('does NOT promote drafts with confidence < 0.8');
  it.todo('toggle-off does not cancel already-queued promotions (forward-only)');
  it.todo('shows promoting indicator while batch promote runs');
});
