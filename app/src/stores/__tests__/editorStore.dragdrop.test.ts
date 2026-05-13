// Phase 7 Plan 01 Wave 0: editorStore drag-drop test scaffold (EDIT-03, Pitfall-5).
// Per RESEARCH Pattern 3 + Pitfall 5: drop-only commit (no interim coord persistence during gesture).

describe('editorStore > addElement (drop commit)', () => {
  it.todo('addElement appends a new PlanElementRow with kind="Beet" and the dropped coords');
  it.todo('addElement sets layer="infrastructure" for non-plant kinds');
  it.todo('addElement sets layer="seasonal" for kind="Pflanze"');
  it.todo('addElement sets provenance={ source: "manual" } for editor-created elements');
  it.todo('addElement sets isAccepted=true and confidence=null (manual elements have no AI confidence)');
});

describe('editorStore > updateElement (drag-in-progress vs commit) — Pitfall-5', () => {
  it.todo('updateElement during active gesture flag does NOT write to outbox (only store-level mutation)');
  it.todo('updateElement on gesture end (gestureActive=false) commits to store AND schedules a save');
  it.todo('updateElement preserves all fields not in the patch');
});

describe('editorStore > deleteElement (soft-delete)', () => {
  it.todo('deleteElement sets deletedAt timestamp; element is NOT removed from the array');
  it.todo('deleteElement leaves other elements untouched');
  it.todo('deleted elements no longer appear in selection candidates');
});
