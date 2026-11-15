import { openDB, type IDBPDatabase } from 'idb';
import type {
  StorageAdapter,
  EntityName,
  AnyRow,
  OutboxEntry,
  SyncStateEntry,
  QueryOptions,
} from '@spatenstich/shared';
import { shouldApplyServerRow, sameRows } from './serverMerge';

const KV_STORE = 'kv';
const OUTBOX_STORE = 'sync_outbox';
const STATE_STORE = 'sync_state';
const SCHEMA_VERSION_KEY = '__schema_version__';

const ROW_STORES: EntityName[] = [
  'gardens', 'garden_members', 'profiles', 'vereinsregeln', 'invite_codes',
  'garden_dimensions', 'plan_elements', 'imports', 'import_items', 'bed_drafts',
  'plant_drafts', 'observation_drafts', 'photo_findings', 'garden_plants',
];

// Which entities have a garden_id field (in camelCase JS objects)?
// gardens is special: id == garden_id (self-reference).
const GARDEN_ID_COLUMN: Record<EntityName, string | null> = {
  gardens: 'id',
  garden_members: 'garden_id',
  profiles: null,
  vereinsregeln: 'garden_id',
  invite_codes: 'garden_id',
  garden_dimensions: 'garden_id',
  plan_elements: 'garden_id',
  imports: 'gardenId',
  import_items: 'gardenId',
  bed_drafts: 'gardenId',
  plant_drafts: 'gardenId',
  observation_drafts: 'gardenId',
  photo_findings: 'gardenId',
  garden_plants: 'gardenId',
};

/** Phase 35 (local schema version 7). */
const V7_ENTITIES: EntityName[] = ['photo_findings', 'garden_plants'];

