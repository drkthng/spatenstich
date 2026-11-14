// Phase 30: the editor's gesture rules, tested without a browser.
// Each test feeds PointerSample sequences into the controller and checks what it asked the
// host to do. Decision ids refer to .planning/phases/30-…/30-CONTEXT.md.

import type { PlanElementRow } from '@spatenstich/shared';
import {
  InteractionController,
  type ControllerPort,
  type PointerSample,
  type PointerType,
} from '../interactionController';
import { getRotateDeg, localToWorld, toBox } from '../elementGeometry';
import { ROTATE_OFFSET_PX } from '../handles';
import type { Viewport } from '../viewport';

function makeEl(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
    xM: 2,
    yM: 2,
    widthM: 2,
    heightM: 2,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}

interface Harness {
  ctrl: InteractionController;
  state: {
    elements: PlanElementRow[];
    selectedIds: string[];
    /** The single selected id, or the last one of several; null when nothing is selected. */
    readonly selection: string | null;
    vp: Viewport;
    mode: 'edit' | 'readOnly';
    gestureLog: boolean[];
    renames: string[];
    multi: boolean;
    placing: { widthM: number; heightM: number } | null;
    ghost: { xM: number; yM: number } | null;
    placed: { xM: number; yM: number }[];
    marquee: ({ x0: number; y0: number; x1: number; y1: number } | null)[];
  };
  el: (id: string) => PlanElementRow;
}

// Scale 50 px/m with no offset: the default element (centre 2,2, size 2×2) covers the
// screen square 50…150 in both directions.
function harness(elements: PlanElementRow[] = [makeEl('a')], mode: 'edit' | 'readOnly' = 'edit'): Harness {
  const state: Harness['state'] = {
    elements,
    selectedIds: [],
    get selection() {
      return this.selectedIds[this.selectedIds.length - 1] ?? null;
    },
    vp: { tx: 0, ty: 0, scale: 50 },
    mode,
    gestureLog: [],
    renames: [],
    multi: false,
    placing: null,
    ghost: null,
    placed: [],
    marquee: [],
  };
  const port: ControllerPort = {
    mode: () => state.mode,
    elements: () => state.elements,
    selectedIds: () => state.selectedIds,
    multiSelect: () => state.multi,
    viewport: () => state.vp,
    garden: () => ({ widthM: 12, heightM: 13 }),
    canvas: () => ({ width: 400, height: 600 }),
    fitScale: () => 30,
    setSelectedIds: (ids) => {
      state.selectedIds = ids;
    },
    updateElement: (id, patch) => {
      state.elements = state.elements.map((e) => (e.id === id ? { ...e, ...patch } : e));
    },
    setViewport: (vp) => {
      state.vp = vp;
    },
    setGestureActive: (active) => {
      state.gestureLog.push(active);
    },
    startRename: (id) => {
      state.renames.push(id);
    },
    placing: () => state.placing,
    ghost: () => state.ghost,
    setGhost: (pos) => {
      state.ghost = pos;
    },
    commitPlacement: (pos) => {
      state.placed.push(pos);
    },
    setMarquee: (rect) => {
      state.marquee.push(rect);
    },
  };
  return {
    ctrl: new InteractionController(port),
    state,
    el: (id) => state.elements.find((e) => e.id === id)!,
  };
}

let clock = 0;
function sample(
  phase: PointerSample['phase'],
  x: number,
  y: number,
  type: PointerType,
  extra: Partial<PointerSample> = {},
): PointerSample {
  clock += 10;
  return { id: 1, x, y, type, phase, ts: clock, button: 0, ...extra };
}

function tap(h: Harness, x: number, y: number, type: PointerType, extra: Partial<PointerSample> = {}): void {
  h.ctrl.handle(sample('down', x, y, type, extra));
  h.ctrl.handle(sample('up', x, y, type, extra));
}

function drag(
  h: Harness,
  from: [number, number],
  to: [number, number],
  type: PointerType,
  extra: Partial<PointerSample> = {},
  release = true,
): void {
  h.ctrl.handle(sample('down', from[0], from[1], type, extra));
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    h.ctrl.handle(sample('move', x, y, type, extra));
  }
  if (release) h.ctrl.handle(sample('up', to[0], to[1], type, extra));
}

beforeEach(() => {
  clock = 0;
});

