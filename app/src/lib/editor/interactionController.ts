// Phase 30: the plan editor's gesture logic, free of any DOM so it can be tested without a
// browser (PROJECT D-03, EDIT3-19). The web adapter in `PlanEditor.tsx` turns pointer and
// wheel events into `PointerSample`s; this controller decides what they mean and tells the
// host what to change through `ControllerPort`.
//
// Rules implemented here (30-CONTEXT.md):
//   D-01  Touch is select-first: a tap selects; a one-finger drag moves an element only when
//         it starts on the already selected element or one of its handles; any other
//         one-finger drag pans. A tap on empty plan deselects.
//   D-02  Mouse: pressing on an element selects it and moves it in the same drag.
//   D-03  Mouse pan: drag on empty plan; middle button or Space+drag anywhere. Shift+drag on
//         empty plan is reserved for the Phase 31 selection frame and does nothing here.
//   D-04  Rotation handle: 15° steps; Shift turns freely with the mouse.
//   D-05  Move and resize land on a 5 cm step.
//   D-06  An element's centre stays inside the parcel.
//   D-12/EDIT3-05  A double tap or double click on an element starts renaming it.
//   EDIT3-07  Two fingers zoom and pan; the wheel zooms around the cursor.

import type { PlanElementRow } from '@spatenstich/shared';
import { findElementAtPoint } from './hitTest';
import {
  clampCenter,
  moveBox,
  resizeBox,
  rotationFromPointer,
  toBox,
  worldToLocal,
  type Box,
  type GardenSize,
  type HandleId,
  type ResizeHandleId,
} from './elementGeometry';
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

/** What the controller needs from, and does to, its host. */
export interface ControllerPort {
  mode(): 'edit' | 'readOnly';
  elements(): PlanElementRow[];
  selection(): string | null;
  viewport(): Viewport;
  garden(): GardenSize;
  canvas(): CanvasSize;
  /** Pixels per metre at which the whole parcel fits the canvas. */
  fitScale(): number;
  setSelection(id: string | null): void;
  updateElement(id: string, patch: Partial<PlanElementRow>): void;
  setViewport(vp: Viewport): void;
  /** True while an element is being moved, resized or rotated (pauses autosave). */
  setGestureActive(active: boolean): void;
  startRename(id: string): void;
}

/** Movement below this is a tap or click, not a drag. */
export const DRAG_THRESHOLD_PX = { mouse: 5, touch: 8, handle: 4 } as const;
export const DOUBLE_TAP = {
  touch: { ms: 350, px: 24 },
  mouse: { ms: 400, px: 6 },
} as const;

type Intent = 'move' | 'resize' | 'rotate' | 'pan' | 'none';

interface SingleGesture {
  pointerId: number;
  type: PointerType;
  startX: number;
  startY: number;
  intent: Intent;
  handle: ResizeHandleId | null;
  /** Element under the pointer at `down`; null on empty plan. */
  targetId: string | null;
  /** Element being changed, as it was at `down`. */
  startEl: PlanElementRow | null;
  startBox: Box | null;
  startVp: Viewport;
  dragging: boolean;
  /** False for presses that must not select or deselect (middle button, Space, Shift). */
  tapCounts: boolean;
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

  /** True while any gesture is in progress (the host uses it for the cursor). */
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
      startEl: null,
      startBox: null,
      startVp: vp,
      dragging: false,
      tapCounts: true,
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

    const elements = this.port.elements();
    const selectedId = this.port.selection();
    const selected = selectedId
      ? elements.find((e) => e.id === selectedId && e.deletedAt === null)
      : undefined;

    const xM = (sample.x - vp.tx) / vp.scale;
    const yM = (sample.y - vp.ty) / vp.scale;
    const hit = findElementAtPoint(elements, xM, yM);

    // 1. Handles of the selected element come first, but they only claim drags. Their touch
    //    areas reach well outside the element, so a plain tap there still selects whatever
    //    lies under the finger (or deselects on empty plan).
    if (selected) {
      const handle = this.handleAt(selected, sample, vp);
      if (handle) {
        return {
          ...base,
          intent: handle === 'rot' ? 'rotate' : 'resize',
          handle: handle === 'rot' ? null : handle,
          targetId: hit?.id ?? null,
          startEl: selected,
          startBox: toBox(selected),
        };
      }
    }

