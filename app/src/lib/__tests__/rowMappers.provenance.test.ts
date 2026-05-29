// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 1 GREEN fills.
// Plan 01 GREEN-fill: rowMapper round-trip for all new provenance fields (D-19).
// Pins Pitfall-5 (provenance spread must preserve ALL fields simultaneously).

describe('lib/rowMappers > provenance round-trip (D-19)', () => {
  it.todo('planElementToLocal preserves provenance.zOrder field in round-trip');
  it.todo('planElementToLocal preserves provenance.note field in round-trip');
  it.todo('planElementToLocal preserves provenance.plantedAt field in round-trip (ISO-Date string)');
  it.todo('planElementToLocal preserves provenance.accentColor field in round-trip (hex string)');
  it.todo('planElementToLocal preserves provenance.rotateDeg AND provenance.plantSlug simultaneously (Pitfall 5)');
});
