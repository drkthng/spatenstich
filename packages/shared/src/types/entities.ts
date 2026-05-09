// Phase 3: Lokale Row-Repräsentationen, gespiegelt an den Supabase-Schema-Typen.
// Wichtig: camelCase für TypeScript-Usage. Die Adapter-Impl speichert snake_case
// in SQLite/IndexedDB (via toRow/fromRow-Mapper in den Repos).

export type EntityName =
  | 'gardens'
  | 'garden_members'
  | 'profiles'
  | 'vereinsregeln'
  | 'invite_codes'
  | 'garden_dimensions'
  | 'plan_elements'
  | 'imports'
  | 'import_items'
  | 'bed_drafts'
  | 'plant_drafts'
  | 'observation_drafts';

/** Gemeinsame Basis-Felder für alle LWW-managed Rows (Plan 03-01 Migration 013). */
export interface RowBase {
  id: string;                 // UUID
  createdAt: string;          // ISO-Timestamp
  updatedAt: string;          // ISO-Timestamp — von LWW-Trigger auf Server gesetzt
  updatedByUserId: string | null; // von trigger mm_set_updated_by_user_id_* gesetzt
  deletedAt: string | null;   // Soft-Delete (D-16)
}

export interface GardenRow extends RowBase {
  name: string;
  ownerUserId: string;
}

export interface GardenMemberRow extends RowBase {
  gardenId: string;
  userId: string;
  role: 'owner' | 'member';
}

export interface ProfileRow extends RowBase {
  userId: string;
  displayName: string | null;
  locale: string | null;
}

export interface VereinsregelnRow extends RowBase {
  gardenId: string;
  rules: Record<string, unknown>; // JSON
}

export interface InviteCodeRow extends RowBase {
  gardenId: string;
  code: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByUserId: string | null;
}

export interface GardenDimensionsRow extends RowBase {
  gardenId: string;
  shape: 'rectangle' | 'l_shape' | 'trapezoid' | 'freehand';
  widthM: number;
  heightM: number;
  extraDims: Record<string, unknown> | null;
}

export interface PlanElementRow extends RowBase {
  gardenId: string;
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low' | null;
  isAccepted: boolean;
}

export type AnyRow =
  | GardenRow
  | GardenMemberRow
  | ProfileRow
  | VereinsregelnRow
  | InviteCodeRow
  | GardenDimensionsRow
  | PlanElementRow
  | ImportRow
  | BedDraftRow
  | PlantDraftRow
  | ObservationDraftRow;

/** Phase 6: Import header row (per D-17, D-18) */
export interface ImportRow extends RowBase {
  gardenId: string;
  source: 'claude-ai-project';
  importedAt: string;
  chatReference: string | null;
  payloadSchemaVersion: string;
}

/** Phase 6: Import item detail row (per D-18) — no RowBase, write-once */
export interface ImportItemRow {
  id: string;
  importId: string;
  gardenId: string;
  itemType: 'bed' | 'plant' | 'observation';
  localId: string;
  payload: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
  deletedAt: string | null;
}

/** Phase 6: Bed draft row (per D-19) */
export interface BedDraftRow {
  id: string;
  importItemId: string;
  gardenId: string;
  label: string;
  lengthCm: number | null;
  widthCm: number | null;
  sunExposure: string | null;
  soilNotes: string | null;
  confidence: number | null;
  status: 'pending' | 'promoted' | 'dismissed';
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}

/** Phase 6: Plant draft row (per D-19) */
export interface PlantDraftRow {
  id: string;
  importItemId: string;
  gardenId: string;
  bedDraftId: string | null;
  scientificName: string | null;
  commonNameDe: string;
  stageEstimate: string | null;
  healthNotes: string | null;
  confidence: number | null;
  status: 'pending' | 'promoted' | 'dismissed';
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}

/** Phase 6: Observation draft row (per D-19) */
export interface ObservationDraftRow {
  id: string;
  importItemId: string;
  gardenId: string;
  bedRefLocalId: string | null;
  kind: 'pest' | 'disease' | 'weather' | 'soil' | 'structural' | 'other';
  summary: string;
  suggestedActions: string[] | null;
  confidence: number | null;
  status: 'pending' | 'promoted' | 'dismissed';
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  deletedAt: string | null;
}

/** Phase 6: Parsed import payload matching spatenstich-import.v1 schema */
export interface ImportPayload {
  schemaVersion: string;
  capture: {
    timestamp: string;
    location?: { lat: number; lon: number };
    photoRefs?: string[];
    chatReference?: string;
  };
  beds?: ImportPayloadBed[];
  plants?: ImportPayloadPlant[];
  observations?: ImportPayloadObservation[];
  complianceFlags?: ImportPayloadComplianceFlag[];
  freeFormNotes?: string;
}

export interface ImportPayloadBed {
  localId: string;
  label: string;
  approxDimensions?: { lengthCm: number; widthCm: number };
  sunExposure?: 'full' | 'half' | 'shade' | 'mixed';
  soilNotes?: string;
  confidence?: number;
}

export interface ImportPayloadPlant {
  localId: string;
  bedRef?: string;
  scientificName?: string;
  commonNameDe: string;
  stageEstimate?: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'senescent';
  healthNotes?: string;
  confidence?: number;
}

export interface ImportPayloadObservation {
  localId: string;
  bedRef?: string;
  kind: 'pest' | 'disease' | 'weather' | 'soil' | 'structural' | 'other';
  summary: string;
  suggestedActions?: string[];
  confidence?: number;
}

export interface ImportPayloadComplianceFlag {
  regulation: string;
  status: 'compliant' | 'warn' | 'violation';
  note?: string;
}

/** Outbox-Eintrag — ein pending Write, der noch nicht gepusht wurde. */
export interface OutboxEntry {
  id: string;                  // UUID
  entity: EntityName;
  rowId: string;
  operation: 'insert' | 'update' | 'delete';
  /** Row-Snapshot (D-14): vollständiger Row-Zustand zum Zeitpunkt des Writes. */
  payload: Record<string, unknown>;
  createdAt: string;           // ISO-Timestamp (lokale Zeit — nur FIFO-Relevanz)
  attempts: number;            // Backoff-Zähler
  lastError: string | null;    // Fehlertext des letzten Push-Versuchs
}

/** Sync-State pro Entity — persistiert last_pull_at für Delta-Pull. */
export interface SyncStateEntry {
  entity: EntityName;
  lastPullAt: string | null;   // ISO-Timestamp vom server_now() RPC (Plan 03-01 Section 8)
  lastPushAt: string | null;
}
