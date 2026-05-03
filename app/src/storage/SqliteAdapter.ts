import * as SQLite from 'expo-sqlite';
import type {
  StorageAdapter,
  EntityName,
  AnyRow,
  OutboxEntry,
  SyncStateEntry,
  QueryOptions,
} from '@spatenstich/shared';

const SCHEMA_VERSION_KEY = '__schema_version__';

const ROW_ENTITIES: EntityName[] = [
  'gardens',
  'garden_members',
  'profiles',
  'vereinsregeln',
  'invite_codes',
  'photo_queue',
  'garden_dimensions',
  'plan_elements',
];

// Which entities have a garden_id column?
// gardens is a special case: id == garden_id (self-reference).
const GARDEN_ID_COLUMN: Record<EntityName, string | null> = {
  gardens: 'id',
  garden_members: 'garden_id',
  profiles: null,            // profiles is cross-garden
  vereinsregeln: 'garden_id',
  invite_codes: 'garden_id',
  photo_queue: 'garden_id',
  garden_dimensions: 'garden_id',
  plan_elements: 'garden_id',
};

// camelCase field name that maps to the garden_id column in the row object
const GARDEN_ID_FIELD: Record<EntityName, string | null> = {
  gardens: 'id',
  garden_members: 'gardenId',
  profiles: null,
  vereinsregeln: 'gardenId',
  invite_codes: 'gardenId',
  photo_queue: 'gardenId',
  garden_dimensions: 'gardenId',
  plan_elements: 'gardenId',
};

// Monotonic counter for Outbox created_at (prevents FIFO collisions at same Date.now())
let outboxCounter = 0;

export class SqliteAdapter implements StorageAdapter {
  private dbPromise: Promise<SQLite.SQLiteDatabase>;

