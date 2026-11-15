// Phase 30: pure helpers behind the plan editor (geometry, handles, viewport, labels,
// number entry, scale bar).

import {
  clampCenter,
  localToWorld,
  moveBox,
  pointInBox,
  resizeBox,
  rotationFromPointer,
  snapStep,
  worldToLocal,
  type Box,
} from '../elementGeometry';
import {
  handleHitRect,
  handleSpots,
  hitHandle,
  MOUSE_HIT,
  TOUCH_HIT,
} from '../handles';
import {
  clampPan,
  clampScale,
  fitScale,
  fitViewport,
  pinchViewport,
  zoomAt,
} from '../viewport';
import { fitLabel } from '../labelFit';
import { formatDegrees, formatMeters, parseDegrees, parseMeters } from '../numberFormat';
import { scaleBar } from '../scaleBar';

const box = (over: Partial<Box> = {}): Box => ({
  xM: 5,
  yM: 5,
  widthM: 2,
  heightM: 1,
  rotateDeg: 0,
  ...over,
});

describe('elementGeometry', () => {
  it('worldToLocal and localToWorld are inverses at any angle', () => {
    for (const rotateDeg of [0, 30, 90, 135, 250]) {
      const b = box({ rotateDeg });
      const w = localToWorld(b, 0.7, -0.3);
      const l = worldToLocal(b, w.xM, w.yM);
      expect(l.x).toBeCloseTo(0.7, 9);
      expect(l.y).toBeCloseTo(-0.3, 9);
    }
  });

  it('pointInBox follows the rotation', () => {
    // 2 × 1 box turned 90°: now 1 wide and 2 tall on the plan.
    const b = box({ rotateDeg: 90 });
    expect(pointInBox(b, 5, 5.9)).toBe(true);
    expect(pointInBox(b, 5.9, 5)).toBe(false);
  });

  it.each([0, 30, 90, 200])('a side handle keeps the opposite edge at %i°', (rotateDeg) => {
    const start = box({ rotateDeg });
    const fixedBefore = localToWorld(start, -start.widthM / 2, 0);
    // Pull the east handle 0.8 m along the element's own width axis.
    const along = localToWorld({ ...start, xM: 0, yM: 0 }, 0.8, 0);
    const next = resizeBox(start, 'e', along.xM, along.yM);
    expect(next.widthM).toBeCloseTo(2.8, 5);
    expect(next.heightM).toBe(1);
    const fixedAfter = localToWorld(next, -next.widthM / 2, 0);
    expect(fixedAfter.xM).toBeCloseTo(fixedBefore.xM, 9);
    expect(fixedAfter.yM).toBeCloseTo(fixedBefore.yM, 9);
  });

  it('a corner handle keeps the opposite corner', () => {
    const start = box({ rotateDeg: 45 });
    const cornerBefore = localToWorld(start, start.widthM / 2, start.heightM / 2);
    const next = resizeBox(start, 'nw', -0.5, -0.5);
    const cornerAfter = localToWorld(next, next.widthM / 2, next.heightM / 2);
    expect(cornerAfter.xM).toBeCloseTo(cornerBefore.xM, 9);
    expect(cornerAfter.yM).toBeCloseTo(cornerBefore.yM, 9);
  });

  it('resizing lands on the 5 cm step and respects the minimum', () => {
    expect(resizeBox(box(), 'e', 0.33, 0).widthM).toBeCloseTo(2.35, 9);
    expect(resizeBox(box(), 'e', -10, 0).widthM).toBeCloseTo(0.05, 9);
    expect(resizeBox(box(), 's', 0, 0.02).heightM).toBeCloseTo(1, 9);
  });

  it('moving a square-lying element puts its edges on the step', () => {
    const garden = { widthM: 12, heightM: 13 };
    // Width 1.25: the centre is not on the step, the left edge is.
    const pos = moveBox(box({ xM: 2.625, widthM: 1.25 }), 0.33, 0, garden);
    expect(pos.xM - 0.625).toBeCloseTo(2.35, 9);
    // At 90° the depth takes the place of the width.
    const turned = moveBox(box({ rotateDeg: 90, heightM: 1.25, yM: 5 }), 0.33, 0, garden);
    expect(turned.xM - 0.625).toBeCloseTo(4.7, 9);
  });

  it('clampCenter keeps the centre in the parcel', () => {
    expect(clampCenter(-1, 20, { widthM: 12, heightM: 13 })).toEqual({ xM: 0, yM: 13 });
  });

  it('rotationFromPointer is 0° above the centre and grows clockwise', () => {
    const b = box();
    expect(rotationFromPointer(b, 5, 0)).toBeCloseTo(0, 9);
    expect(rotationFromPointer(b, 9, 5)).toBeCloseTo(90, 9);
    expect(rotationFromPointer(b, 5, 9)).toBeCloseTo(180, 9);
    expect(rotationFromPointer(b, 1, 5)).toBeCloseTo(270, 9);
  });

  it('snapStep trims binary noise', () => {
    expect(snapStep(0.1 + 0.2, 0.05)).toBe(0.3);
    expect(snapStep(1.074, 0.05)).toBe(1.05);
  });
});

