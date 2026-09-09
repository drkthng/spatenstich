# Phase 3: Offline & Sync (2-User Shared State) — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 27 neue/zu-ändernde Files aus CONTEXT.md §Canonical References + RESEARCH.md §File Layout
**Analogs found:** 24 / 27 (3 ohne perfekten Analog — EXIF-Strip, NetInfo-Triggers, SyncStatusBadge-UI; Muster aus RESEARCH.md)

---

## File Classification

| Neue/Zu-ändernde Datei | Rolle | Data Flow | Closest Analog | Match Quality |
|------------------------|-------|-----------|----------------|---------------|
| **Migration SQL** |
| `supabase/migrations/20260424000013_offline_sync_infrastructure.sql` | migration | DDL (schema + triggers + RPCs + RLS) | `supabase/migrations/20260423000003_shared_garden.sql` + `...010_custom_sqlstate_codes.sql` | exact |
| `supabase/migrations/20260424000014_photo_queue_and_storage_rls.sql` *(optional split)* | migration | DDL (storage.objects + RLS) | `supabase/migrations/20260423000004_fix_rls_recursion.sql` | exact |
| **Supabase Tests** |
| `supabase/tests/lww_guard.sql` | test-sql | DML (simulate older-write → expect P9011) | `supabase/tests/rls_member_check.sql` | role-match |
| `supabase/tests/trigger_ordering.sql` | test-sql | catalog-query | `supabase/tests/rls_foundation.sql` | role-match |
| `supabase/tests/enqueue_photo_analysis.sql` | test-sql | RPC-Call (member vs. non-member) | `supabase/tests/invite_code.sql` | exact |
| `supabase/tests/storage_photos_rls.sql` | test-sql | storage-policy-check | `supabase/tests/rls_member_check.sql` | role-match |
| **Storage Adapter** |
| `packages/shared/src/types/storage.ts` | type-interface | contract | bestehend (erweitert) | self |
| `app/src/storage/SqliteAdapter.ts` | storage-adapter | Row-SQL (native) | bestehend (erweitert) | self |
| `app/src/storage/IndexedDbAdapter.ts` | storage-adapter | Row-IDB (web) | bestehend (erweitert) | self |
| `app/src/storage/migrations.ts` | migration-registry | schema-up-steps | bestehend (erweitert) | self |
| `app/src/storage/__tests__/RowTables.test.ts` | test-unit | contract-test | `app/src/storage/__tests__/StorageAdapter.test.ts` | exact |
| `app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts` | test-unit | fake-idb range queries | `app/src/storage/__tests__/StorageAdapter.test.ts` | role-match |
| **Sync Infrastruktur** |
| `app/src/lib/sync/SyncWorker.ts` | worker | push-/pull-cycle (event-driven) | kein direkter Analog — Pattern aus RESEARCH §4 + `enqueueAiJob.ts` Supabase-Calls | partial |
| `app/src/lib/sync/SyncTriggers.ts` | worker-bootstrap | event-subscription (NetInfo/AppState) | `app/app/_layout.tsx` useEffect-Guard-Pattern | partial |
| `app/src/lib/sync/outboxSerialization.ts` | utility | JSON.parse/stringify helpers | `app/src/lib/vereinsregelnRepo.ts` toRow/fromRow | role-match |
| `app/src/stores/syncStore.ts` | state-store | Zustand (derived counters) | `app/src/stores/authStore.ts` | exact |
| `app/src/lib/sync/__tests__/SyncWorker.test.ts` | test-unit | worker-mock | `app/src/lib/__tests__/vereinsregelnRepo.test.ts` | role-match |
| `app/src/lib/sync/__tests__/SyncWorker.backoff.test.ts` | test-unit | fake-timer | `app/src/lib/__tests__/vereinsregelnRepo.test.ts` | role-match |
| `app/src/stores/__tests__/syncStore.test.ts` | test-unit | reducer-test | `app/src/stores/__tests__/authStore.test.ts` | exact |
| **Foto-Queue + EXIF** |
| `app/src/lib/sync/photoUploader.ts` | worker | binary-upload + RPC (streaming) | `app/src/lib/enqueueAiJob.ts` (RPC) + RESEARCH §6 | role-match |
| `app/src/lib/photo/exifStrip.ts` | utility | transform (Platform.select) | `app/src/storage/index.ts` Platform.select-Pattern; sonst neu | partial |
| `app/src/lib/sync/__tests__/photoUploader.test.ts` | test-unit | mock-supabase | `app/src/lib/__tests__/inviteCodeRepo.test.ts` | role-match |
| `app/src/lib/photo/__tests__/exifStrip.test.ts` | test-unit | mock-piexif | `app/src/lib/__tests__/extractVereinsregeln.test.ts` | role-match |
| **Repos (Umbau D-28)** |
| `app/src/lib/vereinsregelnRepo.ts` | repo | CRUD (storage-first + outbox) | bestehend (mode-aware → umbauen) | self |
| `app/src/lib/gardenRepo.ts` | repo | CRUD (storage-first + outbox) | bestehend (account-only → umbauen) | self |
| `app/src/lib/profileRepo.ts` | repo | CRUD (storage-first + outbox) | bestehend (mode-aware → umbauen) | self |
| `app/src/lib/inviteCodeRepo.ts` | repo | RPC-only (bleibt) | bestehend (unverändert) | self |
| `app/src/lib/migrateLocalToAccount.ts` | migration-flow | atomic 8 → 9 Steps | bestehend (Step 9 hinzufügen) | self |
| **UI** |
| `app/src/components/SyncStatusBadge.tsx` | ui-component | derived-state render | `app/app/(app)/settings.tsx` inline-confirm + `useAuthStore`-subscribe | partial |
| `app/app/(app)/settings.tsx` | screen | form + expansion | bestehend (Sync-Status-Section anhängen) | self |
| `app/app/_layout.tsx` | layout | useEffect bootstrap | bestehend (`initSyncTriggers()` in useEffect) | self |

---

## Pattern Assignments

### 1. `supabase/migrations/20260424000013_offline_sync_infrastructure.sql` (migration)

**Analog:** `supabase/migrations/20260423000010_custom_sqlstate_codes.sql` (SECURITY-DEFINER-RPC-Pattern, P9xxx-Kodierung) + `...003_shared_garden.sql` (Tabellen + Trigger-Attachment) + `...004_fix_rls_recursion.sql` (`is_garden_member`-Verwendung)

