// Phase 32 (EDIT3-13): snapping while moving and resizing. Pure, no DOM.
//
// Edges and centres of what is being moved catch on the edges and centres of the other
// elements and on the parcel boundary; where nothing is near, edges catch on the grid lines.
// Between two neighbours an element also catches where the gaps on both sides are equal.
// The caller draws the returned guides and can switch snapping off.

import { boxBounds, normalizeDeg, type Box, type GardenSize } from './elementGeometry';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A line showing what an edge or centre is aligned with. */
export interface AlignGuide {
  /** 'x': a vertical line at x = `at`; 'y': a horizontal line at y = `at`. */
  axis: 'x' | 'y';
  at: number;
  /** Extent of the line along the other axis. */
  from: number;
  to: number;
}

/** Two equal gaps, drawn as measured stretches at `cross` on the other axis. */
export interface GapGuide {
  axis: 'x' | 'y';
  first: [number, number];
  second: [number, number];
  cross: number;
}

export interface Guides {
  align: AlignGuide[];
  gaps: GapGuide[];
}

export interface SnapOptions {
  /** How close (in metres) an edge must be to catch; the caller derives it from the zoom. */
  toleranceM: number;
  /** Spacing of the grid lines in metres. */
  gridM: number;
  garden: GardenSize;
}

export const NO_GUIDES: Guides = { align: [], gaps: [] };

export function unionBounds(list: Bounds[]): Bounds {
  return {
    minX: Math.min(...list.map((b) => b.minX)),
    minY: Math.min(...list.map((b) => b.minY)),
    maxX: Math.max(...list.map((b) => b.maxX)),
    maxY: Math.max(...list.map((b) => b.maxY)),
  };
}

interface AxisView {
  min: number;
  max: number;
  crossMin: number;
  crossMax: number;
}
const view = (b: Bounds, axis: 'x' | 'y'): AxisView =>
  axis === 'x'
    ? { min: b.minX, max: b.maxX, crossMin: b.minY, crossMax: b.maxY }
    : { min: b.minY, max: b.maxY, crossMin: b.minX, crossMax: b.maxX };

interface AxisSnap {
  shift: number;
  align: AlignGuide[];
  gaps: GapGuide[];
}

/** Snap along one axis; `points` are the positions of the moving thing that may catch. */
function snapAxis(
  axis: 'x' | 'y',
  moving: AxisView,
  points: number[],
  others: AxisView[],
  size: number,
  opts: SnapOptions,
  allowGaps: boolean,
): AxisSnap {
  const tol = opts.toleranceM;

  // 1. Edges and centres of other elements, and the parcel boundary.
  let best: { diff: number; at: number; other: AxisView | null } | null = null;
  const consider = (target: number, other: AxisView | null) => {
    for (const p of points) {
      const diff = target - p;
      if (Math.abs(diff) <= tol && (best === null || Math.abs(diff) < Math.abs(best.diff))) {
        best = { diff, at: target, other };
      }
    }
  };
  for (const o of others) {
    consider(o.min, o);
    consider(o.max, o);
    consider((o.min + o.max) / 2, o);
  }
  consider(0, null);
  consider(size, null);
  if (best !== null) {
    const hit = best as { diff: number; at: number; other: AxisView | null };
    const from = Math.min(moving.crossMin, hit.other ? hit.other.crossMin : moving.crossMin);
    const to = Math.max(moving.crossMax, hit.other ? hit.other.crossMax : moving.crossMax);
    return { shift: hit.diff, align: [{ axis, at: hit.at, from, to }], gaps: [] };
  }

  // 2. Equal gaps between the nearest neighbours on both sides.
  if (allowGaps) {
    const beside = others.filter((o) => o.crossMin < moving.crossMax && o.crossMax > moving.crossMin);
    const before = beside.filter((o) => o.max <= moving.min + tol).sort((a, b) => b.max - a.max)[0];
    const after = beside.filter((o) => o.min >= moving.max - tol).sort((a, b) => a.min - b.min)[0];
    if (before && after) {
      const gapBefore = moving.min - before.max;
      const gapAfter = after.min - moving.max;
      const shift = (gapAfter - gapBefore) / 2;
      if (Math.abs(shift) <= tol && gapBefore + gapAfter > 0) {
        const cross = (Math.max(moving.crossMin, before.crossMin, after.crossMin) +
          Math.min(moving.crossMax, before.crossMax, after.crossMax)) / 2;
        return {
          shift,
          align: [],
          gaps: [
            {
              axis,
              first: [before.max, moving.min + shift],
              second: [moving.max + shift, after.min],
              cross,
            },
          ],
        };
      }
    }
  }

  // 3. Grid lines.
  if (opts.gridM > 0) {
    let grid: number | null = null;
    for (const p of points) {
      const diff = Math.round(p / opts.gridM) * opts.gridM - p;
      if (Math.abs(diff) <= tol && (grid === null || Math.abs(diff) < Math.abs(grid))) grid = diff;
    }
    if (grid !== null) return { shift: grid, align: [], gaps: [] };
  }
  return { shift: 0, align: [], gaps: [] };
}

