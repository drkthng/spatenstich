// Phase 09.1 Plan 03: Web SVG resize handle — one per corner of the selected element.
//
// Pattern S3 (gestureActive discipline): setGestureActive(true) on mousedown, false on mouseup.
// Window-level mousemove/mouseup pattern mirrors WebPlanEditor.tsx:119-152 (drag state effect).
// Pitfall 8 mitigation: try/finally ensures gestureActive is always reset even on error.
// MVP Carve-Out: Only rendered when rotateDeg === 0 (caller enforces, WebPlanEditor render-gate).
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
}

interface ResizeDragState {
  startMouseX: number;
  startMouseY: number;
  startWidthM: number;
  startHeightM: number;
}

/**
 * Cursor style per corner — NW/SE for tl/br, NE/SW for tr/bl.
 */
function cornerCursor(corner: 'tl' | 'tr' | 'bl' | 'br'): string {
  if (corner === 'tl' || corner === 'br') return 'nwse-resize';
  return 'nesw-resize';
}

/**
 * Computes new widthM/heightM from a drag delta, anchored at the opposite corner.
 * Pure function, safe to call in event handlers.
 */
function computeResize(
  corner: 'tl' | 'tr' | 'bl' | 'br',
  startWidthM: number,
  startHeightM: number,
  dxPx: number,
  dyPx: number,
  scale: number,
): { newW: number; newH: number } {
  const dxM = dxPx / scale;
  const dyM = dyPx / scale;
  let newW = startWidthM;
  let newH = startHeightM;

  if (corner === 'br') {
    newW = startWidthM + dxM;
    newH = startHeightM + dyM;
  } else if (corner === 'tl') {
    newW = startWidthM - dxM;
    newH = startHeightM - dyM;
  } else if (corner === 'tr') {
    newW = startWidthM + dxM;
    newH = startHeightM - dyM;
  } else {
    // bl
    newW = startWidthM - dxM;
    newH = startHeightM + dyM;
  }

  return {
    newW: Math.max(MIN_DIM_M, newW),
    newH: Math.max(MIN_DIM_M, newH),
  };
}

export function WebResizeHandle({
  elementId,
  corner,
  xPx,
  yPx,
  scale,
}: WebResizeHandleProps): React.JSX.Element {
  const dragRef = React.useRef<ResizeDragState | null>(null);

  React.useEffect(() => {
    if (!dragRef.current) return;
    const drag = dragRef.current;

    const onMove = (e: MouseEvent) => {
      const dxPx = e.clientX - drag.startMouseX;
      const dyPx = e.clientY - drag.startMouseY;
      const { newW, newH } = computeResize(corner, drag.startWidthM, drag.startHeightM, dxPx, dyPx, scale);
      useEditorStore.getState().updateElement(elementId, { widthM: newW, heightM: newH });
    };

    const onUp = () => {
      try {
        dragRef.current = null;
      } finally {
        // Pitfall 8: always release gestureActive even on error
        useEditorStore.getState().setGestureActive(false);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  });

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = useEditorStore.getState().elements.find((x) => x.id === elementId);
      if (!el || el.deletedAt !== null) return;
      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startWidthM: el.widthM,
        startHeightM: el.heightM,
      };
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
