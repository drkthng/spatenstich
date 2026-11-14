import { getNorthDeg, withNorthDeg, NORTH_DEG_KEY, getBoundary, withBoundary, BOUNDARY_KEY } from '../utils';

describe('north direction in extraDims', () => {
  it('defaults to 0 when nothing is stored', () => {
    expect(getNorthDeg(null)).toBe(0);
    expect(getNorthDeg(undefined)).toBe(0);
    expect(getNorthDeg({})).toBe(0);
    expect(getNorthDeg({ [NORTH_DEG_KEY]: 'x' })).toBe(0);
  });

  it('normalises into 0…359', () => {
    expect(getNorthDeg({ [NORTH_DEG_KEY]: 370 })).toBe(10);
    expect(getNorthDeg({ [NORTH_DEG_KEY]: -15 })).toBe(345);
    expect(getNorthDeg({ [NORTH_DEG_KEY]: 360 })).toBe(0);
  });

  it('keeps other keys when setting north', () => {
    const next = withNorthDeg({ lShapeCut: 2 }, 45);
    expect(next).toEqual({ lShapeCut: 2, [NORTH_DEG_KEY]: 45 });
    expect(withNorthDeg(null, -90)).toEqual({ [NORTH_DEG_KEY]: 270 });
  });
});

describe('free parcel boundary in extraDims', () => {
  const tri = [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 6, y: 13 }];

  it('is null for a plain rectangle and for broken data', () => {
    expect(getBoundary(null, 12, 13)).toBeNull();
    expect(getBoundary({ [BOUNDARY_KEY]: [{ x: 0, y: 0 }] }, 12, 13)).toBeNull();
    expect(getBoundary({ [BOUNDARY_KEY]: [{ x: 0, y: 0 }, { x: 1, y: 'a' }, { x: 2, y: 2 }] }, 12, 13)).toBeNull();
  });

  it('is clamped into the rectangle of the parcel', () => {
    expect(getBoundary({ [BOUNDARY_KEY]: [{ x: -1, y: 0 }, { x: 20, y: 0 }, { x: 6, y: 99 }] }, 12, 13)).toEqual(tri);
  });

  it('is set and removed without touching other keys', () => {
    const set = withBoundary({ [NORTH_DEG_KEY]: 30 }, tri);
    expect(set).toEqual({ [NORTH_DEG_KEY]: 30, [BOUNDARY_KEY]: tri });
    expect(withBoundary(set, null)).toEqual({ [NORTH_DEG_KEY]: 30 });
  });
});
