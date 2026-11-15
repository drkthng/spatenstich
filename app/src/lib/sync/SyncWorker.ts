import * as SentryDefault from '@sentry/react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { storage as defaultStorage } from '../../storage';
import { supabase as defaultSupabase } from '../supabase';
import { ConflictError } from '../errors';
import { useAuthStore } from '../../stores/authStore';
import { syncEvents } from './events';
import { nextBackoffMs, MAX_ATTEMPTS } from './backoff';
import { toMs } from '../../storage/serverMerge';
import { FEATURES } from '@spatenstich/shared';
import type {
  AnyRow,
  EntityName,
  OutboxEntry,
  StorageAdapter,
  GardenRow,
  ProfileRow,
  VereinsregelnRow,
  GardenDimensionsRow,
  PlanElementRow,
} from '@spatenstich/shared';
import {
  gardenFromDb,
  profileFromDb,
  vereinsregelnFromDbRows,
  gardenMemberFromDb,
  inviteCodeFromDb,
  vereinsregelnToDbRows,
  gardenDimensionsToDb,
  gardenDimensionsToLocal,
  planElementToDb,
  planElementToLocal,
  importEntityToDb,
  plainRowFromDb,
  plainRowToDb,
  importEntityFromDb,
} from '../mappers/rowMappers';

// Phase 33 sync model (Masterplan 3.5):
// - Pull follows `server_updated_at` only: ascending, in pages, from the stored cursor
//   minus a short overlap. An edit made offline hours ago still arrives, because the
//   server stamps the moment it received it.
// - `updated_at` is the edit time. The server rejects an older edit (P9011), and local
//   storage refuses to let an older server row replace a newer or still unsent local one.
// - The outbox holds one entry per row. Entries that can never succeed are marked failed
//   at once and never hold up the others.

export const PULL_ENTITIES: EntityName[] = [
  'gardens',
  'garden_members',
  'profiles',
  'vereinsregeln',
  'invite_codes',
  'garden_dimensions',
  'plan_elements',
  'imports',
  'import_items',
  'bed_drafts',
  'plant_drafts',
  'observation_drafts',
  'photo_findings',
  'garden_plants',
  'garden_tasks',
  'task_done',
  'task_sorts',
];

export const PAGE_SIZE = 500;
export const CURSOR_OVERLAP_MS = 10_000;

/** Errors that will not go away by trying again. */
export const PERMANENT_ERROR_CODES = new Set([
  '22P02', // invalid text representation (e.g. a non-uuid id)
  '23502', // not null violation
  '23505', // unique violation
  '23514', // check violation
  '42501', // not allowed (row level security)
  '42P01', // table does not exist
  '42703', // column does not exist
  'PGRST204', // column unknown to the API
  'P9010', // edit time missing
]);

type DbRow = Record<string, unknown>;

interface CursorSpec {
  table: string;
  select: string;
  /** Rows of the active garden only (false: whatever row level security lets through). */
  gardenScoped: boolean;
  toLocal: (row: DbRow) => AnyRow;
}

const importSpec = (entity: EntityName): CursorSpec => ({
  table: entity,
  select: '*',
  gardenScoped: true,
  toLocal: (r) => importEntityFromDb(r, entity) as unknown as AnyRow,
});

const plainSpec = (entity: EntityName): CursorSpec => ({
  table: entity,
  select: '*',
  gardenScoped: true,
  toLocal: (r) => plainRowFromDb(r) as unknown as AnyRow,
});

const CURSOR_SPECS: Partial<Record<EntityName, CursorSpec>> = {
  gardens: {
    table: 'gardens',
    select: '*',
    gardenScoped: false,
    toLocal: (r) => gardenFromDb(r as never),
  },
  profiles: {
    table: 'profiles',
    select: 'id, display_name, created_at, updated_at, updated_by_user_id, deleted_at, server_updated_at',
    gardenScoped: false,
    toLocal: (r) => profileFromDb(r as never),
  },
  garden_dimensions: {
    table: 'garden_dimensions',
    select: '*',
    gardenScoped: true,
    toLocal: (r) => gardenDimensionsToLocal(r as never),
  },
  plan_elements: {
    table: 'plan_elements',
    select: '*',
    gardenScoped: true,
    toLocal: (r) => planElementToLocal(r as never),
  },
  imports: importSpec('imports'),
  import_items: importSpec('import_items'),
  bed_drafts: importSpec('bed_drafts'),
  plant_drafts: importSpec('plant_drafts'),
  observation_drafts: importSpec('observation_drafts'),
  photo_findings: plainSpec('photo_findings'),
  garden_plants: plainSpec('garden_plants'),
  garden_tasks: plainSpec('garden_tasks'),
  task_done: plainSpec('task_done'),
  task_sorts: plainSpec('task_sorts'),
};

