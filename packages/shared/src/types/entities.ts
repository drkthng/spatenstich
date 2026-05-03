// Phase 3: Lokale Row-Repräsentationen, gespiegelt an den Supabase-Schema-Typen.
// Wichtig: camelCase für TypeScript-Usage. Die Adapter-Impl speichert snake_case
// in SQLite/IndexedDB (via toRow/fromRow-Mapper in den Repos).

export type EntityName =
  | 'gardens'
  | 'garden_members'
  | 'profiles'
  | 'vereinsregeln'
  | 'invite_codes'
  | 'photo_queue'
  | 'garden_dimensions'
  | 'plan_elements';

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

export interface PhotoQueueRow extends RowBase {
  gardenId: string;
  storagePath: string;         // <garden_id>/<photo_id>.<ext>
  geoLat: number | null;       // nur wenn Opt-in (D-24)
  geoLng: number | null;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadError: string | null;
  jobId: string | null;        // von enqueue_photo_analysis RPC
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
  aiResultId: string | null;
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low' | null;
  isAccepted: boolean;
}

/** Pre-confirmation shape from Claude Vision (not yet persisted). */
export interface PlanElementCandidate {
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low';
}

export type AnyRow =
  | GardenRow
  | GardenMemberRow
  | ProfileRow
  | VereinsregelnRow
  | InviteCodeRow
  | PhotoQueueRow
  | GardenDimensionsRow
  | PlanElementRow;

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
