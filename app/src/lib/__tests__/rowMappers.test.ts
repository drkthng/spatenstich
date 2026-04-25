// rowMappers unit tests — Plan 03-03 Task 01.
// TDD RED: written BEFORE rowMappers.ts + errors.ts exist.
// Tests cover camelCase↔snake_case round-trips for all 6 entities,
// normalizeDisplayName, and new Error classes.

import type {
  GardenRow,
  VereinsregelnRow,
  ProfileRow,
} from '@spatenstich/shared';
import type { VereinsRegel } from '@spatenstich/shared';

// --- Lazy imports after the module exists ---
import {
  gardenToLocalRow,
  localToGardenView,
  gardenFromDb,
  vereinsregelnToLocalRow,
  localToVereinsregeln,
  profileToLocalRow,
  normalizeDisplayName,
} from '../mappers/rowMappers';
import {
  OutboxEnqueueError,
  ConflictError,
  NotOwnerError,
  GardenHasMembersError,
  CannotTransferToSelfError,
  TargetNotMemberError,
} from '../errors';

const NOW = new Date('2026-04-24T12:00:00.000Z');

// ── Test 1: gardenToLocalRow ──────────────────────────────────────────────
describe('gardenToLocalRow', () => {
  it('creates a new GardenRow with RowBase-conforme Felder', () => {
    const row = gardenToLocalRow('g-1', { name: 'Dirk Garten' }, 'u-1', null, NOW);
    expect(row.id).toBe('g-1');
    expect(row.name).toBe('Dirk Garten');
    expect(row.updatedByUserId).toBe('u-1');
    expect(row.updatedAt).toBe(NOW.toISOString());
    expect(row.deletedAt).toBeNull();
  });

  it('merges patch into existing row', () => {
    const existing: GardenRow = {
      id: 'g-1',
      name: 'Alt',
      ownerUserId: 'u-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      updatedByUserId: 'u-1',
      deletedAt: null,
    };
    const row = gardenToLocalRow('g-1', { name: 'Neu' }, 'u-1', existing, NOW);
    expect(row.name).toBe('Neu');
    expect(row.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(row.updatedAt).toBe(NOW.toISOString());
  });
});

// ── Test 2: gardenFromDb ────────────────────────────────────────────────
describe('gardenFromDb', () => {
  it('maps snake_case DB row to camelCase GardenRow', () => {
    const dbRow = {
      id: 'g-1',
      name: 'Mein Garten',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-04-24T12:00:00Z',
      updated_by_user_id: 'u-1',
      created_by_user_id: 'u-1',
      deleted_at: null,
      owner_user_id: 'u-1',
      plz: '12043',
      klimazone: 4,
      archetype: 'selbstversorger',
    };
    // gardenFromDb uses Database['public']['Tables']['gardens']['Row']
    // We cast to the right type for testing purposes
    const row = gardenFromDb(dbRow as Parameters<typeof gardenFromDb>[0]);
    expect(row.id).toBe('g-1');
    expect(row.updatedByUserId).toBe('u-1');
    expect(row.updatedAt).toBe('2026-04-24T12:00:00Z');
  });
});

// ── Test 3: localToGardenView ─────────────────────────────────────────────
describe('localToGardenView', () => {
  it('converts GardenRow to Garden domain type', () => {
    const row: GardenRow & { plz?: string; klimazone?: number; archetype?: string } = {
      id: 'g-1',
      name: 'Test',
      ownerUserId: 'u-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-04-24T12:00:00Z',
      updatedByUserId: 'u-1',
      deletedAt: null,
      plz: '12043',
      klimazone: 4,
      archetype: 'selbstversorger',
    };
    const garden = localToGardenView(row as GardenRow);
    expect(garden.id).toBe('g-1');
    expect(garden.name).toBe('Test');
    expect(garden.updatedByUserId).toBe('u-1');
  });
});

// ── Test 4: vereinsregeln round-trip ─────────────────────────────────────
describe('vereinsregelnToLocalRow + localToVereinsregeln', () => {
  const rules: VereinsRegel[] = [
    {
      id: 'r-1',
      titel: 'Test',
      istBKleingG: false,
      aktiv: true,
      source: 'manual',
    },
  ];

  it('creates a VereinsregelnRow with RowBase-konforme Felder', () => {
    const row = vereinsregelnToLocalRow('g-1', rules, 'u-1', null, NOW);
    expect(row.id).toBe('g-1');
    expect(row.gardenId).toBe('g-1');
    expect(row.updatedByUserId).toBe('u-1');
    expect(row.updatedAt).toBe(NOW.toISOString());
    expect(row.deletedAt).toBeNull();
  });

  it('round-trip: fromRow(toRow(rules)) returns original rules', () => {
    const row = vereinsregelnToLocalRow('g-1', rules, 'u-1', null, NOW);
    const recovered = localToVereinsregeln(row);
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.id).toBe('r-1');
    expect(recovered[0]!.titel).toBe('Test');
    expect(recovered[0]!.istBKleingG).toBe(false);
    expect(recovered[0]!.aktiv).toBe(true);
  });

  it('returns [] for null row', () => {
    expect(localToVereinsregeln(null)).toEqual([]);
  });
});