describe('touch: select first (D-01)', () => {
  it('a tap on an element selects it, a tap on empty plan deselects', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    expect(h.state.selection).toBe('a');
    tap(h, 300, 400, 'touch');
    expect(h.state.selection).toBeNull();
  });

  it('dragging an unselected element pans the plan and moves nothing', () => {
    const h = harness();
    drag(h, [100, 100], [160, 130], 'touch');
    expect(h.el('a').xM).toBe(2);
    expect(h.el('a').yM).toBe(2);
    expect(h.state.selection).toBeNull();
    expect(h.state.vp).toEqual({ tx: 60, ty: 30, scale: 50 });
    expect(h.state.gestureLog).toEqual([]);
  });

  it('dragging the selected element moves it and leaves the view alone', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    drag(h, [100, 100], [200, 150], 'touch');
    expect(h.el('a').xM).toBeCloseTo(4, 5);
    expect(h.el('a').yM).toBeCloseTo(3, 5);
    expect(h.state.vp).toEqual({ tx: 0, ty: 0, scale: 50 });
    expect(h.state.gestureLog).toEqual([true, false]);
  });

  it('with one element selected, dragging another element still pans', () => {
    const h = harness([makeEl('a'), makeEl('b', { xM: 6, yM: 6 })]);
    tap(h, 100, 100, 'touch');
    drag(h, [300, 300], [320, 340], 'touch');
    expect(h.el('b').xM).toBe(6);
    expect(h.state.selection).toBe('a');
    expect(h.state.vp.tx).toBe(20);
  });

  it('a small selected element can still be dragged by its body (D-21)', () => {
    // 0.4 m at 50 px/m is 20 px: smaller than one 44 px touch area.
    const h = harness([makeEl('a', { widthM: 0.4, heightM: 0.4 })]);
    tap(h, 100, 100, 'touch');
    drag(h, [100, 100], [150, 100], 'touch');
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    expect(h.el('a').widthM).toBe(0.4);
  });

  it('a tap inside a handle\x27s outer touch area selects what lies under the finger', () => {
    // 'b' sits 10 px right of the selected element, inside its east handle\x27s touch area.
    const h = harness([makeEl('a'), makeEl('b', { xM: 3.4, yM: 2, widthM: 0.4, heightM: 0.4 })]);
    tap(h, 100, 100, 'touch');
    tap(h, 170, 100, 'touch');
    expect(h.state.selection).toBe('b');
    expect(h.el('a').widthM).toBe(2);
  });

  it('a tap inside a handle\x27s outer touch area over empty plan deselects', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    tap(h, 170, 100, 'touch');
    expect(h.state.selection).toBeNull();
  });

  it('a touch just outside the edge of the selected element grabs the handle', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    // East edge is at x = 150; 20 px outside it, level with the centre.
    drag(h, [170, 100], [220, 100], 'touch');
    expect(h.el('a').widthM).toBeCloseTo(3, 5);
  });
});

describe('mouse: move at once (D-02) and panning (D-03)', () => {
  it('pressing on an unselected element selects it and moves it in the same drag', () => {
    const h = harness();
    drag(h, [100, 100], [150, 100], 'mouse');
    expect(h.state.selection).toBe('a');
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    expect(h.state.vp.tx).toBe(0);
  });

  it('a press that moves less than the threshold is a click, not a move', () => {
    const h = harness();
    drag(h, [100, 100], [103, 101], 'mouse');
    expect(h.state.selection).toBe('a');
    expect(h.el('a').xM).toBe(2);
    expect(h.state.gestureLog).toEqual([]);
  });

  it('dragging on empty plan pans; a click there deselects', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    drag(h, [300, 400], [280, 380], 'mouse');
    expect(h.state.vp).toEqual({ tx: -20, ty: -20, scale: 50 });
    expect(h.state.selection).toBe('a');
    tap(h, 300, 400, 'mouse');
    expect(h.state.selection).toBeNull();
  });

  it('Shift+drag on empty plan never pans (it draws the selection frame)', () => {
    const h = harness();
    drag(h, [300, 400], [320, 420], 'mouse', { shift: true });
    expect(h.state.vp).toEqual({ tx: 0, ty: 0, scale: 50 });
  });

  it('the middle button pans even over an element and does not select it', () => {
    const h = harness();
    drag(h, [100, 100], [130, 100], 'mouse', { button: 1 });
    expect(h.state.vp.tx).toBe(30);
    expect(h.state.selection).toBeNull();
    expect(h.el('a').xM).toBe(2);
  });

  it('Space+drag pans even over an element', () => {
    const h = harness();
    h.ctrl.setSpaceHeld(true);
    drag(h, [100, 100], [100, 140], 'mouse');
    h.ctrl.setSpaceHeld(false);
    expect(h.state.vp.ty).toBe(40);
    expect(h.el('a').yM).toBe(2);
  });
});