describe('handles (EDIT3-08, D-21)', () => {
  it('shows four corners, four sides and the rotation handle on a large element', () => {
    expect(handleSpots(200, 120).map((s) => s.id).sort()).toEqual(
      ['e', 'n', 'ne', 'nw', 'rot', 's', 'se', 'sw', 'w'].sort(),
    );
  });

  it('drops the middle handle on sides shorter than 36 px', () => {
    // 200 wide, 30 deep: the left and right sides are 30 px long.
    const ids = handleSpots(200, 30).map((s) => s.id);
    expect(ids).toContain('n');
    expect(ids).toContain('s');
    expect(ids).not.toContain('e');
    expect(ids).not.toContain('w');
  });

  it('touch areas are 48 px and reach inward at most a quarter of the element', () => {
    for (const size of [20, 42, 80, 300]) {
      const r = handleHitRect('se', size, size, TOUCH_HIT);
      expect(r.x.max - r.x.min).toBe(48);
      expect(r.y.max - r.y.min).toBe(48);
      const inward = size / 2 - r.x.min;
      expect(inward).toBeLessThanOrEqual(size / 4 + 1e-9);
      expect(inward).toBeLessThanOrEqual(TOUCH_HIT.inwardPx);
    }
  });

  it('the middle of a small selected element is never a handle', () => {
    // The sketch found a 42 px bed could not be dragged once selected.
    for (const size of [16, 24, 42]) {
      expect(hitHandle(0, 0, size, size, TOUCH_HIT)).toBeNull();
      expect(hitHandle(size / 5, -size / 5, size, size, TOUCH_HIT)).toBeNull();
    }
  });

  it('finds corner, side and rotation handles; a corner wins an overlap', () => {
    expect(hitHandle(110, 60, 200, 100, TOUCH_HIT)).toBe('se');
    expect(hitHandle(115, 0, 200, 100, TOUCH_HIT)).toBe('e');
    expect(hitHandle(0, -98, 200, 100, TOUCH_HIT)).toBe('rot');
    // Small element: the east and south-east areas overlap below the middle of the side.
    expect(hitHandle(30, 21, 40, 40, TOUCH_HIT)).toBe('se');
  });

  it('the mouse gets a tighter target', () => {
    expect(hitHandle(125, 0, 200, 100, TOUCH_HIT)).toBe('e');
    expect(hitHandle(125, 0, 200, 100, MOUSE_HIT)).toBeNull();
    expect(hitHandle(104, 0, 200, 100, MOUSE_HIT)).toBe('e');
  });
});

