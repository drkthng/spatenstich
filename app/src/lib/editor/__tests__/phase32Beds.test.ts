// Phase 32: free outlines (EDIT3-14) and plants that follow their bed (EDIT3-12).

import type { PlanElementRow } from '@spatenstich/shared';
import { getRotateDeg, toBox } from '../elementGeometry';
import {
  elementPolygon,
  getOutline,
  insertCorner,
  moveCorner,
  outlineFromCorners,
  outlinePatch,
  pointInPolygon,
  removeCorner,
} from '../outline';
import { applyElementPatch, bedContaining, carryPlants, plantsOfBed } from '../bedBinding';

function el(id: string, overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id,
    gardenId: 'g',
    elementType: 'Beet',
    label: id,
    xM: 5,
    yM: 5,
    widthM: 4,
    heightM: 2,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    updatedByUserId: null,
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure',
    ...overrides,
  };
}
const plant = (id: string, xM: number, yM: number, provenance: Record<string, unknown> = {}) =>
  el(id, { elementType: 'Pflanze', layer: 'seasonal', xM, yM, widthM: 0.4, heightM: 0.4, provenance });
const NOW = '2026-11-14T12:00:00.000Z';
const round = (pts: { x: number; y: number }[]) => pts.map((p) => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);

describe('free outlines', () => {
  const corners = [
    { x: 1, y: 1 },
    { x: 5, y: 1 },
    { x: 5, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 5 },
    { x: 1, y: 5 },
  ];

  it('a rectangle has no outline; its shape is its four corners, turned with it', () => {
    expect(getOutline(el('a'))).toBeNull();
    expect(round(elementPolygon(el('a')))).toEqual([[3, 4], [7, 4], [7, 6], [3, 6]]);
    expect(round(elementPolygon(el('a', { provenance: { rotateDeg: 90 } })))).toEqual([[6, 3], [6, 7], [4, 7], [4, 3]]);
  });

  it('corners tapped on the plan become a bed whose outline reproduces them', () => {
    const { box, outline } = outlineFromCorners(corners);
    expect(box).toMatchObject({ xM: 3, yM: 3, widthM: 4, heightM: 4, rotateDeg: 0 });
    const bed = el('l', { ...box, provenance: { outline } });
    expect(round(elementPolygon(bed))).toEqual(corners.map((c) => [c.x, c.y]));
  });

  it('the outline follows moving, resizing and turning', () => {
    const { box, outline } = outlineFromCorners(corners);
    const moved = el('l', { ...box, xM: 13, yM: 3, widthM: 8, provenance: { outline } });
    // Shifted by 10 m and twice as wide: x' = 10 + 1 + (x - 1) * 2 - 1 … the notch stays a notch.
    expect(round(elementPolygon(moved))).toEqual([[9, 1], [17, 1], [17, 3], [13, 3], [13, 5], [9, 5]]);
    const turned = el('l', { ...box, provenance: { outline, rotateDeg: 180 } });
    expect(round(elementPolygon(turned))[0]).toEqual([5, 5]);
  });

  it('an old outline in garden coordinates follows the bed instead of staying behind', () => {
    const old = el('old', {
      xM: 13,
      yM: 3,
      widthM: 4,
      heightM: 4,
      provenance: { polygonPointsM: corners },
    });
    // Drawn at 1…5, the bed now stands 10 m further right.
    expect(round(elementPolygon(old))[0]).toEqual([11, 1]);
  });

  it('moving, adding and removing a corner refits the box and drops the stale copy', () => {
    const { box, outline } = outlineFromCorners(corners);
    const bed = el('l', { ...box, provenance: { outline, polygonPointsM: corners, note: 'x' } });
    const moved = moveCorner(elementPolygon(bed), 1, { x: 7, y: 1 });
    const patch = outlinePatch(bed, moved);
    expect(patch).toMatchObject({ xM: 4, widthM: 6, heightM: 4 });
    expect((patch.provenance as Record<string, unknown>).polygonPointsM).toBeUndefined();
    expect((patch.provenance as Record<string, unknown>).note).toBe('x');
    expect(round(elementPolygon({ ...bed, ...patch } as PlanElementRow))[1]).toEqual([7, 1]);

    const added = insertCorner(corners, 0);
    expect(added.index).toBe(1);
    expect(added.points[1]).toEqual({ x: 3, y: 1 });
    expect(removeCorner(corners, 3)).toHaveLength(5);
    const triangle = corners.slice(0, 3);
    expect(removeCorner(triangle, 0)).toBe(triangle);
  });

  it('a refit keeps the rotation of a turned bed', () => {
    const turned = el('t', { provenance: { rotateDeg: 30 } });
    const pts = elementPolygon(turned);
    const patch = outlinePatch(turned, pts);
    expect(patch.widthM).toBeCloseTo(4, 6);
    expect(patch.heightM).toBeCloseTo(2, 6);
    expect(getRotateDeg({ provenance: patch.provenance ?? null })).toBe(30);
  });

  it('pointInPolygon knows the notch of an L', () => {
    expect(pointInPolygon(2, 4, corners)).toBe(true);
    expect(pointInPolygon(4, 4, corners)).toBe(false);
  });
});

