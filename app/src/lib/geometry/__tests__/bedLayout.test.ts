// Phase 7 Plan 01 Wave 0: polygon-to-bbox test scaffold (EDIT-05).
// Per RESEARCH Code Examples 4: >=3 points required, centroid = geometric center of bbox.

describe('geometry.bedLayout > polygonToBbox', () => {
  it.todo('throws when points.length < 3 with message "polygon needs at least 3 points"');
  it.todo('triangle (0,0)/(2,0)/(1,2) returns xM=1, yM=1, widthM=2, heightM=2');
  it.todo('square (0,0)/(2,0)/(2,2)/(0,2) returns xM=1, yM=1, widthM=2, heightM=2');
  it.todo('irregular pentagon: xM/yM = geometric center of axis-aligned bbox (not polygon centroid — MVP approximation)');
  it.todo('handles negative coordinates: points (-1,-1)/(1,-1)/(0,1) returns xM=0, yM=0, widthM=2, heightM=2');
});