describe('viewport (EDIT3-07)', () => {
  const garden = { widthM: 12, heightM: 13 };
  const canvas = { width: 400, height: 600 };

  it('fit shows the whole parcel, centred', () => {
    const vp = fitViewport(garden, canvas, 20);
    expect(vp.scale).toBeCloseTo(30, 9);
    expect(vp.tx).toBeCloseTo(20, 9);
    expect(vp.ty).toBeCloseTo((600 - 13 * 30) / 2, 9);
    expect(fitScale(garden, canvas, 20)).toBeCloseTo(30, 9);
  });

  it('zoom is limited to 0.5× … 4× of fit', () => {
    expect(clampScale(1000, 30)).toBe(120);
    expect(clampScale(1, 30)).toBe(15);
    expect(clampScale(45, 30)).toBe(45);
  });

  it('zoomAt keeps the point under the anchor', () => {
    const vp = zoomAt({ tx: 20, ty: 105, scale: 30 }, 2, { x: 200, y: 300 }, 30);
    expect(vp.scale).toBe(60);
    expect((200 - vp.tx) / vp.scale).toBeCloseTo((200 - 20) / 30, 9);
    expect((300 - vp.ty) / vp.scale).toBeCloseTo((300 - 105) / 30, 9);
  });

  it('pinch zooms and pans in one', () => {
    const vp = pinchViewport({ tx: 0, ty: 0, scale: 30 }, { x: 100, y: 100 }, 50, { x: 140, y: 100 }, 100, 30);
    expect(vp.scale).toBe(60);
    // The garden point that was under (100,100) is now under (140,100).
    expect((140 - vp.tx) / vp.scale).toBeCloseTo(100 / 30, 9);
  });

  it('the centre of the parcel cannot be panned off the canvas', () => {
    const vp = clampPan({ tx: 5000, ty: -5000, scale: 30 }, garden, canvas);
    expect(vp.tx + (12 * 30) / 2).toBe(400);
    expect(vp.ty + (13 * 30) / 2).toBe(0);
  });
});

describe('labels (D-12)', () => {
  it('shows a name that fits', () => {
    expect(fitLabel('Beet', 120, 60, 13.5, false)).toEqual({ text: 'Beet', along: false, fits: true });
  });

  it('runs along a long narrow element', () => {
    expect(fitLabel('Hauptweg', 24, 300, 13.5, false)).toEqual({ text: 'Hauptweg', along: true, fits: true });
  });

  it('shortens a name that does not fit and hides it on tiny elements', () => {
    const cut = fitLabel('Tomaten und Basilikum', 70, 40, 13.5, false);
    expect(cut?.text.endsWith('…')).toBe(true);
    expect(cut!.text.length).toBeLessThan('Tomaten und Basilikum'.length);
    expect(fitLabel('Tomaten und Basilikum', 18, 12, 13.5, false)).toBeNull();
  });

  it('the selected element always shows its full name', () => {
    expect(fitLabel('Tomaten und Basilikum', 18, 12, 13.5, true)).toMatchObject({
      text: 'Tomaten und Basilikum',
      fits: false,
    });
    expect(fitLabel('Beet', 120, 60, 13.5, true)?.fits).toBe(true);
  });
});

describe('number entry (EDIT3-06)', () => {
  it('reads metres with a comma, exact to 1 cm', () => {
    expect(parseMeters('1,2')).toBe(1.2);
    expect(parseMeters('1.25')).toBe(1.25);
    expect(parseMeters(' 3 ')).toBe(3);
    expect(parseMeters('2,347')).toBe(2.35);
    expect(parseMeters(',5')).toBe(0.5);
  });

  it('rejects what is not a positive length', () => {
    for (const bad of ['', 'abc', '0', '-1', '1,2,3', '1 m']) {
      expect(parseMeters(bad)).toBeNull();
    }
  });

  it('writes metres with a comma and two decimals', () => {
    expect(formatMeters(1.2)).toBe('1,20');
    expect(formatMeters(0.05)).toBe('0,05');
  });

  it('reads degrees to 1° and wraps them into 0…359', () => {
    expect(parseDegrees('15')).toBe(15);
    expect(parseDegrees('-90')).toBe(270);
    expect(parseDegrees('370')).toBe(10);
    expect(parseDegrees('44,6')).toBe(45);
    expect(parseDegrees('x')).toBeNull();
    expect(formatDegrees(359.6)).toBe('0');
  });
});

describe('scale bar', () => {
  it('picks a round length near the target width', () => {
    expect(scaleBar(30)).toMatchObject({ lengthM: 2, label: '2 m' });
    expect(scaleBar(100)).toMatchObject({ lengthM: 1, label: '1 m' });
    expect(scaleBar(300)).toMatchObject({ lengthM: 0.2, label: '20 cm' });
    expect(scaleBar(15).widthPx).toBeCloseTo(75, 9);
  });
});
