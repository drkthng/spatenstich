// Phase 7 Plan 03: Beet-Polygon -> axis-aligned bounding box + centroid (EDIT-05).
// Pure. Consumed by editorStore.polygonCommit.
// MVP approximation: xM/yM = bbox center (NOT polygon centroid). Polygon shape stored in
// provenance.polygonPointsM so the original shape is recoverable later.

export interface Point2D {
  x: number;
  y: number;
}

export interface Bbox {
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
}

export function polygonToBbox(points: Point2D[]): Bbox {
  if (points.length < 3) {
    throw new Error('polygon needs at least 3 points');
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    xM: (minX + maxX) / 2,
    yM: (minY + maxY) / 2,
    widthM: maxX - minX,
    heightM: maxY - minY,
  };
}
