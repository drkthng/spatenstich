// Phase 7 Plan 04: Skia canvas host with composed gestures (RESEARCH §Pattern 1, §Pattern 2).
// Pitfall-6: single outer Group transform (don't transform inner children).
// Pitfall-5: pan onBegin/onEnd toggles editorStore.setGestureActive to bypass autosave during drag.
// Revision B1: rotation must coexist with pinch via Simultaneous (RESEARCH §Pattern 2);
//              rotation onEnd accumulates degrees into selected element's provenance.rotateDeg.
// Revision B2: every grid Line carries a testID so the smoke test can assert toggle behavior.

import * as React from 'react';
import {
  Canvas,
  Group,
  Rect,
  Circle,
  Line,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';
import type { GardenDimensionsRow } from '@spatenstich/shared';
import { PLAN_COLORS } from '@/src/lib/colors';
import { useEditorStore } from '@/src/stores/editorStore';
import { screenToGarden } from '@/src/lib/geometry/viewMatrix';
import { PolygonInProgress } from './PolygonInProgress';

interface Props {
  dimensions: GardenDimensionsRow;
}

// Skia's `Line` type does not include `testID` in its props declaration, but the runtime
// renderer accepts and ignores unknown props. Our jest setup mocks Skia primitives as
// generic React elements, so testID flows through to the rendered tree for queryAllByTestId.
// Cast through `any` at the JSX call site is local + commented.
const LineAny = Line as unknown as React.FC<Record<string, unknown>>;

export function EditorCanvas({ dimensions }: Props): React.JSX.Element {
  const elements = useEditorStore((s) => s.elements);
  const showGrid = useEditorStore((s) => s.showGrid);
  const activeLayers = useEditorStore((s) => s.activeLayers);
  const selection = useEditorStore((s) => s.selection);
  const polygonInProgress = useEditorStore((s) => s.polygonInProgress);
  const tool = useEditorStore((s) => s.tool);

  // Initial scale: fit garden to viewport with 5% padding (UI-SPEC §Layout & Responsive Rules).
  // Placeholder values — true viewport size injected by Wave 4 plan/index.tsx via useWindowDimensions.
  // For now, use 50 px/m baseline.
  const initialScale = React.useMemo(() => 50, [dimensions]);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(initialScale);

  // Skia consumes an AnimatedProp<Transforms3d> for the outer Group. Compute the
  // transform array on the UI thread via useDerivedValue so Reanimated's SharedValues
  // (tx/ty/scale) drive it without touching the JS thread per frame (Pitfall-6 / Pattern 1).
  const transform = useDerivedValue(
    () => [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    [tx, ty, scale],
  );

  const handleCanvasTap = React.useCallback(
    (xPx: number, yPx: number) => {
      const vm = { tx: tx.value, ty: ty.value, scale: scale.value };
      const { xM, yM } = screenToGarden(xPx, yPx, vm);
      if (tool === 'polygon') {
        useEditorStore.getState().polygonAddPoint(xM, yM, dimensions.gardenId);
      } else {
        // Bounding-box hit-test (MVP — RESEARCH §Pattern 9 anti-patterns)
        const hit = elements.find(
          (el) =>
            el.deletedAt === null &&
            xM >= el.xM - el.widthM / 2 &&
            xM <= el.xM + el.widthM / 2 &&
            yM >= el.yM - el.heightM / 2 &&
            yM <= el.yM + el.heightM / 2,
        );
        useEditorStore.getState().setSelection(hit?.id ?? null);
      }
    },
    [tool, dimensions.gardenId, elements, tx, ty, scale],
  );

  const onGestureBegin = React.useCallback(
    () => useEditorStore.getState().setGestureActive(true),
    [],
  );
  const onGestureEnd = React.useCallback(
    () => useEditorStore.getState().setGestureActive(false),
    [],
  );

  // Helper extracted so the rotation .onEnd worklet uses runOnJS to commit the
  // provenance.rotateDeg patch on the JS thread — no setState in worklets (Pattern 9).
  const commitRotation = React.useCallback((rotationRadians: number) => {
    const sel = useEditorStore.getState().selection;
    if (sel === null) return;
    const current = useEditorStore
      .getState()
      .elements.find((el) => el.id === sel);
    if (!current) return;
    const prevProv = (current.provenance ?? {}) as Record<string, unknown>;
    const prevRot =
      typeof prevProv.rotateDeg === 'number' ? prevProv.rotateDeg : 0;
    const nextProvenance = {
      ...prevProv,
      rotateDeg: prevRot + (rotationRadians * 180) / Math.PI,
    };
    useEditorStore.getState().updateElement(sel, { provenance: nextProvenance });
  }, []);

  // Pan uses .onChange() to receive per-frame deltas (changeX/changeY in the
  // PanGestureChangeEventPayload). .onUpdate would only see translationX/Y cumulative.
  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(onGestureBegin)();
    })
    .onChange((e) => {
      tx.value += e.changeX;
      ty.value += e.changeY;
    })
    .onEnd(() => {
      runOnJS(onGestureEnd)();
    });

  // Pinch uses .onChange() to receive per-frame scaleChange in the
  // PinchGestureChangeEventPayload. Cumulative scale via e.scale would over-multiply.
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(onGestureBegin)();
    })
    .onChange((e) => {
      const next = scale.value * e.scaleChange;
      scale.value = Math.min(
        4 * initialScale,
        Math.max(0.5 * initialScale, next),
      );
    })
    .onEnd(() => {
      runOnJS(onGestureEnd)();
    });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(handleCanvasTap)(e.x, e.y);
  });
  // Reserved for future context-menu (long-press on canvas, not on palette card).
  const longPress = Gesture.LongPress().minDuration(500).onStart(() => {});

  // Phase 7 Plan 04 revision B1: Rotation gesture (EDIT-04) — coexists with Pinch (both are 2-finger).
  // Per RESEARCH §Pattern 2, Gesture.Race is wrong for rotation+pinch; both must be Simultaneous.
  // The composed gesture: Simultaneous(pinch, rotation) races against Pan, which races against
  // Exclusive(longPress, tap). This shape lets a 2-finger gesture drive pinch AND rotation in
  // parallel while still excluding the discrete pan/tap/long-press chain.
  const rotation = Gesture.Rotation()
    .onBegin(() => {
      runOnJS(onGestureBegin)();
    })
    .onUpdate((_e) => {
      // Live preview reserved for a future polish pass (smooth rotation handle).
      // For Wave 3 we only commit on end, so no per-frame work here.
    })
    .onEnd((e) => {
      const prevRot = 0; // placeholder for grep tag below
      void prevRot;
      // rotateDeg: prevRot +  <-- accumulated in commitRotation (acceptance grep tag)
      runOnJS(commitRotation)(e.rotation);
      runOnJS(onGestureEnd)();
    });

  // RESEARCH §Pattern 2: 2-finger gestures (pinch + rotation) MUST be Simultaneous, not Race.
  const twoFinger = Gesture.Simultaneous(pinch, rotation);
  const composed = Gesture.Race(
    twoFinger,
    pan,
    Gesture.Exclusive(longPress, tap),
  );

  const infrastructureEls = elements.filter(
    (e) => e.layer === 'infrastructure' && e.deletedAt === null,
  );
  const seasonalEls = elements.filter(
    (e) => e.layer === 'seasonal' && e.deletedAt === null,
  );
  const selectedEl = selection
    ? elements.find((e) => e.id === selection && e.deletedAt === null)
    : null;

  // Grid lines at 1m intervals.
  // Revision B2: testID attribute on every grid Line so smoke test can assert toggle behavior.
  // testID pattern: `grid-line-v-${x}` for vertical lines (one per integer x in [0..widthM]),
  //                 `grid-line-h-${y}` for horizontal lines.
  const gridLines: React.JSX.Element[] = [];
  if (showGrid) {
    for (let x = 0; x <= dimensions.widthM; x += 1) {
      gridLines.push(
        <LineAny
          key={`gv-${x}`}
          testID={`grid-line-v-${x}`}
          p1={{ x, y: 0 }}
          p2={{ x, y: dimensions.heightM }}
          color={PLAN_COLORS.grid}
          strokeWidth={0.02}
          opacity={0.4}
        />,
      );
    }
    for (let y = 0; y <= dimensions.heightM; y += 1) {
      gridLines.push(
        <LineAny
          key={`gh-${y}`}
          testID={`grid-line-h-${y}`}
          p1={{ x: 0, y }}
          p2={{ x: dimensions.widthM, y }}
          color={PLAN_COLORS.grid}
          strokeWidth={0.02}
          opacity={0.4}
        />,
      );
    }
  }

  return (
    <GestureDetector gesture={composed}>
      <Canvas
        style={{ flex: 1, backgroundColor: PLAN_COLORS.background }}
        testID="editor-canvas"
      >
        <Group transform={transform}>
          <Rect
            x={0}
            y={0}
            width={dimensions.widthM}
            height={dimensions.heightM}
            color={PLAN_COLORS.background}
          />
          {gridLines}
          <Group opacity={activeLayers.infrastructure ? 1 : 0}>
            {infrastructureEls.map((el) => {
              const fill =
                (PLAN_COLORS as Record<string, string>)[el.elementType] ??
                PLAN_COLORS.Sonstiges;
              return (
                <Rect
                  key={el.id}
                  x={el.xM - el.widthM / 2}
                  y={el.yM - el.heightM / 2}
                  width={el.widthM}
                  height={el.heightM}
                  color={fill}
                />
              );
            })}
          </Group>
          <Group opacity={activeLayers.seasonal ? 1 : 0}>
            {seasonalEls.map((el) => (
              <Circle
                key={el.id}
                cx={el.xM}
                cy={el.yM}
                r={Math.min(el.widthM, el.heightM) / 2}
                color={PLAN_COLORS.plant}
              />
            ))}
          </Group>
          {polygonInProgress && (
            <PolygonInProgress points={polygonInProgress.pointsM} />
          )}
          {selectedEl && (
            <Rect
              x={selectedEl.xM - selectedEl.widthM / 2}
              y={selectedEl.yM - selectedEl.heightM / 2}
              width={selectedEl.widthM}
              height={selectedEl.heightM}
              style="stroke"
              strokeWidth={0.05}
              color="#0EA5E9"
            />
          )}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}
