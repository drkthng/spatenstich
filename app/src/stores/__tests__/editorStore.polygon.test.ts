// Phase 7 Plan 01 Wave 0: editorStore polygon-tool test scaffold (EDIT-05).
// Per CONTEXT D-09: tap-corner mode + explicit "Beet abschliessen" commit, mind. 3 points.

describe('editorStore > polygonAddPoint', () => {
  it.todo('first tap initializes polygonInProgress with one point');
  it.todo('subsequent taps append points to polygonInProgress.pointsM');
  it.todo('polygonAddPoint does NOT commit to elements (only on polygonCommit)');
});

describe('editorStore > polygonCommit', () => {
  it.todo('throws when polygonInProgress is null');
  it.todo('throws when polygonInProgress.pointsM.length < 3 with message "polygon needs at least 3 points"');
  it.todo('commits a new Beet element with xM/yM = bbox centroid (via geometry.bedLayout.polygonToBbox)');
  it.todo('commits with widthM/heightM = bbox width/height');
  it.todo('commits with provenance.polygonPointsM = original tap coords (preserve polygon shape)');
  it.todo('commits with layer="infrastructure" (Beete are infrastructure)');
  it.todo('clears polygonInProgress and sets tool back to "select" after commit');
});

describe('editorStore > polygonCancel', () => {
  it.todo('clears polygonInProgress without committing');
  it.todo('sets tool back to "select"');
});