describe('moving (D-05, D-06)', () => {
  it('lands on the 5 cm step', () => {
    const h = harness();
    // 53 px at 50 px/m is 1.06 m; the left edge goes from 1.00 to 2.06 and lands on 2.05.
    drag(h, [100, 100], [153, 100], 'mouse');
    expect(h.el('a').xM).toBeCloseTo(3.05, 5);
  });

  it('keeps the centre inside the parcel but lets the element overhang', () => {
    const h = harness();
    drag(h, [100, 100], [-300, 100], 'mouse');
    expect(h.el('a').xM).toBe(0);
    expect(h.el('a').yM).toBe(2);
  });
});

describe('resizing (EDIT3-02, EDIT3-03)', () => {
  it('a side handle changes one dimension and keeps the opposite edge', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    drag(h, [152, 100], [202, 100], 'mouse');
    expect(h.el('a').widthM).toBeCloseTo(3, 5);
    expect(h.el('a').heightM).toBe(2);
    // Left edge stays at x = 1.
    expect(h.el('a').xM - h.el('a').widthM / 2).toBeCloseTo(1, 5);
  });

  it('a corner handle changes width and depth together', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    drag(h, [152, 152], [202, 177], 'mouse');
    expect(h.el('a').widthM).toBeCloseTo(3, 5);
    expect(h.el('a').heightM).toBeCloseTo(2.5, 5);
    expect(h.el('a').xM - h.el('a').widthM / 2).toBeCloseTo(1, 5);
    expect(h.el('a').yM - h.el('a').heightM / 2).toBeCloseTo(1, 5);
  });

  it('on a rotated element the opposite edge still stays where it was', () => {
    const h = harness([makeEl('a', { provenance: { rotateDeg: 90 } })]);
    tap(h, 100, 100, 'mouse');
    // At 90° the element's own "east" side points down the screen: its handle is at (100,150).
    const before = localToWorld(toBox(h.el('a')), -1, 0);
    drag(h, [100, 152], [100, 202], 'mouse');
    expect(h.el('a').widthM).toBeCloseTo(3, 5);
    const after = localToWorld(toBox(h.el('a')), -h.el('a').widthM / 2, 0);
    expect(after.xM).toBeCloseTo(before.xM, 5);
    expect(after.yM).toBeCloseTo(before.yM, 5);
  });

  it('never shrinks below the minimum size', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    drag(h, [152, 100], [-200, 100], 'mouse');
    expect(h.el('a').widthM).toBeCloseTo(0.05, 5);
  });
});

describe('rotating (D-04)', () => {
  const handleY = 50 - ROTATE_OFFSET_PX;

  it('the handle turns in 15° steps', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    // Pointer ends 100 px right of and 10 px below the centre: 95.7° -> 90°.
    drag(h, [100, handleY], [200, 110], 'mouse');
    expect(getRotateDeg(h.el('a'))).toBe(90);
    expect(h.state.gestureLog).toEqual([true, false]);
  });

  it('Shift turns freely with the mouse, to whole degrees', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    drag(h, [100, handleY], [200, 110], 'mouse', { shift: true });
    expect(getRotateDeg(h.el('a'))).toBe(96);
  });

  it('a finger always gets 15° steps', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    drag(h, [100, handleY], [200, 110], 'touch', { shift: true });
    expect(getRotateDeg(h.el('a'))).toBe(90);
  });

  it('keeps the other provenance keys', () => {
    const h = harness([makeEl('a', { provenance: { source: 'manual', note: 'x' } })]);
    tap(h, 100, 100, 'mouse');
    drag(h, [100, handleY], [200, 100], 'mouse');
    expect(h.el('a').provenance).toEqual({ source: 'manual', note: 'x', rotateDeg: 90 });
  });
});

