// Phase 7 Plan 01 Wave 0: editorStore zundo temporal middleware test scaffold (EDIT-11, Pitfall-3).
// Per RESEARCH Pattern 8 + Pitfall 3: limit=20, partialize={elements}, equality shallow on a.elements===b.elements.

describe('editorStore.temporal > undo/redo basics (EDIT-11)', () => {
  it.todo('addElement then undo() removes the element');
  it.todo('addElement then undo() then redo() restores the element');
  it.todo('undo when pastStates is empty is a no-op (does not throw)');
  it.todo('redo when futureStates is empty is a no-op (does not throw)');
});

describe('editorStore.temporal > 20-step limit (EDIT-11)', () => {
  it.todo('after 25 addElement mutations, pastStates.length === 20 (oldest 5 are dropped)');
  it.todo('after 25 mutations and 20 undos, restored state matches state after mutation 5 (not mutation 0)');
});

describe('editorStore.temporal > partialize excludes selection/viewport/tool (Pitfall-3)', () => {
  it.todo('changing selection does NOT add a snapshot to pastStates');
  it.todo('changing viewport (pan/zoom) does NOT add a snapshot');
  it.todo('changing tool does NOT add a snapshot');
  it.todo('snapshot equality function uses reference check (a.elements === b.elements) to dedup');
});

describe('editorStore.temporal > selection cleared on undo (Open Q 4)', () => {
  it.todo('after undo, selection is reset to null (avoid stale pointer to deleted element)');
  it.todo('after redo, selection stays null (user reselects explicitly)');
});
