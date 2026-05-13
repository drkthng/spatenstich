// Phase 7 Plan 03 (Wave 2 GREEN): bedLayout assertions filled in (was Plan 01 Wave 0 it.todo).
// EDIT-05. >=3 points required; bbox center = axis-aligned bbox center (MVP).

import { polygonToBbox, type Point2D } from '../bedLayout';

describe('geometry.bedLayout > polygonToBbox', () => {
  it('throws when points.length < 3 with message "polygon needs at least 3 points"', () => {
    expect(() => polygonToBbox([])).toThrow('polygon needs at least 3 points');
    expect(() => polygonToBbox([{ x: 0, y: 0 }])).toThrow('polygon needs at least 3 points');
    expect(() => polygonToBbox([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow(
      'polygon needs at least 3 points',
    );
  });

  it('triangle (0,0)/(2,0)/(1,2) returns xM=1, yM=1, widthM=2, heightM=2', () => {
    const tri: Point2D[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ];
    expect(polygonToBbox(tri)).toEqual({
      xM: 1,
      yM: 1,
      widthM: 2,
      heightM: 2,
    });
  });

  it('square (0,0)/(2,0)/(2,2)/(0,2) returns xM=1, yM=1, widthM=2, heightM=2', () => {
    const sq: Point2D[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    expect(polygonToBbox(sq)).toEqual({
      xM: 1,
      yM: 1,
      widthM: 2,
      heightM: 2,
    });
  });

  it('irregular pentagon: xM/yM = geometric center of axis-aligned bbox (not polygon centroid — MVP approximation)', () => {
    // Pentagon with x range [0, 4], y range [0, 3]. bbox-center MUST be (2, 1.5),
    // which is intentionally NOT the polygon centroid for this shape.
    const pent: Point2D[] = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 2, y: 3 },
    ];
    const bb = polygonToBbox(pent);
    expect(bb.xM).toBe(2);
    expect(bb.yM).toBe(1.5);
    expect(bb.widthM).toBe(4);
    expect(bb.heightM).toBe(3);
  });

  it('handles negative coordinates: points (-1,-1)/(1,-1)/(0,1) returns xM=0, yM=0, widthM=2, heightM=2', () => {
    const tri: Point2D[] = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 0, y: 1 },
    ];
    expect(polygonToBbox(tri)).toEqual({
      xM: 0,
      yM: 0,
      widthM: 2,
      heightM: 2,
    });
  });
});
