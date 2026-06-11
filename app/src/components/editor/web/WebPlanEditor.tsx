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
import { sortByZOrder } from '@/src/lib/editor/zOrder';
import { computeCornerHandles, computeRotationHandle } from '@/src/lib/editor/handleGeometry';
import { WebResizeHandle } from './WebResizeHandle';
import { WebRotationHandle } from './WebRotationHandle';

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

// quick-260611-vk4: Drag-to-create Mindestgröße für Beete (Meter).
// Zu kleine aufgezogene Beete werden auf diesen Wert aufgerundet (T-vk4-01).
const MIN_BEET_M = 0.5;

// quick-260611-ln5: Pfeiltasten-Move-Schrittweiten und Burst-Debounce.
// Direkt unter MOUSE_DRAG_THRESHOLD_PX gemäß design_notes.
const ARROW_STEP_M = 0.1;        // kleine Schrittweite (Pfeil ohne Modifier)
const ARROW_STEP_SHIFT_M = 0.5;  // große Schrittweite (Shift+Pfeil)
const ARROW_COMMIT_DEBOUNCE_MS = 400; // Burst-Fenster: nach dem letzten Pfeil bis setGestureActive(false)

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

// quick-260611-vk4: Drag-to-create-Zustand für Beet-Aufzieh-Modus.
interface CreateDrag {
  startClientX: number;
  startClientY: number;
  startSvgX: number; // SVG-lokale Koordinate (px) des Dragebeginns
  startSvgY: number;
}

// Vorschau-Rechteck für das aufzuziehende Beet (px im SVG-Koordinatensystem)
interface CreateRect {
  x: number;
  y: number;
  w: number;
  h: number;
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

  // quick-260611-vk4: Drag-to-create Refs + Vorschau-State.
  // createDragRef hält den laufenden Aufzieh-Vorgang (analog pendingDragRef).
  const createDragRef = React.useRef<CreateDrag | null>(null);
  // justCreatedRef verhindert, dass das mouseup-Ende eines Drag-to-create
  // sofort das nachfolgende click-Event als Deselect-Klick interpretiert.
  const justCreatedRef = React.useRef(false);
  // Vorschau-Rechteck (gestrichelter Rahmen) während des Aufziehens.
  const [createRect, setCreateRect] = React.useState<CreateRect | null>(null);

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

  // quick-260611-ln5: Pfeiltasten-Move (Web-only).
  // Eigenständiger useEffect — der bestehende Delete/Escape-Effekt bleibt unverändert.
  // Ablauf: erster Pfeil → setGestureActive(true); updateElement pro Taste;
  // 400ms-Debounce → setGestureActive(false) löst l5y-Flush + einen zundo-Snapshot aus.
  const arrowBurstActiveRef = React.useRef(false);
  const arrowDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onArrowKey = (e: KeyboardEvent) => {
      const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (!ARROW_KEYS.includes(e.key)) return;

      // Fokus-Guard: In Eingabefeldern nichts abfangen (INPUT/TEXTAREA/contenteditable)
      const active = document.activeElement as HTMLElement | null;
      if (active?.isContentEditable) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // activeElement-Fallback (robuster in jsdom, da e.target window ist bei dispatchEvent)
      const activeTag = active?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      // Selektions-Guard: nur bei aktiver Selektion
      const currentSelection = useEditorStore.getState().selection;
      if (!currentSelection) return;
      const currentElements = useEditorStore.getState().elements;
      const el = currentElements.find((elem) => elem.id === currentSelection && elem.deletedAt === null);
      if (!el) return;

      // Tatsächliche Verschiebung — ab hier darf e.preventDefault() gerufen werden
      e.preventDefault();

      const step = e.shiftKey ? ARROW_STEP_SHIFT_M : ARROW_STEP_M;
      let newXM = el.xM;
      let newYM = el.yM;

      if (e.key === 'ArrowLeft') newXM -= step;
      else if (e.key === 'ArrowRight') newXM += step;
      else if (e.key === 'ArrowUp') newYM -= step;
      else if (e.key === 'ArrowDown') newYM += step;

      // Clamping identisch zum Drag-onMove-Handler (xM/yM = Center)
      const elWidth = el.widthM;
      const elHeight = el.heightM;
      newXM = Math.max(elWidth / 2, Math.min(dimensions.widthM - elWidth / 2, newXM));
      newYM = Math.max(elHeight / 2, Math.min(dimensions.heightM - elHeight / 2, newYM));

      // Burst-Gesture-Wrapping: erster Pfeil des Bursts aktiviert gestureActive
      if (!arrowBurstActiveRef.current) {
        arrowBurstActiveRef.current = true;
        useEditorStore.getState().setGestureActive(true);
      }

      // Element verschieben (läuft im pausierten zundo-Fenster → kein per-Tastendruck-Snapshot)
      useEditorStore.getState().updateElement(currentSelection, { xM: newXM, yM: newYM });

      // Debounce-Timer zurücksetzen (gleitendes Fenster — ein Burst = ein Snapshot)
      if (arrowDebounceTimerRef.current !== null) {
        clearTimeout(arrowDebounceTimerRef.current);
      }
      arrowDebounceTimerRef.current = setTimeout(() => {
        arrowDebounceTimerRef.current = null;
        arrowBurstActiveRef.current = false;
        // setGestureActive(false) → l5y-Subscription resumed (1 Snapshot) + scheduleSaveElement-Flush
        useEditorStore.getState().setGestureActive(false);
      }, ARROW_COMMIT_DEBOUNCE_MS);
    };

