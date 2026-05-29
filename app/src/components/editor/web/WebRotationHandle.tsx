// Phase 09.1 Plan 03: Web SVG rotation handle — one circle above the selected element.
//
// Pattern S3 (gestureActive discipline): setGestureActive(true) on mousedown, false on mouseup.
// Pattern S2 (provenance update): always spread prev provenance before updating rotateDeg.
// Pattern S5 (Shift-key listener): INPUT/TEXTAREA guard prevents Shift hijacking in modal (Pitfall 7).
// Pitfall 8 mitigation: try/finally ensures gestureActive is always reset even on error.
// D-07: 15°-snap via snapRotation(rawDeg, isShiftDown); Shift key bypasses snap (freeRotation).

import * as React from 'react';
import { Circle } from 'react-native-svg';
import { useEditorStore } from '@/src/stores/editorStore';
import { snapRotation } from '@/src/lib/editor/rotationSnap';

export interface WebRotationHandleProps {
  elementId: string;
  /** Handle center in screen pixels */
  xPx: number;
  yPx: number;
  /** Element center in screen pixels (for atan2 angle computation) */
  centerXPx: number;
  centerYPx: number;
}

interface RotationDragState {
  active: true;
}

export function WebRotationHandle({
  elementId,
  xPx,
  yPx,
  centerXPx,
  centerYPx,
}: WebRotationHandleProps): React.JSX.Element {
  const [isShiftDown, setIsShiftDown] = React.useState(false);
  const dragRef = React.useRef<RotationDragState | null>(null);

  // Pattern S5 + Pitfall 7: Shift-key listener with INPUT/TEXTAREA guard.
  // Without the guard, Shift in modal text input is hijacked by this handler.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // Pitfall 7 guard
      setIsShiftDown(e.shiftKey);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  // Window-level drag effect: fires when drag is active (dragRef.current !== null).
  // Uses isShiftDown from closure — captured at time effect re-runs.
  React.useEffect(() => {
    if (!dragRef.current) return;

    const onMove = (e: MouseEvent) => {
      const rawDeg = (Math.atan2(e.clientY - centerYPx, e.clientX - centerXPx) * 180) / Math.PI;
      const newDeg = snapRotation(rawDeg, isShiftDown);
      const el = useEditorStore.getState().elements.find((x) => x.id === elementId);
      if (!el) return;
      const prevProv = (el.provenance ?? {}) as Record<string, unknown>;
      useEditorStore.getState().updateElement(elementId, {
        provenance: { ...prevProv, rotateDeg: newDeg },
      });
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
      dragRef.current = { active: true };
      useEditorStore.getState().setGestureActive(true);
    },
    [],
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
      style={{ cursor: 'grab' }}
      onMouseDown={onMouseDown as any}
    />
  );
}