**File-Header-Pattern** (aus Migration 010, Z. 1-33):
```sql
-- Phase 3 / Migration 013 — Offline-Sync Infrastructure (D-01..D-28, Research §3/§6)
-- Background:
--   D-08 LWW-Guard + D-09 client-set updated_at + D-17 photo_queue +
--   D-19 enqueue_photo_analysis RPC + D-23 soft-delete via deleted_at
--
-- Trigger-Ordering (Research §3, Landmine L-7):
--   Postgres fires BEFORE UPDATE triggers alphabetisch. LWW-Guard MUSS vor
--   tg_set_updated_at laufen → Naming-Konvention aa_/mm_/zz_.
--
-- Atomicity: Supabase wraps file in implicit transaction (D-15). DO NOT add BEGIN/COMMIT.
-- Rollback-strategy: none needed — if any step fails, Postgres rolls back the whole file.
-- Test coverage: supabase/tests/{lww_guard,trigger_ordering,enqueue_photo_analysis,storage_photos_rls}.sql
```

**SECURITY-DEFINER-Trigger-Function-Pattern** (aus Migration 010, Z. 38-68; übernommen für `tg_lww_guard`):
```sql
CREATE OR REPLACE FUNCTION public.tg_lww_guard()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    RAISE EXCEPTION 'lww_guard_missing_updated_at'
      USING ERRCODE = 'P9010',
            MESSAGE = 'Client must set updated_at explicitly (D-09)';
  END IF;
  IF NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'lww_reject_older_write'
      USING ERRCODE = 'P9011',
            MESSAGE = format('LWW reject: incoming=% < existing=%', NEW.updated_at, OLD.updated_at);
  END IF;
  RETURN NEW;
END $$;
```

**Trigger-Attachment-Loop-Pattern** (neuer Ansatz; Naming gemäß RESEARCH §3):
```sql
-- DROP old updated_at-Trigger before recreating under zz_-Namespace
DROP TRIGGER IF EXISTS vereinsregeln_updated_at ON public.vereinsregeln;
DROP TRIGGER IF EXISTS gardens_updated_at ON public.gardens;
DROP TRIGGER IF EXISTS ai_jobs_updated_at ON public.ai_jobs;

DO $$ DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['gardens','vereinsregeln','ai_jobs','ai_results','profiles']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER aa_lww_guard_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard()', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER zz_set_updated_at_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', tbl, tbl);
  END LOOP;
END $$;
```

**Soft-delete-Column-Pattern** (aus Migration 003, Z. 123-130):
```sql
ALTER TABLE public.gardens       ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.vereinsregeln ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.ai_jobs       ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.ai_results    ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.profiles      ADD COLUMN deleted_at timestamptz;

-- Profiles: updated_at fehlt bislang; für LWW-Guard nötig (RESEARCH Open Question 1)
ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
```

**RPC-Pattern** (aus Migration 010 `consume_invite_code`, Z. 38-68 — für `enqueue_photo_analysis`):
```sql
CREATE OR REPLACE FUNCTION public.enqueue_photo_analysis(
  p_garden_id uuid, p_storage_path text, p_kind text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_garden_member(p_garden_id) THEN
    RAISE EXCEPTION 'not_garden_member' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_jobs (created_by_user_id, garden_id, job_type, payload)
  VALUES (v_user, p_garden_id, 'photo_analysis',
    jsonb_build_object('storage_path', p_storage_path, 'kind', p_kind))
  RETURNING id INTO v_job_id;

  PERFORM pgmq.send('ai_jobs',
    jsonb_build_object('job_id', v_job_id, 'storage_path', p_storage_path, 'kind', p_kind));

  RETURN v_job_id;
END $$;

GRANT EXECUTE ON FUNCTION public.enqueue_photo_analysis(uuid,text,text) TO authenticated;
```

**pgcrypto-search_path-Gotcha** (aus Migration 005, Z. 16-17): falls `gen_random_uuid()` oder `gen_random_bytes` in neuer Function genutzt wird → `SET search_path = public, extensions, pg_temp`. Für `enqueue_photo_analysis` unkritisch (kein pgcrypto-Aufruf), aber für `server_now()` + `tg_lww_guard` nicht nötig (kein pgcrypto).

**photo_queue-Tabelle-Pattern** (aus Migration 003 `invite_codes`, Z. 57-71):
```sql
CREATE TABLE public.photo_queue (
  id                   uuid primary key default gen_random_uuid(),
  garden_id            uuid not null references public.gardens(id) on delete cascade,
  created_by_user_id   uuid not null references auth.users(id) on delete cascade,
  local_uri            text not null,              -- client-side ref (expo-file-system or idb:<id>)
  kind                 text not null,              -- 'plan_photo' | 'rules_photo' | etc.
  uploaded_at          timestamptz,
  storage_path         text,
  retry_count          int  not null default 0,
  last_error           text,
  last_attempted_at    timestamptz,
  geo_lat              double precision,           -- D-26 opt-in
  geo_lng              double precision,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by_user_id   uuid references auth.users(id),
  deleted_at           timestamptz
);
CREATE INDEX photo_queue_garden_idx ON public.photo_queue (garden_id, uploaded_at);
CREATE INDEX photo_queue_retry_idx  ON public.photo_queue (retry_count) WHERE uploaded_at IS NULL;

ALTER TABLE public.photo_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_queue_member" ON public.photo_queue FOR ALL
  USING (public.is_garden_member(garden_id))
  WITH CHECK (public.is_garden_member(garden_id));
```

**Post-migration-Invariant-Block** (aus Migration 004, Z. 117-127):
```sql
do $$ declare cnt int;
begin
  select count(*) into cnt from pg_trigger
    where tgname = 'aa_lww_guard_vereinsregeln';
  if cnt <> 1 then raise exception 'migration_013_invariant: aa_lww_guard_vereinsregeln missing'; end if;
  raise notice 'migration_013 ok: LWW guard + photo_queue + deleted_at applied';
end $$;
```

---

### 2. `supabase/tests/lww_guard.sql` (test-sql)

**Analog:** `supabase/tests/rls_member_check.sql` (Z. 9-50; JWT-Claim-Switch + BEGIN/ROLLBACK + `do $$ … $$`-Assertions)

