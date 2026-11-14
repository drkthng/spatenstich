import { getNorthDeg, withNorthDeg, NORTH_DEG_KEY } from '../utils';

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
