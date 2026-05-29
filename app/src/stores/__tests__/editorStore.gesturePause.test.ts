// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 1 GREEN fills.
// Plan 01 GREEN-fill: zundo pause/resume during gestureActive (D-22, RESEARCH §Pattern 11).
// Pins T-09.1-Z-INTEGRITY: one snapshot per drag gesture end.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

const mockSchedule = jest.fn();
jest.mock('../../lib/editor/saveDebounce', () => ({
  scheduleSaveElement: (...a: unknown[]) => mockSchedule(...a),
}));

jest.mock('../authStore', () => ({
  useAuthStore: {
    getState: () => ({ mode: 'account', userId: 'u-1' }),
  },
}));

describe('editorStore > gesturePause (D-22, Pattern 11)', () => {
  it.todo('drag operations during gestureActive do NOT spam zundo history (Pattern 11)');
  it.todo('zundo.temporal.getState().pause is invoked on gestureActive=true');
  it.todo('zundo.temporal.getState().resume is invoked on gestureActive=false');
  it.todo('one final updateElement after gesture end captures exactly one snapshot (D-22)');
});