/**
 * Snap a move. `moving` is where the thing would be without snapping. Returns how much
 * further to shift it, and the guides to draw.
 */
export function snapMove(
  moving: Bounds,
  others: Bounds[],
  opts: SnapOptions,
): { dxM: number; dyM: number; guides: Guides } {
  const xs = snapAxis(
    'x',
    view(moving, 'x'),
    [moving.minX, moving.maxX, (moving.minX + moving.maxX) / 2],
    others.map((o) => view(o, 'x')),
    opts.garden.widthM,
    opts,
    true,
  );
  const ys = snapAxis(
    'y',
    view(moving, 'y'),
    [moving.minY, moving.maxY, (moving.minY + moving.maxY) / 2],
    others.map((o) => view(o, 'y')),
    opts.garden.heightM,
    opts,
    true,
  );
  return {
    dxM: xs.shift,
    dyM: ys.shift,
    guides: { align: [...xs.align, ...ys.align], gaps: [...xs.gaps, ...ys.gaps] },
  };
}

/**
 * Snap a resize of an element lying square to the parcel (0°, 90°, 180°, 270°): the edges
 * that moved compared with `start` catch on neighbours, the boundary and the grid; the other
 * edges stay. Elements at other angles are returned unchanged.
 */
export function snapResize(
  start: Box,
  resized: Box,
  others: Bounds[],
  opts: SnapOptions,
  minM: number,
): { box: Box; guides: Guides } {
  const rot = normalizeDeg(resized.rotateDeg);
  if (rot % 90 !== 0) return { box: resized, guides: NO_GUIDES };
  const before = boxBounds(start);
  const now = boxBounds(resized);
  const next: Bounds = { ...now };
  const align: AlignGuide[] = [];
  const eps = 1e-9;

  const edge = (axis: 'x' | 'y', key: keyof Bounds) => {
    if (Math.abs(now[key] - before[key]) < eps) return;
    const snap = snapAxis(
      axis,
      view(now, axis),
      [now[key]],
      others.map((o) => view(o, axis)),
      axis === 'x' ? opts.garden.widthM : opts.garden.heightM,
      opts,
      false,
    );
    next[key] = now[key] + snap.shift;
    align.push(...snap.align);
  };
  edge('x', 'minX');
  edge('x', 'maxX');
  edge('y', 'minY');
  edge('y', 'maxY');

  const spanX = next.maxX - next.minX;
  const spanY = next.maxY - next.minY;
  if (spanX < minM || spanY < minM) return { box: resized, guides: NO_GUIDES };
  const swapped = rot % 180 === 90;
  return {
    box: {
      xM: (next.minX + next.maxX) / 2,
      yM: (next.minY + next.maxY) / 2,
      widthM: swapped ? spanY : spanX,
      heightM: swapped ? spanX : spanY,
      rotateDeg: resized.rotateDeg,
    },
    guides: { align, gaps: [] },
  };
}
