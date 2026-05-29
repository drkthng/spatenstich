// Phase 7.5 — Web-native interactive SVG editor.
// Parallel to EditorCanvas (Skia, iOS/Android). Same editorStore, same data model.
// Mouse-first: click to select, drag to move, Del to delete, click empty to deselect.
//
// Why SVG: Skia Web is Beta + needs CanvasKit-WASM + COOP/COEP headers; HTML/SVG is
// industry-standard for desktop 2D editors (Figma/Excalidraw/Miro), modern-design
// friendly via CSS, no WASM risk. CONTEXT D-09 (web=read-only) is hereby revised
// because Desktop is a primary use case, not mobile-only (user decision 2026-05-16).

import * as React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText, G, Polygon } from 'react-native-svg';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import type { PlantMeta } from './WebPaletteBar';
import { useEditorStore } from '@/src/stores/editorStore';
import { PLAN_COLORS, darkenColor, truncateLabel } from '@/src/lib/colors';

export interface WebPlanEditorProps {
  dimensions: GardenDimensionsRow;
  gardenId: string;
  userId: string;
  /** When the palette has primed a kind to place, the next canvas click drops it. */
  placingKind: string | null;
  plantMeta?: PlantMeta | null;
  onPlaced: () => void;
  conflictElementIds?: Set<string>;
}

// RESEARCH §Open Q 2 / T-09.1-DBLCLICK-RACE: mousedown stays passive until
// 5px movement threshold exceeded — leaves native dblclick window intact.
const MOUSE_DRAG_THRESHOLD_PX = 5;

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  elStartXM: number;
  elStartYM: number;
}

// Pending drag capture before threshold promotion
interface PendingDrag {
  id: string;
  startMouseX: number;
  startMouseY: number;
  elStartXM: number;
  elStartYM: number;
}

// Default element sizes in meters per kind. Tunable later.
const DEFAULT_SIZES: Record<string, { widthM: number; heightM: number }> = {
  Beet: { widthM: 2, heightM: 1 },
  Pflanze: { widthM: 0.4, heightM: 0.4 },
  Rasen: { widthM: 4, heightM: 3 },
  Weg: { widthM: 3, heightM: 0.6 },
  Laube: { widthM: 3, heightM: 2 },
  Kompost: { widthM: 1, heightM: 1 },
  Wasserstelle: { widthM: 1, heightM: 1 },
  Zaun: { widthM: 0.1, heightM: 3 },
  Baum: { widthM: 1, heightM: 1 },
  Sitzplatz: { widthM: 1.5, heightM: 1.5 },
  Sonstiges: { widthM: 1, heightM: 1 },
};

