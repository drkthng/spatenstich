// Zentralisierte camelCase↔snake_case Mapper für alle 6 Entities.
// Plan 03-03 Task 01: DRY — vorher duplizierte toRow/fromRow-Logik in jedem Repo.
//
// WICHTIG: Die DB-Typen in packages/shared/src/types/database.ts entsprechen dem
// Stand vor Plan 03-01. Plan 03-01 hat neue Spalten hinzugefügt (deleted_at,
// updated_by_user_id auf profiles, photo_queue-Tabelle). Diese werden mit Type-Assertions
// zugegriffen, da die Typen noch nicht regeneriert wurden.
// Nach dem nächsten `pnpm --filter app gen:types` werden die Assertions aufgelöst.
//
// Design-Entscheidungen:
// - GardenRow-Erweiterung (plz/klimazone/archetype): Phase-2.5-Pivot D-01 hat diese
//   Felder auf gardens-Tabelle verschoben. Lokal werden sie im erweiterten GardenRow
//   gespeichert.
// - VereinsregelnRow: 1 lokale Row pro Garden (Option A) mit rules:{list:[...]} Payload.
//   DB bleibt N Rows — SyncWorker-Push splittet bei Push (vereinsregelnToDbRows).
// - ProfileRow: account-mode; local-mode behält KV-Blob in profileRepo.ts.

import type {
  Database,
  GardenRow,
  GardenMemberRow,
  ProfileRow,
  VereinsregelnRow,
  InviteCodeRow,
  PhotoQueueRow,
  Garden,
  Klimazone,
  Archetype,
  VereinsRegel,
} from '@spatenstich/shared';

// Supabase-Row-Typen (snake_case) aus packages/shared/src/types/database.ts
type DbGardenRow = Database['public']['Tables']['gardens']['Row'];
type DbGardenMemberRow = Database['public']['Tables']['garden_members']['Row'];
type DbProfileRow = Database['public']['Tables']['profiles']['Row'];
type DbVereinsregelnRow = Database['public']['Tables']['vereinsregeln']['Row'];
type DbInviteCodeRow = Database['public']['Tables']['invite_codes']['Row'];

// photo_queue ist noch nicht in database.ts (wird nach gen:types verfügbar).
// Interim: loose type für photoQueueFromDb.
type DbPhotoQueueRowLoose = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  deleted_at?: string | null;
  garden_id: string;
  geo_lat: number | null;
  geo_lng: number | null;
  storage_path?: string | null;
  last_error?: string | null;
  uploaded_at?: string | null;
};

// ── Gardens ────────────────────────────────────────────────────────────────

/**
 * Domain→Local: erzeugt eine camelCase GardenRow für die lokale Row-Table.
 * Wird von gardenRepo VOR writeWithOutbox aufgerufen.
 * updatedAt = now.toISOString() wird lokal gestempelt (Pattern 6).
 * Server-LWW-Trigger überschreibt ggf. beim Server-Push (Plan 03-01).
 */
export function gardenToLocalRow(
  id: string,
  patch: {
    name?: string;
    ownerUserId?: string;
    plz?: string | null;
    klimazone?: string | null;
    archetype?: string | null;
  },
  userId: string,
  existingRow: GardenRow | null,
  now: Date = new Date(),
): GardenRow {
  const base: GardenRow = existingRow ?? {
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
    deletedAt: null,
    name: '',
    ownerUserId: userId,
  };
  return {
    ...base,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.ownerUserId !== undefined ? { ownerUserId: patch.ownerUserId } : {}),
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
  };
}

/**
 * Local→Domain-View: GardenRow → Garden (kompatibel zu bestehendem `Garden`-Typ in shared).
 * plz/klimazone/archetype werden aus erweiterten Feldern der Row gezogen
 * (Phase 2.5 D-01 Pivot — diese Felder leben auf gardens).
 */
