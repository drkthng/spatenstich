// Phase 7 Plan 01 Wave 0: editor toolbar test scaffold (EDIT-08, EDIT-11, EDIT-09 manual save).
// Per UI-SPEC Toolbar layout: 9 buttons left-to-right.

describe('EditorToolbar > layer toggle (EDIT-08)', () => {
  it.todo('cycle 1 -> both layers visible (Eye icon, default)');
  it.todo('cycle 2 -> infrastructure only (EyeOff with seasonal-strike)');
  it.todo('cycle 3 -> seasonal only (EyeOff with infra-strike)');
  it.todo('cycle 4 -> back to both');
  it.todo('layer-toggle button has testID editor-layer-toggle-button');
});

describe('EditorToolbar > undo/redo (EDIT-11)', () => {
  it.todo('undo button calls useEditorStore.temporal.getState().undo');
  it.todo('redo button calls useEditorStore.temporal.getState().redo');
  it.todo('undo button disabled (opacity 0.4) when pastStates is empty');
  it.todo('redo button disabled when futureStates is empty');
});

describe('EditorToolbar > manual save (EDIT-09)', () => {
  it.todo('save button calls flushAllPendingSaves with mode + byId selector');
  it.todo('save button cycles state: idle -> saving (Loader2) -> saved (Check 2s) -> idle');
  it.todo('save error triggers an InlineBanner variant=warning with editor.saveError copy');
});

describe('EditorToolbar > polygon mode (EDIT-05)', () => {
  it.todo('polygon-start button activates polygon tool (toolbar background accent green)');
  it.todo('polygon-finish button appears only when polygonInProgress.pointsM.length >= 3');
  it.todo('polygon-finish disabled with caption "Mindestens 3 Ecken" when length < 3');
});