**Test-Scaffold-Pattern** (Z. 1-13):
```sql
-- Phase 3 / LWW-Guard Test — Plan 03-01
-- Ausführung: supabase db query --linked -f supabase/tests/lww_guard.sql
-- Erwartet: NOTICE 'P9011 reject' + NOTICE 'P9010 missing' + NOTICE 'accept newer'
BEGIN;
  select set_config('request.jwt.claim.sub', '<seeded-owner-uuid>', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- Setup: garden + vereinsregel-row mit known updated_at
  do $$ begin
    -- UPDATE mit older timestamp → expect P9011
    begin
      update public.vereinsregeln
        set titel = 'x', updated_at = '2000-01-01'::timestamptz
        where id = (select id from public.vereinsregeln limit 1);
      raise exception 'LWW guard did not fire — got accepted';
    exception when sqlstate 'P9011' then
      raise notice 'LWW ok: P9011 older-write rejected';
    end;
  end $$;
ROLLBACK;
```

---

### 3. `packages/shared/src/types/storage.ts` (type-interface)

**Analog:** bestehendes File (erweitert)

**Bestehender Contract** (Z. 1-10) bleibt rückwärtskompatibel:
```typescript
// D-08: CRUD only in Phase 1. Transactions/queries deferred to Phase 3.
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
}
```

**Extension-Pattern** (aus RESEARCH §2, Z. 152-221):
```typescript
export type EntityName =
  | 'gardens' | 'garden_members' | 'profiles'
  | 'vereinsregeln' | 'ai_jobs' | 'ai_results'
  | 'photo_queue';

export interface RowBase {
  id: string;
  garden_id?: string | null;
  updated_at: string;
  updated_by_user_id?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface QueryOptions {
  where?: Partial<Pick<RowBase, 'garden_id' | 'id'>>;
  updatedAfter?: string;
  includeDeleted?: boolean;
}

export interface OutboxEntry {
  id: string; entity: EntityName; row_id: string;
  op: 'upsert' | 'delete';
  payload_json: string; created_at: string;
  retry_count: number; last_error: string | null;
  last_attempted_at: string | null;
}

export interface StorageAdapter {
  // ... existing KV ...
  queryRows<T extends RowBase>(entity: EntityName, opts?: QueryOptions): Promise<T[]>;
  getRow<T extends RowBase>(entity: EntityName, id: string): Promise<T | null>;
  upsertRow<T extends RowBase>(entity: EntityName, row: T): Promise<void>;
  deleteRow(entity: EntityName, id: string, at?: string): Promise<void>;
  writeWithOutbox<T extends RowBase>(entity: EntityName, row: T, op: 'upsert'|'delete'): Promise<void>;
  pendingOutbox(limit: number): Promise<OutboxEntry[]>;
  markOutboxAttempt(id: string, error: string | null): Promise<void>;
  removeOutbox(id: string): Promise<void>;
  getLastPulledAt(entity: EntityName): Promise<string | null>;
  setLastPulledAt(entity: EntityName, ts: string): Promise<void>;
}
```

---

### 4. `app/src/storage/SqliteAdapter.ts` (storage-adapter, native Row-Tables)

**Analog:** bestehendes `SqliteAdapter.ts` (KV-Pfad bleibt unverändert — Z. 1-58)

**Bestehendes Pattern (KV, bleibt)** — `dbPromise`-Muster Z. 9-17:
```typescript
constructor(dbName: string) {
  this.dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
    );
    return db;
  })();
}
```

**Extension-Pattern** — Row-Tables daneben anlegen im Constructor; nicht in `upgrade`-Callback, sondern via `runMigrations` (siehe §5). `writeWithOutbox` MUSS `withExclusiveTransactionAsync` nutzen (RESEARCH Landmine L-6):

```typescript
async writeWithOutbox<T extends RowBase>(entity: EntityName, row: T, op: 'upsert'|'delete'): Promise<void> {
  const db = await this.dbPromise;
  await db.withExclusiveTransactionAsync(async (txn) => {
    // 1. Row upsert (domain-table)
    // 2. sync_outbox insert
    // Both in same exclusive tx → atomic-tail like migrateLocalToAccount
  });
}
```

**Query-Pattern** — Spiegel des bestehenden `db.getAllAsync` KV-Call (Z. 42-48):
```typescript
async queryRows<T extends RowBase>(entity: EntityName, opts?: QueryOptions): Promise<T[]> {
  const db = await this.dbPromise;
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts?.where?.garden_id) { where.push('garden_id = ?'); params.push(opts.where.garden_id); }
  if (opts?.updatedAfter) { where.push('updated_at > ?'); params.push(opts.updatedAfter); }
  if (!opts?.includeDeleted) { where.push('deleted_at IS NULL'); }
  const sql = `SELECT * FROM ${entity}${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
  return db.getAllAsync<T>(sql, ...params);
}
```

---

### 5. `app/src/storage/IndexedDbAdapter.ts` (storage-adapter, web Row-Tables)

**Analog:** bestehendes `IndexedDbAdapter.ts` (KV-Pfad bleibt — Z. 1-50)

**Bestehendes Pattern (KV)** — idb `openDB(name, version, {upgrade})` Z. 11-17:
```typescript
this.dbPromise = openDB(dbName, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE);
    }
  },
});
```

**Extension-Pattern** — `upgrade`-Callback um ObjectStores pro Entity + `garden_id`-Index erweitern (version 2+). Muss auf dieselbe idb `openDB`-Shape bleiben:
```typescript
this.dbPromise = openDB(dbName, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) db.createObjectStore('kv');
    if (oldVersion < 2) {
      for (const e of ENTITY_NAMES) {
        const store = db.createObjectStore(e, { keyPath: 'id' });
        store.createIndex('garden_id', 'garden_id');
        store.createIndex('updated_at', 'updated_at');
      }
      db.createObjectStore('sync_outbox', { keyPath: 'id' });
      db.createObjectStore('sync_state', { keyPath: 'entity' });
    }
  },
});
```

**Multi-store-Transaction für `writeWithOutbox`** (RESEARCH §2, Z. 229):
```typescript
async writeWithOutbox(entity: EntityName, row: RowBase, op: 'upsert'|'delete'): Promise<void> {
  const db = await this.dbPromise;
  const tx = db.transaction([entity, 'sync_outbox'], 'readwrite');
  await Promise.all([
    tx.objectStore(entity).put(row),
    tx.objectStore('sync_outbox').add({ /* OutboxEntry */ }),
    tx.done,
  ]);
}
```

---

### 6. `app/src/storage/migrations.ts` (migration-registry)

**Analog:** bestehendes `migrations.ts` (Z. 1-35)

**Extension-Pattern** — neue `LocalMigration` appenden, NICHT bestehende ändern:
```typescript
// Existing (bleiben):
{ version: 1, up: async () => {} },
{ version: 2, up: async (_adapter) => {} },