export function localToGardenView(row: GardenRow): Garden {
  const extended = row as GardenRow & {
    plz?: string | null;
    klimazone?: string | null | number;
    archetype?: string | null;
  };
  return {
    id: row.id,
    name: row.name,
    plz: extended.plz ?? null,
    klimazone: (extended.klimazone as Klimazone | null) ?? null,
    archetype: (extended.archetype as Archetype | null) ?? null,
    // createdByUserId: Kompat-Shim — wird in Phase 3 nicht mehr lokal getrackt.
    createdByUserId: row.updatedByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Supabase→Local: snake_case DB-Row → camelCase lokale Row. */
export function gardenFromDb(row: DbGardenRow): GardenRow {
  // deleted_at + owner_user_id werden von Plan 03-01 hinzugefügt;
  // bis zur Typen-Regenerierung via any-cast.
  const r = row as DbGardenRow & {
    deleted_at?: string | null;
    owner_user_id?: string | null;
  };
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    updatedByUserId: r.updated_by_user_id ?? null,
    deletedAt: r.deleted_at ?? null,
    name: r.name,
    ownerUserId: r.owner_user_id ?? r.updated_by_user_id ?? r.created_by_user_id ?? '',
    // Extended fields (Phase 2.5 D-01):
    ...(r.plz != null ? { plz: r.plz } : {}),
    ...(r.klimazone != null ? { klimazone: r.klimazone } : {}),
    ...(r.archetype != null ? { archetype: r.archetype } : {}),
  } as GardenRow;
}

// ── Vereinsregeln ──────────────────────────────────────────────────────────

/**
 * Eine lokale VereinsregelnRow kapselt alle Regeln eines Gartens in EINEM Row-Entry
 * (Option A: 1 Row pro Garden mit `rules: {list: VereinsRegel[]}` im Payload).
 * WICHTIG: Das `id`-Feld der Row ist garden_id (eine Row pro Garden).
 */
export function vereinsregelnToLocalRow(
  gardenId: string,
  rules: VereinsRegel[],
  userId: string,
  existingRow: VereinsregelnRow | null,
  now: Date = new Date(),
): VereinsregelnRow {
  const base: VereinsregelnRow = existingRow ?? {
    id: gardenId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
    deletedAt: null,
    gardenId,
    rules: {},
  };
  return {
    ...base,
    gardenId,
    rules: { list: rules },
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
  };
}

export function localToVereinsregeln(
  row: VereinsregelnRow | null,
): VereinsRegel[] {
  if (!row) return [];
  const payload = row.rules as { list?: VereinsRegel[] };
  return payload.list ?? [];
}

/**
 * Für SyncWorker (Plan 03-04) Push: konvertiert lokale aggregierte Row
 * in Array von DB-Insert-Rows (eine pro VereinsRegel).
 */
export function vereinsregelnToDbRows(
  row: VereinsregelnRow,
  userId: string,
): Database['public']['Tables']['vereinsregeln']['Insert'][] {
  const rules = localToVereinsregeln(row);
  return rules.map((r) => ({
    id: r.id,
    created_by_user_id: userId,
    updated_by_user_id: userId,
    garden_id: row.gardenId,
    titel: r.titel,
    beschreibung: r.beschreibung ?? null,
    wert: r.wert ?? null,
    einheit: r.einheit ?? null,
    ist_bkleingg: r.istBKleingG,
    aktiv: r.aktiv,
    source: r.source,
    updated_at: row.updatedAt, // D-09 client-set timestamp
  }));
}

/** Supabase→Local: aggregiert N DB-Rows zu EINER lokalen VereinsregelnRow. */
export function vereinsregelnFromDbRows(
  dbRows: DbVereinsregelnRow[],
  gardenId: string,
): VereinsregelnRow | null {
  if (dbRows.length === 0) return null;
  const rules: VereinsRegel[] = dbRows.map((row) => ({
    id: row.id,
    titel: row.titel,
    ...(row.beschreibung != null ? { beschreibung: row.beschreibung } : {}),
    ...(row.wert != null ? { wert: row.wert } : {}),
    ...(row.einheit != null ? { einheit: row.einheit } : {}),
    istBKleingG: row.ist_bkleingg,
    aktiv: row.aktiv,
    source: row.source as VereinsRegel['source'],
  }));
  const mostRecentUpdated = dbRows
    .map((r) => r.updated_at)
    .sort()
    .pop() ?? new Date().toISOString();
  const r0 = dbRows[0] as DbVereinsregelnRow & { deleted_at?: string | null };
  return {
    id: gardenId,
    gardenId,
    createdAt: dbRows[0]!.erstellt_am,
    updatedAt: mostRecentUpdated,
    updatedByUserId: dbRows[0]!.updated_by_user_id ?? null,
    deletedAt: r0.deleted_at ?? null,
    rules: { list: rules },
  };
}

// ── Profiles ───────────────────────────────────────────────────────────────

/**
 * WR-03 display_name normalization aus Phase 02.5 Migration 012.
 * Max 40 chars, NFC-normalisiert, null für leere Strings.
 */
export function normalizeDisplayName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  // Some JS runtimes (Hermes RN) lack String.prototype.normalize — guard.
  const normalized =
    typeof (raw as string).normalize === 'function' ? raw.normalize('NFC') : raw;
  const trimmed = normalized.trim().slice(0, 40);
  return trimmed.length > 0 ? trimmed : null;
}

