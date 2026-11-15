// Phase 35 (PHOTO-08): which part of the garden the picture of a finding shows.
// Pure geometry; the drawing is in components/photo/FindingPlanMark.tsx.

import type { PlanElementRow } from '@spatenstich/shared';
import { elementPolygon } from '../editor/outline';
import type { FindingMark } from './findings';

/** The picture shows at least this much of the garden, so there is something to orient by. */
const MIN_VIEW_M = 6;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boundsOf(polygon: { x: number; y: number }[]): Bounds {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

const boxBounds = (b: { xM: number; yM: number; widthM: number; heightM: number }): Bounds => ({
  minX: b.xM - b.widthM / 2,
  minY: b.yM - b.heightM / 2,
  maxX: b.xM + b.widthM / 2,
  maxY: b.yM + b.heightM / 2,
});

const union = (a: Bounds, b: Bounds): Bounds => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
});

/**
 * The part of the garden to show: what the finding points at, with room around it,
 * never less than MIN_VIEW_M across and never beyond the parcel (a small garden is
 * shown whole).
 */
export function viewFor(
  mark: FindingMark,
  elements: PlanElementRow[],
  garden: { widthM: number; heightM: number },
): { x: number; y: number; width: number; height: number } {
  const whole = { x: 0, y: 0, width: garden.widthM, height: garden.heightM };
  let focus: Bounds | null = null;
  if (mark.type === 'element') {
    const el = elements.find((e) => e.id === mark.elementId);
    if (el) focus = boundsOf(elementPolygon(el));
    if (mark.proposed) focus = focus ? union(focus, boxBounds(mark.proposed)) : boxBounds(mark.proposed);
  } else if (mark.type === 'box') {
    focus = boxBounds(mark);
  } else if (mark.type === 'spot') {
    focus = { minX: mark.xM - 0.3, minY: mark.yM - 0.3, maxX: mark.xM + 0.3, maxY: mark.yM + 0.3 };
  }
  if (!focus) return whole;

  const span = Math.max(focus.maxX - focus.minX, focus.maxY - focus.minY);
  const margin = Math.max(1.5, span * 0.75);
  const side = (min: number, max: number, limit: number): { start: number; size: number } => {
    const size = Math.max(MIN_VIEW_M, max - min + 2 * margin);
    if (size >= limit) return { start: 0, size: limit };
    const centre = (min + max) / 2;
    const start = Math.min(limit - size, Math.max(0, centre - size / 2));
    return { start, size };
  };
  const horizontal = side(focus.minX, focus.maxX, garden.widthM);
  const vertical = side(focus.minY, focus.maxY, garden.heightM);
  return { x: horizontal.start, y: vertical.start, width: horizontal.size, height: vertical.size };
}