  constructor(dbName: string) {
    this.dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(dbName);
      // KV table always created (Phase 1 compatibility)
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
      );
      return db;
    })();
  }

  // ---- KV (Phase 1/2) ----
  async get(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync(
      'INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      key,
      value,
    );
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.dbPromise;
    const rows = prefix
      ? await db.getAllAsync<{ key: string }>('SELECT key FROM kv WHERE key LIKE ?', `${prefix}%`)
      : await db.getAllAsync<{ key: string }>('SELECT key FROM kv');
    return rows.map((r) => r.key);
  }

  async getSchemaVersion(): Promise<number> {
    const v = await this.get(SCHEMA_VERSION_KEY);
    return v ? Number(v) : 0;
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.set(SCHEMA_VERSION_KEY, String(version));
  }

  // ---- Migration hook (called from migrations.ts) ----
  async __createRowTablesV3(): Promise<void> {
    const db = await this.dbPromise;
    // All Row-Tables have identical schema:
    // (id TEXT PK, data TEXT JSON, <garden_id_col> TEXT NULL, deleted_at TEXT NULL, updated_at TEXT NOT NULL)
    // JSON-blob storage — camelCase serialisation via JSON.stringify in adapter.
    for (const entity of ROW_ENTITIES) {
      const gidCol = GARDEN_ID_COLUMN[entity];
      const gidSchema = gidCol ? `${gidCol} TEXT,` : '';
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${entity} (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          ${gidSchema}
          deleted_at TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      if (gidCol) {
        await db.execAsync(
          `CREATE INDEX IF NOT EXISTS idx_${entity}_${gidCol} ON ${entity}(${gidCol}) WHERE deleted_at IS NULL;`,
        );
      }
    }

    // sync_outbox: FIFO queue
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        entity TEXT NOT NULL,
        row_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_fifo ON sync_outbox(created_at);
    `);

    // sync_state: last_pull_at / last_push_at per entity
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_state (
        entity TEXT PRIMARY KEY NOT NULL,
        last_pull_at TEXT,
        last_push_at TEXT
      );
    `);
  }

  // ---- Migration hook V4 (Phase 4: garden_dimensions + plan_elements) ----
  async __createRowTablesV4(): Promise<void> {
    const db = await this.dbPromise;
    const v4Entities: EntityName[] = ['garden_dimensions', 'plan_elements'];
    for (const entity of v4Entities) {
      const gidCol = GARDEN_ID_COLUMN[entity];
      const gidSchema = gidCol ? `${gidCol} TEXT,` : '';
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${entity} (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          ${gidSchema}
          deleted_at TEXT,
          updated_at TEXT NOT NULL
        );
      `);
      if (gidCol) {
        await db.execAsync(
          `CREATE INDEX IF NOT EXISTS idx_${entity}_${gidCol} ON ${entity}(${gidCol}) WHERE deleted_at IS NULL;`,
        );
      }
    }
  }

  // ---- Row-Level (Phase 3) ----
  async getRow<T extends AnyRow>(
    entity: EntityName,
    id: string,
    opts: QueryOptions = {},
  ): Promise<T | null> {
    const db = await this.dbPromise;
    const sql = opts.includeDeleted
      ? `SELECT data FROM ${entity} WHERE id = ?`
      : `SELECT data FROM ${entity} WHERE id = ? AND deleted_at IS NULL`;
    const row = await db.getFirstAsync<{ data: string }>(sql, id);
    return row ? (JSON.parse(row.data) as T) : null;
  }

  async getRowsByGarden<T extends AnyRow>(
    entity: EntityName,
    gardenId: string,
    opts: QueryOptions = {},
  ): Promise<T[]> {
    const gidCol = GARDEN_ID_COLUMN[entity];
    if (!gidCol) {
      throw new Error(`Entity ${entity} has no garden_id column — use getAllRows instead.`);
    }
    const db = await this.dbPromise;
    const whereDeleted = opts.includeDeleted ? '' : ' AND deleted_at IS NULL';
    const rows = await db.getAllAsync<{ data: string }>(
      `SELECT data FROM ${entity} WHERE ${gidCol} = ?${whereDeleted}`,
      gardenId,
    );
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  async getAllRows<T extends AnyRow>(entity: EntityName, opts: QueryOptions = {}): Promise<T[]> {
    const db = await this.dbPromise;
    const sql = opts.includeDeleted
      ? `SELECT data FROM ${entity}`
      : `SELECT data FROM ${entity} WHERE deleted_at IS NULL`;
    const rows = await db.getAllAsync<{ data: string }>(sql);
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  async writeWithOutbox<T extends AnyRow>(
    entity: EntityName,
    row: T,
    outbox: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts' | 'lastError'>,
  ): Promise<void> {
    const db = await this.dbPromise;
    const gidCol = GARDEN_ID_COLUMN[entity];
    const gidField = GARDEN_ID_FIELD[entity];
    const gidValue =
      gidField && gidField in row ? (row as unknown as Record<string, unknown>)[gidField] : null;
    const outboxId = cryptoRandomUuid();
    const outboxCreatedAt = `${new Date().toISOString()}-${String(outboxCounter++).padStart(6, '0')}`;

    // L-6: exclusive transaction → both writes atomic
    await db.withExclusiveTransactionAsync(async (tx) => {
      if (gidCol) {
        await tx.runAsync(
          `INSERT INTO ${entity}(id, data, ${gidCol}, deleted_at, updated_at)
           VALUES(?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET data=excluded.data, ${gidCol}=excluded.${gidCol},
                                         deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
          row.id, JSON.stringify(row), gidValue as string | null, row.deletedAt, row.updatedAt,
        );
      } else {
        await tx.runAsync(
          `INSERT INTO ${entity}(id, data, deleted_at, updated_at)
           VALUES(?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET data=excluded.data,
                                         deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
          row.id, JSON.stringify(row), row.deletedAt, row.updatedAt,
        );
      }
      await tx.runAsync(
        `INSERT INTO sync_outbox(id, entity, row_id, operation, payload, created_at, attempts, last_error)
         VALUES(?,?,?,?,?,?,?,?)`,
        outboxId, outbox.entity, outbox.rowId, outbox.operation,
        JSON.stringify(outbox.payload), outboxCreatedAt, 0, null,
      );
    });
  }

  async upsertRowFromServer<T extends AnyRow>(entity: EntityName, row: T): Promise<void> {
    const db = await this.dbPromise;
    const gidCol = GARDEN_ID_COLUMN[entity];
    const gidField = GARDEN_ID_FIELD[entity];
    const gidValue =
      gidField && gidField in row ? (row as unknown as Record<string, unknown>)[gidField] : null;
    if (gidCol) {
      await db.runAsync(
        `INSERT INTO ${entity}(id, data, ${gidCol}, deleted_at, updated_at)
         VALUES(?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET data=excluded.data, ${gidCol}=excluded.${gidCol},
                                       deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
        row.id, JSON.stringify(row), gidValue as string | null, row.deletedAt, row.updatedAt,
      );
    } else {
      await db.runAsync(
        `INSERT INTO ${entity}(id, data, deleted_at, updated_at)
         VALUES(?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET data=excluded.data,
                                       deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
        row.id, JSON.stringify(row), row.deletedAt, row.updatedAt,
      );
    }
  }

  async upsertRowsFromServer<T extends AnyRow>(entity: EntityName, rows: T[]): Promise<void> {
    if (rows.length === 0) return;
    const db = await this.dbPromise;
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const row of rows) {
        const gidCol = GARDEN_ID_COLUMN[entity];
        const gidField = GARDEN_ID_FIELD[entity];
        const gidValue =
          gidField && gidField in row ? (row as unknown as Record<string, unknown>)[gidField] : null;
        if (gidCol) {
          await tx.runAsync(
            `INSERT INTO ${entity}(id, data, ${gidCol}, deleted_at, updated_at)
             VALUES(?,?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET data=excluded.data, ${gidCol}=excluded.${gidCol},
                                           deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
            row.id, JSON.stringify(row), gidValue as string | null, row.deletedAt, row.updatedAt,
          );
        } else {
          await tx.runAsync(
            `INSERT INTO ${entity}(id, data, deleted_at, updated_at)
             VALUES(?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET data=excluded.data,
                                           deleted_at=excluded.deleted_at, updated_at=excluded.updated_at`,
            row.id, JSON.stringify(row), row.deletedAt, row.updatedAt,
          );
        }
      }
    });
  }

  // ---- Outbox ----
  async listOutboxEntries(limit?: number): Promise<OutboxEntry[]> {
    const db = await this.dbPromise;
    const sql = limit
      ? `SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT ?`
      : `SELECT * FROM sync_outbox ORDER BY created_at ASC`;
    const rows = limit
      ? await db.getAllAsync<Record<string, unknown>>(sql, limit)
      : await db.getAllAsync<Record<string, unknown>>(sql);
    return rows.map((r) => ({
      id: r['id'] as string,
      entity: r['entity'] as EntityName,
      rowId: r['row_id'] as string,
      operation: r['operation'] as OutboxEntry['operation'],
      payload: JSON.parse(r['payload'] as string) as Record<string, unknown>,
      createdAt: r['created_at'] as string,
      attempts: r['attempts'] as number,
      lastError: r['last_error'] as string | null,
    }));
  }

  async deleteOutboxEntry(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', id);
  }

  async updateOutboxEntry(
    id: string,
    patch: Pick<OutboxEntry, 'attempts' | 'lastError'>,
  ): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync(
      'UPDATE sync_outbox SET attempts = ?, last_error = ? WHERE id = ?',
      patch.attempts, patch.lastError, id,
    );
  }

  // ---- sync_state ----
  async getSyncState(entity: EntityName): Promise<SyncStateEntry | null> {
    const db = await this.dbPromise;
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM sync_state WHERE entity = ?',
      entity,
    );
    return row
      ? {
          entity: row['entity'] as EntityName,
          lastPullAt: row['last_pull_at'] as string | null,
          lastPushAt: row['last_push_at'] as string | null,
        }
      : null;
  }

  async setSyncState(state: SyncStateEntry): Promise<void> {
    const db = await this.dbPromise;
    await db.runAsync(
      `INSERT INTO sync_state(entity, last_pull_at, last_push_at)
       VALUES(?,?,?)
       ON CONFLICT(entity) DO UPDATE SET last_pull_at=excluded.last_pull_at,
                                          last_push_at=excluded.last_push_at`,
      state.entity, state.lastPullAt, state.lastPushAt,
    );
  }
}

// UUID v4 fallback (Expo provides randomUUID on SDK 55 via globalThis.crypto)
function cryptoRandomUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
