// Phase 30: the one plan editor (PROJECT D-03). Draws the garden as a surveyed plate in the
// Feldführer style (DESIGN3-03) with SVG in the web DOM, and turns pointer, wheel and key
// events into samples for the browser-free `InteractionController`.
//
// Three uses:
//   mode="edit"                      the full-screen editor
//   mode="readOnly"                  the plan view: zoom and pan, nothing can be changed
//   mode="readOnly" interactive=off  a still picture (home screen preview)
//
// Everything is drawn in screen pixels inside one translated group, so panning moves a single
// transform and handles, labels and line widths keep their size at every zoom (EDIT3-08).
// No event handlers sit on SVG nodes; the wrapping div receives all pointer input.

import * as React from 'react';
import { Platform, View } from 'react-native';
import { getNorthDeg, type GardenDimensionsRow, type PlanElementRow } from '@spatenstich/shared';
import { tokens, elementFill } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';
import { sortByZOrder } from '@/src/lib/editor/zOrder';
import { getRotateDeg } from '@/src/lib/editor/elementGeometry';
import { HANDLE_VISUAL_PX, ROTATE_OFFSET_PX, handleSpots } from '@/src/lib/editor/handles';
import { estimateTextWidth, fitLabel, type MeasureText } from '@/src/lib/editor/labelFit';
import { scaleBar } from '@/src/lib/editor/scaleBar';
import { formatDegrees, parseDegrees } from '@/src/lib/editor/numberFormat';
import {
  clampPan,
  fitScale,
  fitViewport,
  FIT_PADDING_PX,
  type Viewport,
} from '@/src/lib/editor/viewport';
import {
  InteractionController,
  type ControllerPort,
  type PointerSample,
  type PointerType,
} from '@/src/lib/editor/interactionController';

const P = tokens.plan;
const C = tokens.color;
const HATCHED_KINDS = new Set(['Beet', 'Hochbeet']);
const ROUND_KINDS = new Set(['Baum', 'Pflanze']);
const RENAME_MAX_LENGTH = 24;
/** Strip at the bottom of the canvas kept free for the scale bar when the plan is fitted. */
const SCALE_BAR_RESERVE_PX = 30;

function fitArea(size: { width: number; height: number }): { width: number; height: number } {
  return { width: size.width, height: Math.max(1, size.height - SCALE_BAR_RESERVE_PX) };
}

export interface PlanEditorHandle {
  /** Show the whole parcel again. */
  fit(): void;
  /** Garden point at the middle of what is currently visible, inside the parcel. */
  visibleCenterM(): { xM: number; yM: number };
}

export interface PlanEditorProps {
  mode: 'edit' | 'readOnly';
  dimensions: GardenDimensionsRow;
  elements: PlanElementRow[];
  /** False draws a still picture: no input, always fitted. Default true. */
  interactive?: boolean;
  selection?: string | null;
  onSelect?: (id: string | null) => void;
  onUpdateElement?: (id: string, patch: Partial<PlanElementRow>) => void;
  /** True while an element is being moved, resized or rotated. */
  onGestureActive?: (active: boolean) => void;
  /** Edit mode only: the user set a new north direction (degrees, 0 = top, clockwise). */
  onNorthChange?: (deg: number) => void;
  testID?: string;
}

// ── text measuring ────────────────────────────────────────────────────────
// Names are fitted with the real width of the text in the label font. Widths are cached;
// the cache is emptied once the web fonts have loaded, because earlier measurements used the
// fallback font.

const measureCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

const measureLabel: MeasureText = (text, fontPx) => {
  if (measureCtx === undefined) {
    measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) return estimateTextWidth(text, fontPx);
  const key = `${fontPx}|${text}`;
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;
  measureCtx.font = `${P.labelWeight} ${fontPx}px ${tokens.font.display}`;
  const width = measureCtx.measureText(text).width;
  measureCache.set(key, width);
  return width;
};

