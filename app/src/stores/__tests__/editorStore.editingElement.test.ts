// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 2 GREEN fills.
// Plan 02 GREEN-fill: editingElementId state + openElementEditor / closeElementEditor actions.
// Pins T-09.1-MODAL-ESC: editingElementId as UI-only ephemeral state (D-19).

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

describe('editorStore > editingElement (D-19)', () => {
  it.todo('editingElementId default is null (D-19 — no DB migration; UI-only state)');
  it.todo('setEditingElementId(id) sets editingElementId to id');
  it.todo('setEditingElementId(null) clears editingElementId');
  it.todo('editingElementId is NOT included in zundo partialize (no undo into modal-open state)');
  it.todo('selection auto-set when openElementEditor invoked via setEditingElementId path');
});
