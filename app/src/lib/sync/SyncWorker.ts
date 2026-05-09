import * as SentryDefault from '@sentry/react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { storage as defaultStorage } from '../../storage';
import { supabase as defaultSupabase } from '../supabase';
import { ConflictError } from '../errors';
import { useAuthStore } from '../../stores/authStore';
import { syncEvents } from './events';
import { nextBackoffMs, MAX_ATTEMPTS } from './backoff';
import type {
  EntityName,
  OutboxEntry,
  StorageAdapter,
  GardenRow,
  GardenMemberRow,
  ProfileRow,
  VereinsregelnRow,
  InviteCodeRow,
} from '@spatenstich/shared';
import {
  gardenFromDb,
  profileFromDb,
  vereinsregelnFromDbRows,
  gardenMemberFromDb,
  inviteCodeFromDb,
  vereinsregelnToDbRows,
} from '../mappers/rowMappers';

// Entities, die gepullt werden
export const PULL_ENTITIES: EntityName[] = [
  'gardens',
  'garden_members',
  'profiles',
  'vereinsregeln',
  'invite_codes',
];

export interface SyncWorkerDeps {
  storage: StorageAdapter;
  supabase: SupabaseClient;
  sentry?: typeof SentryDefault;
}

/**
 * SyncWorker: Offline-First Sync-Engine fuer Phase 3.
 *
 * KLASSE (nicht Module-Funktionen), weil:
 *   - pushInFlight-Serialisation braucht Instance-State
 *   - retryOp/discardOp sind instance-scoped und koppeln an Outbox + SyncTriggers
 *   - Constructor-Injection { storage, supabase } erlaubt saubere Jest-Mocks
 *     (insbesondere fuer reconnect-2user.integration.test.ts in Task 03)
 *
 * Singleton-Pattern: getSyncWorker() im App-Code, setSyncWorker() in Tests + _layout.tsx.
 */
export class SyncWorker {
  private readonly storage: StorageAdapter;
  private readonly supabase: SupabaseClient;
  private readonly sentry: typeof SentryDefault;
  private pushInFlight = false;

