// Phase 09.1 Plan 03: Skia resize handle — one per corner of the selected element.
//
// Pattern S3 (gestureActive discipline): setGestureActive(true) at onBegin, false at onEnd.
// Pitfall 8 mitigation: try/finally ensures gestureActive is always reset even on error.
// MVP Carve-Out: Only rendered when rotateDeg === 0 (caller enforces, EditorCanvas render-gate).
// D-05: 4 corner handles for resize. D-20: widthM/heightM are dedicated columns — no provenance touch.

import * as React from 'react';
import { Circle } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useEditorStore } from '@/src/stores/editorStore';

// Minimum dimension in meters (5cm) to prevent degenerate elements
const MIN_DIM_M = 0.05;

export interface ResizeHandleProps {
  elementId: string;
  corner: 'tl' | 'tr' | 'bl' | 'br';
  xM: number;
  yM: number;
  scale: number;
}

/**
 * Computes new widthM/heightM from a drag delta (worklet-safe, pure function).
 * Anchors the opposite corner; the dragged corner moves.
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

export function ResizeHandle({
  elementId,
  corner,
  xM,
  yM,
  scale,
}: ResizeHandleProps): React.JSX.Element {
  const startWidthM = useSharedValue(0);
  const startHeightM = useSharedValue(0);
  const currentW = useSharedValue(0);
  const currentH = useSharedValue(0);

  const onGestureBegin = React.useCallback(() => {
    useEditorStore.getState().setGestureActive(true);
  }, []);

  const onGestureEnd = React.useCallback(() => {
    useEditorStore.getState().setGestureActive(false);
  }, []);

  const commitResize = React.useCallback(
    (finalW: number, finalH: number) => {
      try {
        useEditorStore.getState().updateElement(elementId, {
          widthM: finalW,
          heightM: finalH,
        });
      } finally {
        // Pitfall 8: always release gestureActive even on error
        useEditorStore.getState().setGestureActive(false);
      }
    },
    [elementId],
  );

  const resize = Gesture.Pan()
    .onBegin(() => {
      // Capture start dimensions from current store state
      'worklet';
      runOnJS(onGestureBegin)();
      const el = useEditorStore.getState().elements.find((e) => e.id === elementId);
      if (el) {
        startWidthM.value = el.widthM;
        startHeightM.value = el.heightM;
      }
    })
    .onChange((e) => {
      'worklet';
      const result = computeResize(
        corner,
        startWidthM.value,
        startHeightM.value,
        e.translationX,
        e.translationY,
        scale,
      );
      currentW.value = result.newW;
      currentH.value = result.newH;
    })
    .onEnd(() => {
      'worklet';
      const finalW = currentW.value > 0 ? currentW.value : startWidthM.value;
      const finalH = currentH.value > 0 ? currentH.value : startHeightM.value;
      runOnJS(commitResize)(finalW, finalH);
      runOnJS(onGestureEnd)();
    });

  // Handle radius in garden meters (keeps visual size constant across zoom levels)
  const r = 6 / scale;

  return (
    <GestureDetector gesture={resize}>
      <Circle cx={xM} cy={yM} r={r} color="#2DD4BF" />
    </GestureDetector>
  );
}