// NEW Phase 3:
{
  version: 3,
  up: async (adapter) => {
    // SQLite: CREATE TABLE gardens/vereinsregeln/… mit Row-Spalten
    // IDB: kein-op (upgrade-Callback in Adapter-Constructor wählt Version 2)
    // Best-effort: adapter erkennt selbst, ob CREATE TABLE nötig ist.
  },
},
```

**Runner-Pattern** (bestehend Z. 25-34) bleibt — `pending.filter(m => m.version > current).sort(...)`.

---

### 7. `app/src/lib/sync/SyncWorker.ts` (worker)

**Analog:** `app/src/lib/enqueueAiJob.ts` (Supabase-Schema-cast Pattern) + RESEARCH §4 (Skizze Z. 336-441)

**Imports-Pattern** (aus `enqueueAiJob.ts` Z. 1-4):
```typescript
import { supabase } from '../supabase';
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import * as Sentry from '@sentry/react-native';
```

**Debounced-Scheduler-Pattern** (RESEARCH §4, Z. 355-371) — keine Timer-Leaks:
```typescript
schedule() {
  if (this.debounceTimer) clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => this.run(), 500);
}
async run() {
  if (this.running) { this.queued = true; return; }
  this.running = true;
  try {
    await this.pushCycle();  // D-16: push before pull
    await this.pullCycle();
  } finally {
    this.running = false;
    if (this.queued) { this.queued = false; this.schedule(); }
  }
}
```

**Error-Mapping-Pattern** (übernommen aus `gardenRepo.ts` Z. 198-205 — typed domain errors per SQLSTATE):
```typescript
private async handleError(entry: OutboxEntry, err: unknown) {
  const code = (err as { code?: string }).code;
  if (code === 'P9011') {
    // LWW-Reject (D-10) — verwerfen + Pull
    await storage.removeOutbox(entry.id);
    useSyncStore.getState().triggerPull(entry.entity);
    Sentry.addBreadcrumb({ category: 'sync', message: 'lww_reject',
      data: { entity: entry.entity, row_id: entry.row_id } });
    return;
  }
  if (code === 'P9010') {
    // Programmfehler — updated_at fehlte
    await storage.markOutboxAttempt(entry.id, 'missing_updated_at');
    if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
      Sentry.captureMessage('lww_guard_missing_updated_at', { extra: entry } as any);
    }
    return;
  }
  // D-12 4xx vs 5xx
  const msg = err instanceof Error ? err.message : String(err);
  const isClientError = code && /^(22|23|42)/.test(code);
  if (isClientError) {
    await storage.markOutboxAttempt(entry.id, `permanent: ${msg}`);
    return;
  }
  await storage.markOutboxAttempt(entry.id, msg);   // retry_count++
}
```

**Sentry-Gating-Pattern** (aus `settings.tsx` Z. 61):
```typescript
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.captureMessage(...);
}
```

**Supabase-Upsert-Pattern** (aus `vereinsregelnRepo.ts` Z. 152-156):
```typescript
const { error } = await supabase.from(entry.entity)
  .upsert(payload, { onConflict: 'id' });
if (error) throw error;
```

---

### 8. `app/src/lib/sync/SyncTriggers.ts` (worker-bootstrap)

**Analog:** `app/app/_layout.tsx` useEffect-Guard-Pattern (Z. 63-94)

**Reentrancy-Guard-Pattern** (aus `_layout.tsx` Z. 74-94, „WR-02 Reentrancy-Schutz"):
```typescript
let initialized = false;   // module-scoped, Hot-Reload via (module as any).hot.dispose

export function initSyncTriggers() {
  if (initialized) return;
  initialized = true;

  const unsubNet = NetInfo.addEventListener((state) => {
    const isOnline = !!state.isConnected && state.isInternetReachable !== false;
    if (isOnline) useSyncStore.getState().triggerPush();
  });
  const subAppState = AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      useSyncStore.getState().triggerPush();
      useSyncStore.getState().triggerPull();
    }
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__ && (module as any).hot) {
    (module as any).hot.dispose(() => {
      unsubNet(); subAppState.remove(); initialized = false;
    });
  }
}
```

**Call-Site** (ergänzung in `_layout.tsx` `RootLayoutInner` — Pattern wie bestehender `ensureDefaultGardenForUser`-useEffect):
```typescript
// In RootLayoutInner nach SplashController: initSyncTriggers() einmalig im useEffect
React.useEffect(() => { initSyncTriggers(); }, []);
```

---

### 9. `app/src/stores/syncStore.ts` (Zustand state-store)

**Analog:** `app/src/stores/authStore.ts` (Z. 1-55) — Zustand + `create` + minimal-action-setters

**Imports-Pattern** (authStore Z. 8-10):
```typescript
import { create } from 'zustand';
// KEIN persist — syncStore ist derived, in-memory (Counter-State aus Outbox)
```

**State-Shape-Pattern** (RESEARCH §4 Z. 446-455 + authStore Z. 14-22):
```typescript
export interface SyncState {
  pendingCount: number;
  failedCount: number;
  status: 'synced' | 'syncing' | 'error';
  pendingTriggers: number;
  triggerPush: () => void;
  triggerPull: (entity?: EntityName) => void;
  setCounters: (pending: number, failed: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0, failedCount: 0, status: 'synced', pendingTriggers: 0,
  triggerPush: () => set((s) => ({ pendingTriggers: s.pendingTriggers + 1 })),
  triggerPull: (_entity) => set((s) => ({ pendingTriggers: s.pendingTriggers + 1 })),
  setCounters: (pending, failed) => set({
    pendingCount: pending, failedCount: failed,
    status: failed > 0 ? 'error' : pending > 0 ? 'syncing' : 'synced',
  }),
}));
```

---

### 10. `app/src/lib/sync/photoUploader.ts` (worker, binary-upload)

**Analog:** `app/src/lib/enqueueAiJob.ts` (Z. 1-55) — Supabase-Insert → Supabase-RPC Sequence + `any`-cast für nicht-generierte Schemas

**Imports-Pattern** (enqueueAiJob Z. 1-4):
```typescript
import { supabase } from '../supabase';
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
```

**Auth-Guard-Pattern** (enqueueAiJob Z. 23-27):
```typescript
const { data: user } = await supabase.auth.getUser();
if (!user?.user) throw new Error('Not authenticated');
const { activeGardenId } = useAuthStore.getState();
if (!activeGardenId) throw new Error('no_active_garden');
```

**ArrayBuffer-Upload-Pattern** (RESEARCH §6 Z. 524-543 — verified iOS-Fix):
```typescript
const arrayBuffer = await fetch(entry.local_uri).then((r) => r.arrayBuffer());
const ext = entry.local_uri.split('.').pop()?.toLowerCase() ?? 'jpg';
const storagePath = `${entry.garden_id}/${entry.id}.${ext}`;