describe('renaming (EDIT3-05)', () => {
  it('a double tap renames; the first tap selects', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    expect(h.state.selection).toBe('a');
    expect(h.state.renames).toEqual([]);
    tap(h, 102, 101, 'touch');
    expect(h.state.renames).toEqual(['a']);
  });

  it('two slow taps do not rename', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    clock += 1000;
    tap(h, 100, 100, 'touch');
    expect(h.state.renames).toEqual([]);
  });

  it('a double click renames', () => {
    const h = harness();
    tap(h, 100, 100, 'mouse');
    tap(h, 100, 100, 'mouse');
    expect(h.state.renames).toEqual(['a']);
  });

  it('a tap followed by a drag does not rename', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    drag(h, [100, 100], [140, 100], 'touch');
    tap(h, 140, 100, 'touch');
    expect(h.state.renames).toEqual([]);
  });
});

describe('zoom and two fingers (EDIT3-07)', () => {
  function twoDown(h: Harness, a: [number, number], b: [number, number]): void {
    h.ctrl.handle(sample('down', a[0], a[1], 'touch', { id: 1 }));
    h.ctrl.handle(sample('down', b[0], b[1], 'touch', { id: 2 }));
  }

  it('spreading two fingers zooms in around their midpoint', () => {
    const h = harness();
    twoDown(h, [150, 300], [250, 300]);
    h.ctrl.handle(sample('move', 100, 300, 'touch', { id: 1 }));
    h.ctrl.handle(sample('move', 300, 300, 'touch', { id: 2 }));
    expect(h.state.vp.scale).toBeCloseTo(100, 5);
    // The garden point under the midpoint (200,300) is still under it.
    expect((200 - h.state.vp.tx) / h.state.vp.scale).toBeCloseTo(4, 5);
    expect((300 - h.state.vp.ty) / h.state.vp.scale).toBeCloseTo(6, 5);
  });

  it('zoom stops at 4× and at 0.5× of the fit scale', () => {
    const h = harness();
    twoDown(h, [190, 300], [210, 300]);
    h.ctrl.handle(sample('move', 0, 300, 'touch', { id: 1 }));
    h.ctrl.handle(sample('move', 400, 300, 'touch', { id: 2 }));
    expect(h.state.vp.scale).toBeCloseTo(120, 5);
    h.ctrl.handle(sample('move', 199, 300, 'touch', { id: 1 }));
    h.ctrl.handle(sample('move', 201, 300, 'touch', { id: 2 }));
    expect(h.state.vp.scale).toBeCloseTo(15, 5);
  });

  it('a second finger ends a move and puts the element back', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    drag(h, [100, 100], [150, 100], 'touch', {}, false);
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    h.ctrl.handle(sample('down', 300, 300, 'touch', { id: 2 }));
    expect(h.el('a').xM).toBe(2);
    expect(h.state.gestureLog).toEqual([true, false]);
  });

  it('the finger left over after a pinch does not drag anything', () => {
    const h = harness();
    tap(h, 100, 100, 'touch');
    twoDown(h, [100, 100], [300, 300]);
    h.ctrl.handle(sample('up', 300, 300, 'touch', { id: 2 }));
    const vp = h.state.vp;
    h.ctrl.handle(sample('move', 180, 160, 'touch', { id: 1 }));
    h.ctrl.handle(sample('up', 180, 160, 'touch', { id: 1 }));
    expect(h.el('a').xM).toBe(2);
    expect(h.state.vp).toEqual(vp);
  });

  it('the wheel zooms around the cursor', () => {
    const h = harness();
    h.ctrl.wheel(100, 100, -200);
    expect(h.state.vp.scale).toBeGreaterThan(50);
    expect((100 - h.state.vp.tx) / h.state.vp.scale).toBeCloseTo(2, 5);
    expect((100 - h.state.vp.ty) / h.state.vp.scale).toBeCloseTo(2, 5);
  });

  it('the wheel respects the zoom limits', () => {
    const h = harness();
    h.ctrl.wheel(100, 100, -100000);
    expect(h.state.vp.scale).toBeCloseTo(120, 5);
    h.ctrl.wheel(100, 100, 100000);
    expect(h.state.vp.scale).toBeCloseTo(15, 5);
  });
});

