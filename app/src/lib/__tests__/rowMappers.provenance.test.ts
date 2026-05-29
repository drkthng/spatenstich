// Phase 09.1 Plan 05 GREEN: provenance round-trip + D-19/D-20/D-21 column-discipline.
// Round-trip: planElementToDb → planElementToLocal preserves all provenance fields without loss.
// Column-discipline: label/widthM/heightM live on dedicated columns, NOT in provenance.

import { planElementToDb, planElementToLocal } from '../mappers/rowMappers';
import type { PlanElementRow } from '@spatenstich/shared';

/** Helper to create a minimal PlanElementRow for testing. */
function makeEl(overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: 'el-test-1',
    gardenId: 'garden-1',
    elementType: 'Beet',
    label: 'Test Element',
    xM: 1.0,
    yM: 2.0,
    widthM: 3.0,
    heightM: 1.5,
    confidence: 'high',
    isAccepted: true,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    updatedByUserId: 'user-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual', zOrder: 0 },
    layer: 'infrastructure',
    ...overrides,
  };
}

describe('lib/rowMappers > provenance round-trip (D-19)', () => {
  it('planElementToLocal preserves provenance.zOrder field in round-trip', () => {
    const local = makeEl({ provenance: { source: 'manual', zOrder: 7 } });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect((back.provenance as Record<string, unknown>)?.zOrder).toBe(7);
  });

  it('planElementToLocal preserves provenance.note field in round-trip', () => {
    const local = makeEl({ provenance: { source: 'manual', zOrder: 0, note: 'Hallo Welt mit Umlauten ÄÖÜß' } });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect((back.provenance as Record<string, unknown>)?.note).toBe('Hallo Welt mit Umlauten ÄÖÜß');
  });

  it('planElementToLocal preserves provenance.plantedAt field in round-trip (ISO-Date string)', () => {
    const local = makeEl({ provenance: { source: 'manual', zOrder: 0, plantedAt: '2026-04-15' } });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect((back.provenance as Record<string, unknown>)?.plantedAt).toBe('2026-04-15');
  });

  it('planElementToLocal preserves provenance.accentColor field in round-trip (hex string)', () => {
    const local = makeEl({ provenance: { source: 'manual', zOrder: 0, accentColor: '#a1b2c3' } });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect((back.provenance as Record<string, unknown>)?.accentColor).toBe('#a1b2c3');
  });

  it('planElementToLocal preserves provenance.rotateDeg AND provenance.plantSlug simultaneously (Pitfall 5)', () => {
    const local = makeEl({
      provenance: { source: 'manual', zOrder: 0, rotateDeg: 45.0, plantSlug: 'tomate-cherry' },
    });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    const prov = back.provenance as Record<string, unknown>;
    expect(prov.rotateDeg).toBe(45.0);
    expect(prov.plantSlug).toBe('tomate-cherry');
  });

  it('round-trips provenance.source field (existing field "manual" stays)', () => {
    const local = makeEl({ provenance: { source: 'manual', zOrder: 0 } });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect((back.provenance as Record<string, unknown>)?.source).toBe('manual');
  });

  it('round-trips all 09.1 provenance fields simultaneously without loss', () => {
    const local = makeEl({
      provenance: {
        source: 'manual',
        zOrder: 3,
        note: 'Mein Beet',
        plantedAt: '2026-05-01',
        accentColor: '#ff6600',
        rotateDeg: 90.0,
        plantSlug: 'basilikum',
      },
    });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    const prov = back.provenance as Record<string, unknown>;
    expect(prov.source).toBe('manual');
    expect(prov.zOrder).toBe(3);
    expect(prov.note).toBe('Mein Beet');
    expect(prov.plantedAt).toBe('2026-05-01');
    expect(prov.accentColor).toBe('#ff6600');
    expect(prov.rotateDeg).toBe(90.0);
    expect(prov.plantSlug).toBe('basilikum');
  });

  it('label and widthM/heightM live on dedicated columns, NOT in provenance (D-20/D-21)', () => {
    const local = makeEl({
      widthM: 1.5,
      heightM: 2.0,
      label: 'Beet A',
      provenance: { zOrder: 0, source: 'manual' },
    });
    const db = planElementToDb(local);
    // label is own column, no provenance duplicate
    expect((db.provenance as Record<string, unknown> | null | undefined)?.label).toBeUndefined();
    expect((db.provenance as Record<string, unknown> | null | undefined)?.widthM).toBeUndefined();
    expect((db.provenance as Record<string, unknown> | null | undefined)?.heightM).toBeUndefined();
    // Round-trip preserves label intact via dedicated column
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect(back.label).toBe('Beet A');
    expect(back.widthM).toBe(1.5);
    expect(back.heightM).toBe(2.0);
  });

  it('provenance survives null → returns null (normalization)', () => {
    const local = makeEl({ provenance: null });
    const db = planElementToDb(local);
    const back = planElementToLocal(db as Parameters<typeof planElementToLocal>[0]);
    expect(back.provenance).toBeNull();
  });
});
