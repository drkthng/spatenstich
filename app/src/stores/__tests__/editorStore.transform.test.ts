// Phase 7 Plan 01 Wave 0: editorStore rotation + scale action test scaffold (EDIT-04).
// Per CONTEXT D-04: rotation stored as provenance.rotateDeg (no schema column — Open Q 3, A11).

describe('editorStore > rotation (EDIT-04)', () => {
  it.todo('updateElement with patch.provenance.rotateDeg writes the new angle to that element');
  it.todo('rotation persists 0..359 degrees; values >=360 are normalized via modulo');
  it.todo('rotation snapshot is captured by zundo (undoable)');
});

describe('editorStore > scale (EDIT-04)', () => {
  it.todo('updateElement with patch.widthM/heightM writes new dimensions');
  it.todo('scale preserves provenance.rotateDeg if previously set');
  it.todo('scale snapshot is captured by zundo (undoable)');
});