describe('read-only view (D-08)', () => {
  it('pans and zooms but selects, moves and renames nothing', () => {
    const h = harness([makeEl('a')], 'readOnly');
    tap(h, 100, 100, 'touch');
    tap(h, 100, 100, 'touch');
    expect(h.state.selection).toBeNull();
    expect(h.state.renames).toEqual([]);
    drag(h, [100, 100], [130, 120], 'mouse');
    expect(h.el('a').xM).toBe(2);
    expect(h.state.vp).toEqual({ tx: 30, ty: 20, scale: 50 });
  });
});

describe('interrupted gestures', () => {
  it('a cancelled move puts the element back and ends the gesture', () => {
    const h = harness();
    drag(h, [100, 100], [150, 130], 'mouse', {}, false);
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    h.ctrl.handle(sample('cancel', 150, 130, 'mouse'));
    expect(h.el('a').xM).toBe(2);
    expect(h.el('a').yM).toBe(2);
    expect(h.state.gestureLog).toEqual([true, false]);
    expect(h.ctrl.isBusy()).toBe(false);
  });

  it('every finished gesture leaves gestureActive false', () => {
    const h = harness();
    drag(h, [100, 100], [150, 100], 'mouse');
    drag(h, [200, 100], [250, 100], 'mouse');
    expect(h.state.gestureLog[h.state.gestureLog.length - 1]).toBe(false);
    expect(h.state.gestureLog.filter((g) => g).length).toBe(
      h.state.gestureLog.filter((g) => !g).length,
    );
  });
});

// ── Phase 31 ──────────────────────────────────────────────────────────────

describe('several elements (EDIT3-10)', () => {
  const three = () => [makeEl('a'), makeEl('b', { xM: 6, yM: 2 }), makeEl('c', { xM: 6, yM: 6 })];

  it('mouse: Shift+click adds and removes elements', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    expect(h.state.selectedIds).toEqual(['a', 'b']);
    tap(h, 100, 100, 'mouse', { shift: true });
    expect(h.state.selectedIds).toEqual(['b']);
  });

  it('mouse: Shift+drag on an element does not move it', () => {
    const h = harness(three());
    drag(h, [100, 100], [160, 100], 'mouse', { shift: true });
    expect(h.el('a').xM).toBe(2);
  });

  it('mouse: dragging one of several selected elements moves all of them', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    drag(h, [300, 100], [350, 150], 'mouse');
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    expect(h.el('a').yM).toBeCloseTo(3, 5);
    expect(h.el('b').xM).toBeCloseTo(7, 5);
    expect(h.el('b').yM).toBeCloseTo(3, 5);
    expect(h.el('c').xM).toBe(6);
    expect(h.state.selectedIds).toEqual(['a', 'b']);
    expect(h.state.gestureLog).toEqual([true, false]);
  });

  it('mouse: a plain click on one of several selected elements selects it alone', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    tap(h, 300, 100, 'mouse');
    expect(h.state.selectedIds).toEqual(['b']);
  });

  it('a group stops as a whole when one of its centres reaches the parcel edge', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    // 'a' is 2 m from the left edge, 'b' 6 m: the group can go 2 m left, not more.
    drag(h, [300, 100], [-100, 100], 'mouse');
    expect(h.el('a').xM).toBe(0);
    expect(h.el('b').xM).toBeCloseTo(4, 5);
  });

  it('with several selected, handles are not grabbed', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    // Where the east handle of 'a' would be if it were selected alone.
    drag(h, [152, 100], [202, 100], 'mouse');
    expect(h.el('a').widthM).toBe(2);
  });

  it('mouse: Shift+drag on empty plan selects what the frame touches', () => {
    const h = harness(three());
    // From (20,20) to (330,160) px = 0.4…6.6 m by 0.4…3.2 m: touches 'a' and 'b', not 'c'.
    drag(h, [20, 20], [330, 160], 'mouse', { shift: true });
    expect([...h.state.selectedIds].sort()).toEqual(['a', 'b']);
    expect(h.state.marquee[0]).toEqual(expect.objectContaining({ x0: 20, y0: 20 }));
    expect(h.state.marquee[h.state.marquee.length - 1]).toBeNull();
    expect(h.state.vp).toEqual({ tx: 0, ty: 0, scale: 50 });
    expect(h.state.gestureLog).toEqual([]);
  });

  it('touch with "Mehrere" on: taps add and remove, dragging a selected one moves all', () => {
    const h = harness(three());
    h.state.multi = true;
    tap(h, 100, 100, 'touch');
    tap(h, 300, 100, 'touch');
    expect(h.state.selectedIds).toEqual(['a', 'b']);
    drag(h, [100, 100], [150, 100], 'touch');
    expect(h.el('a').xM).toBeCloseTo(3, 5);
    expect(h.el('b').xM).toBeCloseTo(7, 5);
    tap(h, 350, 100, 'touch');
    expect(h.state.selectedIds).toEqual(['a']);
  });

  it('touch with "Mehrere" on: dragging an unselected element still pans', () => {
    const h = harness(three());
    h.state.multi = true;
    tap(h, 100, 100, 'touch');
    drag(h, [300, 300], [320, 300], 'touch');
    expect(h.state.vp.tx).toBe(20);
    expect(h.el('c').xM).toBe(6);
  });

  it('a cancelled group move puts every element back', () => {
    const h = harness(three());
    tap(h, 100, 100, 'mouse');
    tap(h, 300, 100, 'mouse', { shift: true });
    drag(h, [300, 100], [350, 150], 'mouse', {}, false);
    h.ctrl.handle(sample('cancel', 350, 150, 'mouse'));
    expect(h.el('a').xM).toBe(2);
    expect(h.el('b').xM).toBe(6);
    expect(h.el('b').yM).toBe(2);
  });
});

