// Phase 33: "did this row really change?" Two versions of a row count as the same when
// they differ only in the bookkeeping fields: edit time, editor, server arrival stamp.

/** JSON with object keys in a fixed order at every depth, so key order never matters. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const body = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${body.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function sameContent<T extends object>(a: T, b: T): boolean {
  const strip = (row: T): string => {
    const { updatedAt: _u, updatedByUserId: _b, serverUpdatedAt: _s, ...rest } = row as Record<string, unknown>;
    return stableStringify(rest);
  };
  return strip(a) === strip(b);
}