export interface PullResult {
  rowsFetched: number;
  /** Ids whose stored row changed. */
  changedIds: string[];
  /** Other people whose edits arrived with this pull. */
  foreignUserIds: string[];
}

const NO_CHANGE: PullResult = { rowsFetched: 0, changedIds: [], foreignUserIds: [] };

/** No answer from the server at all: offline, DNS, timeout. Not the entry's fault. */
export function isNetworkError(e: unknown): boolean {
  const err = e as { code?: string; message?: string; name?: string } | null;
  if (err?.code) return false; // Postgres or the API answered with an error code
  const msg = (err?.message ?? String(e)).toLowerCase();
  if (/failed to fetch|fetch failed|network|load failed|timed? ?out|aborted/.test(msg)) return true;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export interface SyncWorkerDeps {
  storage: StorageAdapter;
  supabase: SupabaseClient;
  sentry?: typeof SentryDefault;
  now?: () => number;
}

export class SyncWorker {
  private readonly storage: StorageAdapter;
  private readonly supabase: SupabaseClient;
  private readonly sentry: typeof SentryDefault;
  private readonly now: () => number;
  private pushInFlight = false;
  private pushAgain = false;
  private readonly pulls = new Map<EntityName, Promise<void>>();
  private readonly pullQueued = new Set<EntityName>();

  constructor(deps: SyncWorkerDeps) {
    this.storage = deps.storage;
    this.supabase = deps.supabase;
    this.sentry = deps.sentry ?? SentryDefault;
    this.now = deps.now ?? Date.now;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Sends everything in the outbox that is due. A second call while one is running
   * returns at once and makes the running one look again when it is through.
   */
  async push(): Promise<void> {
    if (this.pushInFlight) {
      this.pushAgain = true;
      return;
    }
    this.pushInFlight = true;
    syncEvents.emit({ type: 'status_change', status: 'syncing' });
    try {
      let offline = false;
      do {
        this.pushAgain = false;
        const nowMs = this.now();
        const due = (await this.storage.listOutboxEntries()).filter(
          (e) => e.attempts < MAX_ATTEMPTS && toMs(e.nextAttemptAt) <= nowMs,
        );
        for (const entry of due) {
          const outcome = await this.pushOne(entry);
          if (outcome === 'offline') {
            offline = true;
            break;
          }
        }
      } while (this.pushAgain && !offline);
    } finally {
      this.pushInFlight = false;
      this.pushAgain = false;
      const remaining = await this.storage.listOutboxEntries();
      syncEvents.emit({
        type: 'status_change',
        status: remaining.length > 0 ? 'degraded' : 'idle',
      });
    }
  }

  /**
   * Fetches what changed on the server for one entity. Calls for the same entity never
   * overlap: a call during a running pull waits for it and triggers one more afterwards.
   */
  pull(entity: EntityName): Promise<void> {
    const running = this.pulls.get(entity);
    if (running) {
      this.pullQueued.add(entity);
      return running;
    }
    const run = this.runPull(entity).finally(() => {
      this.pulls.delete(entity);
      if (this.pullQueued.delete(entity)) {
        this.pull(entity).catch(() => {});
      }
    });
    this.pulls.set(entity, run);
    return run;
  }

  /** Pulls every entity. One failing does not stop the others. */
  async pullAll(): Promise<void> {
    await Promise.all(
      PULL_ENTITIES.map((entity) =>
        this.pull(entity).catch((e) => {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[pullAll] pull ${entity} failed`, e);
        }),
      ),
    );
  }

  /** Full sync: pull everything, then push the outbox. */
  async syncAll(): Promise<void> {
    await this.pullAll();
    await this.push();
  }

  /** Makes a failed entry due again and syncs. */
  async retryOp(opId: string): Promise<void> {
    const entries = await this.storage.listOutboxEntries();
    const entry = entries.find((e) => e.id === opId);
    if (!entry) {
      throw new Error('outbox_entry_not_found');
    }
    await this.storage.updateOutboxEntry(opId, { attempts: 0, lastError: null, nextAttemptAt: null });
    syncEvents.emit({ type: 'status_change', status: 'syncing' });
    await this.syncAll();
  }

  /** Makes every failed entry due again and syncs. */
  async retryAllFailed(): Promise<void> {
    const entries = await this.storage.listOutboxEntries();
    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        await this.storage.updateOutboxEntry(entry.id, { attempts: 0, lastError: null, nextAttemptAt: null });
      }
    }
    await this.syncAll();
  }

  /**
   * Gives up a local change. The server's version of the row comes back; a row the
   * server never had disappears locally.
   */
  async discardOp(opId: string): Promise<void> {
    const entries = await this.storage.listOutboxEntries();
    const entry = entries.find((e) => e.id === opId);
    await this.storage.deleteOutboxEntry(opId);
    if (!entry) return;
    try {
      const restored = await this.refetchRow(entry.entity, entry.rowId);
      if (!restored) {
        const local = await this.storage.getRow<AnyRow>(entry.entity, entry.rowId, { includeDeleted: true });
        if (local && local.deletedAt == null) {
          await this.storage.upsertRowFromServer(entry.entity, {
            ...local,
            deletedAt: new Date(this.now()).toISOString(),
          });
        }
      }
      syncEvents.emit({
        type: 'pull_success',
        entity: entry.entity,
        rowsFetched: restored ? 1 : 0,
        changedIds: [entry.rowId],
        foreignUserIds: [],
      });
    } catch {
      // No connection right now: the next pull brings the server's version.
    }
    const remaining = await this.storage.listOutboxEntries();
    syncEvents.emit({ type: 'status_change', status: remaining.length > 0 ? 'degraded' : 'idle' });
  }

  /** Test-utility: reset internal state between tests. */
  _resetForTest(): void {
    this.pushInFlight = false;
    this.pushAgain = false;
    this.pulls.clear();
    this.pullQueued.clear();
  }

  // ── Push ────────────────────────────────────────────────────────────────────

  private async pushOne(entry: OutboxEntry): Promise<'ok' | 'failed' | 'offline'> {
    syncEvents.emit({ type: 'push_start', entry });
    this.sentry.addBreadcrumb({
      category: 'sync',
      level: 'info',
      message: `push ${entry.entity}.${entry.rowId} op=${entry.operation}`,
      data: {
        entity: entry.entity,
        row_id: entry.rowId,
        operation: entry.operation,
        attempts: entry.attempts,
      },
    });
    try {
      await this.dispatchPush(entry);
      await this.storage.deleteOutboxEntry(entry.id);
      syncEvents.emit({ type: 'push_success', entry });
      return 'ok';
    } catch (e) {
      return this.handlePushError(entry, e);
    }
  }

  private async dispatchPush(entry: OutboxEntry): Promise<void> {
    switch (entry.entity) {
      case 'gardens':
        return this.pushGarden(entry);
      case 'profiles':
        return this.pushProfile(entry);
      case 'vereinsregeln':
        // Behind the feature switch nothing is sent; the entry is simply cleared.
        if (!FEATURES.vereinsregeln) return;
        return this.pushVereinsregeln(entry);
      case 'garden_members':
        throw Object.assign(new Error('garden_members are changed through server functions'), { code: '42501' });
      case 'invite_codes':
        throw Object.assign(new Error('invite_codes are changed through server functions'), { code: '42501' });
      case 'garden_dimensions':
        return this.pushGardenDimensions(entry);
      case 'plan_elements':
        return this.pushPlanElement(entry);
      case 'imports':
      case 'import_items':
      case 'bed_drafts':
      case 'plant_drafts':
      case 'observation_drafts':
        return this.pushImportEntity(entry);
      case 'photo_findings':
      case 'garden_plants':
      case 'garden_tasks':
      case 'task_done':
      case 'task_sorts':
        return this.pushPlainRow(entry);
      default:
        throw new Error(`Unknown entity for push: ${(entry as { entity: string }).entity}`);
    }
  }

  private requireUser(): string {
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error('no_user');
    return userId;
  }

  private async pushPlainRow(entry: OutboxEntry): Promise<void> {
    const row = plainRowToDb(entry.payload);
    const { error } = await this.supabase.from(entry.entity as never).upsert(row as never, { onConflict: 'id' });
    if (error) throw error;
  }

  private async pushImportEntity(entry: OutboxEntry): Promise<void> {
    const snakeRow = importEntityToDb(entry.payload, entry.entity);
    const { error } = await this.supabase.from(entry.entity).upsert(snakeRow as never, { onConflict: 'id' });
    if (error) throw error;
  }

  private async pushGarden(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as GardenRow & {
      plz?: string | null;
      klimazone?: number | null;
      archetype?: string | null;
    };
    const userId = this.requireUser();
    const { error } = await this.supabase.from('gardens').upsert(
      {
        id: row.id,
        name: row.name,
        plz: row.plz ?? null,
        klimazone: row.klimazone ?? null,
        archetype: row.archetype ?? null,
        updated_at: row.updatedAt,
        updated_by_user_id: userId,
        deleted_at: row.deletedAt,
      } as never,
      { onConflict: 'id' },
    );
    if (error) throw error;
  }

  private async pushProfile(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as ProfileRow;
    const userId = this.requireUser();
    const { error } = await this.supabase.from('profiles').upsert(
      {
        id: row.userId,
        display_name: row.displayName,
        updated_at: row.updatedAt,
        updated_by_user_id: userId,
        deleted_at: row.deletedAt,
      } as never,
      { onConflict: 'id' },
    );
    if (error) throw error;
  }

  private async pushVereinsregeln(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as VereinsregelnRow;
    const userId = this.requireUser();
    const dbRows = vereinsregelnToDbRows(row, userId);
    if (dbRows.length === 0) {
      const { error } = await this.supabase.from('vereinsregeln').delete().eq('garden_id', row.gardenId);
      if (error) throw error;
      return;
    }
    const { error: upsertErr } = await this.supabase
      .from('vereinsregeln')
      .upsert(dbRows as never, { onConflict: 'id' });
    if (upsertErr) throw upsertErr;
    const currentIds = dbRows.map((r) => r.id);
    const { error: deleteErr } = await this.supabase
      .from('vereinsregeln')
      .delete()
      .eq('garden_id', row.gardenId)
      .not('id', 'in', `(${currentIds.map((id) => `'${id}'`).join(',')})`);
    if (deleteErr) throw deleteErr;
  }

  private async pushGardenDimensions(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as GardenDimensionsRow;
    const userId = this.requireUser();
    const dbRow = gardenDimensionsToDb(row);
    dbRow.updated_by_user_id = userId;
    // One row per garden (unique on garden_id): two devices that each created the
    // dimensions offline meet on the same row instead of colliding.
    const { error } = await this.supabase
      .from('garden_dimensions')
      .upsert(dbRow as never, { onConflict: 'garden_id' });
    if (error) throw error;
  }

  private async pushPlanElement(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as PlanElementRow;
    const userId = this.requireUser();
    const dbRow = planElementToDb(row);
    dbRow.updated_by_user_id = userId;
    const { error } = await this.supabase.from('plan_elements').upsert(dbRow as never, { onConflict: 'id' });
    if (error) throw error;
  }

  private async handlePushError(entry: OutboxEntry, e: unknown): Promise<'failed' | 'offline'> {
    const err = e as { code?: string; message?: string };
    const code = err.code;
    const msg = err.message ?? String(e);

    if (isNetworkError(e)) {
      // Not the entry's fault and no reason to count against it. The rest of the outbox
      // would fail the same way, so this round ends here.
      syncEvents.emit({ type: 'push_retry', entry, nextAttempt: entry.attempts, nextDelayMs: 0 });
      return 'offline';
    }

    if (code === 'P9011') {
      // Someone else's later edit is already on the server. Theirs stays; ours is dropped
      // and their version is fetched so this device shows it.
      await this.storage.deleteOutboxEntry(entry.id);
      syncEvents.emit({
        type: 'push_conflict',
        entry,
        error: new ConflictError(entry.entity, entry.rowId, e),
      });
      let winnerUserId: string | null = null;
      try {
        const winner = await this.refetchRow(entry.entity, entry.rowId);
        winnerUserId = (winner as { updatedByUserId?: string | null } | null)?.updatedByUserId ?? null;
      } catch {
        // The next pull brings it.
      }
      syncEvents.emit({
        type: 'conflict_resolved',
        entity: entry.entity,
        rowId: entry.rowId,
        winnerUserId,
      });
      syncEvents.emit({
        type: 'pull_success',
        entity: entry.entity,
        rowsFetched: 1,
        changedIds: [entry.rowId],
        foreignUserIds: winnerUserId ? [winnerUserId] : [],
      });
      return 'failed';
    }

    if (code && PERMANENT_ERROR_CODES.has(code)) {
      const lastError = `${code}: ${msg}`;
      await this.storage.updateOutboxEntry(entry.id, { attempts: MAX_ATTEMPTS, lastError, nextAttemptAt: null });
      syncEvents.emit({
        type: 'push_permanent_failure',
        entry: { ...entry, attempts: MAX_ATTEMPTS, lastError },
        lastError,
      });
      this.sentry.captureException(e, {
        tags: { sync_phase: 'push', entity: entry.entity, error_kind: 'permanent', code },
      } as never);
      return 'failed';
    }

    const nextAttempts = entry.attempts + 1;
    const lastError = code ? `${code}: ${msg}` : msg;

    if (nextAttempts >= MAX_ATTEMPTS) {
      await this.storage.updateOutboxEntry(entry.id, { attempts: nextAttempts, lastError, nextAttemptAt: null });
      syncEvents.emit({
        type: 'push_permanent_failure',
        entry: { ...entry, attempts: nextAttempts, lastError },
        lastError,
      });
      this.sentry.captureException(e, {
        tags: { sync_phase: 'push', entity: entry.entity, error_kind: 'max_attempts' },
      } as never);
      return 'failed';
    }

    const delayMs = nextBackoffMs(nextAttempts);
    await this.storage.updateOutboxEntry(entry.id, {
      attempts: nextAttempts,
      lastError,
      nextAttemptAt: new Date(this.now() + delayMs).toISOString(),
    });
    syncEvents.emit({
      type: 'push_retry',
      entry: { ...entry, attempts: nextAttempts, lastError },
      nextAttempt: nextAttempts,
      nextDelayMs: delayMs,
    });
    return 'failed';
  }

  // ── Pull ────────────────────────────────────────────────────────────────────

  private async runPull(entity: EntityName): Promise<void> {
    syncEvents.emit({ type: 'pull_start', entity });
    try {
      const result = await this.pullEntity(entity);
      syncEvents.emit({ type: 'pull_success', entity, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      if (!isNetworkError(e)) {
        this.sentry.captureException(e, { tags: { sync_phase: 'pull', entity } });
      }
      syncEvents.emit({ type: 'pull_failure', entity, error: msg });
      throw e;
    }
  }

  private async pullEntity(entity: EntityName): Promise<PullResult> {
    const { userId, activeGardenId } = useAuthStore.getState();
    if (!userId) throw new Error('no_user');

    const spec = CURSOR_SPECS[entity];
    if (spec) {
      if (spec.gardenScoped && !activeGardenId) return NO_CHANGE;
      return this.pullByCursor(entity, spec, userId, activeGardenId);
    }

    switch (entity) {
      case 'garden_members': {
        if (!activeGardenId) return NO_CHANGE;
        const { data, error } = await this.supabase
          .from('garden_members')
          .select('garden_id, user_id, role, joined_at, updated_at, updated_by_user_id, deleted_at')
          .eq('garden_id', activeGardenId)
          .is('deleted_at', null);
        if (error) throw error;
        const rows = ((data ?? []) as DbRow[]).map((r) => gardenMemberFromDb(r as never));
        if (!rows.some((r) => r.userId === userId)) {
          // Row level security shows the list to members only, so an empty answer means
          // "not a member". A request without a valid session gets the same empty
          // answer, though, and acting on that would wipe local data for nothing. So the
          // server is asked who is signed in before the conclusion is drawn.
          const { data: auth, error: authError } = await this.supabase.auth.getUser();
          if (authError || auth?.user?.id !== userId) {
            throw Object.assign(new Error('not_authenticated'), { code: 'PGRST301' });
          }
          syncEvents.emit({ type: 'membership_lost', gardenId: activeGardenId });
          return NO_CHANGE;
        }
        const changed = await this.storage.replaceRowsForGarden('garden_members', activeGardenId, rows);
        return {
          rowsFetched: rows.length,
          changedIds: changed ? rows.map((r) => r.id) : [],
          foreignUserIds: [],
        };
      }
      case 'invite_codes': {
        if (!activeGardenId) return NO_CHANGE;
        const { data, error } = await this.supabase
          .from('invite_codes')
          .select('*')
          .eq('garden_id', activeGardenId);
        if (error) throw error;
        const rows = ((data ?? []) as DbRow[]).map((r) => inviteCodeFromDb(r as never));
        const changed = await this.storage.replaceRowsForGarden('invite_codes', activeGardenId, rows);
        return {
          rowsFetched: rows.length,
          changedIds: changed ? rows.map((r) => r.id) : [],
          foreignUserIds: [],
        };
      }
      case 'vereinsregeln': {
        if (!FEATURES.vereinsregeln || !activeGardenId) return NO_CHANGE;
        const { data, error } = await this.supabase
          .from('vereinsregeln')
          .select('*')
          .eq('garden_id', activeGardenId);
        if (error) throw error;
        const all = (data ?? []) as DbRow[];
        if (all.length === 0) return NO_CHANGE;
        const aggregated = vereinsregelnFromDbRows(all as never, activeGardenId);
        if (aggregated) await this.storage.upsertRowFromServer('vereinsregeln', aggregated);
        return { rowsFetched: all.length, changedIds: aggregated ? [aggregated.id] : [], foreignUserIds: [] };
      }
      default:
        return NO_CHANGE;
    }
  }

  private async pullByCursor(
    entity: EntityName,
    spec: CursorSpec,
    userId: string,
    activeGardenId: string | null,
  ): Promise<PullResult> {
    const state = await this.storage.getSyncState(entity);
    const cursor = state?.lastPullAt ?? null;
    const lowerBound = cursor ? new Date(toMs(cursor) - CURSOR_OVERLAP_MS).toISOString() : null;

    let after: { stamp: string; id: string } | null = null;
    let newest = cursor;
    let rowsFetched = 0;
    const changedIds: string[] = [];
    const foreign = new Set<string>();

    for (;;) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = this.supabase.from(spec.table).select(spec.select);
      if (spec.gardenScoped) q = q.eq('garden_id', activeGardenId);
      if (after) {
        // Next page: strictly after the last row read, by (server_updated_at, id). Rows
        // that share one stamp are not skipped at a page boundary.
        q = q.or(
          `server_updated_at.gt."${after.stamp}",and(server_updated_at.eq."${after.stamp}",id.gt."${after.id}")`,
        );
      } else if (lowerBound) {
        q = q.gt('server_updated_at', lowerBound);
      }
      q = q
        .order('server_updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(PAGE_SIZE);
      const { data, error } = await q;
      if (error) throw error;
      const page = (data ?? []) as DbRow[];
      if (page.length === 0) break;

      const rows = page.map(spec.toLocal);
      const written = (await this.storage.upsertRowsFromServer(entity, rows)) ?? [];
      if (written.length > 0) {
        const writtenSet = new Set(written);
        for (const row of rows) {
          if (!writtenSet.has(row.id)) continue;
          changedIds.push(row.id);
          const by = (row as { updatedByUserId?: string | null }).updatedByUserId;
          if (by && by !== userId) foreign.add(by);
        }
      }

      const last = page[page.length - 1]!;
      after = { stamp: String(last['server_updated_at']), id: String(last['id']) };
      newest = after.stamp;
      rowsFetched += page.length;
      if (page.length < PAGE_SIZE) break;
    }

    if (newest && newest !== cursor) {
      await this.storage.setSyncState({
        entity,
        lastPullAt: newest,
        lastPushAt: state?.lastPushAt ?? null,
      });
    }
    return { rowsFetched, changedIds, foreignUserIds: [...foreign] };
  }

  /**
   * Fetches one row by id and stores it even when the local row carries a later edit
   * time. For the moments when the server's version has to win: a lost conflict, a
   * discarded change. Returns the row, or null when the server has none.
   */
  private async refetchRow(entity: EntityName, rowId: string): Promise<AnyRow | null> {
    const spec = CURSOR_SPECS[entity];
    if (!spec) {
      await this.pull(entity);
      return null;
    }
    const { data, error } = await this.supabase
      .from(spec.table)
      .select(spec.select)
      .eq('id', rowId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = spec.toLocal(data as unknown as DbRow);
    await this.storage.upsertRowsFromServer(entity, [row], { force: true });
    return row;
  }
}

// ── Singleton-Accessor ────────────────────────────────────────────────────────

let _instance: SyncWorker | null = null;

export function getSyncWorker(): SyncWorker {
  if (!_instance) {
    _instance = new SyncWorker({
      storage: defaultStorage,
      supabase: defaultSupabase,
    });
  }
  return _instance;
}

export function setSyncWorker(worker: SyncWorker | null): void {
  _instance = worker;
}