/** Counts up once the web fonts are ready, so labels are fitted again with the real font. */
function useFontEpoch(): number {
  const [epoch, setEpoch] = React.useState(0);
  React.useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      measureCache.clear();
      setEpoch((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, []);
  return epoch;
}

// ── drawing ───────────────────────────────────────────────────────────────

interface ElementShapeProps {
  el: PlanElementRow;
  scale: number;
  selected: boolean;
  hideLabel: boolean;
  hatchId: string;
  /** Changes when the fonts have loaded; makes memoised shapes fit their names again. */
  fontEpoch: number;
}

const ElementShape = React.memo(function ElementShape({
  el,
  scale,
  selected,
  hideLabel,
  hatchId,
}: ElementShapeProps): React.JSX.Element {
  const w = el.widthM * scale;
  const h = el.heightM * scale;
  const rot = getRotateDeg(el);
  const accent = (el.provenance as Record<string, unknown> | null)?.accentColor;
  const fill =
    typeof accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : elementFill(el.elementType);
  const stroke = selected ? P.select : P.stroke;
  const strokeWidth = selected ? 1.6 : 1;
  const round = ROUND_KINDS.has(el.elementType);
  const hatched = HATCHED_KINDS.has(el.elementType);

  const shape = (paint: { fill: string; fillOpacity?: number; stroke?: string; strokeWidth?: number }) =>
    round ? (
      <ellipse cx={0} cy={0} rx={w / 2} ry={h / 2} {...paint} />
    ) : (
      <rect x={-w / 2} y={-h / 2} width={w} height={h} {...paint} />
    );

  const label = hideLabel
    ? null
    : fitLabel(el.label || el.elementType, w, h, P.labelPx, selected, measureLabel);
  let labelNode: React.ReactNode = null;
  // A selected element whose name does not fit shows it on a tag (see SelectionOverlay).
  if (label && label.fits) {
    // Keep names upright: text that would stand on its head is turned by 180°.
    const angle = (((rot + (label.along ? -90 : 0)) % 360) + 360) % 360;
    const textRot = (label.along ? -90 : 0) + (angle > 90 && angle < 270 ? 180 : 0);
    labelNode = (
      <text
        transform={`rotate(${textRot})`}
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={tokens.font.display}
        fontSize={P.labelPx}
        fontWeight={P.labelWeight}
        fill={P.label}
        stroke={P.labelHalo}
        strokeWidth={3}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        {label.text}
      </text>
    );
  }

  return (
    <g transform={`translate(${el.xM * scale} ${el.yM * scale}) rotate(${rot})`} data-el={el.id}>
      {shape({ fill, fillOpacity: P.fillOpacity })}
      {hatched ? shape({ fill: `url(#${hatchId})` }) : null}
      {shape({ fill: 'none', stroke, strokeWidth })}
      {labelNode}
    </g>
  );
});

function SelectionOverlay({
  el,
  scale,
  hideName,
}: {
  el: PlanElementRow;
  scale: number;
  /** True while the element is being renamed on the plan. */
  hideName: boolean;
}): React.JSX.Element {
  const w = el.widthM * scale;
  const h = el.heightM * scale;
  const half = HANDLE_VISUAL_PX / 2;
  const rot = getRotateDeg(el);
  // The full name of the selected element (D-12): inside it when it fits, otherwise on a
  // tag under it, on its own solid background.
  const label = fitLabel(el.label || el.elementType, w, h, P.labelPx, true, measureLabel);
  let tag: React.ReactNode = null;
  if (label && !label.fits && !hideName) {
    const tagW = measureLabel(label.text, P.labelPx) + 14;
    const tagH = P.labelPx + 9;
    const upsideDown = rot > 90 && rot < 270;
    tag = (
      <g
        transform={`translate(0 ${h / 2 + half + 8 + tagH / 2}) rotate(${upsideDown ? 180 : 0})`}
        data-name-tag=""
      >
        <rect x={-tagW / 2} y={-tagH / 2} width={tagW} height={tagH} fill={C.bg} stroke={P.select} strokeWidth={1} />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={tokens.font.display}
          fontSize={P.labelPx}
          fontWeight={P.labelWeight}
          fill={P.label}
        >
          {label.text}
        </text>
      </g>
    );
  }
  return (
    <g
      transform={`translate(${el.xM * scale} ${el.yM * scale}) rotate(${rot})`}
      data-selection={el.id}
    >
      {tag}
      <line x1={0} y1={-h / 2} x2={0} y2={-h / 2 - ROTATE_OFFSET_PX} stroke={P.select} strokeWidth={1} />
      {handleSpots(w, h).map((spot) =>
        spot.id === 'rot' ? (
          <circle
            key={spot.id}
            data-handle={spot.id}
            cx={spot.x}
            cy={spot.y}
            r={half + 0.5}
            fill={P.handleFill}
            stroke={P.select}
            strokeWidth={1.4}
          />
        ) : (
          <rect
            key={spot.id}
            data-handle={spot.id}
            x={spot.x - half}
            y={spot.y - half}
            width={HANDLE_VISUAL_PX}
            height={HANDLE_VISUAL_PX}
            fill={P.handleFill}
            stroke={P.select}
            strokeWidth={1.4}
          />
        ),
      )}
    </g>
  );
}

function NorthGlyph({ deg }: { deg: number }): React.JSX.Element {
  const rad = (deg * Math.PI) / 180;
  // The letter stays upright and sits beyond the tip of the arrow.
  const nx = 24 + Math.sin(rad) * 17;
  const ny = 24 - Math.cos(rad) * 17;
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block' }}>
      <g transform={`rotate(${deg} 24 24)`}>
        <line x1={24} y1={38} x2={24} y2={24} stroke={C.ink} strokeWidth={1.2} />
        <path d="M24 15 L19.5 26 L24 23.5 Z" fill={C.ink} />
        <path d="M24 15 L28.5 26 L24 23.5 Z" fill="none" stroke={C.ink} strokeWidth={1} strokeLinejoin="round" />
      </g>
      <text
        x={nx}
        y={ny}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={tokens.font.display}
        fontSize={11}
        fontWeight={500}
        fill={C.ink}
      >
        N
      </text>
    </svg>
  );
}

