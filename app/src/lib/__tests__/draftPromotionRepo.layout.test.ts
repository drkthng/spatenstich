// Phase 6.5 Plan 01: Wave-0 test scaffold — Pitfall-2 layout (nextFreeBedSlot).
// Tests filled in by Plan 02 (nextFreeBedSlot pure function).
// Pure-function test — no mocks needed for nextFreeBedSlot itself.
//
// Covers:
//   Pitfall-2 (default geometry stacks beds row-wise without overlap;
//   wraps to next row when garden width exhausted; uses sensible defaults
//   when draft dimensions are null).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('draftPromotionRepo layout > nextFreeBedSlot', () => {
  it.todo('places first bed near (1, 1)');
  it.todo('does not overlap a previously placed bed');
  it.todo('wraps to a new row when garden width is exhausted');
  it.todo('uses default 1.5m x 1.0m when draft dimensions are null');
});