export function profileToLocalRow(
  userId: string,
  patch: { displayName?: string | null; locale?: string | null },
  existingRow: ProfileRow | null,
  now: Date = new Date(),
): ProfileRow {
  const base: ProfileRow = existingRow ?? {
    id: userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
    deletedAt: null,
    userId,
    displayName: null,
    locale: null,
  };
  return {
    ...base,
    ...(patch.displayName !== undefined
      ? { displayName: normalizeDisplayName(patch.displayName) }
      : {}),
    ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
    updatedAt: now.toISOString(),
    updatedByUserId: userId,
  };
}

export function profileFromDb(row: DbProfileRow): ProfileRow {
  // updated_by_user_id + deleted_at added by Plan 03-01 migration;
  // type-cast until types are regenerated.
  const r = row as DbProfileRow & {
    updated_by_user_id?: string | null;
    deleted_at?: string | null;
    locale?: string | null;
  };
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    updatedByUserId: r.updated_by_user_id ?? null,
    deletedAt: r.deleted_at ?? null,
    userId: r.id,
    displayName: r.display_name ?? null,
    locale: r.locale ?? null,
  };
}

// ── Garden Members ─────────────────────────────────────────────────────────

export function gardenMemberFromDb(row: DbGardenMemberRow): GardenMemberRow {
  return {
    id: `${row.garden_id}:${row.user_id}`,
    createdAt: row.joined_at,
    updatedAt: row.joined_at,
    updatedByUserId: row.user_id,
    deletedAt: null, // garden_members nutzt DELETE, nicht Soft-Delete
    gardenId: row.garden_id,
    userId: row.user_id,
    role: row.role as 'owner' | 'member',
  };
}

// ── Invite Codes ──────────────────────────────────────────────────────────
// NOTE: DB schema uses consumed_at/consumed_by_user_id (not used_at/used_by_user_id)

export function inviteCodeFromDb(row: DbInviteCodeRow): InviteCodeRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    updatedByUserId: row.created_by_user_id ?? null,
    deletedAt: null,
    gardenId: row.garden_id,
    code: row.code,
    expiresAt: row.expires_at ?? null,
    usedAt: row.consumed_at ?? null,
    usedByUserId: row.consumed_by_user_id ?? null,
  };
}

// ── Photo Queue ────────────────────────────────────────────────────────────
// photo_queue is not yet in database.ts types (added by Plan 03-01 migration).
// Uses loose type DbPhotoQueueRowLoose until gen:types is run.

export function photoQueueFromDb(row: DbPhotoQueueRowLoose): PhotoQueueRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedByUserId: row.created_by_user_id ?? null,
    deletedAt: row.deleted_at ?? null,
    gardenId: row.garden_id,
    storagePath: row.storage_path ?? '',
    geoLat: row.geo_lat,
    geoLng: row.geo_lng,
    uploadStatus: row.uploaded_at != null ? 'uploaded' : 'pending',
    uploadError: row.last_error ?? null,
    jobId: null, // jobId assigned via RPC response, not stored in DB photo_queue
  };
}