const uiButton: React.CSSProperties = {
  width: 44,
  height: 44,
  background: C.bg,
  border: `1px solid ${C.line}`,
  borderRadius: 0,
  color: C.ink,
  font: `500 18px ${tokens.font.body}`,
  cursor: 'pointer',
  padding: 0,
};

function NorthPanel({
  deg,
  onChange,
  onClose,
}: {
  deg: number;
  onChange: (deg: number) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <div
      role="group"
      aria-label={t('editor.north.title')}
      style={{
        position: 'absolute',
        top: 52,
        right: 0,
        background: C.bg,
        border: `1px solid ${C.line}`,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 3,
      }}
    >
      <div
        style={{
          font: `500 11px ${tokens.font.body}`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.inkMuted,
        }}
      >
        {t('editor.north.title')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          style={uiButton}
          aria-label={t('editor.north.left')}
          data-testid="north-left"
          onClick={() => onChange((deg + 345) % 360)}
        >
          −
        </button>
        <input
          aria-label={t('editor.north.angle')}
          data-testid="north-angle"
          inputMode="numeric"
          value={draft ?? formatDegrees(deg)}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = parseDegrees(e.target.value);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
          style={{
            width: 56,
            height: 44,
            boxSizing: 'border-box',
            textAlign: 'center',
            font: `400 16px ${tokens.font.body}`,
            color: C.ink,
            background: C.bg,
            border: 'none',
            borderBottom: `1px solid ${C.line}`,
            borderRadius: 0,
            outline: 'none',
          }}
        />
        <span style={{ font: `400 16px ${tokens.font.body}`, color: C.inkMuted }}>°</span>
        <button
          type="button"
          style={uiButton}
          aria-label={t('editor.north.right')}
          data-testid="north-right"
          onClick={() => onChange((deg + 15) % 360)}
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{ ...uiButton, width: '100%', font: `500 15px ${tokens.font.body}` }}
      >
        {t('editor.north.close')}
      </button>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────

function pointerType(e: PointerEvent): PointerType {
  return e.pointerType === 'touch' ? 'touch' : e.pointerType === 'pen' ? 'pen' : 'mouse';
}

function isTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
}

export const PlanEditor = React.forwardRef<PlanEditorHandle, PlanEditorProps>(function PlanEditor(
  props,
  ref,
): React.JSX.Element {
  const { mode, dimensions, elements, selection = null, testID } = props;
  const interactive = props.interactive !== false;
  const padding = interactive ? FIT_PADDING_PX : 14;

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [vp, setVpState] = React.useState<Viewport>({ tx: 0, ty: 0, scale: 1 });
  const [rename, setRenameState] = React.useState<{ id: string; value: string } | null>(null);
  const [northOpen, setNorthOpen] = React.useState(false);
  const fontEpoch = useFontEpoch();
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const visible = React.useMemo(
    () => sortByZOrder(elements.filter((e) => e.deletedAt === null)),
    [elements],
  );
  const garden = React.useMemo(
    () => ({ widthM: dimensions.widthM, heightM: dimensions.heightM }),
    [dimensions.widthM, dimensions.heightM],
  );
  const northDeg = getNorthDeg(dimensions.extraDims);

  // Mirrors for the controller, which reads between renders.
  const propsRef = React.useRef(props);
  propsRef.current = props;
  const elementsRef = React.useRef(visible);
  elementsRef.current = visible;
  const selectionRef = React.useRef<string | null>(selection);
  selectionRef.current = selection;
  const gardenRef = React.useRef(garden);
  gardenRef.current = garden;
  const sizeRef = React.useRef(size);
  const vpRef = React.useRef(vp);
  const renameRef = React.useRef(rename);
  /** True until the user pans or zooms; a fitted view follows canvas size changes. */
  const fittedRef = React.useRef(true);

  const setViewport = React.useCallback((next: Viewport, byUser: boolean) => {
    if (byUser) fittedRef.current = false;
    vpRef.current = next;
    setVpState(next);
  }, []);

  const setRename = React.useCallback((next: { id: string; value: string } | null) => {
    renameRef.current = next;
    setRenameState(next);
  }, []);

  const commitRename = React.useCallback(
    (apply: boolean) => {
      const current = renameRef.current;
      if (!current) return;
      setRename(null);
      const value = current.value.trim();
      if (apply && value.length > 0) propsRef.current.onUpdateElement?.(current.id, { label: value });
    },
    [setRename],
  );

  const controller = React.useMemo(() => {
    const port: ControllerPort = {
      mode: () => propsRef.current.mode,
      elements: () => elementsRef.current,
      selection: () => selectionRef.current,
      viewport: () => vpRef.current,
      garden: () => gardenRef.current,
      canvas: () => sizeRef.current,
      fitScale: () => fitScale(gardenRef.current, fitArea(sizeRef.current), FIT_PADDING_PX),
      setSelection: (id) => {
        selectionRef.current = id;
        propsRef.current.onSelect?.(id);
      },
      updateElement: (id, patch) => {
        elementsRef.current = elementsRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e));
        propsRef.current.onUpdateElement?.(id, patch);
      },
      setViewport: (next) => setViewport(next, true),
      setGestureActive: (active) => propsRef.current.onGestureActive?.(active),
      startRename: (id) => {
        const el = elementsRef.current.find((e) => e.id === id);
        if (el) setRename({ id, value: el.label ?? '' });
      },
    };
    return new InteractionController(port);
  }, [setViewport, setRename]);

  React.useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        fittedRef.current = true;
        if (sizeRef.current.width > 0) {
          setViewport(fitViewport(gardenRef.current, fitArea(sizeRef.current), FIT_PADDING_PX), false);
        }
      },
      visibleCenterM: () => {
        const v = vpRef.current;
        const s = sizeRef.current;
        const g = gardenRef.current;
        const xM = (s.width / 2 - v.tx) / v.scale;
        const yM = (s.height / 2 - v.ty) / v.scale;
        return {
          xM: Math.min(g.widthM, Math.max(0, xM)),
          yM: Math.min(g.heightM, Math.max(0, yM)),
        };
      },
    }),
    [setViewport],
  );

  // Canvas size.
  React.useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setSize((prev) =>
        prev.width === r.width && prev.height === r.height ? prev : { width: r.width, height: r.height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Fit on first layout; afterwards a fitted view stays fitted, a user's view is kept.
  React.useEffect(() => {
    sizeRef.current = size;
    if (size.width === 0 || size.height === 0) return;
    if (fittedRef.current || !interactive) {
      setViewport(fitViewport(garden, fitArea(size), padding), false);
    } else {
      setViewport(clampPan(vpRef.current, garden, size), false);
    }
  }, [size, garden, interactive, padding, setViewport]);

  // While renaming, keep the element in view (the on-screen keyboard shrinks the canvas).
  React.useEffect(() => {
    if (!rename || size.height === 0) return;
    const el = elementsRef.current.find((e) => e.id === rename.id);
    if (!el) return;
    const v = vpRef.current;
    const cy = el.yM * v.scale + v.ty;
    const cx = el.xM * v.scale + v.tx;
    const margin = 40;
    if (cy < margin || cy > size.height - margin || cx < margin || cx > size.width - margin) {
      setViewport(
        { scale: v.scale, tx: size.width / 2 - el.xM * v.scale, ty: size.height / 2 - el.yM * v.scale },
        true,
      );
    }
  }, [rename?.id, size.height, size.width, setViewport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer, wheel and key input.
  React.useEffect(() => {
    const node = wrapRef.current;
    if (!node || !interactive) return;
    const down = new Set<number>();

    const isUi = (e: Event): boolean => {
      const target = e.target as Element | null;
      return !!target && typeof target.closest === 'function' && target.closest('[data-plan-ui]') !== null;
    };
    const toSample = (e: PointerEvent, phase: PointerSample['phase']): PointerSample => {
      const r = node.getBoundingClientRect();
      return {
        id: e.pointerId,
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        type: pointerType(e),
        phase,
        ts: e.timeStamp,
        shift: e.shiftKey,
        button: e.button,
      };
    };

    const onDown = (e: PointerEvent) => {
      if (isUi(e)) return;
      // Finish text entry first: a rename in progress, or a properties field with focus.
      commitRename(true);
      const focused = document.activeElement as HTMLElement | null;
      if (focused && isTextField(focused)) focused.blur();
      setNorthOpen(false);
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        // Not capturable (already released); the gesture still works inside the canvas.
      }
      down.add(e.pointerId);
      controller.handle(toSample(e, 'down'));
      if (e.pointerType === 'mouse') e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!down.has(e.pointerId)) return;
      controller.handle(toSample(e, 'move'));
    };
    const onUp = (e: PointerEvent) => {
      if (!down.delete(e.pointerId)) return;
      controller.handle(toSample(e, 'up'));
    };
    const onCancel = (e: PointerEvent) => {
      if (!down.delete(e.pointerId)) return;
      controller.handle(toSample(e, 'cancel'));
    };
    const onWheel = (e: WheelEvent) => {
      if (isUi(e)) return;
      e.preventDefault();
      const r = node.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      controller.wheel(e.clientX - r.left, e.clientY - r.top, e.deltaY * unit, e.ctrlKey);
    };
    const onContextMenu = (e: Event) => {
      if (!isUi(e)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTextField(e.target)) controller.setSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') controller.setSpaceHeld(false);
    };
    const onWindowBlur = () => controller.setSpaceHeld(false);

    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onCancel);
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [controller, interactive, commitRename]);

  if (Platform.OS !== 'web') {
    // The app ships as a web app only (D-01); there is no native plan renderer.
    return <View testID={testID} />;
  }

  const s = vp.scale;
  const ready = size.width > 0 && size.height > 0;
  const selectedEl = mode === 'edit' && selection ? visible.find((e) => e.id === selection) : undefined;
  const renameEl = rename ? visible.find((e) => e.id === rename.id) : undefined;
  const bar = scaleBar(s);
  const hatchId = `hatch${uid}`;
  const gridId = `grid${uid}`;

  return (
    <div
      ref={wrapRef}
      data-testid={testID}
      data-plan-mode={mode}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: P.bg,
        touchAction: interactive ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Long-press on Android must not open the text callout over the plan.
        ...({ WebkitTouchCallout: 'none' } as React.CSSProperties),
      }}
    >
      {ready ? (
        <svg
          width={size.width}
          height={size.height}
          role="img"
          aria-label={t('plan.view.ariaPlan', { count: visible.length })}
          style={{ display: 'block', pointerEvents: 'none' }}
        >
          <defs>
            <pattern id={hatchId} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={7} stroke={P.hatchInk} strokeWidth={1} />
            </pattern>
            <pattern id={gridId} width={s} height={s} patternUnits="userSpaceOnUse">
              <path d={`M ${s} 0 L 0 0 0 ${s}`} fill="none" stroke={P.grid} strokeWidth={1} />
            </pattern>
          </defs>
          <g transform={`translate(${vp.tx} ${vp.ty})`}>
            <rect x={0} y={0} width={garden.widthM * s} height={garden.heightM * s} fill={P.bg} />
            <rect x={0} y={0} width={garden.widthM * s} height={garden.heightM * s} fill={`url(#${gridId})`} />
            {visible.map((el) => (
              <ElementShape
                key={el.id}
                el={el}
                scale={s}
                selected={selectedEl?.id === el.id}
                hideLabel={rename?.id === el.id}
                hatchId={hatchId}
                fontEpoch={fontEpoch}
              />
            ))}
            <rect
              x={0}
              y={0}
              width={garden.widthM * s}
              height={garden.heightM * s}
              fill="none"
              stroke={P.border}
              strokeWidth={P.borderWidth}
            />
            {selectedEl ? (
              <SelectionOverlay el={selectedEl} scale={s} hideName={rename?.id === selectedEl.id} />
            ) : null}
          </g>
          <g transform={`translate(14 ${size.height - 14})`} aria-label={t('plan.view.ariaScale', { label: bar.label })}>
            <rect x={-6} y={-24} width={bar.widthPx + 12} height={30} fill={P.bg} fillOpacity={0.85} />
            <path d={`M0 -6 V0 H${bar.widthPx} V-6`} fill="none" stroke={C.ink} strokeWidth={1.2} />
            <text
              x={bar.widthPx / 2}
              y={-9}
              textAnchor="middle"
              fontFamily={tokens.font.body}
              fontSize={12}
              fill={C.ink}
            >
              {bar.label}
            </text>
          </g>
        </svg>
      ) : null}

      {/* North arrow: a button in the editor (D-11), a mark elsewhere. */}
      <div data-plan-ui={interactive ? '' : undefined} style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}>
        {mode === 'edit' && interactive ? (
          <button
            type="button"
            data-testid="north-button"
            aria-label={t('editor.north.open')}
            aria-expanded={northOpen}
            onClick={() => setNorthOpen((open) => !open)}
            style={{ width: 48, height: 48, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <NorthGlyph deg={northDeg} />
          </button>
        ) : (
          <div role="img" aria-label={t('plan.view.north')} style={{ pointerEvents: 'none' }}>
            <NorthGlyph deg={northDeg} />
          </div>
        )}
        {northOpen && mode === 'edit' ? (
          <NorthPanel
            deg={northDeg}
            onChange={(deg) => props.onNorthChange?.(deg)}
            onClose={() => setNorthOpen(false)}
          />
        ) : null}
      </div>

      {/* Renaming on the plan (EDIT3-05). */}
      {rename && renameEl ? (
        <input
          data-plan-ui=""
          data-testid="plan-rename-input"
          aria-label={t('editor.rename.label')}
          autoFocus
          maxLength={RENAME_MAX_LENGTH}
          value={rename.value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setRename({ id: rename.id, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitRename(true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              commitRename(false);
            }
          }}
          onBlur={() => commitRename(true)}
          style={{
            position: 'absolute',
            left: renameEl.xM * s + vp.tx,
            top: renameEl.yM * s + vp.ty,
            transform: 'translate(-50%, -50%)',
            width: Math.min(260, Math.max(150, renameEl.widthM * s)),
            boxSizing: 'border-box',
            padding: '7px 8px',
            textAlign: 'center',
            font: `500 16px ${tokens.font.display}`,
            color: C.ink,
            background: C.bg,
            border: `1.5px solid ${C.select}`,
            borderRadius: 0,
            outline: 'none',
            zIndex: 2,
          }}
        />
      ) : null}
    </div>
  );
});
