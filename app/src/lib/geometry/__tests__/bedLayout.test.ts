// Phase 7 Plan 03 (Wave 2 GREEN): bedLayout assertions filled in (was Plan 01 Wave 0 it.todo).
// EDIT-05. >=3 points required; bbox center = axis-aligned bbox center (MVP).

import { polygonToBbox, pointInPolygon, type Point2D } from '../bedLayout';

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

describe('geometry.bedLayout > pointInPolygon', () => {
  const unitSquare: Point2D[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];

  it('returns false for polygon with fewer than 3 points (guard, not throw)', () => {
    const point: Point2D = { x: 1, y: 1 };
    expect(pointInPolygon(point, [])).toBe(false);
    expect(pointInPolygon(point, [{ x: 0, y: 0 }])).toBe(false);
    expect(pointInPolygon(point, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });

  it('returns true for point (1,1) inside unit square [(0,0),(2,0),(2,2),(0,2)]', () => {
    expect(pointInPolygon({ x: 1, y: 1 }, unitSquare)).toBe(true);
  });

  it('returns false for point (3,3) outside unit square', () => {
    expect(pointInPolygon({ x: 3, y: 3 }, unitSquare)).toBe(false);
  });

  it('documents implementation-defined behavior for point on vertex (0,0)', () => {
    // Ray-casting on vertices is implementation-defined; we just document the result
    const result = pointInPolygon({ x: 0, y: 0 }, unitSquare);
    expect(typeof result).toBe('boolean');
  });

  it('concave L-shape: point inside concavity returns false, point in body returns true', () => {
    // L-shape polygon:
    //  (0,0)---(2,0)
    //  |            |
    //  |   (2,1)---(1,1)
    //  |   |
    //  (0,2)---(1,2)  -- wait, let me define properly
    // An L-shape: bottom-left block + top-left block
    const lShape: Point2D[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    // Point in the body of the L (bottom-left area)
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, lShape)).toBe(true);
    // Point in the concavity (upper-right notch, outside the L)
    expect(pointInPolygon({ x: 1.5, y: 1.5 }, lShape)).toBe(false);
  });
});