  constructor(deps: SyncWorkerDeps) {
    this.storage = deps.storage;
    this.supabase = deps.supabase;
    this.sentry = deps.sentry ?? SentryDefault;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Push alle pending Outbox-Eintraege sequentiell.
   * Idempotent bei parallelem Aufruf (zweiter Aufruf ist No-Op wenn erster noch laeuft — S-6 Pattern).
   */
  async push(): Promise<void> {
    if (this.pushInFlight) return;
    this.pushInFlight = true;
    syncEvents.emit({ type: 'status_change', status: 'syncing' });
    try {
      const entries = await this.storage.listOutboxEntries(50);
      for (const entry of entries) {
        await this.pushOne(entry);
      }
    } finally {
      this.pushInFlight = false;
      const remaining = await this.storage.listOutboxEntries(1);
      syncEvents.emit({
        type: 'status_change',
        status: remaining.length > 0 ? 'degraded' : 'idle',
      });
    }
  }

  /**
   * Delta-Pull fuer eine einzelne Entity.
   * Nutzt sync_state.lastPullAt als `updated_at > X`-Filter.
   * Aktualisiert sync_state auf server_now() nach Erfolg.
   */
  async pull(entity: EntityName): Promise<void> {
    syncEvents.emit({ type: 'pull_start', entity });
    try {
      const state = await this.storage.getSyncState(entity);
      const lastPullAt = state?.lastPullAt;

      const { data: nowData, error: nowErr } = await this.supabase.rpc('server_now');
      if (nowErr) throw nowErr;
      const serverNow = nowData as string;

      const rowsFetched = await this.pullEntity(entity, lastPullAt ?? null);

      await this.storage.setSyncState({
        entity,
        lastPullAt: serverNow,
        lastPushAt: state?.lastPushAt ?? null,
      });
      syncEvents.emit({ type: 'pull_success', entity, rowsFetched, serverNow });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.sentry.captureException(e, { tags: { sync_phase: 'pull', entity } });
      syncEvents.emit({ type: 'pull_failure', entity, error: msg });
      throw e;
    }
  }

  /**
   * Delta-Pull fuer ALLE PULL_ENTITIES.
   * Fehler einzelner Entities stoppen die Iteration NICHT — partial-sync ist erlaubt.
   * Wird von syncAll() + Plan 03-06 Task 05 (worker.pullAll()) genutzt.
   */
  async pullAll(): Promise<void> {
    for (const entity of PULL_ENTITIES) {
      try {
        await this.pull(entity);
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[pullAll] pull ${entity} failed`, e);
        // Continue mit naechster Entity
      }
    }
  }

  /**
   * Voller Sync: alle Entities pullen + Outbox pushen.
   * Wird beim Reconnect + App-Start (nach auth) aufgerufen + von retryOp().
   */
  async syncAll(): Promise<void> {
    await this.pullAll();
    await this.push();
  }

  /**
   * Retry eines failed/stuck Outbox-Eintrags (Plan 03-06 Detail-Screen Retry-Button).
   * Setzt attempts=0, clear lastError, triggert syncAll().
   * Throws 'outbox_entry_not_found' wenn opId nicht existiert.
   */
  async retryOp(opId: string): Promise<void> {
    const entries = await this.storage.listOutboxEntries();
    const entry = entries.find((e) => e.id === opId);
    if (!entry) {
      throw new Error('outbox_entry_not_found');
    }
    await this.storage.updateOutboxEntry(opId, {
      attempts: 0,
      lastError: null,
    });
    syncEvents.emit({ type: 'status_change', status: 'syncing' });
    await this.syncAll();
  }

  /**
   * Verwerfen eines Outbox-Eintrags (Plan 03-06 Detail-Screen Verwerfen-Button).
   * Loescht die Op, triggert pull(entity) fuer Delta-Korrektur — Server-Stand ueberschreibt lokalen Wert (D-22).
   * Idempotent: fehlende IDs fuehren NICHT zu Exception.
   */
  async discardOp(opId: string): Promise<void> {
    const entries = await this.storage.listOutboxEntries();
    const entry = entries.find((e) => e.id === opId);
    await this.storage.deleteOutboxEntry(opId);
    if (entry) {
      try {
        await this.pull(entry.entity);
      } catch {
        // Pull-Fehler still — naechster Trigger wird versuchen
      }
    }
  }

  /** Test-utility: reset internal state between tests. */
  _resetForTest(): void {
    this.pushInFlight = false;
  }

  // ── Private: Push Handlers ─────────────────────────────────────────────────

  private async pushOne(entry: OutboxEntry): Promise<void> {
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
      this.sentry.addBreadcrumb({
        category: 'sync',
        level: 'info',
        message: `push success ${entry.entity}.${entry.rowId}`,
      });
    } catch (e) {
      await this.handlePushError(entry, e);
    }
  }

  private async dispatchPush(entry: OutboxEntry): Promise<void> {
    switch (entry.entity) {
      case 'gardens':       return this.pushGarden(entry);
      case 'profiles':      return this.pushProfile(entry);
      case 'vereinsregeln': return this.pushVereinsregeln(entry);
      case 'garden_members': return this.pushGardenMember(entry);
      case 'invite_codes':  return this.pushInviteCode(entry);
      default:
        throw new Error(`Unknown entity for push: ${(entry as { entity: string }).entity}`);
    }
  }

  private async pushGarden(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as GardenRow & { plz?: string | null; klimazone?: string | null; archetype?: string | null };
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error('no_user');
    if (entry.operation === 'delete') {
      const { error } = await this.supabase
        .from('gardens')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: row.updatedAt,
          updated_by_user_id: userId,
        } as any)
        .eq('id', entry.rowId);
      if (error) throw error;
      return;
    }
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
      } as any,
      { onConflict: 'id' },
    );
    if (error) throw error;
  }

  private async pushProfile(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as ProfileRow;
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error('no_user');
    const { error } = await this.supabase.from('profiles').upsert(
      {
        id: row.userId,
        display_name: row.displayName,
        updated_at: row.updatedAt,
        updated_by_user_id: userId,
        deleted_at: row.deletedAt,
      } as any,
      { onConflict: 'id' },
    );
    if (error) throw error;
  }

  private async pushVereinsregeln(entry: OutboxEntry): Promise<void> {
    const row = entry.payload as unknown as VereinsregelnRow;
    const userId = useAuthStore.getState().userId;
    if (!userId) throw new Error('no_user');
    const dbRows = vereinsregelnToDbRows(row, userId);
    if (dbRows.length === 0) {
      const { error } = await this.supabase
        .from('vereinsregeln')
        .delete()
        .eq('garden_id', row.gardenId);
      if (error) throw error;
      return;
    }
    const { error: upsertErr } = await this.supabase
      .from('vereinsregeln')
      .upsert(dbRows, { onConflict: 'id' });
    if (upsertErr) throw upsertErr;
    const currentIds = dbRows.map((r) => r.id);
    const { error: deleteErr } = await this.supabase
      .from('vereinsregeln')
      .delete()
      .eq('garden_id', row.gardenId)
      .not('id', 'in', `(${currentIds.map((id) => `'${id}'`).join(',')})`);
    if (deleteErr) throw deleteErr;
  }

  private async pushGardenMember(_entry: OutboxEntry): Promise<void> {
    throw new Error('garden_members push not supported in Phase 3 — use RPCs directly');
  }

  private async pushInviteCode(_entry: OutboxEntry): Promise<void> {
    throw new Error('invite_codes push not supported — use RPCs');
  }

  // ── Private: Error Handling ─────────────────────────────────────────────────

  private async handlePushError(entry: OutboxEntry, e: unknown): Promise<void> {
    const err = e as { code?: string; message?: string };
    const code = err.code;
    const msg = err.message ?? String(e);

    if (code === 'P9011') {
      const conflictError = new ConflictError(entry.entity, entry.rowId, e);
      await this.storage.deleteOutboxEntry(entry.id);
      syncEvents.emit({ type: 'push_conflict', entry, error: conflictError });
      this.sentry.captureException(e, {
        level: 'warning',
        tags: {
          sync_phase: 'push',
          entity: entry.entity,
          error_kind: 'lww_conflict',
        },
        extra: { row_id: entry.rowId, attempts: entry.attempts },
      } as any);
      return;
    }

    if (code === 'P9010') {
      await this.storage.deleteOutboxEntry(entry.id);
      this.sentry.captureException(e, {
        tags: { sync_phase: 'push', entity: entry.entity, error_kind: 'missing_updated_at' },
      } as any);
      syncEvents.emit({ type: 'push_permanent_failure', entry, lastError: 'P9010 missing updated_at' });
      return;
    }

    const nextAttempts = entry.attempts + 1;

    if (nextAttempts >= MAX_ATTEMPTS) {
      await this.storage.updateOutboxEntry(entry.id, { attempts: nextAttempts, lastError: msg });
      syncEvents.emit({ type: 'push_permanent_failure', entry: { ...entry, attempts: nextAttempts, lastError: msg }, lastError: msg });
      this.sentry.captureException(e, {
        tags: { sync_phase: 'push', entity: entry.entity, error_kind: 'max_attempts' },
      } as any);
      return;
    }

    const delayMs = nextBackoffMs(nextAttempts);
    await this.storage.updateOutboxEntry(entry.id, { attempts: nextAttempts, lastError: msg });
    syncEvents.emit({
      type: 'push_retry',
      entry: { ...entry, attempts: nextAttempts, lastError: msg },
      nextAttempt: nextAttempts,
      nextDelayMs: delayMs,
    });
  }

  // ── Private: Pull Handlers ─────────────────────────────────────────────────

  private async pullEntity(entity: EntityName, lastPullAt: string | null): Promise<number> {
    const userId = useAuthStore.getState().userId;
    const activeGardenId = useAuthStore.getState().activeGardenId;
    if (!userId) throw new Error('no_user');

    switch (entity) {
      case 'gardens': {
        let q = this.supabase.from('gardens').select('*') as any;
        if (lastPullAt) q = q.gt('updated_at', lastPullAt);
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data ?? []).map(gardenFromDb);
        if (rows.length > 0) await this.storage.upsertRowsFromServer('gardens', rows);
        return rows.length;
      }
      case 'profiles': {
        let q = this.supabase
          .from('profiles')
          .select('id, display_name, created_at, updated_at, updated_by_user_id, deleted_at') as any;
        if (lastPullAt) q = q.gt('updated_at', lastPullAt);
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data ?? []).map(profileFromDb);
        if (rows.length > 0) await this.storage.upsertRowsFromServer('profiles', rows);
        return rows.length;
      }
      case 'vereinsregeln': {
        if (!activeGardenId) return 0;
        let q = this.supabase.from('vereinsregeln').select('*').eq('garden_id', activeGardenId) as any;
        if (lastPullAt) q = q.gt('updated_at', lastPullAt);
        const { data, error } = await q;
        if (error) throw error;
        if ((data ?? []).length === 0) return 0;
        const { data: allData, error: allErr } = await this.supabase
          .from('vereinsregeln')
          .select('*')
          .eq('garden_id', activeGardenId) as any;
        if (allErr) throw allErr;
        const aggregated = vereinsregelnFromDbRows(allData ?? [], activeGardenId);
        if (aggregated) await this.storage.upsertRowFromServer('vereinsregeln', aggregated);
        return (allData ?? []).length;
      }
      case 'garden_members': {
        if (!activeGardenId) return 0;
        const { data, error } = await (this.supabase
          .from('garden_members')
          .select('garden_id, user_id, role, joined_at')
          .eq('garden_id', activeGardenId) as any);
        if (error) throw error;
        const rows = (data ?? []).map(gardenMemberFromDb);
        await this.storage.upsertRowsFromServer('garden_members', rows);
        return rows.length;
      }
      case 'invite_codes': {
        if (!activeGardenId) return 0;
        const { data, error } = await (this.supabase
          .from('invite_codes')
          .select('*')
          .eq('garden_id', activeGardenId) as any);
        if (error) throw error;
        const rows = (data ?? []).map(inviteCodeFromDb);
        await this.storage.upsertRowsFromServer('invite_codes', rows);
        return rows.length;
      }
      default:
        return 0;
    }
  }
}

// ── Singleton-Accessor ────────────────────────────────────────────────────────

let _instance: SyncWorker | null = null;

/**
 * Lazy-initialized Singleton-Accessor.
 * Default-Injection: storage aus '../../storage', supabase aus '../supabase'.
 * Fuer Tests: setSyncWorker(null) vor Test + setSyncWorker(customWorker) zur Injection.
 */
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
