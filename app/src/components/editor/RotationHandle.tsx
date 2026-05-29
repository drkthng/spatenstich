// Phase 09.1 Plan 03: Skia rotation handle — one circle above the selected element's top-center.
//
// Pattern S3 (gestureActive discipline): setGestureActive(true) at onBegin, false at onEnd.
// Pattern S2 (provenance update): always spread prev provenance before updating rotateDeg.
// Pitfall 8 mitigation: try/finally ensures gestureActive is always reset even on error.
// D-07: 15°-snap via snapRotation(deg, false) — no Shift on mobile (A7).
// D-08 additive: co-exists with 2-finger Gesture.Rotation in EditorCanvas.
// commitRotationAbsolute: sets absolute deg (differs from delta-based commitRotation in EditorCanvas).

import * as React from 'react';
import { Circle } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useEditorStore } from '@/src/stores/editorStore';
import { snapRotation } from '@/src/lib/editor/rotationSnap';

export interface RotationHandleProps {
  elementId: string;
  xM: number;
  yM: number;
  /** Garden-meter X coordinate of element center (atan2 origin) */
  centerXM: number;
  /** Garden-meter Y coordinate of element center (atan2 origin) */
  centerYM: number;
  scale: number;
}

export function RotationHandle({
  elementId,
  xM,
  yM,
  centerXM,
  centerYM,
  scale,
}: RotationHandleProps): React.JSX.Element {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const snappedDeg = useSharedValue(0);

  const onGestureBegin = React.useCallback(() => {
    useEditorStore.getState().setGestureActive(true);
  }, []);

  const onGestureEnd = React.useCallback(() => {
    useEditorStore.getState().setGestureActive(false);
  }, []);

  // commitRotationAbsolute: sets rotateDeg as an absolute value (not delta).
  // Differs from EditorCanvas's commitRotation which accumulates a delta.
  const commitRotationAbsolute = React.useCallback(
    (deg: number) => {
      try {
        const el = useEditorStore.getState().elements.find((e) => e.id === elementId);
        if (!el) return;
        const prevProv = (el.provenance ?? {}) as Record<string, unknown>;
        useEditorStore.getState().updateElement(elementId, {
          provenance: { ...prevProv, rotateDeg: deg },
        });
      } finally {
        // Pitfall 8: always release gestureActive even on error
        useEditorStore.getState().setGestureActive(false);
      }
    },
    [elementId],
  );

  const rotation = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      startX.value = e.x;
      startY.value = e.y;
      runOnJS(onGestureBegin)();
    })
    .onChange((e) => {
      'worklet';
      // Compute angle from element center to current cursor position
      const currentX = centerXM + (e.x - startX.value) / scale;
      const currentY = centerYM + (e.y - startY.value) / scale;
      const rawDeg = (Math.atan2(currentY - centerYM, currentX - centerXM) * 180) / Math.PI;
      // D-07: 15°-snap always on mobile (no Shift key), freeRotation=false
      snappedDeg.value = snapRotation(rawDeg, false);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(commitRotationAbsolute)(snappedDeg.value);
      runOnJS(onGestureEnd)();
    });

  // Handle radius in garden meters (keeps visual size constant across zoom levels)
  const r = 6 / scale;

  return (
    <GestureDetector gesture={rotation}>
      <Circle cx={xM} cy={yM} r={r} color="#2DD4BF" />
    </GestureDetector>
  );
}
