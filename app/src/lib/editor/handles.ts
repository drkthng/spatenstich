// Phase 30: handle layout and hit testing in screen pixels.
//
// Handles keep a constant on-screen size whatever the zoom (EDIT3-08). Their touch areas are
// at least 44 px, sit mostly outside the element and reach inward at most a quarter of the
// element, so the middle of even a small selected element stays free for dragging and
// double-tapping (PROJECT D-21, Sketch 001 findings). Side handles are dropped on sides
// shorter than 36 px on screen.
//
// All coordinates here are in the selected element's own frame: origin at its centre, axes
// along its width and depth, in screen pixels. The caller rotates the pointer into that frame.

import type { HandleId, ResizeHandleId } from './elementGeometry';
import { handleSigns } from './elementGeometry';

/** Visual size of a handle square (Sketch 001: 13 px). */
export const HANDLE_VISUAL_PX = 13;
/**
 * Distance of the rotation handle above the top edge. Far enough that its touch area and
 * the top side handle's touch area barely overlap (the rotation handle wins the overlap).
 */
export const ROTATE_OFFSET_PX = 48;
/** Sides shorter than this get no middle handle. */
export const SIDE_HANDLE_MIN_PX = 36;

export interface HitProfile {
  /** Edge length of the square touch area. */
  hitPx: number;
  /** How far the touch area may reach into the element, before the quarter cap. */
  inwardPx: number;
}

export const TOUCH_HIT: HitProfile = { hitPx: 44, inwardPx: 14 };
export const MOUSE_HIT: HitProfile = { hitPx: 24, inwardPx: 8 };

export interface HandleSpot {
  id: HandleId;
  /** Centre of the visible handle. */
  x: number;
  y: number;
}

const CORNERS: ResizeHandleId[] = ['nw', 'ne', 'se', 'sw'];
const SIDES: ResizeHandleId[] = ['n', 'e', 's', 'w'];

/** Which handles a selected element shows, with the centre of each visible handle. */
export function handleSpots(widthPx: number, heightPx: number): HandleSpot[] {
  const hw = widthPx / 2;
  const hh = heightPx / 2;
  const spots: HandleSpot[] = [{ id: 'rot', x: 0, y: -hh - ROTATE_OFFSET_PX }];
  for (const id of CORNERS) {
    const { sx, sy } = handleSigns(id);
    spots.push({ id, x: sx * hw, y: sy * hh });
  }
  for (const id of SIDES) {
    const { sx, sy } = handleSigns(id);
    // 'n' and 's' sit on the edges that are as long as the width; 'e' and 'w' on the depth.
    const sideLength = sx === 0 ? widthPx : heightPx;
    if (sideLength < SIDE_HANDLE_MIN_PX) continue;
    spots.push({ id, x: sx * hw, y: sy * hh });
  }
  return spots;
}

interface Range {
  min: number;
  max: number;
}

/** Touch range along one axis for a handle on the edge at `sign * half`. */
function axisRange(sign: -1 | 0 | 1, half: number, profile: HitProfile): Range {
  if (sign === 0) return { min: -profile.hitPx / 2, max: profile.hitPx / 2 };
  // Inward reach is capped at a quarter of the element's extent on this axis.
  const inward = Math.min(profile.inwardPx, half / 2);
  const outward = profile.hitPx - inward;
  return sign > 0
    ? { min: half - inward, max: half + outward }
    : { min: -half - outward, max: -half + inward };
}

/** Touch rectangle of a handle in the element's own frame. */
export function handleHitRect(
  id: HandleId,
  widthPx: number,
  heightPx: number,
  profile: HitProfile,
): { x: Range; y: Range } {
  const hw = widthPx / 2;
  const hh = heightPx / 2;
  if (id === 'rot') {
    const cy = -hh - ROTATE_OFFSET_PX;
    const half = profile.hitPx / 2;
    return { x: { min: -half, max: half }, y: { min: cy - half, max: cy + half } };
  }
  const { sx, sy } = handleSigns(id);
  return { x: axisRange(sx, hw, profile), y: axisRange(sy, hh, profile) };
}

/**
 * Which handle, if any, is under a point given in the element's own frame (screen pixels).
 * Order: rotation handle, corners, then sides, so a corner wins where touch areas overlap.
 */
export function hitHandle(
  localX: number,
  localY: number,
  widthPx: number,
  heightPx: number,
  profile: HitProfile,
): HandleId | null {
  for (const spot of handleSpots(widthPx, heightPx)) {
    const r = handleHitRect(spot.id, widthPx, heightPx, profile);
    if (localX >= r.x.min && localX <= r.x.max && localY >= r.y.min && localY <= r.y.max) {
      return spot.id;
    }
  }
  return null;
}