const { error } = await supabase.storage.from('photos').upload(
  storagePath, arrayBuffer,
  { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: false },
);
if (error) throw error;
```

**RPC-Call-Pattern** (enqueueAiJob Z. 46-52 — `any`-cast, weil pgmq_public nicht in Database-Typen):
```typescript
const { error: rpcErr } = await supabase.rpc('enqueue_photo_analysis', {
  p_garden_id: entry.garden_id,
  p_storage_path: storagePath,
  p_kind: entry.kind,
});
if (rpcErr) throw rpcErr;
```

---

### 11. `app/src/lib/photo/exifStrip.ts` (utility)

**Analog:** `app/src/storage/index.ts` (Z. 1-9) — `Platform.select`-Pattern; Logic selbst ist neu (RESEARCH §7)

**Platform.select-Pattern** (storage/index.ts Z. 6-9) — adaptiert für Library-Loading:
```typescript
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export async function stripExif(uri: string, opts: { readGps: boolean }) {
  const gps = opts.readGps ? await readGpsFromExif(uri) : null;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { strippedUri: result.uri, gps };
}

async function readGpsFromExif(uri: string) {
  if (Platform.OS === 'web') {
    const piexif = await import('piexifjs');
    // ... piexif.load + GPS-Tags
  } else {
    const { readAsync } = await import('@lodev09/react-native-exify');
    // ... native read
  }
}
```

---

### 12. `app/src/lib/vereinsregelnRepo.ts` (repo-refactor D-28)

**Analog:** bestehendes `vereinsregelnRepo.ts` (Z. 1-191) — `toRow`/`fromRow`/`ensureBKleingGRules`/`assertBKleingGActive` bleiben **unverändert**. Nur Read/Write-Pfad-Body ändert.

**Bestehender `toRow`** (Z. 38-56) bleibt 1:1; wichtig: `updated_at` + `deleted_at` müssen in Insert-Payload ergänzt werden:
```typescript
export function toRow(rule: VereinsRegel, userId: string, gardenId: string): VereinsregelnInsert {
  return {
    id: rule.id, created_by_user_id: userId, updated_by_user_id: userId,
    garden_id: gardenId,
    titel: rule.titel, beschreibung: rule.beschreibung ?? null,
    wert: rule.wert ?? null, einheit: rule.einheit ?? null,
    ist_bkleingg: rule.istBKleingG, aktiv: rule.aktiv, source: rule.source,
    updated_at: new Date().toISOString(),   // NEW D-09 client-set
    // deleted_at bleibt null bei Upsert; wird nur bei delete gesetzt
  };
}
```

**Bestehender `fromRow`** (Z. 64-75) bleibt 1:1 (droppt audit-fields).

**Umbau der Read/Write-Pfade** (D-28) — Account-Mode-Zweig ersetzt Supabase-Direct-Call durch Storage:
```typescript
// VORHER (Z. 117-140):
if (mode === 'account') {
  const { data, error } = await supabase.from('vereinsregeln').select('*')...
}

