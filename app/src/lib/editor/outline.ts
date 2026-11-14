// Phase 32 (EDIT3-14): free outlines of beds. Pure, no DOM.
//
// An outline is stored in the element's own frame as fractions of its width and depth
// (`provenance.outline`, points {u, v} with the centre at 0 and the edges at ±0.5). Because
// it is relative, the outline follows the element when it is moved, resized or rotated.
//
// Older beds carry `provenance.polygonPointsM`: garden coordinates captured when the bed was
// drawn, which went stale as soon as the bed moved. Those are read as an outline relative to
// their own bounding box, so they follow the element too.

import type { PlanElementRow } from '@spatenstich/shared';
import { localToWorld, snapStep, toBox, worldToLocal, type Box, DRAG_STEP_M, MIN_SIZE_M } from './elementGeometry';

export interface OutlinePoint {
  u: number;
  v: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

const RECT: OutlinePoint[] = [
  { u: -0.5, v: -0.5 },
  { u: 0.5, v: -0.5 },
  { u: 0.5, v: 0.5 },
  { u: -0.5, v: 0.5 },
];

function isOutline(value: unknown): value is OutlinePoint[] {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every(
      (p) =>
        p && typeof p === 'object' && Number.isFinite((p as OutlinePoint).u) && Number.isFinite((p as OutlinePoint).v),
    )
  );
}

/** The element's free outline, or null when it is a plain rectangle. */
export function getOutline(el: Pick<PlanElementRow, 'provenance'>): OutlinePoint[] | null {
  const prov = el.provenance as Record<string, unknown> | null;
  if (!prov) return null;
  if (isOutline(prov.outline)) return prov.outline;
  const legacy = prov.polygonPointsM;
  if (Array.isArray(legacy) && legacy.length >= 3) {
    const pts = legacy as WorldPoint[];
    if (!pts.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX;
    const h = Math.max(...ys) - minY;
    if (w <= 0 || h <= 0) return null;
    return pts.map((p) => ({ u: (p.x - minX) / w - 0.5, v: (p.y - minY) / h - 0.5 }));
  }
  return null;
}

/** Corner points in garden metres: the outline, or the four corners of the box. */
export function outlineWorld(box: Box, outline: OutlinePoint[] | null): WorldPoint[] {
  return (outline ?? RECT).map((p) => {
    const w = localToWorld(box, p.u * box.widthM, p.v * box.heightM);
    return { x: w.xM, y: w.yM };
  });
}

/** The element's shape in garden metres, following its position, size and rotation. */
export function elementPolygon(el: PlanElementRow): WorldPoint[] {
  return outlineWorld(toBox(el), getOutline(el));
}

export function pointInPolygon(x: number, y: number, polygon: WorldPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * Fit a box around corner points given in garden metres, keeping the rotation, and express
 * the points as an outline of that box. Used after a corner was moved, added or removed.
 */
export function reframe(rotateDeg: number, points: WorldPoint[]): { box: Box; outline: OutlinePoint[] } {
  const frame: Box = { xM: 0, yM: 0, widthM: 1, heightM: 1, rotateDeg };
  const local = points.map((p) => worldToLocal(frame, p.x, p.y));
  const xs = local.map((p) => p.x);
  const ys = local.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const widthM = Math.max(MIN_SIZE_M, Math.max(...xs) - minX);
  const heightM = Math.max(MIN_SIZE_M, Math.max(...ys) - minY);
  const centre = localToWorld(frame, minX + widthM / 2, minY + heightM / 2);
  return {
    box: { xM: centre.xM, yM: centre.yM, widthM, heightM, rotateDeg },
    outline: local.map((p) => ({ u: (p.x - minX) / widthM - 0.5, v: (p.y - minY) / heightM - 0.5 })),
  };
}

/** A new free-outline bed from corners tapped on the plan. */
export function outlineFromCorners(points: WorldPoint[]): { box: Box; outline: OutlinePoint[] } {
  return reframe(0, points);
}

/** Patch for an element after its corner points changed. */
export function outlinePatch(el: PlanElementRow, points: WorldPoint[]): Partial<PlanElementRow> {
  const { box, outline } = reframe(toBox(el).rotateDeg, points);
  const provenance: Record<string, unknown> = { ...(el.provenance ?? {}), outline };
  // The stale garden-coordinate copy is dropped; `outline` is the one source from now on.
  delete provenance.polygonPointsM;
  return { xM: box.xM, yM: box.yM, widthM: box.widthM, heightM: box.heightM, provenance };
}

export function snapPoint(p: WorldPoint, stepM: number = DRAG_STEP_M): WorldPoint {
  return { x: snapStep(p.x, stepM), y: snapStep(p.y, stepM) };
}

/** Corner moved to a new place. */
export function moveCorner(points: WorldPoint[], index: number, to: WorldPoint): WorldPoint[] {
  return points.map((p, i) => (i === index ? to : p));
}

/** New corner in the middle of the edge that starts at `index`. Returns the points and its index. */
export function insertCorner(points: WorldPoint[], index: number): { points: WorldPoint[]; index: number } {
  const a = points[index];
  const b = points[(index + 1) % points.length];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return { points: [...points.slice(0, index + 1), mid, ...points.slice(index + 1)], index: index + 1 };
}

/** Corner removed; a shape keeps at least three corners. */
export function removeCorner(points: WorldPoint[], index: number): WorldPoint[] {
  return points.length <= 3 ? points : points.filter((_, i) => i !== index);
}

/** Middle of every edge, where a new corner can be added. */
export function edgeMidpoints(points: WorldPoint[]): WorldPoint[] {
  return points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });
}