describe('placing with a preview (EDIT3-09)', () => {
  const placing = { widthM: 2, heightM: 1 };

  it('mouse: the preview follows the cursor on the 5 cm step', () => {
    const h = harness();
    h.state.placing = placing;
    h.ctrl.hover(301, 252);
    // Left edge at 6.02 - 1 = 5.02 lands on 5.00; top edge at 5.04 - 0.5 = 4.54 on 4.55.
    expect(h.state.ghost!.xM).toBeCloseTo(6, 5);
    expect(h.state.ghost!.yM).toBeCloseTo(5.05, 5);
    expect(h.state.placed).toEqual([]);
  });

  it('mouse: a click sets the element there, even on top of another element', () => {
    const h = harness();
    h.state.placing = placing;
    tap(h, 100, 100, 'mouse');
    expect(h.state.placed).toEqual([{ xM: 2, yM: 2 }]);
    expect(h.state.selectedIds).toEqual([]);
  });

  it('touch: a tap moves the preview and sets nothing', () => {
    const h = harness();
    h.state.placing = placing;
    tap(h, 300, 250, 'touch');
    expect(h.state.ghost).toEqual({ xM: 6, yM: 5 });
    expect(h.state.placed).toEqual([]);
  });

  it('touch: the preview can be dragged; dragging elsewhere pans', () => {
    const h = harness();
    h.state.placing = placing;
    tap(h, 300, 250, 'touch');
    drag(h, [300, 250], [350, 300], 'touch');
    expect(h.state.ghost!.xM).toBeCloseTo(7, 5);
    expect(h.state.ghost!.yM).toBeCloseTo(6, 5);
    expect(h.state.vp.tx).toBe(0);
    drag(h, [50, 500], [70, 520], 'touch');
    expect(h.state.vp).toEqual({ tx: 20, ty: 20, scale: 50 });
    expect(h.state.ghost!.xM).toBeCloseTo(7, 5);
  });

  it('the preview stays inside the parcel', () => {
    const h = harness();
    h.state.placing = placing;
    h.ctrl.hover(-500, 100000);
    expect(h.state.ghost).toEqual({ xM: 0, yM: 13 });
  });

  it('while placing nothing is selected, moved or renamed', () => {
    const h = harness();
    h.state.placing = placing;
    drag(h, [100, 100], [160, 100], 'mouse');
    tap(h, 100, 100, 'touch');
    tap(h, 100, 100, 'touch');
    expect(h.el('a').xM).toBe(2);
    expect(h.state.selectedIds).toEqual([]);
    expect(h.state.renames).toEqual([]);
    expect(h.state.gestureLog).toEqual([]);
  });

  it('without placing, hovering does nothing', () => {
    const h = harness();
    h.ctrl.hover(300, 300);
    expect(h.state.ghost).toBeNull();
  });
});