    window.addEventListener('keydown', onArrowKey);
    return () => {
      window.removeEventListener('keydown', onArrowKey);
      // Cleanup: hängenden Burst-Timer schließen, damit kein gestureActive=true liegen bleibt
      if (arrowDebounceTimerRef.current !== null) {
        clearTimeout(arrowDebounceTimerRef.current);
        arrowDebounceTimerRef.current = null;
      }
      if (arrowBurstActiveRef.current) {
        arrowBurstActiveRef.current = false;
        useEditorStore.getState().setGestureActive(false);
      }
    };
  }, [selection, dimensions.widthM, dimensions.heightM, elements]);

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

  // quick-260611-vk4: Drag-to-create useEffect.
  // Registriert window-level mousemove/mouseup-Listener, die aktiv sind, solange
  // createDragRef.current gesetzt ist (analoges Muster zu drag-useEffect ab Zeile 226).
  // Abhängigkeiten: scale, gardenId, userId, dimensions, placingKind, plantMeta, onPlaced.
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cd = createDragRef.current;
      if (!cd) return;
      const dx = e.clientX - cd.startClientX;
      const dy = e.clientY - cd.startClientY;
      // Vorschau nur nach Überschreiten der Mindest-Drag-Distanz anzeigen
      if (Math.abs(dx) >= MOUSE_DRAG_THRESHOLD_PX || Math.abs(dy) >= MOUSE_DRAG_THRESHOLD_PX) {
        const x = Math.min(cd.startSvgX, cd.startSvgX + dx);
        const y = Math.min(cd.startSvgY, cd.startSvgY + dy);
        setCreateRect({ x, y, w: Math.abs(dx), h: Math.abs(dy) });
      }
    };
    const onUp = (e: MouseEvent) => {
      const cd = createDragRef.current;
      if (!cd) return;
      createDragRef.current = null;
      setCreateRect(null);

      const dx = e.clientX - cd.startClientX;
      const dy = e.clientY - cd.startClientY;
      // Mindest-Drag-Distanz muss in mindestens einer Achse überschritten sein
      if (Math.abs(dx) < MOUSE_DRAG_THRESHOLD_PX && Math.abs(dy) < MOUSE_DRAG_THRESHOLD_PX) {
        // Reiner Klick — kein Beet via Drag erzeugen; Drag-to-create löst nicht aus.
        // BEWUSSTES DESIGN: Ein reiner Klick im Beet-Modus erzeugt KEIN Beet über
        // den Drag-Pfad. Der bestehende click-Platzierungs-Pfad (handleSvgClick /
        // Default-Größe 2×1) greift aber weiterhin, da kein justCreatedRef gesetzt wird.
        return;
      }

      // Maße des aufgezogenen Rechtecks in Metern
      let rawWidthM = Math.abs(dx) / scale;
      let rawHeightM = Math.abs(dy) / scale;
      // Mindestkantenlänge (T-vk4-01: verhindert 0-/Negativ-Beete)
      const widthM = Math.max(MIN_BEET_M, rawWidthM);
      const heightM = Math.max(MIN_BEET_M, rawHeightM);

      // Center aus Mittelpunkt des aufgezogenen Rechtecks
      const midSvgX = cd.startSvgX + dx / 2;
      const midSvgY = cd.startSvgY + dy / 2;
      const rawCenterX = midSvgX / scale;
      const rawCenterY = midSvgY / scale;

      // Clamping identisch zum Klick-Pfad in handleSvgClick (T-vk4-01)
      const centerX = Math.max(widthM / 2, Math.min(dimensions.widthM - widthM / 2, rawCenterX));
      const centerY = Math.max(heightM / 2, Math.min(dimensions.heightM - heightM / 2, rawCenterY));

      const newEl: PlanElementRow = {
        id: randomId(),
        gardenId,
        elementType: 'Beet',
        label: plantMeta?.label ?? 'Beet',
        xM: centerX,
        yM: centerY,
        widthM,
        heightM,
        confidence: null,
        isAccepted: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        updatedByUserId: userId,
        deletedAt: null,
        importedFrom: null,
        provenance: { source: 'manual', ...(plantMeta?.slug ? { plantSlug: plantMeta.slug } : {}) },
        layer: 'infrastructure',
      };

      // Genau ein addElement — persistiert direkt über die auto-save Subscription
      // (KEIN setGestureActive nötig, da addElement einen neuen elements-Ref erzeugt)
      useEditorStore.getState().addElement(newEl);
      useEditorStore.getState().setSelection(newEl.id);
      onPlaced();

      // Unterdrückt das unmittelbar folgende click-Event, damit kein Deselect ausgelöst wird
      justCreatedRef.current = true;
      setTimeout(() => {
        justCreatedRef.current = false;
      }, 0);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scale, gardenId, userId, dimensions.widthM, dimensions.heightM, placingKind, plantMeta, onPlaced]);

  const handleSvgClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement | SVGSVGElement>) => {
      // quick-260611-vk4: Unterdrücke Klick direkt nach Drag-to-create (justCreatedRef-Flag).
      // Das mouseup des Drag-Endes setzt justCreatedRef — der folgende click soll weder
      // deselecten noch ein zweites Beet über den Klick-Pfad erzeugen.
      if (justCreatedRef.current) return;

      // If we're in placing mode, drop a new element at the click position.
      // quick-260611-vk4: Für placingKind === 'Beet' wird Drag-to-create bevorzugt (mousedown-Pfad).
      // Der Klick-Pfad bleibt aber als Fallback aktiv (z.B. reiner Klick ohne Drag),
      // sodass ein einzelner Klick im Beet-Modus ein Beet mit Default-Größe platziert.
      if (placingKind) {
        const svgEl = (e.currentTarget as HTMLElement).querySelector('svg') ?? e.currentTarget;
        const rect = (svgEl as Element).getBoundingClientRect();
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
      // quick-260611-vk4: Deselect-Fix.
      // Der frühere Early-Return `if (e.target !== e.currentTarget && !placingKind) return`
      // verhinderte das Deselect, weil Klicks auf Hintergrund-SVG-Kinder (Rect, Svg) das
      // Event bis zum <div> (handleSvgClick's currentTarget) bubblen, dabei aber
      // e.target !== e.currentTarget gilt. Element-Klicks rufen bereits e.stopPropagation()
      // in handleElementMouseDown und erreichen diesen Handler nie.
      // Daher: Kein Early-Return mehr — jeder Klick auf die leere Canvas deselectiert.
      useEditorStore.getState().setSelection(null);
    },
    [placingKind, plantMeta, scale, gardenId, userId, dimensions.widthM, dimensions.heightM, onPlaced],
  );

  const handleElementMouseDown = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault?.();
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

  // quick-260611-vk4: Canvas mousedown — startet Drag-to-create wenn placingKind === 'Beet'.
  // Für alle anderen Werkzeuge oder kein Werkzeug passiert hier nichts; Klick-Platzierung
  // läuft weiter über handleSvgClick (click-Event).
  const handleCanvasMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (placingKind !== 'Beet') return;
      // SVG-lokale Koordinaten für den Aufzieh-Startpunkt ermitteln.
      // Wir suchen das SVG-Element innerhalb des div-Containers.
      const svgEl = (e.currentTarget as HTMLElement).querySelector('svg');
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const startSvgX = e.clientX - rect.left;
      const startSvgY = e.clientY - rect.top;
      createDragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startSvgX,
        startSvgY,
      };
    },
    [placingKind],
  );

  // Selected element (for handle rendering)
  const selectedEl = selection
    ? elements.find((e) => e.id === selection && e.deletedAt === null)
    : null;

  // Filter by layer + deletion status
  const visibleElements = elements.filter((el) => {
    if (el.deletedAt !== null) return false;
    if (el.layer === 'infrastructure' && !activeLayers.infrastructure) return false;
    if (el.layer === 'seasonal' && !activeLayers.seasonal) return false;
    return true;
  });

  // Cursor: crosshair when placing, grab on element hover (CSS via Pressable styling).
  // userSelect: 'none' prevents native browser text-selection during all drag gestures.
  const cursorStyle: React.CSSProperties = placingKind
    ? { cursor: 'crosshair', userSelect: 'none', WebkitUserSelect: 'none' }
    : { cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' };

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      className="flex-1 items-center justify-center"
      testID="web-plan-editor-container"
    >
      {/* quick-260611-vk4: onMouseDown startet Drag-to-create für Beet */}
      <div onClick={handleSvgClick as any} onMouseDown={handleCanvasMouseDown as any} style={cursorStyle}>
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
        {sortByZOrder(visibleElements).map((el) => {
          const fill =
            PLAN_COLORS[el.elementType as keyof typeof PLAN_COLORS] ?? PLAN_COLORS.Sonstiges;
          const stroke = darkenColor(fill, 0.25);
          const selected = el.id === selection;
          const prov = (el.provenance ?? {}) as Record<string, unknown>;
          const rotateDegRaw = typeof prov.rotateDeg === 'number' ? prov.rotateDeg : 0;
          const rotateDeg = Number.isFinite(rotateDegRaw) ? rotateDegRaw : 0;
          const cxPx = el.xM * scale;
          const cyPx = el.yM * scale;
          const accentRaw = typeof prov.accentColor === 'string' ? prov.accentColor : null;
          const safeAccent = accentRaw && /^#[0-9a-fA-F]{6}$/.test(accentRaw) ? accentRaw : null;
          const finalFill = safeAccent ?? fill;
          return (
            <G
              key={el.id}
              transform={`rotate(${rotateDeg}, ${cxPx}, ${cyPx})`}
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
                fill={finalFill}
                stroke={stroke}
                strokeWidth={selected ? 3 : 1}
              />
              <SvgText
                x={el.xM * scale}
                y={el.yM * scale + 4}
                fontSize={Math.max(10, Math.min(13, el.widthM * scale * 0.18))}
                fill={darkenColor(finalFill, 0.5)}
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

        {/* 5. Resize handles — shown for any selected element */}
        {selectedEl && (() => {
          const corners = computeCornerHandles(selectedEl);
          const prov = (selectedEl.provenance ?? {}) as Record<string, unknown>;
          const rotateDeg = typeof prov.rotateDeg === 'number' ? prov.rotateDeg : 0;
          const cxPx = selectedEl.xM * scale;
          const cyPx = selectedEl.yM * scale;
          return (
            <G transform={rotateDeg !== 0 ? `rotate(${rotateDeg}, ${cxPx}, ${cyPx})` : undefined}>
              <WebResizeHandle
                key="resize-tl"
                elementId={selectedEl.id}
                corner="tl"
                xPx={corners.tl.xM * scale}
                yPx={corners.tl.yM * scale}
                scale={scale}
                rotateDeg={rotateDeg}
              />
              <WebResizeHandle
                key="resize-tr"
                elementId={selectedEl.id}
                corner="tr"
                xPx={corners.tr.xM * scale}
                yPx={corners.tr.yM * scale}
                scale={scale}
                rotateDeg={rotateDeg}
              />
              <WebResizeHandle
                key="resize-bl"
                elementId={selectedEl.id}
                corner="bl"
                xPx={corners.bl.xM * scale}
                yPx={corners.bl.yM * scale}
                scale={scale}
                rotateDeg={rotateDeg}
              />
              <WebResizeHandle
                key="resize-br"
                elementId={selectedEl.id}
                corner="br"
                xPx={corners.br.xM * scale}
                yPx={corners.br.yM * scale}
                scale={scale}
                rotateDeg={rotateDeg}
              />
            </G>
          );
        })()}

        {/* 6. Rotation handle — always shown for selected element (any rotateDeg) */}
        {selectedEl && (() => {
          const rotHandle = computeRotationHandle(selectedEl, 20, scale);
          return (
            <WebRotationHandle
              key="rotation-handle"
              elementId={selectedEl.id}
              xPx={rotHandle.xM * scale}
              yPx={rotHandle.yM * scale}
              centerXPx={selectedEl.xM * scale}
              centerYPx={selectedEl.yM * scale}
            />
          );
        })()}
        {/* quick-260611-vk4: Vorschau-Rechteck während Beet-Aufziehen (gestrichelter Rahmen) */}
        {createRect && (
          <Rect
            x={createRect.x}
            y={createRect.y}
            width={createRect.w}
            height={createRect.h}
            fill="none"
            stroke="#0EA5E9"
            strokeWidth={2}
            strokeDasharray="6 3"
            pointerEvents="none"
          />
        )}
      </Svg>
      </div>
    </View>
  );
}