// NACHHER:
if (mode === 'account') {
  const gardenId = requireActiveGardenId();
  // SYNC-01: Lesen IMMER aus lokaler Row-Table (D-22 optimistisches UI)
  const rows = await storage.queryRows<VereinsregelnRow>('vereinsregeln', {
    where: { garden_id: gardenId },
  });
  return rows.map(fromRow);
}
// local mode — bleibt KV-Blob (D-13)
```

**Write-Pattern (NEW)** (D-06 row-snapshot + D-28):
```typescript
if (mode === 'account') {
  const gardenId = requireActiveGardenId();
  for (const rule of ensured) {
    await storage.writeWithOutbox(
      'vereinsregeln',
      toRow(rule, userId, gardenId),
      'upsert',
    );
  }
  // SyncWorker debounced-triggert via Outbox-Insert-Event
  return;
}
```

**Error-Class-Pattern** (aus `gardenRepo.ts` Z. 27-61) bleibt; Outbox-Worker re-wirft P9011/P9010 dort NICHT — er handelt sie intern.

---

### 13. `app/src/lib/gardenRepo.ts` (repo-refactor D-28)

**Analog:** bestehendes File (Z. 1-241) — `toRow`/`fromRow` unverändert (Z. 67-91), nur `loadGarden`/`updateGarden`/`loadMembers` umbauen.

**Bestehende Typed-Error-Classes** (Z. 27-61) bleiben — Outbox-Fehler werden separat per `syncStore.failedCount` exposed; owner-RPCs (`deleteGarden`, `transferOwnership`) bleiben Supabase-direct (nicht outbox'd, da owner-atomic).

**Read-Pfad-Umbau** (Z. 93-105):
```typescript
export async function loadGarden(mode: AuthMode, gardenId: string): Promise<Garden | null> {
  assertAccount(mode);
  const row = await storage.getRow<GardensRow>('gardens', gardenId);
  return row ? fromRow(row) : null;
}
```

**Write-Pfad-Umbau** (Z. 131-146):
```typescript
export async function updateGarden(mode, gardenId, userId, patch) {
  assertAccount(mode);
  const current = await storage.getRow<GardensRow>('gardens', gardenId);
  if (!current) throw new Error('garden_not_found');
  const next: GardensRow = {
    ...current, ...snakeCasePatch(patch),
    updated_by_user_id: userId,
    updated_at: new Date().toISOString(),
  };
  await storage.writeWithOutbox('gardens', next, 'upsert');
}
```

**`loadMembers` bleibt Supabase-direct** (garden_members ist pull-only per RESEARCH Open Q 2).

---

### 14. `app/src/lib/profileRepo.ts` (repo-refactor D-28)

**Analog:** bestehendes File (Z. 1-99) + `vereinsregelnRepo.ts` `toRow`/`fromRow`

**Pattern**: analog zu `gardenRepo` (oben). Account-Mode liest/schreibt aus/in `profiles`-Row-Table; Lokal-Mode bleibt KV-Blob (`storage.get(PROFILE_KEY)` — Z. 53-58 unverändert).

**`normalizeDisplayName`** (Z. 69-76) bleibt — wird VOR dem `upsertRow` angewandt.

---

### 15. `app/src/lib/migrateLocalToAccount.ts` (migration-flow)

**Analog:** bestehendes File (Z. 1-178) — 8-Step atomic-tail bleibt; Step 9 wird ANGEHÄNGT **nach** Step 8 (`storage.delete`).

**Atomic-Tail-Invariant** (Z. 5-9, 166-168):
```typescript
// Step 8 — clean local storage. Atomic tail (MUST be last).
await storage.delete(PROFILE_KEY);
await storage.delete(VEREINSREGELN_KEY);
```

**Step-9-Pattern** (NEW D-28 tail extension): nach Step 8 Bulk-Pull aus Supabase in Row-Tables (lokales Gerät sofort offline-ready):
```typescript
// Step 9 (NEW, Phase 3 D-28) — Bootstrap lokale Row-Tables aus Supabase.
// Läuft STRIKT nach Step 8 (atomic-tail-Invariant: Supabase-Writes fertig,
// KV-Blob weg; erst jetzt Row-Tables füllen).
for (const entity of ['gardens','garden_members','profiles','vereinsregeln'] as const) {
  const query = supabase.from(entity).select('*');
  if (entity !== 'profiles') query.eq('garden_id', gardenId);
  const { data, error } = await query;
  if (error) {
    // Non-fatal: App läuft weiter, Bulk-Pull wird beim ersten SyncWorker-Run
    // per last_pulled_at=null wiederholt.
    if (__DEV__) console.warn(`bootstrap_row_table_${entity}_failed`, error);
    continue;
  }
  for (const row of data ?? []) {
    await storage.upsertRow(entity, row);
  }
  await storage.setLastPulledAt(entity, new Date().toISOString());
}
```

---

### 16. `app/src/components/SyncStatusBadge.tsx` (ui-component)

**Analog:** `app/app/(app)/settings.tsx` (Z. 137-177) — inline-expansion + `useAuthStore`-subscribe-style → hier `useSyncStore`

**Imports-Pattern** (settings.tsx Z. 12-23):
```typescript
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSyncStore } from '@/src/stores/syncStore';
```

**State-Subscription-Pattern** (settings.tsx Z. 30):
```typescript
const status = useSyncStore((s) => s.status);
const pendingCount = useSyncStore((s) => s.pendingCount);
const failedCount = useSyncStore((s) => s.failedCount);
```

**Render-Pattern** (D-21 drei Zustände, NativeWind-Style aus settings.tsx Z. 110-177):
```tsx
<Pressable onPress={() => router.push('/(app)/settings' as any)} testID="sync-status-badge">
  {status === 'synced' && <Text className="text-stone-500">✓ synced</Text>}
  {status === 'syncing' && <Text className="text-sky-600">⇄ syncing ({pendingCount} pending)</Text>}
  {status === 'error' && <Text className="text-red-600">⚠ {failedCount} Fehler</Text>}