describe('plants follow their bed', () => {
  const bed = el('bed'); // 3…7 by 4…6
  const inside = plant('in', 4, 4.5, { plantSlug: 'tomate', parentBedId: 'bed' });
  const unnamed = plant('unnamed', 6, 5.5);
  const outside = plant('out', 9, 9);
  const all = [bed, inside, unnamed, outside];

  it('a bed knows its plants: named ones and unnamed ones lying in it', () => {
    expect(plantsOfBed(bed, all).map((p) => p.id)).toEqual(['in', 'unnamed']);
    // A plant that names another bed is not taken along even when it lies here.
    const foreign = plant('foreign', 5, 5, { parentBedId: 'other' });
    expect(plantsOfBed(bed, [bed, foreign])).toEqual([]);
  });

  it('moving the bed moves its plants; plants outside stay', () => {
    const next = applyElementPatch(all, 'bed', { xM: 7, yM: 6 }, NOW);
    const at = (id: string) => next.find((e) => e.id === id)!;
    expect([at('in').xM, at('in').yM]).toEqual([6, 5.5]);
    expect([at('unnamed').xM, at('unnamed').yM]).toEqual([8, 6.5]);
    expect([at('out').xM, at('out').yM]).toEqual([9, 9]);
    expect(at('out')).toBe(outside);
  });

  it('resizing spreads the plants with the bed; turning takes them round', () => {
    const wider = carryPlants(toBox(bed), { ...toBox(bed), widthM: 8 }, [inside]);
    expect(wider[0].patch.xM).toBeCloseTo(3, 6); // 1 m left of centre becomes 2 m
    const turned = carryPlants(toBox(bed), { ...toBox(bed), rotateDeg: 90 }, [inside]);
    expect(turned[0].patch.xM).toBeCloseTo(5.5, 6);
    expect(turned[0].patch.yM).toBeCloseTo(4, 6);
    expect(getRotateDeg({ provenance: turned[0].patch.provenance ?? null })).toBe(90);
  });

  it('a plant keeps its own size when the bed is resized', () => {
    const next = applyElementPatch(all, 'bed', { widthM: 8 }, NOW);
    expect(next.find((e) => e.id === 'in')!.widthM).toBe(0.4);
  });

  it('a plant moved out of its bed stops belonging to it; moved in, it belongs', () => {
    const out = applyElementPatch(all, 'in', { xM: 10, yM: 10 }, NOW);
    const moved = out.find((e) => e.id === 'in')!;
    expect((moved.provenance as Record<string, unknown>).parentBedId).toBeUndefined();
    expect((moved.provenance as Record<string, unknown>).plantSlug).toBe('tomate');
    const back = applyElementPatch(out, 'out', { xM: 5, yM: 5 }, NOW);
    expect((back.find((e) => e.id === 'out')!.provenance as Record<string, unknown>).parentBedId).toBe('bed');
  });

  it('renaming a bed does not touch its plants', () => {
    const next = applyElementPatch(all, 'bed', { label: 'Neu' }, NOW);
    expect(next.find((e) => e.id === 'in')).toBe(inside);
  });

  it('bedContaining follows a free outline', () => {
    const { box, outline } = outlineFromCorners([
      { x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 5 }, { x: 1, y: 5 },
    ]);
    const l = el('l', { ...box, provenance: { outline } });
    expect(bedContaining([l], 2, 4)?.id).toBe('l');
    expect(bedContaining([l], 4, 4)).toBeUndefined();
  });
});
