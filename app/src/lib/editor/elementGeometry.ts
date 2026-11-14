// Phase 30: geometry for plan elements, shared by the interaction controller and the renderer.
// Pure functions, no DOM. An element is a box: centre (xM, yM), size (widthM, heightM) and a
// rotation in degrees, clockwise, around its centre (stored in `provenance.rotateDeg`).
//
// Decisions implemented here (30-CONTEXT.md):
//   D-05  moving and resizing by drag land on a 5 cm step
//   D-06  the centre stays inside the parcel; the element may overhang
//   EDIT3-03  a side handle keeps the opposite edge where it is, also when rotated

import type { PlanElementRow } from '@spatenstich/shared';

/** Step for drag-move and drag-resize in metres (D-05). */
export const DRAG_STEP_M = 0.05;
/** Smallest width or depth an element can be resized to. */
export const MIN_SIZE_M = 0.05;

export interface Box {
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  rotateDeg: number;
}

export interface GardenSize {
  widthM: number;
  heightM: number;
}

/** The eight resize handles by compass position in the element's own frame, plus rotation. */
export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type HandleId = ResizeHandleId | 'rot';

const SIGNS: Record<ResizeHandleId, { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }> = {
  nw: { sx: -1, sy: -1 },
  n: { sx: 0, sy: -1 },
  ne: { sx: 1, sy: -1 },
  e: { sx: 1, sy: 0 },
  se: { sx: 1, sy: 1 },
  s: { sx: 0, sy: 1 },
  sw: { sx: -1, sy: 1 },
  w: { sx: -1, sy: 0 },
};

export function handleSigns(handle: ResizeHandleId): { sx: -1 | 0 | 1; sy: -1 | 0 | 1 } {
  return SIGNS[handle];
}

export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

export function getRotateDeg(el: Pick<PlanElementRow, 'provenance'>): number {
  const raw = (el.provenance as Record<string, unknown> | null)?.rotateDeg;
  return typeof raw === 'number' && Number.isFinite(raw) ? normalizeDeg(raw) : 0;
}

export function toBox(el: PlanElementRow): Box {
  return {
    xM: el.xM,
    yM: el.yM,
    widthM: el.widthM,
    heightM: el.heightM,
    rotateDeg: getRotateDeg(el),
  };
}

/** Patch that writes a box back to an element, keeping the other provenance keys. */
export function boxPatch(el: PlanElementRow, box: Box): Partial<PlanElementRow> {
  const patch: Partial<PlanElementRow> = {
    xM: box.xM,
    yM: box.yM,
    widthM: box.widthM,
    heightM: box.heightM,
  };
  if (normalizeDeg(box.rotateDeg) !== getRotateDeg(el)) {
    patch.provenance = { ...(el.provenance ?? {}), rotateDeg: normalizeDeg(box.rotateDeg) };
  }
  return patch;
}

function trig(deg: number): { c: number; s: number } {
  const rad = (deg * Math.PI) / 180;
  return { c: Math.cos(rad), s: Math.sin(rad) };
}

