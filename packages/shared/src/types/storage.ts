import type {
  AnyRow,
  EntityName,
  OutboxEntry,
  SyncStateEntry,
} from './entities';

export interface QueryOptions {
  /** Soft-deleted Rows mit einschließen. Default: false. */
  includeDeleted?: boolean;
}

// D-08: KV CRUD bleibt erhalten (Phase 1/2 Profile-Store + misc Keys).
// Phase 3: zusätzlich Row-Level + Outbox + sync_state.
export interface StorageAdapter {
  // ---- Phase 1/2: KV-Interface (unverändert) ----
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;

  // ---- Phase 3: Row-Level-Zugriff ----
  /** Einzelne Row per Primary Key laden. Soft-deleted Rows werden ausgeblendet (es sei denn opts.includeDeleted). */
  getRow<T extends AnyRow>(entity: EntityName, id: string, opts?: QueryOptions): Promise<T | null>;

  /** Alle Rows einer garden_id laden (exkl. soft-deleted by default). */
  getRowsByGarden<T extends AnyRow>(entity: EntityName, gardenId: string, opts?: QueryOptions): Promise<T[]>;

  /** Alle Rows einer Entity (für profiles / cross-garden Sync nach Member-Check). */
  getAllRows<T extends AnyRow>(entity: EntityName, opts?: QueryOptions): Promise<T[]>;

  /**
   * Atomic Row-Write + Outbox-Insert (L-6 Absicherung).
   * Bei Fehler wird die gesamte Transaktion zurückgerollt.
   * Verwendet SQLite's withExclusiveTransactionAsync (native) bzw. idb's
   * db.transaction([entity, 'sync_outbox'], 'readwrite') (web).
   */
  writeWithOutbox<T extends AnyRow>(
    entity: EntityName,
    row: T,
    outbox: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
  ): Promise<void>;

  /**
   * Row-Write OHNE Outbox — ausschließlich für Sync-Pull (Server→Client Updates
   * erzeugen KEINE neuen Outbox-Einträge, sonst Ping-Pong).
   */
  upsertRowFromServer<T extends AnyRow>(entity: EntityName, row: T): Promise<void>;

  /** Mehrere Rows vom Server atomar anwenden (Delta-Pull). */
  upsertRowsFromServer<T extends AnyRow>(entity: EntityName, rows: T[]): Promise<void>;

  // ---- Phase 3: Outbox ----
  /** FIFO-sortiert (ASC created_at). */
  listOutboxEntries(limit?: number): Promise<OutboxEntry[]>;
  /** Nach erfolgreichem Server-Ack entfernen. */
  deleteOutboxEntry(id: string): Promise<void>;
  /** Backoff-Zähler + Fehlertext aktualisieren nach Push-Fehler. */
  updateOutboxEntry(id: string, patch: Pick<OutboxEntry, 'attempts' | 'lastError'>): Promise<void>;

  // ---- Phase 3: sync_state ----
  getSyncState(entity: EntityName): Promise<SyncStateEntry | null>;
  setSyncState(state: SyncStateEntry): Promise<void>;
}
