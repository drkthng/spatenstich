// Phase 7 Plan 02: rowMappers layer field — TDD GREEN (Wave-0 stub from Plan 01 Task 4 now filled).

// process.env stubs (matches gardenPlanRepo.test.ts:5-6 pattern for node-project tests)
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import { planElementToDb, planElementToLocal } from '../mappers/rowMappers';
import type { PlanElementRow } from '@spatenstich/shared';

function makeBaseLocal(overrides: Partial<PlanElementRow> = {}): PlanElementRow {
  return {
    id: 'e-1',
    gardenId: 'g-1',
    elementType: 'Beet',
    label: 'Hochbeet',
    xM: 1,
    yM: 1,
    widthM: 2,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: null,
    layer: 'infrastructure',
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBaseDb(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'e-1',
    garden_id: 'g-1',
    element_type: 'Beet',
    label: 'Hochbeet',
    x_m: 1,
    y_m: 1,
    width_m: 2,
    height_m: 1,
    confidence: null,
    is_accepted: true,
    created_at: '2026-05-12T10:00:00.000Z',
    updated_at: '2026-05-12T10:00:00.000Z',
    updated_by_user_id: 'u-1',
    deleted_at: null,
    imported_from: null,
    provenance: null,
    layer: 'infrastructure',
    ...overrides,
  };
}

describe('rowMappers layer field (Phase 7)', () => {
  it('round-trips layer="infrastructure" through planElementToDb -> planElementToLocal', () => {
    const local = makeBaseLocal({ layer: 'infrastructure' });
    const db = planElementToDb(local);
    expect(db['layer']).toBe('infrastructure');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = planElementToLocal(db as any);
    expect(back.layer).toBe('infrastructure');
  });

  it('round-trips layer="seasonal" through planElementToDb -> planElementToLocal', () => {
    const local = makeBaseLocal({ layer: 'seasonal', elementType: 'Pflanze' });
    const db = planElementToDb(local);
    expect(db['layer']).toBe('seasonal');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = planElementToLocal(db as any);
    expect(back.layer).toBe('seasonal');
  });

  it('planElementToDb writes "layer" snake_case key (camelToSnake)', () => {
    const local = makeBaseLocal({ layer: 'infrastructure' });
    const db = planElementToDb(local);
    expect(Object.keys(db)).toContain('layer');
  });
});

describe('rowMappers layer pre-018 lazy defaults (Pitfall-8)', () => {
  it('pre-018 row with layer=undefined AND element_type="Pflanze" -> planElementToLocal returns layer="seasonal"', () => {
    const db = makeBaseDb({ element_type: 'Pflanze' });
    delete db.layer;
    const local = planElementToLocal(db);
    expect(local.layer).toBe('seasonal');
  });

  it('pre-018 row with layer=undefined AND element_type="Beet" -> planElementToLocal returns layer="infrastructure"', () => {
    const db = makeBaseDb({ element_type: 'Beet' });
    delete db.layer;
    const local = planElementToLocal(db);
    expect(local.layer).toBe('infrastructure');
  });

  it('pre-018 row with layer=null AND element_type="Pflanze" -> layer="seasonal"', () => {
    const db = makeBaseDb({ layer: null, element_type: 'Pflanze' });
    const local = planElementToLocal(db);
    expect(local.layer).toBe('seasonal');
  });

  it('row with explicit layer="seasonal" overrides element_type-based default', () => {
    const db = makeBaseDb({ layer: 'seasonal', element_type: 'Beet' });
    const local = planElementToLocal(db);
    expect(local.layer).toBe('seasonal');
  });

  it('row with explicit layer="infrastructure" overrides element_type-based default', () => {
    const db = makeBaseDb({ layer: 'infrastructure', element_type: 'Pflanze' });
    const local = planElementToLocal(db);
    expect(local.layer).toBe('infrastructure');
  });
});
