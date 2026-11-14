// Phase 30: viewport maths for the plan (EDIT3-07). Pure, no DOM.
// A viewport maps garden metres to canvas pixels: px = m * scale + (tx, ty).
// Zoom is limited to 0.5x … 4x of the scale at which the whole parcel fits the canvas.

import type { ViewMatrix } from '../geometry/viewMatrix';
import type { GardenSize } from './elementGeometry';

export type Viewport = ViewMatrix;

export interface CanvasSize {
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
/** Free space kept around the parcel when it is shown whole. */
export const FIT_PADDING_PX = 28;

/** Pixels per metre at which the whole parcel fits the canvas. */
export function fitScale(garden: GardenSize, canvas: CanvasSize, padding = FIT_PADDING_PX): number {
  const w = Math.max(1, canvas.width - 2 * padding);
  const h = Math.max(1, canvas.height - 2 * padding);
  const scale = Math.min(w / Math.max(garden.widthM, 0.01), h / Math.max(garden.heightM, 0.01));
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** The viewport that shows the whole parcel, centred. */
export function fitViewport(garden: GardenSize, canvas: CanvasSize, padding = FIT_PADDING_PX): Viewport {
  const scale = fitScale(garden, canvas, padding);
  return {
    scale,
    tx: (canvas.width - garden.widthM * scale) / 2,
    ty: (canvas.height - garden.heightM * scale) / 2,
  };
}

export function clampScale(scale: number, fit: number): number {
  return Math.min(fit * MAX_ZOOM, Math.max(fit * MIN_ZOOM, scale));
}

/**
 * Keep the plan findable: the centre of the parcel may not leave the canvas. That allows
 * panning any edge of the parcel into view at every zoom, but never losing the plan.
 */
export function clampPan(vp: Viewport, garden: GardenSize, canvas: CanvasSize): Viewport {
  const halfW = (garden.widthM * vp.scale) / 2;
  const halfH = (garden.heightM * vp.scale) / 2;
  return {
    scale: vp.scale,
    tx: Math.min(canvas.width - halfW, Math.max(-halfW, vp.tx)),
    ty: Math.min(canvas.height - halfH, Math.max(-halfH, vp.ty)),
  };
}

export function panBy(vp: Viewport, dxPx: number, dyPx: number): Viewport {
  return { scale: vp.scale, tx: vp.tx + dxPx, ty: vp.ty + dyPx };
}

/** Zoom by a factor so that the garden point under the anchor stays under it. */
export function zoomAt(
  vp: Viewport,
  factor: number,
  anchor: { x: number; y: number },
  fit: number,
): Viewport {
  const scale = clampScale(vp.scale * factor, fit);
  const gx = (anchor.x - vp.tx) / vp.scale;
  const gy = (anchor.y - vp.ty) / vp.scale;
  return { scale, tx: anchor.x - gx * scale, ty: anchor.y - gy * scale };
}

/**
 * Two-finger gesture: scale by the change in finger distance and keep the garden point that
 * was under the starting midpoint under the current midpoint (zoom and pan in one).
 */
export function pinchViewport(
  start: Viewport,
  startMid: { x: number; y: number },
  startDist: number,
  mid: { x: number; y: number },
  dist: number,
  fit: number,
): Viewport {
  const ratio = startDist > 0 ? dist / startDist : 1;
  const scale = clampScale(start.scale * ratio, fit);
  const gx = (startMid.x - start.tx) / start.scale;
  const gy = (startMid.y - start.ty) / start.scale;
  return { scale, tx: mid.x - gx * scale, ty: mid.y - gy * scale };
}

/** Current zoom relative to "whole parcel visible" (1 = fit). */
export function zoomLevel(vp: Viewport, fit: number): number {
  return fit > 0 ? vp.scale / fit : 1;
}