    // 2. The topmost element under the pointer.

    if (mouse) {
      if (hit) {
        // D-02: select and move in one drag.
        if (hit.id !== selectedId) this.port.setSelection(hit.id);
        return { ...base, intent: 'move', targetId: hit.id, startEl: hit, startBox: toBox(hit) };
      }
      // D-03: Shift+drag on empty plan is reserved for the selection frame (Phase 31).
      return sample.shift
        ? { ...base, intent: 'none', tapCounts: false }
        : { ...base, intent: 'pan' };
    }

    // D-01: touch moves only the element that is already selected.
    if (hit && hit.id === selectedId) {
      return { ...base, intent: 'move', targetId: hit.id, startEl: hit, startBox: toBox(hit) };
    }
    return { ...base, intent: 'pan', targetId: hit?.id ?? null };
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
      if (g.intent !== 'pan') this.port.setGestureActive(true);
    }

    const scale = g.startVp.scale;
    switch (g.intent) {
      case 'pan': {
        const next = panBy(g.startVp, dx, dy);
        this.port.setViewport(clampPan(next, this.port.garden(), this.port.canvas()));
        break;
      }
      case 'move': {
        if (!g.startEl || !g.startBox) break;
        const pos = moveBox(g.startBox, dx / scale, dy / scale, this.port.garden());
        this.port.updateElement(g.startEl.id, { xM: pos.xM, yM: pos.yM });
        break;
      }
      case 'resize': {
        if (!g.startEl || !g.startBox || !g.handle) break;
        const box = resizeBox(g.startBox, g.handle, dx / scale, dy / scale);
        // D-06: a resize that would push the centre out of the parcel is not applied.
        const clamped = clampCenter(box.xM, box.yM, this.port.garden());
        if (clamped.xM !== box.xM || clamped.yM !== box.yM) break;
        this.port.updateElement(g.startEl.id, {
          xM: box.xM,
          yM: box.yM,
          widthM: box.widthM,
          heightM: box.heightM,
        });
        break;
      }
      case 'rotate': {
        if (!g.startEl || !g.startBox) break;
        const vp = g.startVp;
        const raw = rotationFromPointer(
          g.startBox,
          (sample.x - vp.tx) / vp.scale,
          (sample.y - vp.ty) / vp.scale,
        );
        // D-04: hard 15° steps; Shift turns freely with the mouse, to whole degrees.
        const free = isMouseLike(g.type) && sample.shift === true;
        const deg = free ? Math.round(raw) % 360 : snapRotation(raw, false);
        const current = this.port.elements().find((e) => e.id === g.startEl!.id) ?? g.startEl;
        this.port.updateElement(g.startEl.id, {
          provenance: { ...(current.provenance ?? {}), rotateDeg: deg },
        });
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
      if (g.intent !== 'pan' && g.intent !== 'none') this.port.setGestureActive(false);
      return;
    }
    this.onTap(g, sample);
  }

  private onTap(g: SingleGesture, sample: PointerSample): void {
    if (!g.tapCounts || this.port.mode() !== 'edit') return;

    if (g.targetId === null) {
      // Tap or click on empty plan deselects.
      if (this.port.selection() !== null) this.port.setSelection(null);
      this.lastTap = null;
      return;
    }

    if (this.port.selection() !== g.targetId) this.port.setSelection(g.targetId);

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

  /** Stop the single-pointer gesture and put a half-changed element back as it was. */
  private abortSingle(): void {
    const g = this.single;
    this.single = null;
    if (!g || !g.dragging) return;
    if (g.intent === 'move' || g.intent === 'resize' || g.intent === 'rotate') {
      if (g.startEl) {
        this.port.updateElement(g.startEl.id, {
          xM: g.startEl.xM,
          yM: g.startEl.yM,
          widthM: g.startEl.widthM,
          heightM: g.startEl.heightM,
          provenance: g.startEl.provenance,
        });
      }
      this.port.setGestureActive(false);
    }
    // A pan is left where it is: snapping the view back when a second finger lands would jump.
  }
}
