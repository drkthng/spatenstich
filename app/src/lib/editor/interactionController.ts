// The plan editor's gesture logic, free of any DOM so it can be tested without a browser
// (PROJECT D-03, EDIT3-19). The web adapter in `PlanEditor.tsx` turns pointer and wheel events
// into `PointerSample`s; this controller decides what they mean and tells the host what to
// change through `ControllerPort`.
//
// Rules from Phase 30 (30-CONTEXT.md):
//   D-01  Touch is select-first: a tap selects; a one-finger drag moves an element only when
//         it starts on an already selected element or one of its handles; any other
//         one-finger drag pans. A tap on empty plan deselects.
//   D-02  Mouse: pressing on an element selects it and moves it in the same drag.
//   D-03  Mouse pan: drag on empty plan; middle button or Space+drag anywhere.
//   D-04  Rotation handle: 15° steps; Shift turns freely with the mouse.
//   D-05  Move and resize land on a 5 cm step.
//   D-06  An element's centre stays inside the parcel.
//   EDIT3-05  A double tap or double click on an element starts renaming it.
//   EDIT3-07  Two fingers zoom and pan; the wheel zooms around the cursor.
//
// Added in Phase 31:
//   EDIT3-10  Several elements can be selected and moved together. Mouse: Shift+click adds or
//             removes one, Shift+drag on empty plan draws a selection frame. Touch: with the
//             "Mehrere" switch on, a tap adds or removes an element.
//   EDIT3-09  Placing with a preview. Mouse: the preview follows the cursor and a click sets
//             the element. Touch: a tap moves the preview, it can be dragged, and a button in
//             the host sets it. Panning and zooming keep working while placing.
//
// Added in Phase 32:
//   EDIT3-13  While moving and resizing, edges and centres catch on neighbours, the parcel
//             boundary, equal gaps and the grid; the host draws the guides. Can be off.
//   EDIT3-14  Free outlines: while a shape's corners are being edited, a corner can be
//             dragged, a marker in the middle of an edge adds a corner, and a double tap on
//             a corner removes it. While a new outline is drawn, each tap adds a corner.

import type { PlanElementRow } from '@spatenstich/shared';
import { findElementAtPoint } from './hitTest';
import {
  boxBounds,
  boxTouchesRect,
  clampCenter,
  clampGroupDelta,
  moveBox,
  pointInBox,
  resizeBox,
  rotationFromPointer,
  toBox,
  worldToLocal,
  MIN_SIZE_M,
  type Box,
  type GardenSize,
  type HandleId,
  type ResizeHandleId,
} from './elementGeometry';
import { plantsOfBed } from './bedBinding';
import {
  edgeMidpoints,
  insertCorner,
  moveCorner,
  removeCorner,
  snapPoint,
  type WorldPoint,
} from './outline';
import { snapMove, snapResize, unionBounds, type Bounds, type Guides } from './snapping';
import { hitHandle, MOUSE_HIT, TOUCH_HIT } from './handles';
import { snapRotation } from './rotationSnap';
import {
  clampPan,
  panBy,
  pinchViewport,
  zoomAt,
  type CanvasSize,
  type Viewport,
} from './viewport';

export type PointerType = 'mouse' | 'touch' | 'pen';

export interface PointerSample {
  /** Stable id of the pointer for the duration of the contact. */
  id: number;
  /** Position in canvas pixels. */
  x: number;
  y: number;
  type: PointerType;
  phase: 'down' | 'move' | 'up' | 'cancel';
  /** Milliseconds; only differences matter. */
  ts: number;
  shift?: boolean;
  /** Mouse button on `down`: 0 main, 1 middle, 2 secondary. */
  button?: number;
}

/** Size of the element that is about to be placed. */
export interface PlacingSpec {
  widthM: number;
  heightM: number;
}

