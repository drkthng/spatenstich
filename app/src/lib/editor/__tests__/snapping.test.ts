// Phase 32 (EDIT3-13): snapping to neighbours, the boundary, equal gaps and the grid.

import { snapMove, snapResize, unionBounds, type Bounds } from '../snapping';
import type { Box } from '../elementGeometry';

const opts = { toleranceM: 0.15, gridM: 1, garden: { widthM: 12, heightM: 13 } };
const b = (minX: number, minY: number, maxX: number, maxY: number): Bounds => ({ minX, minY, maxX, maxY });

describe('snapMove', () => {
  it('an edge catches on the edge of a neighbour and a guide spans both', () => {
    // Neighbour 2…4 by 2…3; the moving box would start at x = 4.1.
    const r = snapMove(b(4.1, 5.5, 6.1, 6.4), [b(2, 2, 4, 3)], opts);
    expect(r.dxM).toBeCloseTo(-0.1, 9);
    expect(r.guides.align).toContainEqual({ axis: 'x', at: 4, from: 2, to: 6.4 });
  });

  it('centres catch on centres', () => {
    // Neighbour centre x = 3; moving box 2.3…3.9 has its centre at 3.1; the edges are too far.
    const r = snapMove(b(2.3, 6.3, 3.9, 6.8), [b(2, 2, 4, 3)], opts);
    expect(r.dxM).toBeCloseTo(-0.1, 9);
    expect(r.guides.align[0]).toMatchObject({ axis: 'x', at: 3 });
  });

  it('the nearest candidate wins', () => {
    const r = snapMove(b(4.12, 5.5, 6.12, 6.4), [b(2, 2, 4, 3), b(2, 8, 4.1, 9)], opts);
    expect(r.dxM).toBeCloseTo(-0.02, 9);
  });

  it('edges catch on the parcel boundary', () => {
    const r = snapMove(b(0.08, 5.3, 2.08, 6.3), [], opts);
    expect(r.dxM).toBeCloseTo(-0.08, 9);
    expect(r.guides.align[0]).toMatchObject({ axis: 'x', at: 0 });
    expect(snapMove(b(9.9, 5.3, 11.9, 6.3), [], opts).dxM).toBeCloseTo(0.1, 9);
  });

  it('between two neighbours it catches where the gaps are equal', () => {
    // Left ends at 2, right starts at 8; a 2 m box centred between them starts at 4.
    const r = snapMove(b(4.1, 2.2, 6.1, 2.8), [b(0.5, 2, 2, 3), b(8, 2, 9.5, 3)], opts);
    expect(r.dxM).toBeCloseTo(-0.1, 9);
    expect(r.guides.gaps).toHaveLength(1);
    expect(r.guides.gaps[0]).toMatchObject({ axis: 'x', first: [2, 4], second: [6, 8] });
  });

  it('where nothing is near, edges catch on grid lines', () => {
    const r = snapMove(b(3.07, 5.4, 4.6, 6.2), [], opts);
    expect(r.dxM).toBeCloseTo(-0.07, 9);
    expect(r.guides.align).toEqual([]);
  });

  it('out of reach nothing happens', () => {
    const r = snapMove(b(4.4, 5.4, 5.6, 6.3), [b(1, 1, 2, 2)], opts);
    expect(r.dxM).toBe(0);
    expect(r.dyM).toBe(0);
    expect(r.guides).toEqual({ align: [], gaps: [] });
  });

  it('both axes snap independently', () => {
    const r = snapMove(b(4.1, 3.05, 6.1, 4.5), [b(2, 2, 4, 3)], opts);
    expect(r.dxM).toBeCloseTo(-0.1, 9);
    expect(r.dyM).toBeCloseTo(-0.05, 9);
    expect(r.guides.align).toHaveLength(2);
  });

  it('unionBounds spans a group', () => {
    expect(unionBounds([b(1, 1, 2, 2), b(4, 0, 5, 3)])).toEqual(b(1, 0, 5, 3));
  });
});

describe('snapResize', () => {
  const start: Box = { xM: 3, yM: 5, widthM: 2, heightM: 1, rotateDeg: 0 };

  it('only the edge that moved catches; the other stays', () => {
    // East edge pulled from 4 to 5.9; a neighbour edge is at 6.
    const resized: Box = { ...start, xM: 3.95, widthM: 3.9 };
    const r = snapResize(start, resized, [b(6, 1, 7, 2)], opts, 0.05);
    expect(r.box.widthM).toBeCloseTo(4, 9);
    expect(r.box.xM - r.box.widthM / 2).toBeCloseTo(2, 9);
    expect(r.guides.align[0]).toMatchObject({ axis: 'x', at: 6 });
  });

  it('works for an element turned by 90°: its width runs down the plan', () => {
    const turned: Box = { xM: 3, yM: 5, widthM: 2, heightM: 1, rotateDeg: 90 };
    // Bounds 2.5…3.5 by 4…6; the bottom edge is pulled to 6.9, the grid line is at 7.
    const resized: Box = { ...turned, yM: 5.45, widthM: 2.9 };
    const r = snapResize(turned, resized, [], opts, 0.05);
    expect(r.box.widthM).toBeCloseTo(3, 9);
    expect(r.box.heightM).toBe(1);
    expect(r.box.yM).toBeCloseTo(5.5, 9);
  });

  it('leaves elements at other angles alone', () => {
    const tilted: Box = { ...start, rotateDeg: 30 };
    const resized: Box = { ...tilted, widthM: 3.9 };
    expect(snapResize(tilted, resized, [b(6, 1, 7, 2)], opts, 0.05).box).toBe(resized);
  });
});
