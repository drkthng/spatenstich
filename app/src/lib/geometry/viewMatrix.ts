// Phase 7 Plan 03: pixel <-> meter coordinate conversion for the Skia editor view matrix.
// Pure, symmetric, no rounding — single source of truth for viewport transforms.
// Pitfall-4 (RESEARCH): rounding is forbidden at storage layer; consumers round only at display time.

export interface ViewMatrix {
  tx: number;
  ty: number;
  scale: number;
}

export function mToPx(m: number, scale: number): number {
  return m * scale;
}

export function pxToM(px: number, scale: number): number {
  return px / scale;
}

export function screenToGarden(
  xPx: number,
  yPx: number,
  vm: ViewMatrix,
): { xM: number; yM: number } {
  return {
    xM: (xPx - vm.tx) / vm.scale,
    yM: (yPx - vm.ty) / vm.scale,
  };
}

export function gardenToScreen(
  xM: number,
  yM: number,
  vm: ViewMatrix,
): { xPx: number; yPx: number } {
  return {
    xPx: xM * vm.scale + vm.tx,
    yPx: yM * vm.scale + vm.ty,
  };
}