// ── Test 5: normalizeDisplayName ─────────────────────────────────────────
describe('normalizeDisplayName', () => {
  it('returns null for null/undefined input', () => {
    expect(normalizeDisplayName(null)).toBeNull();
    expect(normalizeDisplayName(undefined)).toBeNull();
  });

  it('trims and limits to 40 chars', () => {
    const long = 'a'.repeat(50);
    const result = normalizeDisplayName(long);
    expect(result!.length).toBe(40);
  });

  it('returns null for empty string', () => {
    expect(normalizeDisplayName('  ')).toBeNull();
  });

  it('returns trimmed string for normal input', () => {
    expect(normalizeDisplayName('  Dirk  ')).toBe('Dirk');
  });
});

// ── Test 6: profileToLocalRow ────────────────────────────────────────────
describe('profileToLocalRow', () => {
  it('creates a new ProfileRow with RowBase-konforme Felder', () => {
    const row = profileToLocalRow('u-1', { displayName: 'Dirk' }, null, NOW);
    expect(row.id).toBe('u-1');
    expect(row.userId).toBe('u-1');
    expect(row.displayName).toBe('Dirk');
    expect(row.updatedByUserId).toBe('u-1');
    expect(row.updatedAt).toBe(NOW.toISOString());
    expect(row.deletedAt).toBeNull();
  });

  it('normalizes displayName via normalizeDisplayName', () => {
    const row = profileToLocalRow('u-1', { displayName: '  x '.repeat(15) }, null, NOW);
    // should be trimmed + max 40 chars
    expect(row.displayName!.length).toBeLessThanOrEqual(40);
  });

  it('merges patch into existing row', () => {
    const existing: ProfileRow = {
      id: 'u-1',
      userId: 'u-1',
      displayName: 'Alt',
      locale: 'de',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      updatedByUserId: 'u-1',
      deletedAt: null,
    };
    const row = profileToLocalRow('u-1', { displayName: 'Neu' }, existing, NOW);
    expect(row.displayName).toBe('Neu');
    expect(row.locale).toBe('de');
    expect(row.createdAt).toBe('2026-01-01T00:00:00Z');
  });
});

// ── Test 7: Error classes ─────────────────────────────────────────────────
describe('Error classes', () => {
  it('OutboxEnqueueError has correct code and name', () => {
    const err = new OutboxEnqueueError('gardens', 'g-1', new Error('cause'));
    expect(err.code).toBe('OUTBOX_ENQUEUE_FAILED');
    expect(err.name).toBe('OutboxEnqueueError');
    expect(err instanceof Error).toBe(true);
  });

  it('ConflictError has correct code, name, entity, rowId', () => {
    const err = new ConflictError('gardens', 'g-1');
    expect(err.code).toBe('CONFLICT_STALE_WRITE');
    expect(err.name).toBe('ConflictError');
    expect(err.entity).toBe('gardens');
    expect(err.rowId).toBe('g-1');
  });

  it('NotOwnerError has correct code', () => {
    const err = new NotOwnerError();
    expect(err.code).toBe('NOT_OWNER');
    expect(err.name).toBe('NotOwnerError');
  });

  it('GardenHasMembersError has correct code', () => {
    const err = new GardenHasMembersError();
    expect(err.code).toBe('GARDEN_HAS_MEMBERS');
  });

  it('CannotTransferToSelfError has correct code', () => {
    const err = new CannotTransferToSelfError();
    expect(err.code).toBe('CANNOT_TRANSFER_TO_SELF');
  });

  it('TargetNotMemberError has correct code', () => {
    const err = new TargetNotMemberError();
    expect(err.code).toBe('TARGET_NOT_MEMBER');
  });
});