function randomId(): string {
  return 'el-' + Math.random().toString(36).slice(2, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function WebPlanEditor({
  dimensions,
  gardenId,
  userId,
  placingKind,
  plantMeta,
  onPlaced,
  conflictElementIds,
}: WebPlanEditorProps): React.JSX.Element {
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const showGrid = useEditorStore((s) => s.showGrid);
  const activeLayers = useEditorStore((s) => s.activeLayers);

  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [containerSize, setContainerSize] = React.useState({ w: 800, h: 600 });
  // Pending drag: captures mousedown coords before the 5px threshold is exceeded (MOUSE_DRAG_THRESHOLD_PX)
  const pendingDragRef = React.useRef<PendingDrag | null>(null);

  // Compute scale (px per meter) to fit garden into available viewport with padding.
  const PADDING = 24;
  const availW = Math.max(200, containerSize.w - PADDING * 2);
  const availH = Math.max(200, containerSize.h - PADDING * 2);
  const scaleByWidth = availW / dimensions.widthM;
  const scaleByHeight = availH / dimensions.heightM;
  const scale = Math.min(scaleByWidth, scaleByHeight);

  const svgWidth = dimensions.widthM * scale;
  const svgHeight = dimensions.heightM * scale;

  // Track container size for responsive scaling
  const containerRef = React.useRef<View>(null);
  const onLayout = React.useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setContainerSize({ w: width, h: height });
    },
    [],
  );

  // Keyboard: Delete removes selected; Escape clears selection + tool mode.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Don't hijack typing in inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        useEditorStore.getState().deleteElement(selection);
        useEditorStore.getState().setSelection(null);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        useEditorStore.getState().setSelection(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  // Drag: window-level mouse move/up so the drag continues even if cursor leaves an
  // element. setGestureActive(true) bypasses the autosave subscription during drag
  // (Pitfall-5); the up handler clears it so save fires once on release.
  React.useEffect(() => {
    if (!drag) return;
    const elAtStart = elements.find((e) => e.id === drag.id);
    if (!elAtStart) {
      setDrag(null);
      return;
    }
    const elWidth = elAtStart.widthM;
    const elHeight = elAtStart.heightM;

    const onMove = (e: MouseEvent) => {
      const dxM = (e.clientX - drag.startMouseX) / scale;
      const dyM = (e.clientY - drag.startMouseY) / scale;
      const newXM = Math.max(
        elWidth / 2,
        Math.min(dimensions.widthM - elWidth / 2, drag.elStartXM + dxM),
      );
      const newYM = Math.max(
        elHeight / 2,
        Math.min(dimensions.heightM - elHeight / 2, drag.elStartYM + dyM),
      );
      useEditorStore.getState().updateElement(drag.id, { xM: newXM, yM: newYM });
    };
    const onUp = () => {
      setDrag(null);
      useEditorStore.getState().setGestureActive(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, scale, dimensions.widthM, dimensions.heightM, elements]);

  // Pending drag threshold effect: promotes pendingDragRef → active drag once mousemove exceeds 5px.
  // This frees the dblclick path (T-09.1-DBLCLICK-RACE mitigation, RESEARCH §Open Q 2).
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const pending = pendingDragRef.current;
      if (!pending) return;
      const dx = Math.abs(e.clientX - pending.startMouseX);
      const dy = Math.abs(e.clientY - pending.startMouseY);
      if (dx >= MOUSE_DRAG_THRESHOLD_PX || dy >= MOUSE_DRAG_THRESHOLD_PX) {
        // Threshold exceeded — promote to active drag
        pendingDragRef.current = null;
        useEditorStore.getState().setGestureActive(true);
        setDrag({
          id: pending.id,
          startMouseX: pending.startMouseX,
          startMouseY: pending.startMouseY,
          elStartXM: pending.elStartXM,
          elStartYM: pending.elStartYM,
        });
      }
    };
    const onUp = () => {
      // Mouseup before threshold: clear pending without starting drag (dblclick still fires)
      pendingDragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // stable — no deps needed, uses refs

  const handleSvgClick = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Ignore clicks that originated on an element (bubbled up)
      if ((e.target as EventTarget) !== e.currentTarget && !placingKind) return;
      // If we're in placing mode, drop a new element at the click position
      if (placingKind) {
        const rect = (e.currentTarget as unknown as SVGSVGElement).getBoundingClientRect();
        const xPx = e.clientX - rect.left;
        const yPx = e.clientY - rect.top;
        const xM = xPx / scale;
        const yM = yPx / scale;
        const size = DEFAULT_SIZES[placingKind] ?? DEFAULT_SIZES.Sonstiges;
        // Store center point (app convention: xM/yM = element center)
        const centerX = Math.max(size.widthM / 2, Math.min(dimensions.widthM - size.widthM / 2, xM));
        const centerY = Math.max(size.heightM / 2, Math.min(dimensions.heightM - size.heightM / 2, yM));
        const newEl: PlanElementRow = {
          id: randomId(),
          gardenId,
          elementType: placingKind,
          label: plantMeta?.label ?? placingKind,
          xM: centerX,
          yM: centerY,
          widthM: size.widthM,
          heightM: size.heightM,
          confidence: null,
          isAccepted: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          updatedByUserId: userId,
          deletedAt: null,
          importedFrom: null,
          provenance: { source: 'manual', ...(plantMeta?.slug ? { plantSlug: plantMeta.slug } : {}) },
          layer: placingKind === 'Pflanze' ? 'seasonal' : 'infrastructure',
        };
        useEditorStore.getState().addElement(newEl);
        useEditorStore.getState().setSelection(newEl.id);
        onPlaced();
        return;
      }
      // Otherwise: deselect
      useEditorStore.getState().setSelection(null);
    },
    [placingKind, plantMeta, scale, gardenId, userId, dimensions.widthM, dimensions.heightM, onPlaced],
  );

  const handleElementMouseDown = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const el = elements.find((x) => x.id === id);
      if (!el || el.deletedAt !== null) return;
      useEditorStore.getState().setSelection(id);
      // MOUSE_DRAG_THRESHOLD_PX: capture pending drag but do NOT start drag or setGestureActive yet.
      // Only promote to active drag once mousemove exceeds MOUSE_DRAG_THRESHOLD_PX (5px).
      // This leaves the native dblclick event window intact (T-09.1-DBLCLICK-RACE).
      pendingDragRef.current = {
        id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        elStartXM: el.xM,
        elStartYM: el.yM,
      };
    },
    [elements],
  );

  // Filter by layer + deletion status
  const visibleElements = elements.filter((el) => {
    if (el.deletedAt !== null) return false;
    if (el.layer === 'infrastructure' && !activeLayers.infrastructure) return false;
    if (el.layer === 'seasonal' && !activeLayers.seasonal) return false;
    return true;
  });

  // Cursor: crosshair when placing, grab on element hover (CSS via Pressable styling)
  const cursorStyle: React.CSSProperties = placingKind
    ? { cursor: 'crosshair' }
    : { cursor: 'default' };

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      className="flex-1 items-center justify-center"
      testID="web-plan-editor-container"
    >
      <div onClick={handleSvgClick as any} style={cursorStyle}>
      <Svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        accessibilityLabel={`Interaktiver Gartenplan mit ${visibleElements.length} Elementen`}
        testID="web-plan-editor-svg"
      >
        {/* 1. Background */}
        <Rect x={0} y={0} width={svgWidth} height={svgHeight} fill={PLAN_COLORS.background} />

        {/* 2. Grid */}
        {showGrid && (
          <G>
            {Array.from({ length: Math.floor(dimensions.widthM) + 1 }).map((_, i) => (
              <Line
                key={`gv-${i}`}
                x1={i * scale}
                y1={0}
                x2={i * scale}
                y2={svgHeight}
                stroke={PLAN_COLORS.grid}
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: Math.floor(dimensions.heightM) + 1 }).map((_, i) => (
              <Line
                key={`gh-${i}`}
                x1={0}
                y1={i * scale}
                x2={svgWidth}
                y2={i * scale}
                stroke={PLAN_COLORS.grid}
                strokeWidth={1}
              />
            ))}
          </G>
        )}

        {/* 3. Garden border */}
        <Rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          fill="none"
          stroke={PLAN_COLORS.border}
          strokeWidth={2}
        />

        {/* 4. Elements */}
        {visibleElements.map((el) => {
          const fill =
            PLAN_COLORS[el.elementType as keyof typeof PLAN_COLORS] ?? PLAN_COLORS.Sonstiges;
          const stroke = darkenColor(fill, 0.25);
          const selected = el.id === selection;
          return (
            <G
              key={el.id}
              onMouseDown={((e: React.MouseEvent) => handleElementMouseDown(el.id, e)) as any}
              onDoubleClick={((e: React.MouseEvent) => {
                // D-01: Web double-click opens ElementEditorModal (T-09.1-DBLCLICK-RACE mitigation)
                e.stopPropagation();
                useEditorStore.getState().setSelection(el.id);
                useEditorStore.getState().setEditingElementId(el.id);
              }) as any}
              style={{ cursor: 'grab' } as any}
            >
              <Rect
                x={(el.xM - el.widthM / 2) * scale}
                y={(el.yM - el.heightM / 2) * scale}
                width={el.widthM * scale}
                height={el.heightM * scale}
                fill={fill}
                stroke={stroke}
                strokeWidth={selected ? 3 : 1}
              />
              <SvgText
                x={el.xM * scale}
                y={el.yM * scale + 4}
                fontSize={Math.max(10, Math.min(13, el.widthM * scale * 0.18))}
                fill={darkenColor(fill, 0.5)}
                textAnchor="middle"
                pointerEvents="none"
              >
                {truncateLabel(el.label ?? el.elementType, 14)}
              </SvgText>
              {/* Selection outline */}
              {selected && (
                <Rect
                  x={(el.xM - el.widthM / 2) * scale - 3}
                  y={(el.yM - el.heightM / 2) * scale - 3}
                  width={el.widthM * scale + 6}
                  height={el.heightM * scale + 6}
                  fill="none"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
              {/* Conflict triangle (D-10: persistent visual marker) */}
              {conflictElementIds?.has(el.id) && (
                <Polygon
                  points={`${(el.xM + el.widthM / 2) * scale - 2},${(el.yM - el.heightM / 2) * scale + 2} ${(el.xM + el.widthM / 2) * scale + 12},${(el.yM - el.heightM / 2) * scale + 9} ${(el.xM + el.widthM / 2) * scale - 2},${(el.yM - el.heightM / 2) * scale + 16}`}
                  fill="#DC2626"
                  opacity={0.9}
                  pointerEvents="none"
                />
              )}
            </G>
          );
        })}
      </Svg>
      </div>
    </View>
  );
}
