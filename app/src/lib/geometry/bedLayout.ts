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

/**
 * Ray-casting point-in-polygon test (D-05, Phase 9).
 * Returns true if point is strictly inside polygon.
 * Points on edge: implementation-defined. O(n) vertex count.
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  const { x: px, y: py } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
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