// Monotonic counter for Outbox created_at (prevents FIFO collisions at same ms)
let outboxCounter = 0;

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbName: string) {
    this.dbPromise = openDB(dbName, 5, {
      // Another tab was opened with a newer version of the app and has to upgrade the
      // database. Holding on to the connection would leave that tab hanging at start,
      // so this older one lets go and loads the new version as well.
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase | null)?.close();
        if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
          window.location.reload();
        }
      },
      upgrade(db, oldVersion) {
        // Fallthrough pattern for future versions.
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(KV_STORE)) {
            db.createObjectStore(KV_STORE);
          }
        }
        if (oldVersion < 2) {
          // Row-Stores for V3 entities
          const v3Entities: EntityName[] = [
            'gardens', 'garden_members', 'profiles', 'vereinsregeln', 'invite_codes',
          ];
          for (const entity of v3Entities) {
            if (!db.objectStoreNames.contains(entity)) {
              const store = db.createObjectStore(entity, { keyPath: 'id' });
              const gidCol = GARDEN_ID_COLUMN[entity];
              if (gidCol && gidCol !== 'id') {
                // IndexedDB indexes use keyPath in camelCase (JS object fields):
                // e.g. garden_members.gardenId
                store.createIndex('by_gardenId', 'gardenId', { unique: false });
              }
            }
          }
          // sync_outbox with FIFO index on createdAt
          if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
            const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
            outbox.createIndex('by_createdAt', 'createdAt', { unique: false });
          }
          // sync_state keyed by entity
          if (!db.objectStoreNames.contains(STATE_STORE)) {
            db.createObjectStore(STATE_STORE, { keyPath: 'entity' });
          }
        }
        if (oldVersion < 3) {
          // Phase 4 (Plan 04-01): garden_dimensions + plan_elements Row-Stores
          const v4Entities: EntityName[] = ['garden_dimensions', 'plan_elements'];
          for (const entity of v4Entities) {
            if (!db.objectStoreNames.contains(entity)) {
              const store = db.createObjectStore(entity, { keyPath: 'id' });
              const gidCol = GARDEN_ID_COLUMN[entity];
              if (gidCol && gidCol !== 'id') {
                store.createIndex('by_gardenId', 'gardenId', { unique: false });
              }
            }
          }
        }
        if (oldVersion < 4) {
          // Phase 6: import draft stores
          const v5Entities: EntityName[] = [
            'imports', 'import_items', 'bed_drafts', 'plant_drafts', 'observation_drafts',
          ];
          for (const entity of v5Entities) {
            if (!db.objectStoreNames.contains(entity)) {
              const store = db.createObjectStore(entity, { keyPath: 'id' });
              const gidCol = GARDEN_ID_COLUMN[entity];
              if (gidCol && gidCol !== 'id') {
                store.createIndex('by_gardenId', 'gardenId', { unique: false });
              }
            }
          }
        }
        if (oldVersion < 5) {
          // Phase 35: photo findings and garden-own catalog entries
          for (const entity of V7_ENTITIES) {
            if (!db.objectStoreNames.contains(entity)) {
              const store = db.createObjectStore(entity, { keyPath: 'id' });
              store.createIndex('by_gardenId', 'gardenId', { unique: false });
            }
          }
        }
      },
    });
  }

  // ---- KV (Phase 1/2) ----
  async get(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    const v = await db.get(KV_STORE, key);
    return typeof v === 'string' ? v : (v ?? null);
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    await db.put(KV_STORE, value, key);
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(KV_STORE, key);
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.dbPromise;
    const keys = (await db.getAllKeys(KV_STORE)) as string[];
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async getSchemaVersion(): Promise<number> {
    const v = await this.get(SCHEMA_VERSION_KEY);
    return v ? Number(v) : 0;
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.set(SCHEMA_VERSION_KEY, String(version));
  }

  // ---- Migration hook ----
  async __createRowTablesV3(): Promise<void> {
    // IndexedDB stores are created in the upgrade() callback when opening.
    // The migration runner stores schema_version = 3 in KV afterwards.
    // Here we verify all stores exist (defensive check).
    const db = await this.dbPromise;
    const v3Entities: EntityName[] = [
      'gardens', 'garden_members', 'profiles', 'vereinsregeln', 'invite_codes',
    ];
    const missing = [...v3Entities, OUTBOX_STORE, STATE_STORE].filter(
      (s) => !db.objectStoreNames.contains(s),
    );
    if (missing.length > 0) {
      throw new Error(
        `IndexedDbAdapter: expected stores missing after upgrade: ${missing.join(', ')}. ` +
        'Delete dev database and retry.',
      );
    }
  }

  // ---- Migration hook V4 (Phase 4: garden_dimensions + plan_elements) ----
  async __createRowTablesV4(): Promise<void> {
    // IndexedDB stores for v4 entities are created in the upgrade() callback
    // when the DB version is bumped. Here we verify they exist (defensive check).
    const db = await this.dbPromise;
    const v4Entities: EntityName[] = ['garden_dimensions', 'plan_elements'];
    const missing = v4Entities.filter(
      (s) => !db.objectStoreNames.contains(s),
    );
    if (missing.length > 0) {
      throw new Error(
        `IndexedDbAdapter: v4 stores missing after upgrade: ${missing.join(', ')}. ` +
        'Delete dev database and retry.',
      );
    }
  }

  // ---- Migration hook V5 (Phase 6: import draft stores) ----
  async __createRowTablesV5(): Promise<void> {
    const db = await this.dbPromise;
    const v5Entities: EntityName[] = [
      'imports', 'import_items', 'bed_drafts', 'plant_drafts', 'observation_drafts',
    ];
    const missing = v5Entities.filter(
      (s) => !db.objectStoreNames.contains(s),
    );
    if (missing.length > 0) {
      throw new Error(
        `IndexedDbAdapter: v5 stores missing after upgrade: ${missing.join(', ')}. ` +
        'Delete dev database and retry.',
      );
    }
  }

  // ---- Migration hook V7 (Phase 35: photo findings, garden plants) ----
  async __createRowTablesV7(): Promise<void> {
    const db = await this.dbPromise;
    const missing = V7_ENTITIES.filter((s) => !db.objectStoreNames.contains(s));
    if (missing.length > 0) {
      throw new Error(
        `IndexedDbAdapter: v7 stores missing after upgrade: ${missing.join(', ')}. ` +
        'Delete dev database and retry.',
      );
    }
  }

  // ---- Row-Level (Phase 3) ----
  async getRow<T extends AnyRow>(
    entity: EntityName,
    id: string,
    opts: QueryOptions = {},
  ): Promise<T | null> {
    const db = await this.dbPromise;
    const row = (await db.get(entity, id)) as T | undefined;
    if (!row) return null;
    if (!opts.includeDeleted && row.deletedAt != null) return null;
    return row;
  }

  async getRowsByGarden<T extends AnyRow>(
    entity: EntityName,
    gardenId: string,
    opts: QueryOptions = {},
  ): Promise<T[]> {
    const gidCol = GARDEN_ID_COLUMN[entity];
    if (!gidCol) {
      throw new Error(`Entity ${entity} has no garden_id — use getAllRows.`);
    }
    const db = await this.dbPromise;
    let rows: T[];
    if (gidCol === 'id') {
      // gardens special case: id == garden_id
      const row = (await db.get(entity, gardenId)) as T | undefined;
      rows = row ? [row] : [];
    } else {
      rows = (await db.getAllFromIndex(entity, 'by_gardenId', gardenId)) as T[];
    }
    return opts.includeDeleted ? rows : rows.filter((r) => r.deletedAt == null);
  }

  async getAllRows<T extends AnyRow>(entity: EntityName, opts: QueryOptions = {}): Promise<T[]> {
    const db = await this.dbPromise;
    const rows = (await db.getAll(entity)) as T[];
    return opts.includeDeleted ? rows : rows.filter((r) => r.deletedAt == null);
  }

  async writeWithOutbox<T extends AnyRow>(
    entity: EntityName,
    row: T,
    outbox: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
  ): Promise<void> {
    const db = await this.dbPromise;
    const outboxEntry: OutboxEntry = {
      id: cryptoRandomUuid(),
      entity: outbox.entity,
      rowId: outbox.rowId,
      operation: outbox.operation,
      payload: outbox.payload,
      createdAt: `${new Date().toISOString()}-${String(outboxCounter++).padStart(6, '0')}`,
      attempts: 0,
      lastError: null,
    };
    // One transaction: the row, and exactly one outbox entry for it. Older entries for
    // the same row are replaced, because only the newest snapshot is worth sending.
    const tx = db.transaction([entity, OUTBOX_STORE], 'readwrite');
    const outboxStore = tx.objectStore(OUTBOX_STORE);
    const waiting = (await outboxStore.getAll()) as OutboxEntry[];
    const superseded = waiting.filter(
      (e) => e.entity === outboxEntry.entity && e.rowId === outboxEntry.rowId,
    );
    await Promise.all([
      ...superseded.map((e) => outboxStore.delete(e.id)),
      tx.objectStore(entity).put(row),
      outboxStore.put(outboxEntry),
      tx.done,
    ]);
  }

  async upsertRowFromServer<T extends AnyRow>(entity: EntityName, row: T): Promise<void> {
    const db = await this.dbPromise;
    await db.put(entity, row);
  }

  async upsertRowsFromServer<T extends AnyRow>(
    entity: EntityName,
    rows: T[],
    opts: { force?: boolean } = {},
  ): Promise<string[]> {
    if (rows.length === 0) return [];
    const db = await this.dbPromise;
    const tx = db.transaction([entity, OUTBOX_STORE], 'readwrite');
    const store = tx.objectStore(entity);
    const waiting = (await tx.objectStore(OUTBOX_STORE).getAll()) as OutboxEntry[];
    const pending = new Set(waiting.filter((e) => e.entity === entity).map((e) => e.rowId));
    const written: string[] = [];
    for (const row of rows) {
      const local = ((await store.get(row.id)) as T | undefined) ?? null;
      if (!shouldApplyServerRow(local, row, pending.has(row.id), opts.force === true)) continue;
      await store.put(row);
      written.push(row.id);
    }
    await tx.done;
    return written;
  }

  async replaceRowsForGarden<T extends AnyRow>(
    entity: EntityName,
    gardenId: string,
    rows: T[],
  ): Promise<boolean> {
    const db = await this.dbPromise;
    const tx = db.transaction(entity, 'readwrite');
    const store = tx.objectStore(entity);
    const existing = (await store.index('by_gardenId').getAll(gardenId)) as T[];
    if (sameRows(existing, rows)) {
      await tx.done;
      return false;
    }
    const keep = new Set(rows.map((r) => r.id));
    await Promise.all([
      ...existing.filter((r) => !keep.has(r.id)).map((r) => store.delete(r.id)),
      ...rows.map((r) => store.put(r)),
      tx.done,
    ]);
    return true;
  }

  // ---- Outbox ----
  async listOutboxEntries(limit?: number): Promise<OutboxEntry[]> {
    const db = await this.dbPromise;
    const index = db.transaction(OUTBOX_STORE).store.index('by_createdAt');
    const all = (await index.getAll()) as OutboxEntry[];
    return limit ? all.slice(0, limit) : all;
  }

  async deleteOutboxEntry(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(OUTBOX_STORE, id);
  }

  async updateOutboxEntry(
    id: string,
    patch: Partial<Pick<OutboxEntry, 'attempts' | 'lastError' | 'nextAttemptAt'>>,
  ): Promise<void> {
    const db = await this.dbPromise;
    const entry = (await db.get(OUTBOX_STORE, id)) as OutboxEntry | undefined;
    if (!entry) return;
    await db.put(OUTBOX_STORE, { ...entry, ...patch });
  }

  // ---- sync_state ----
  async getSyncState(entity: EntityName): Promise<SyncStateEntry | null> {
    const db = await this.dbPromise;
    const state = (await db.get(STATE_STORE, entity)) as SyncStateEntry | undefined;
    return state ?? null;
  }

  async setSyncState(state: SyncStateEntry): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STATE_STORE, state);
  }

  async clearSyncState(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(STATE_STORE);
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const stores = [...ROW_STORES, OUTBOX_STORE, STATE_STORE].filter((s) =>
      db.objectStoreNames.contains(s),
    );
    const tx = db.transaction(stores, 'readwrite');
    await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
  }
}

// UUID v4 fallback
function cryptoRandomUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