/** Selection frame in canvas pixels. */
export interface MarqueeRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** What the controller needs from, and does to, its host. */
export interface ControllerPort {
  mode(): 'edit' | 'readOnly';
  elements(): PlanElementRow[];
  selectedIds(): string[];
  /** Touch "Mehrere" switch: a tap adds or removes an element instead of replacing. */
  multiSelect(): boolean;
  viewport(): Viewport;
  garden(): GardenSize;
  canvas(): CanvasSize;
  /** Pixels per metre at which the whole parcel fits the canvas. */
  fitScale(): number;
  setSelectedIds(ids: string[]): void;
  updateElement(id: string, patch: Partial<PlanElementRow>): void;
  setViewport(vp: Viewport): void;
  /** True while elements are being moved, resized or rotated (one undo step, saved at the end). */
  setGestureActive(active: boolean): void;
  startRename(id: string): void;
  /** Non-null while a new element is being placed. */
  placing(): PlacingSpec | null;
  /** Centre of the placement preview, if it is shown. */
  ghost(): { xM: number; yM: number } | null;
  setGhost(pos: { xM: number; yM: number }): void;
  /** Mouse click while placing: set the element here. */
  commitPlacement(pos: { xM: number; yM: number }): void;
  setMarquee(rect: MarqueeRect | null): void;
  /** Snapping to neighbours, boundary and grid is switched on. */
  snapEnabled(): boolean;
  setGuides(guides: Guides | null): void;
  /** Corner points (garden metres) of the shape whose outline is being edited, or null. */
  outlinePoints(): WorldPoint[] | null;
  /** New corner points; `done` is true when the change is complete (end of a drag, a tap). */
  setOutlinePoints(points: WorldPoint[], done: boolean): void;
  /** True while a new free outline is being drawn: a tap adds a corner. */
  drawing(): boolean;
  addDrawPoint(point: WorldPoint): void;
}

/** How close (in screen pixels) an edge must come to catch. */
export const SNAP_DISTANCE_PX = 8;
/** Grid lines that edges catch on, in metres (the drawn grid). */
export const SNAP_GRID_M = 1;
/** Reach of a corner or edge marker while editing an outline. */
export const CORNER_HIT_PX = { mouse: 10, touch: 22 } as const;

/** Movement below this is a tap or click, not a drag. */
export const DRAG_THRESHOLD_PX = { mouse: 5, touch: 8, handle: 4 } as const;
export const DOUBLE_TAP = {
  touch: { ms: 350, px: 24 },
  mouse: { ms: 400, px: 6 },
} as const;

type Intent = 'move' | 'resize' | 'rotate' | 'pan' | 'marquee' | 'ghost' | 'corner' | 'none';

interface SingleGesture {
  pointerId: number;
  type: PointerType;
  startX: number;
  startY: number;
  intent: Intent;
  handle: ResizeHandleId | null;
  /** Element under the pointer at `down`; null on empty plan. */
  targetId: string | null;
  /** Elements being changed, as they were at `down`. */
  starts: { el: PlanElementRow; box: Box }[];
  /** Box whose edges land on the step while moving (the element under the pointer). */
  primary: Box | null;
  /** Centre of the placement preview at `down` (intent 'ghost'). */
  ghostStart: { xM: number; yM: number } | null;
  startVp: Viewport;
  dragging: boolean;
  /** False for presses that must not select or deselect (middle button, Space). */
  tapCounts: boolean;
  /** A tap adds or removes `targetId` instead of selecting it alone. */
  toggle: boolean;
  /** A tap places (mouse) or moves the preview (touch) instead of selecting. */
  placeOnTap: boolean;
  /** Bounds of everything that is not being moved, for snapping; filled on first use. */
  otherBounds: Bounds[] | null;
  /** Outline editing: the corner being dragged and the corner points at `down`. */
  cornerIndex: number;
  cornerPoints: WorldPoint[] | null;
  /** Outline editing: the corner was just added by pressing an edge marker. */
  cornerAdded: boolean;
  /** A tap adds a corner to the outline that is being drawn. */
  drawOnTap: boolean;
}

interface PinchGesture {
  ids: [number, number];
  startVp: Viewport;
  startMid: { x: number; y: number };
  startDist: number;
}

function isMouseLike(type: PointerType): boolean {
  return type === 'mouse' || type === 'pen';
}

export class InteractionController {
  private readonly pointers = new Map<number, { x: number; y: number; type: PointerType }>();
  private single: SingleGesture | null = null;
  private pinch: PinchGesture | null = null;
  /** Pointers left over from a pinch; ignored until they lift. */
  private readonly ignored = new Set<number>();
  private lastTap: { targetId: string; ts: number; x: number; y: number } | null = null;
  private spaceHeld = false;