</Pressable>
```

---

### 17. `app/app/(app)/settings.tsx` (screen-extension)

**Analog:** bestehendes `settings.tsx` (Z. 1-244) — „Sync-Status"-Section wird an bestehende Struktur angehängt (zwischen `settings-garden-link` und Logout-Confirmation-Expansion)

**Inline-Confirmation-Expansion-Pattern** (Z. 137-177 — der kanonische UI-SPEC-Zeile-234-Stil; kein Modal):
```tsx
// Pseudo-Code zeigt das bestehende Expansion-Muster, adaptiert für Sync-Status:
{!showSyncDetails ? (
  <Button variant="ghost" onPress={() => setShowSyncDetails(true)}
          testID="settings-sync-status">
    <Text>{t('settings.sync.section_title')}  {pendingCount > 0 && `(${pendingCount})`}</Text>
  </Button>
) : (
  <View className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
    {outboxEntries.map((entry) => (
      <View key={entry.id} className="flex-row gap-2">
        <Text className="flex-1">{entry.entity}/{entry.row_id} — {entry.last_error ?? 'pending'}</Text>
        <Button variant="outline" onPress={() => retry(entry.id)}>
          <Text>{t('sync.retry')}</Text>
        </Button>
        <Button variant="destructive" onPress={() => discard(entry.id)}>
          <Text>{t('sync.discard')}</Text>
        </Button>
      </View>
    ))}
  </View>
)}
```

**i18n-Key-Pattern** (Z. 25-26):
```typescript
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```
Neue Keys: `settings.sync.section_title`, `sync.retry`, `sync.discard`, `sync.status.synced`, etc.

---

### 18. `app/app/_layout.tsx` (layout-extension)

**Analog:** bestehendes File (Z. 1-127) — `useEffect` für `initSyncTriggers` in `RootLayoutInner`

**Extension-Point** (Z. 109-116, `RootLayoutInner`):
```typescript
function RootLayoutInner(): React.JSX.Element {
  // NEW: Sync-Triggers einmalig mounten (idempotent via initialized-Guard).
  React.useEffect(() => { initSyncTriggers(); }, []);
  return (<>
    <SplashController />
    <GuardedStack />
  </>);
}
```

**Sentry-Gating-Pattern** (bestehend Z. 22-27) bleibt — SyncWorker nutzt dieselbe Guard.

---

### 19. Unit-Tests (sync + exif + syncStore)

**Analog:** `app/src/lib/__tests__/vereinsregelnRepo.test.ts` + `app/src/stores/__tests__/authStore.test.ts` + `app/src/storage/__tests__/StorageAdapter.test.ts`

**Contract-Suite-Pattern** (StorageAdapter.test.ts Z. 16-69):
```typescript
function contractSuite(name: string, factory: () => StorageAdapter) {
  describe(`StorageAdapter contract — ${name}`, () => {
    let adapter: StorageAdapter;
    beforeEach(() => { adapter = factory(); });
    it('...', async () => { ... });
  });
}
contractSuite('IndexedDbAdapter (web)', () => new IndexedDbAdapter(`test-db-${Date.now()}-${Math.random()}`));
```

**Unique-DB-per-test-Pattern** (StorageAdapter.test.ts Z. 73, 77, 84):
```typescript
new IndexedDbAdapter(`test-db-${Date.now()}-${Math.random()}`)
```

**Static-Import-Check-Pattern** (StorageAdapter.test.ts Z. 93-105) — adaptiert für „nur storage/ importiert idb, nichts anderes":
```typescript
it('no feature code outside src/storage/ imports idb directly', () => {
  const offenders = globSync('src/**/*.{ts,tsx}', { cwd: srcRoot, ignore: ['src/storage/**'] })
    .filter((f) => /from\s+['"]idb['"]/.test(readFileSync(path.join(srcRoot, f), 'utf8')));
  expect(offenders).toEqual([]);
});
```

**fake-indexeddb-Setup-Pattern** (StorageAdapter.test.ts Z. 7):
```typescript
import 'fake-indexeddb/auto';
```

---

## Shared Patterns

### S-1: toRow / fromRow Mapper (camelCase ↔ snake_case)
**Source:** `app/src/lib/vereinsregelnRepo.ts` (Z. 38-75) + `app/src/lib/gardenRepo.ts` (Z. 67-91)
**Apply to:** alle Repos (vereinsregeln, garden, profile, photo_queue)
**Code excerpt (vereinsregelnRepo.ts Z. 38-55):**
```typescript
export function toRow(rule: VereinsRegel, userId: string, gardenId: string): VereinsregelnInsert {
  return {
    id: rule.id,
    created_by_user_id: userId,
    updated_by_user_id: userId,         // Pattern 6 — client-first
    garden_id: gardenId,
    ...                                  // snake_case DB-Spalten
    ist_bkleingg: rule.istBKleingG,      // camelCase-Domain → snake_case-DB
  };
}
```
**Critical for Phase 3:** Jedes neue Repo (photo_queue-Repo, ai_jobs-Repo, etc.) MUSS `updated_at` (D-09 client-set) + `deleted_at` (D-23 soft-delete) in der Insert-Payload mit aufnehmen. Verhinderte Silent-Drops (dokumentiert als post-hoc `ist_bkleingg`-Fix in Phase 02-04).

### S-2: SECURITY-DEFINER-RPC + is_garden_member Guard
**Source:** `supabase/migrations/20260423000004_fix_rls_recursion.sql` (Z. 32-55) + `supabase/migrations/20260423000010_custom_sqlstate_codes.sql` (Z. 38-68)
**Apply to:** `enqueue_photo_analysis`, `server_now` (wenn nötig), alle neuen RPCs + RLS auf `photo_queue` + Storage-Bucket `photos`
**Code excerpt (Migration 010 Z. 38-68):**
```sql
CREATE OR REPLACE FUNCTION public.<name>(...)
RETURNS <type>
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_garden_member(p_garden_id) THEN
    RAISE EXCEPTION 'not_garden_member' USING ERRCODE = '42501';
  END IF;
  ...
END $$;
GRANT EXECUTE ON FUNCTION public.<name>(...) TO authenticated;
```
**Critical:** `SET search_path = public, pg_temp` ist Pflicht (Hijack-Schutz). Wenn RPC `gen_random_*` aus pgcrypto braucht → `SET search_path = public, extensions, pg_temp` (Migration 005 Pattern Z. 16-17).

### S-3: P9xxx Custom SQLSTATE für Domain-Errors
**Source:** `supabase/migrations/20260423000010_custom_sqlstate_codes.sql` (ganze Datei)
**Apply to:** `tg_lww_guard` (P9010 missing_updated_at, P9011 lww_reject_older_write)
**Existing allocation:** P9001 invite_invalid_or_expired, P9003 garden_has_members, P9004 cannot_transfer_to_self, P9005 target_not_member, P9006 garden_already_full. **Phase 3 adds:** P9010, P9011 (frei laut Audit, RESEARCH §3).
**Client-Mapping-Pattern (gardenRepo.ts Z. 198-205):**
```typescript
const code = (error as { code?: string }).code;
if (code === 'P9xxx') throw new SpecificDomainError(error);
```

### S-4: JWT-Claim-Switch in SQL-Tests (BEGIN/ROLLBACK)
**Source:** `supabase/tests/rls_member_check.sql` (Z. 9-15, 31-32)
**Apply to:** alle neuen SQL-Tests (`lww_guard.sql`, `enqueue_photo_analysis.sql`, `storage_photos_rls.sql`)
**Code excerpt:**
```sql
BEGIN;
  select set_config('request.jwt.claim.sub', '<test-user-uuid>', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  -- ... assertions via do $$ ... $$
ROLLBACK;
```
**Critical:** `BEGIN; ... ROLLBACK;` hält die Test-DB clean. User-A → User-B-Wechsel per neuem `set_config(...jwt.claim.sub,...)`.

### S-5: Sentry-Gated-Logging (DSN-Check)
**Source:** `app/app/_layout.tsx` (Z. 22-27) + `app/app/(app)/settings.tsx` (Z. 61)
**Apply to:** SyncWorker-Fehlerpfade, photoUploader-Fehlerpfade
**Code excerpt:**
```typescript
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.captureMessage('<event>', { extra: { ... } } as any);
}
```

### S-6: Reentrancy-Guard via useRef + __DEV__ Hot-Reload-Dispose
**Source:** `app/app/_layout.tsx` (Z. 74-94 — WR-02 Reentrancy-Schutz)
**Apply to:** `SyncTriggers.initSyncTriggers()`, `SyncWorker.run()` (running/queued-Flag)
**Code excerpt:**
```typescript
const inFlight = React.useRef(false);
React.useEffect(() => {
  if (<guard>) return;
  inFlight.current = true;
  (async () => {
    try { ... } finally { inFlight.current = false; }
  })();
}, [deps]);
```
**Worker-Variant (RESEARCH §4 Z. 360-371):**
```typescript
private running = false;
private queued = false;
async run() {
  if (this.running) { this.queued = true; return; }
  this.running = true;
  try { ... } finally {
    this.running = false;
    if (this.queued) { this.queued = false; this.schedule(); }
  }
}
```

### S-7: Inline-Confirmation-Expansion (UI-SPEC Zeile 234, kein Modal)
**Source:** `app/app/(app)/settings.tsx` (Z. 137-177 — Logout-Confirm)
**Apply to:** Sync-Status-Section in `settings.tsx` (Retry/Verwerfen-Buttons pro Outbox-Entry)
**Code excerpt (vereinfacht):**
```tsx
{!expanded ? (
  <Button variant="ghost" onPress={() => setExpanded(true)} testID="open-expansion">...</Button>
) : (
  <View className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
    <Text>...</Text>
    <View className="flex-row gap-2">
      <Button variant="destructive" ...>Ja</Button>
      <Button variant="outline" onPress={() => setExpanded(false)}>Abbrechen</Button>
    </View>
  </View>
)}
```

### S-8: Atomic-Tail-Invariant (storage.delete STRIKT NACH allen Supabase-Writes)
**Source:** `app/src/lib/migrateLocalToAccount.ts` (Z. 5-9, 166-168)
**Apply to:** `migrateLocalToAccount` Step 9 (Bootstrap Row-Tables) — MUSS nach Step 8 (`storage.delete(PROFILE_KEY)` etc.) passieren. Fehler im Step 9 hinterlassen den User in einem funktionsfähigen Account-Modus (Row-Tables werden beim ersten SyncWorker-Run nachgezogen).
**Code excerpt:**
```typescript
// Step 8 — clean local storage. Atomic tail (MUST be last).
await storage.delete(PROFILE_KEY);
await storage.delete(VEREINSREGELN_KEY);

// Step 9 (NEW Phase 3) — bootstrap row-tables; Fehler non-fatal (SyncWorker ziehen nach).
```

### S-9: Supabase-Schema-Cast für nicht-generierte Schemas (`any`-cast)
**Source:** `app/src/lib/enqueueAiJob.ts` (Z. 46-52 — pgmq_public-Schema-Cast)
**Apply to:** `SyncWorker` falls direkte pgmq-Calls nötig (Research rät aber ab: stattdessen RPC); photoUploader nutzt normales `supabase.rpc('enqueue_photo_analysis', ...)` (bereits in Database-Typen sobald Migration 013 gen'd).
**Code excerpt:**
```typescript
// pgmq_public is not in the generated Database type — use untyped client via any-cast.
const pgmqClient = (supabase as any).schema('pgmq_public'); // eslint-disable-line @typescript-eslint/no-explicit-any
await pgmqClient.rpc('send', {...});
```
**Note:** Nach `pnpm --filter app gen:types` (gegen Staging) ist `enqueue_photo_analysis` typed; dort KEIN `any`-cast nötig.

### S-10: Platform.select für plattformspezifische Imports
**Source:** `app/src/storage/index.ts` (Z. 6-9)
**Apply to:** `exifStrip.ts` (piexifjs auf web, @lodev09/react-native-exify nativ)
**Code excerpt:**
```typescript
import { Platform } from 'react-native';
// Dynamic import-based variant (um Bundle-Size zu minimieren):
if (Platform.OS === 'web') {
  const piexif = await import('piexifjs');
} else {
  const { readAsync } = await import('@lodev09/react-native-exify');
}
```

---

## No Analog Found

| Datei | Rolle | Data Flow | Grund |
|-------|-------|-----------|-------|
| `app/src/lib/sync/SyncWorker.ts` | worker | push/pull debounced scheduler | Erste worker-Klasse im Codebase; Pattern direkt aus RESEARCH §4 + Zustand-subscribe aus authStore + Supabase-Call aus enqueueAiJob zusammensetzen |
| `app/src/lib/photo/exifStrip.ts` | utility | zwei-stufige transform | Keine Photo-Transform-Pipeline existiert; Pattern aus RESEARCH §7 + Platform.select aus storage/index.ts |
| `app/src/components/SyncStatusBadge.tsx` | ui-component | derived-state indicator | Erste reusable Header-Badge-Komponente; NativeWind-Styling aus settings.tsx; State-subscribe aus authStore.ts |

Für diese drei Dateien soll der Planner RESEARCH.md §4 / §7 / §8 als primäre Pattern-Quelle heranziehen, die shared patterns S-5, S-6, S-7, S-10 als Sekundärkontrolle.

---

## Metadata

**Analog search scope:**
- `app/src/lib/**` (11 Files) — Repos, Sync-Lib, enqueueAiJob, supabase-client
- `app/src/storage/**` (5 Files) — Adapters, Interface, Migrations, Tests
- `app/src/stores/**` (3 Files) — Zustand-Stores mit Persist-Middleware-Pattern
- `app/app/**` (18 Files) — Layouts + Screens (settings, garden, profile, vereinsregeln)
- `supabase/migrations/**` (12 Files) — Foundation → shared_garden → RLS-recursion-fix → SQLSTATE-codes → display_name-constraint
- `supabase/tests/**` (11 Files) — RLS-tests, member_limit, delete/transfer, invite_code

**Files scanned:** ~60 relevante Files (read non-overlapping ranges für die 12 Analog-Files mit konkreten Code-Ausschnitten)

**Pattern extraction date:** 2026-04-24

---

## PATTERN MAPPING COMPLETE

- **Phase:** 3 — Offline & Sync (2-User Shared State)
- **Files classified:** 27 (new/modified)
- **Analogs found:** 24 exakt/role-match + 3 mit RESEARCH-only Pattern-Quelle

**Coverage:**
- Exact analog: 18 (migrations, repos, stores, tests, layouts)
- Role-match / partial: 6 (SyncTriggers, outboxSerialization, photoUploader, settings-extension, SyncStatusBadge, exifStrip)
- No analog (RESEARCH-only): 3 (SyncWorker, exifStrip, SyncStatusBadge)

**Key patterns identified:**
- toRow/fromRow camelCase↔snake_case (S-1) — gilt für ALLE Sync-Integrationen, inkl. photo_queue
- SECURITY-DEFINER + is_garden_member (S-2) + P9xxx-SQLSTATEs (S-3) — erweitert um P9010/P9011 für LWW-Guard
- BEGIN/ROLLBACK + JWT-Claim-Switch (S-4) — Test-Harness-Pattern für alle 4 neuen SQL-Tests
- Sentry-DSN-Gating (S-5) + Reentrancy-Guard (S-6) + Atomic-Tail (S-8) — robuste Client-Infra
- Inline-Confirmation-Expansion (S-7) — Pflicht für Sync-Status-UI (kein Modal)
- Platform.select (S-10) — piexifjs vs. react-native-exify und IDB vs. SQLite sauber getrennt

**File created:** `D:\AiProjects\garden-app\.planning\phases\03-offline-sync-2-user-shared-state\03-PATTERNS.md`

**Ready for planning:** Planner kann jedem der 6 Waves aus RESEARCH §Plan-Wave-Struktur die konkreten Analog-Files + Code-Excerpts direkt in seine Plan-Actions kopieren.