/** World point -> the element's own unrotated frame, origin at its centre. */
export function worldToLocal(box: Box, xM: number, yM: number): { x: number; y: number } {
  const { c, s } = trig(box.rotateDeg);
  const dx = xM - box.xM;
  const dy = yM - box.yM;
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

/** Point in the element's own frame -> world. */
export function localToWorld(box: Box, x: number, y: number): { xM: number; yM: number } {
  const { c, s } = trig(box.rotateDeg);
  return { xM: box.xM + x * c - y * s, yM: box.yM + x * s + y * c };
}

/** Rotation-aware containment test. */
export function pointInBox(box: Box, xM: number, yM: number): boolean {
  const p = worldToLocal(box, xM, yM);
  return Math.abs(p.x) <= box.widthM / 2 && Math.abs(p.y) <= box.heightM / 2;
}

export function snapStep(value: number, step: number): number {
  if (step <= 0) return value;
  // Round to the step, then trim binary noise (0.1 + 0.2 style) to a tenth of a millimetre.
  return Math.round(Math.round(value / step) * step * 10000) / 10000;
}

/** D-06: the centre stays inside the parcel. */
export function clampCenter(
  xM: number,
  yM: number,
  garden: GardenSize,
): { xM: number; yM: number } {
  return {
    xM: Math.min(garden.widthM, Math.max(0, xM)),
    yM: Math.min(garden.heightM, Math.max(0, yM)),
  };
}

/**
 * Move a box by a world delta. For elements lying square to the parcel (0°, 90°, 180°, 270°)
 * the top-left edge lands on the step, so edges and sizes read as clean numbers; for other
 * angles the centre lands on the step. The centre is then clamped to the parcel.
 */
export function moveBox(
  start: Box,
  dxM: number,
  dyM: number,
  garden: GardenSize,
  stepM: number = DRAG_STEP_M,
): { xM: number; yM: number } {
  const rot = normalizeDeg(start.rotateDeg);
  const quarter = rot % 90 === 0;
  let x = start.xM + dxM;
  let y = start.yM + dyM;
  if (quarter) {
    const swapped = rot % 180 === 90;
    const halfW = (swapped ? start.heightM : start.widthM) / 2;
    const halfH = (swapped ? start.widthM : start.heightM) / 2;
    x = snapStep(x - halfW, stepM) + halfW;
    y = snapStep(y - halfH, stepM) + halfH;
  } else {
    x = snapStep(x, stepM);
    y = snapStep(y, stepM);
  }
  return clampCenter(x, y, garden);
}

/**
 * Resize from a handle by a world-space pointer delta. Corner handles change width and depth
 * together; side handles change one of them. The edge (or corner) opposite the handle stays
 * exactly where it was, whatever the rotation: the size change is applied in the element's
 * own frame and the centre is shifted by half of it along the rotated axes.
 */
export function resizeBox(
  start: Box,
  handle: ResizeHandleId,
  dxM: number,
  dyM: number,
  opts: { stepM?: number; minM?: number } = {},
): Box {
  const stepM = opts.stepM ?? DRAG_STEP_M;
  const minM = opts.minM ?? MIN_SIZE_M;
  const { sx, sy } = SIGNS[handle];
  const { c, s } = trig(start.rotateDeg);
  // Pointer delta in the element's own frame.
  const lx = dxM * c + dyM * s;
  const ly = -dxM * s + dyM * c;
  const widthM = sx === 0 ? start.widthM : Math.max(minM, snapStep(start.widthM + sx * lx, stepM));
  const heightM = sy === 0 ? start.heightM : Math.max(minM, snapStep(start.heightM + sy * ly, stepM));
  // Centre shift in the own frame, then back to world.
  const mx = (sx * (widthM - start.widthM)) / 2;
  const my = (sy * (heightM - start.heightM)) / 2;
  return {
    xM: start.xM + mx * c - my * s,
    yM: start.yM + mx * s + my * c,
    widthM,
    heightM,
    rotateDeg: start.rotateDeg,
  };
}

/**
 * Angle for the rotation handle: 0° when the pointer is straight above the centre (where the
 * handle sits on an unrotated element), growing clockwise. Not snapped; see `snapRotation`.
 */
export function rotationFromPointer(box: Box, xM: number, yM: number): number {
  const deg = (Math.atan2(yM - box.yM, xM - box.xM) * 180) / Math.PI + 90;
  return normalizeDeg(deg);
}

/** Axis-aligned bounds of a (possibly rotated) box, in metres. */
export function boxBounds(box: Box): { minX: number; minY: number; maxX: number; maxY: number } {
  const { c, s } = trig(box.rotateDeg);
  const halfW = (Math.abs(c) * box.widthM + Math.abs(s) * box.heightM) / 2;
  const halfH = (Math.abs(s) * box.widthM + Math.abs(c) * box.heightM) / 2;
  return { minX: box.xM - halfW, minY: box.yM - halfH, maxX: box.xM + halfW, maxY: box.yM + halfH };
}

/** True when the box's bounds touch the rectangle (selection frame). */
export function boxTouchesRect(
  box: Box,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  const b = boxBounds(box);
  return b.minX <= rect.maxX && b.maxX >= rect.minX && b.minY <= rect.maxY && b.maxY >= rect.minY;
}

/**
 * Limit a move of several elements so that every centre stays inside the parcel (D-06).
 * Returns the delta that can be applied to all of them.
 */
export function clampGroupDelta(
  centres: { xM: number; yM: number }[],
  dxM: number,
  dyM: number,
  garden: GardenSize,
): { dxM: number; dyM: number } {
  let dx = dxM;
  let dy = dyM;
  for (const c of centres) {
    dx = Math.min(garden.widthM - c.xM, Math.max(-c.xM, dx));
    dy = Math.min(garden.heightM - c.yM, Math.max(-c.yM, dy));
  }
  return { dxM: dx, dyM: dy };
}