  constructor(private readonly port: ControllerPort) {}

  /** Space bar state from the host's key handling (D-03). */
  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
  }

  /** True while any gesture is in progress. */
  isBusy(): boolean {
    return this.single !== null || this.pinch !== null;
  }

  handle(sample: PointerSample): void {
    switch (sample.phase) {
      case 'down':
        this.onDown(sample);
        break;
      case 'move':
        this.onMove(sample);
        break;
      case 'up':
      case 'cancel':
        this.onEnd(sample);
        break;
    }
  }

  /** Mouse moved without a button down: the placement preview follows the cursor. */
  hover(x: number, y: number): void {
    if (this.single || this.pinch) return;
    const placing = this.port.placing();
    if (!placing || this.port.mode() !== 'edit') return;
    this.port.setGhost(this.placementAt(placing, x, y, this.port.viewport()));
  }

  /** Wheel zoom around the cursor; `ctrl` marks a trackpad pinch (finer steps). */
  wheel(x: number, y: number, deltaY: number, ctrl = false): void {
    if (this.pinch) return;
    const factor = Math.exp(-deltaY * (ctrl ? 0.01 : 0.0015));
    const next = zoomAt(this.port.viewport(), factor, { x, y }, this.port.fitScale());
    this.port.setViewport(clampPan(next, this.port.garden(), this.port.canvas()));
  }

  // ── down ────────────────────────────────────────────────────────────────

  private onDown(sample: PointerSample): void {
    this.pointers.set(sample.id, { x: sample.x, y: sample.y, type: sample.type });

    if (sample.type === 'touch') {
      const touches = [...this.pointers.entries()].filter(([, p]) => p.type === 'touch');
      if (touches.length === 2 && !this.pinch) {
        this.beginPinch(touches[0][0], touches[1][0]);
        return;
      }
      if (touches.length > 2) {
        this.ignored.add(sample.id);
        return;
      }
    }
    if (this.single || this.pinch) {
      // A second mouse button or an unrelated pointer during a gesture.
      this.ignored.add(sample.id);
      return;
    }
    this.single = this.beginSingle(sample);
  }

  private beginSingle(sample: PointerSample): SingleGesture {
    const vp = this.port.viewport();
    const base: SingleGesture = {
      pointerId: sample.id,
      type: sample.type,
      startX: sample.x,
      startY: sample.y,
      intent: 'pan',
      handle: null,
      targetId: null,
      starts: [],
      primary: null,
      ghostStart: null,
      startVp: vp,
      dragging: false,
      tapCounts: true,
      toggle: false,
      placeOnTap: false,
      otherBounds: null,
      cornerIndex: -1,
      cornerPoints: null,
      cornerAdded: false,
      drawOnTap: false,
    };
    const mouse = isMouseLike(sample.type);
    const panOverride = mouse && (sample.button === 1 || this.spaceHeld);

    if (mouse && sample.button === 2) {
      return { ...base, intent: 'none', tapCounts: false };
    }
    if (this.port.mode() !== 'edit') {
      return { ...base, tapCounts: false };
    }
    if (panOverride) {
      return { ...base, tapCounts: false };
    }

    const xM = (sample.x - vp.tx) / vp.scale;
    const yM = (sample.y - vp.ty) / vp.scale;

    // Drawing a new outline: every tap adds a corner; a drag pans.
    if (this.port.drawing()) {
      return { ...base, intent: 'pan', drawOnTap: true };
    }

    // Editing an outline: corners can be dragged, edge markers add a corner; the rest pans.
    const corners = this.port.outlinePoints();
    if (corners) {
      const reach = sample.type === 'mouse' ? CORNER_HIT_PX.mouse : CORNER_HIT_PX.touch;
      const near = (p: WorldPoint) =>
        Math.hypot(p.x * vp.scale + vp.tx - sample.x, p.y * vp.scale + vp.ty - sample.y) <= reach;
      const cornerIndex = corners.findIndex(near);
      if (cornerIndex >= 0) {
        return { ...base, intent: 'corner', cornerIndex, cornerPoints: corners };
      }
      const edgeIndex = edgeMidpoints(corners).findIndex(near);
      if (edgeIndex >= 0) {
        const added = insertCorner(corners, edgeIndex);
        return {
          ...base,
          intent: 'corner',
          cornerIndex: added.index,
          cornerPoints: added.points,
          cornerAdded: true,
        };
      }
      return { ...base, intent: 'pan', tapCounts: false };
    }

    // Placing a new element: a tap sets it (mouse) or moves the preview (touch); the preview
    // can be dragged by touch; everything else pans.
    const placing = this.port.placing();
    if (placing) {
      const ghost = this.port.ghost();
      if (
        !mouse &&
        ghost &&
        pointInBox({ ...ghost, widthM: placing.widthM, heightM: placing.heightM, rotateDeg: 0 }, xM, yM)
      ) {
        return { ...base, intent: 'ghost', ghostStart: ghost, placeOnTap: true };
      }
      return { ...base, intent: 'pan', placeOnTap: true };
    }

    const elements = this.port.elements();
    const ids = this.port.selectedIds();
    const selected = elements.filter((e) => e.deletedAt === null && ids.includes(e.id));
    const hit = findElementAtPoint(elements, xM, yM);

    // 1. Handles of a single selected element come first, but they only claim drags. Their
    //    touch areas reach well outside the element, so a plain tap there still selects
    //    whatever lies under the finger (or deselects on empty plan).
    if (selected.length === 1) {
      const handle = this.handleAt(selected[0], sample, vp);
      if (handle) {
        return {
          ...base,
          intent: handle === 'rot' ? 'rotate' : 'resize',
          handle: handle === 'rot' ? null : handle,
          targetId: hit?.id ?? null,
          starts: [{ el: selected[0], box: toBox(selected[0]) }],
          toggle: !mouse && this.port.multiSelect(),
        };
      }
    }

    // 2. The topmost element under the pointer.
    if (mouse) {
      if (hit) {
        if (sample.shift) {
          // Shift+click adds or removes; it never moves.
          return { ...base, intent: 'none', targetId: hit.id, toggle: true };
        }
        // D-02: select and move in one drag. A press on one of several selected elements
        // keeps the group so the drag moves all of them.
        const inSelection = ids.includes(hit.id);
        if (!inSelection) this.port.setSelectedIds([hit.id]);
        const moving = inSelection ? selected : [hit];
        return {
          ...base,
          intent: 'move',
          targetId: hit.id,
          starts: moving.map((el) => ({ el, box: toBox(el) })),
          primary: toBox(hit),
        };
      }
      // Shift+drag on empty plan draws the selection frame.
      return sample.shift ? { ...base, intent: 'marquee', tapCounts: false } : { ...base, intent: 'pan' };
    }

    // D-01: touch moves only what is already selected.
    const multi = this.port.multiSelect();
    if (hit && ids.includes(hit.id)) {
      return {
        ...base,
        intent: 'move',
        targetId: hit.id,
        starts: selected.map((el) => ({ el, box: toBox(el) })),
        primary: toBox(hit),
        toggle: multi,
      };
    }
    return { ...base, intent: 'pan', targetId: hit?.id ?? null, toggle: multi };
  }

  private handleAt(el: PlanElementRow, sample: PointerSample, vp: Viewport): HandleId | null {
    const box = toBox(el);
    const screenBox: Box = {
      xM: box.xM * vp.scale + vp.tx,
      yM: box.yM * vp.scale + vp.ty,
      widthM: box.widthM * vp.scale,
      heightM: box.heightM * vp.scale,
      rotateDeg: box.rotateDeg,
    };
    const local = worldToLocal(screenBox, sample.x, sample.y);
    const profile = sample.type === 'mouse' ? MOUSE_HIT : TOUCH_HIT;
    return hitHandle(local.x, local.y, screenBox.widthM, screenBox.heightM, profile);
  }

  /**
   * Bounds of the elements that stay put during this gesture: everything except what is
   * being changed and the plants that travel with a moving bed. Computed once per gesture.
   */
  private othersFor(g: SingleGesture): Bounds[] {
    if (g.otherBounds) return g.otherBounds;
    const elements = this.port.elements();
    const moving = new Set(g.starts.map((s) => s.el.id));
    for (const s of g.starts) {
      if (s.el.elementType === 'Beet') {
        for (const plant of plantsOfBed(s.el, elements)) moving.add(plant.id);
      }
    }
    g.otherBounds = elements
      .filter((e) => e.deletedAt === null && !moving.has(e.id))
      .map((e) => boxBounds(toBox(e)));
    return g.otherBounds;
  }

  /** Centre for a new element at a canvas point: edges on the step, centre in the parcel. */
  private placementAt(
    placing: PlacingSpec,
    x: number,
    y: number,
    vp: Viewport,
  ): { xM: number; yM: number } {
    return moveBox(
      { xM: 0, yM: 0, widthM: placing.widthM, heightM: placing.heightM, rotateDeg: 0 },
      (x - vp.tx) / vp.scale,
      (y - vp.ty) / vp.scale,
      this.port.garden(),
    );
  }

  private beginPinch(a: number, b: number): void {
    // A second finger turns whatever the first was doing into a pinch.
    if (this.single) {
      this.abortSingle();
    }
    const pa = this.pointers.get(a)!;
    const pb = this.pointers.get(b)!;
    this.pinch = {
      ids: [a, b],
      startVp: this.port.viewport(),
      startMid: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      startDist: Math.hypot(pa.x - pb.x, pa.y - pb.y),
    };
    this.lastTap = null;
  }

  // ── move ────────────────────────────────────────────────────────────────

  private onMove(sample: PointerSample): void {
    const known = this.pointers.get(sample.id);
    if (!known) return;
    known.x = sample.x;
    known.y = sample.y;

    if (this.pinch) {
      if (!this.pinch.ids.includes(sample.id)) return;
      const pa = this.pointers.get(this.pinch.ids[0]);
      const pb = this.pointers.get(this.pinch.ids[1]);
      if (!pa || !pb) return;
      const next = pinchViewport(
        this.pinch.startVp,
        this.pinch.startMid,
        this.pinch.startDist,
        { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
        Math.hypot(pa.x - pb.x, pa.y - pb.y),
        this.port.fitScale(),
      );
      this.port.setViewport(clampPan(next, this.port.garden(), this.port.canvas()));
      return;
    }

    const g = this.single;
    if (!g || g.pointerId !== sample.id || g.intent === 'none') return;

    const dx = sample.x - g.startX;
    const dy = sample.y - g.startY;
    if (!g.dragging) {
      const onHandle = g.intent === 'resize' || g.intent === 'rotate';
      const threshold = onHandle
        ? DRAG_THRESHOLD_PX.handle
        : isMouseLike(g.type)
          ? DRAG_THRESHOLD_PX.mouse
          : DRAG_THRESHOLD_PX.touch;
      if (Math.hypot(dx, dy) < threshold) return;
      g.dragging = true;
      this.lastTap = null;
      if (g.intent === 'move' || onHandle || g.intent === 'corner') this.port.setGestureActive(true);
    }

    const scale = g.startVp.scale;
    const garden = this.port.garden();
    switch (g.intent) {
      case 'pan': {
        const next = panBy(g.startVp, dx, dy);
        this.port.setViewport(clampPan(next, garden, this.port.canvas()));
        break;
      }
      case 'move': {
        if (!g.primary || g.starts.length === 0) break;
        // The element under the pointer lands on the step; the others keep their offset.
        const pos = moveBox(g.primary, dx / scale, dy / scale, garden);
        let stepX = pos.xM - g.primary.xM;
        let stepY = pos.yM - g.primary.yM;
        if (this.port.snapEnabled()) {
          const start = unionBounds(g.starts.map((s) => boxBounds(s.box)));
          const snap = snapMove(
            { minX: start.minX + stepX, maxX: start.maxX + stepX, minY: start.minY + stepY, maxY: start.maxY + stepY },
            this.othersFor(g),
            { toleranceM: SNAP_DISTANCE_PX / scale, gridM: SNAP_GRID_M, garden },
          );
          stepX += snap.dxM;
          stepY += snap.dyM;
          this.port.setGuides(snap.guides);
        }
        const delta = clampGroupDelta(
          g.starts.map((s) => s.box),
          stepX,
          stepY,
          garden,
        );
        for (const s of g.starts) {
          this.port.updateElement(s.el.id, { xM: s.box.xM + delta.dxM, yM: s.box.yM + delta.dyM });
        }
        break;
      }
      case 'resize': {
        const start = g.starts[0];
        if (!start || !g.handle) break;
        let box = resizeBox(start.box, g.handle, dx / scale, dy / scale);
        if (this.port.snapEnabled()) {
          const snap = snapResize(
            start.box,
            box,
            this.othersFor(g),
            { toleranceM: SNAP_DISTANCE_PX / scale, gridM: SNAP_GRID_M, garden },
            MIN_SIZE_M,
          );
          box = snap.box;
          this.port.setGuides(snap.guides);
        }
        // D-06: a resize that would push the centre out of the parcel is not applied.
        const clamped = clampCenter(box.xM, box.yM, garden);
        if (clamped.xM !== box.xM || clamped.yM !== box.yM) break;
        this.port.updateElement(start.el.id, {
          xM: box.xM,
          yM: box.yM,
          widthM: box.widthM,
          heightM: box.heightM,
        });
        break;
      }
      case 'rotate': {
        const start = g.starts[0];
        if (!start) break;
        const vp = g.startVp;
        const raw = rotationFromPointer(
          start.box,
          (sample.x - vp.tx) / vp.scale,
          (sample.y - vp.ty) / vp.scale,
        );
        // D-04: hard 15° steps; Shift turns freely with the mouse, to whole degrees.
        const free = isMouseLike(g.type) && sample.shift === true;
        const deg = free ? Math.round(raw) % 360 : snapRotation(raw, false);
        const current = this.port.elements().find((e) => e.id === start.el.id) ?? start.el;
        this.port.updateElement(start.el.id, {
          provenance: { ...(current.provenance ?? {}), rotateDeg: deg },
        });
        break;
      }
      case 'marquee': {
        const vp = g.startVp;
        this.port.setMarquee({ x0: g.startX, y0: g.startY, x1: sample.x, y1: sample.y });
        const rect = {
          minX: (Math.min(g.startX, sample.x) - vp.tx) / vp.scale,
          maxX: (Math.max(g.startX, sample.x) - vp.tx) / vp.scale,
          minY: (Math.min(g.startY, sample.y) - vp.ty) / vp.scale,
          maxY: (Math.max(g.startY, sample.y) - vp.ty) / vp.scale,
        };
        const ids = this.port
          .elements()
          .filter((e) => e.deletedAt === null && boxTouchesRect(toBox(e), rect))
          .map((e) => e.id);
        this.port.setSelectedIds(ids);
        break;
      }
      case 'corner': {
        if (!g.cornerPoints) break;
        const vp = g.startVp;
        const raw = snapPoint({ x: (sample.x - vp.tx) / vp.scale, y: (sample.y - vp.ty) / vp.scale });
        const inside = clampCenter(raw.x, raw.y, garden);
        this.port.setOutlinePoints(
          moveCorner(g.cornerPoints, g.cornerIndex, { x: inside.xM, y: inside.yM }),
          false,
        );
        break;
      }
      case 'ghost': {
        const placing = this.port.placing();
        if (!placing || !g.ghostStart) break;
        this.port.setGhost(
          moveBox(
            { ...g.ghostStart, widthM: placing.widthM, heightM: placing.heightM, rotateDeg: 0 },
            dx / scale,
            dy / scale,
            garden,
          ),
        );
        break;
      }
    }
  }

  // ── up / cancel ─────────────────────────────────────────────────────────

  private onEnd(sample: PointerSample): void {
    this.pointers.delete(sample.id);

    if (this.ignored.delete(sample.id)) return;

    if (this.pinch) {
      if (this.pinch.ids.includes(sample.id)) {
        const other = this.pinch.ids.find((id) => id !== sample.id)!;
        // The finger that stays down must not start dragging something.
        if (this.pointers.has(other)) this.ignored.add(other);
        this.pinch = null;
      }
      return;
    }

    const g = this.single;
    if (!g || g.pointerId !== sample.id) return;

    if (sample.phase === 'cancel') {
      this.abortSingle();
      return;
    }

    this.single = null;
    if (g.dragging) {
      if (g.intent === 'move' || g.intent === 'resize' || g.intent === 'rotate') {
        this.port.setGuides(null);
        this.port.setGestureActive(false);
      } else if (g.intent === 'corner') {
        const points = this.port.outlinePoints();
        if (points) this.port.setOutlinePoints(points, true);
        this.port.setGestureActive(false);
      } else if (g.intent === 'marquee') {
        this.port.setMarquee(null);
      }
      return;
    }
    this.onTap(g, sample);
  }

  private onTap(g: SingleGesture, sample: PointerSample): void {
    if (!g.tapCounts || this.port.mode() !== 'edit') return;

    if (g.drawOnTap) {
      const vp = g.startVp;
      const raw = snapPoint({ x: (sample.x - vp.tx) / vp.scale, y: (sample.y - vp.ty) / vp.scale });
      const inside = clampCenter(raw.x, raw.y, this.port.garden());
      this.port.addDrawPoint({ x: inside.xM, y: inside.yM });
      return;
    }

    if (g.intent === 'corner' && g.cornerPoints) {
      if (g.cornerAdded) {
        // A tap on an edge marker adds the corner there.
        this.port.setOutlinePoints(g.cornerPoints, true);
        this.lastTap = null;
        return;
      }
      // A double tap on a corner removes it.
      const key = `corner:${g.cornerIndex}`;
      const limits = isMouseLike(g.type) ? DOUBLE_TAP.mouse : DOUBLE_TAP.touch;
      const prev = this.lastTap;
      if (
        prev &&
        prev.targetId === key &&
        sample.ts - prev.ts <= limits.ms &&
        Math.hypot(sample.x - prev.x, sample.y - prev.y) <= limits.px
      ) {
        this.lastTap = null;
        this.port.setOutlinePoints(removeCorner(g.cornerPoints, g.cornerIndex), true);
        return;
      }
      this.lastTap = { targetId: key, ts: sample.ts, x: sample.x, y: sample.y };
      return;
    }

    if (g.placeOnTap) {
      const placing = this.port.placing();
      if (!placing) return;
      const pos = this.placementAt(placing, sample.x, sample.y, g.startVp);
      if (isMouseLike(g.type)) this.port.commitPlacement(pos);
      else this.port.setGhost(pos);
      return;
    }

    const ids = this.port.selectedIds();

    if (g.targetId === null) {
      // Tap or click on empty plan deselects.
      if (ids.length > 0) this.port.setSelectedIds([]);
      this.lastTap = null;
      return;
    }

    if (g.toggle) {
      const targetId = g.targetId;
      this.port.setSelectedIds(
        ids.includes(targetId) ? ids.filter((id) => id !== targetId) : [...ids, targetId],
      );
      this.lastTap = null;
      return;
    }

    if (ids.length !== 1 || ids[0] !== g.targetId) this.port.setSelectedIds([g.targetId]);

    const limits = isMouseLike(g.type) ? DOUBLE_TAP.mouse : DOUBLE_TAP.touch;
    const prev = this.lastTap;
    if (
      prev &&
      prev.targetId === g.targetId &&
      sample.ts - prev.ts <= limits.ms &&
      Math.hypot(sample.x - prev.x, sample.y - prev.y) <= limits.px
    ) {
      this.lastTap = null;
      this.port.startRename(g.targetId);
      return;
    }
    this.lastTap = { targetId: g.targetId, ts: sample.ts, x: sample.x, y: sample.y };
  }

  /** Stop the single-pointer gesture and put half-changed elements back as they were. */
  private abortSingle(): void {
    const g = this.single;
    this.single = null;
    if (!g || !g.dragging) return;
    if (g.intent === 'move' || g.intent === 'resize' || g.intent === 'rotate') {
      for (const s of g.starts) {
        this.port.updateElement(s.el.id, {
          xM: s.el.xM,
          yM: s.el.yM,
          widthM: s.el.widthM,
          heightM: s.el.heightM,
          provenance: s.el.provenance,
        });
      }
      this.port.setGuides(null);
      this.port.setGestureActive(false);
    } else if (g.intent === 'corner') {
      const before = g.cornerAdded && g.cornerPoints ? removeCorner(g.cornerPoints, g.cornerIndex) : g.cornerPoints;
      if (before) this.port.setOutlinePoints(before, true);
      this.port.setGestureActive(false);
    } else if (g.intent === 'marquee') {
      this.port.setMarquee(null);
    }
    // A pan is left where it is: snapping the view back when a second finger lands would jump.
  }
}
