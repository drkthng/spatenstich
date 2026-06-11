// Phase 09.1 Plan 03: Web SVG resize handle — one per corner of the selected element.
//
// Pattern S3 (gestureActive discipline): setGestureActive(true) on mousedown, false on mouseup.
// Window-level mousemove/mouseup pattern mirrors WebPlanEditor.tsx:119-152 (drag state effect).
// Pitfall 8 mitigation: try/finally ensures gestureActive is always reset even on error.
// Rotated-resize: drag deltas converted to element's local frame via inverse rotation; center
// shift rotated back to world frame. Implemented in Phase quick-260610-jtf.
// D-05: 4 corner handles. D-20: widthM/heightM are dedicated columns — no provenance touch.

import * as React from 'react';
import { Circle } from 'react-native-svg';
import { useEditorStore } from '@/src/stores/editorStore';

// Minimum dimension in meters (5cm) to prevent degenerate elements
const MIN_DIM_M = 0.05;

export interface WebResizeHandleProps {
  elementId: string;
  corner: 'tl' | 'tr' | 'bl' | 'br';
  /** Handle center in screen pixels */
  xPx: number;
  yPx: number;
  /** Current viewport scale (px per meter) */
  scale: number;
  /** Element rotation in degrees (clockwise, y-down). Default 0. */
  rotateDeg?: number;
}

interface ResizeDragState {
  startMouseX: number;
  startMouseY: number;
  startWidthM: number;
  startHeightM: number;
  startXM: number;
  startYM: number;
}

/**
 * Cursor style per corner — NW/SE for tl/br, NE/SW for tr/bl.
 */
function cornerCursor(corner: 'tl' | 'tr' | 'bl' | 'br'): string {
  if (corner === 'tl' || corner === 'br') return 'nwse-resize';
  return 'nesw-resize';
}

/**
 * Computes new dimensions + center offset, anchored at the opposite corner.
 * Supports rotated elements: drag deltas are converted to the element's local frame
 * using the inverse rotation, and the center shift is rotated back to world frame.
 *
 * θ = rotateDeg in radians (positive = clockwise in screen y-down coords).
 * dxLocal = ( dxPx * cos(θ) + dyPx * sin(θ) ) / scale
 * dyLocal = ( -dxPx * sin(θ) + dyPx * cos(θ) ) / scale
 * Center shift computed in local frame, then rotated back to world.
 */
function computeResize(
  corner: 'tl' | 'tr' | 'bl' | 'br',
  startWidthM: number,
  startHeightM: number,
  dxPx: number,
  dyPx: number,
  scale: number,
  theta: number,
): { newW: number; newH: number; cxAdj: number; cyAdj: number } {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Rotate screen delta into local (unrotated) element frame
  const dxLocal = (dxPx * cosT + dyPx * sinT) / scale;
  const dyLocal = (-dxPx * sinT + dyPx * cosT) / scale;

  const sxW = corner === 'tl' || corner === 'bl' ? -1 : 1;
  const syH = corner === 'tl' || corner === 'tr' ? -1 : 1;

  const newW = Math.max(MIN_DIM_M, startWidthM + sxW * dxLocal);
  const newH = Math.max(MIN_DIM_M, startHeightM + syH * dyLocal);

  // Center shift in local frame
  const cxLocal = sxW * (newW - startWidthM) / 2;
  const cyLocal = syH * (newH - startHeightM) / 2;

  // Rotate center shift back to world frame
  const cxAdj = cxLocal * cosT - cyLocal * sinT;
  const cyAdj = cxLocal * sinT + cyLocal * cosT;

  return { newW, newH, cxAdj, cyAdj };
}

export function WebResizeHandle({
  elementId,
  corner,
  xPx,
  yPx,
  scale,
  rotateDeg,
}: WebResizeHandleProps): React.JSX.Element {
  const theta = ((rotateDeg ?? 0) * Math.PI) / 180;
  const [drag, setDrag] = React.useState<ResizeDragState | null>(null);

  React.useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      const dxPx = e.clientX - drag.startMouseX;
      const dyPx = e.clientY - drag.startMouseY;
      const { newW, newH, cxAdj, cyAdj } = computeResize(
        corner,
        drag.startWidthM,
        drag.startHeightM,
        dxPx,
        dyPx,
        scale,
        theta,
      );
      useEditorStore.getState().updateElement(elementId, {
        widthM: newW,
        heightM: newH,
        xM: drag.startXM + cxAdj,
        yM: drag.startYM + cyAdj,
      });
    };

    const onUp = () => {
      try {
        setDrag(null);
      } finally {
        useEditorStore.getState().setGestureActive(false);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, corner, elementId, scale, theta]);

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault?.();
      const el = useEditorStore.getState().elements.find((x) => x.id === elementId);
      if (!el || el.deletedAt !== null) return;
      setDrag({
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startWidthM: el.widthM,
        startHeightM: el.heightM,
        startXM: el.xM,
        startYM: el.yM,
      });
      useEditorStore.getState().setGestureActive(true);
    },
    [elementId],
  );

  return (
    <Circle
      cx={xPx}
      cy={yPx}
      r={6}
      fill="#2DD4BF"
      stroke="#0F766E"
      strokeWidth={1}
      // @ts-ignore — react-native-svg Circle accepts style on web
      style={{ cursor: cornerCursor(corner) }}
      onMouseDown={onMouseDown as any}
    />
  );
}
