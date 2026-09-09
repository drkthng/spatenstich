---
phase: 03-offline-sync-2-user-shared-state
plan: "01"
subsystem: supabase-db
tags: [sync, migration, lww, photo-queue, rls, supabase]
dependency_graph:
  requires: []
  provides:
    - public.tg_lww_guard (P9010/P9011)
    - public.photo_queue (table + RLS)
    - public.enqueue_photo_analysis (RPC)
    - public.server_now (RPC)
    - storage.objects photos_garden_member_* (RLS)
    - deleted_at on gardens/vereinsregeln/ai_jobs/ai_results/profiles/photo_queue
    - packages/shared/src/types/supabase.ts (photo_queue + RPCs typed)
  affects:
    - Wave 2 Plan 02 (StorageAdapter Row-Tables — needs photo_queue TypeScript types)
    - Wave 3 Plan 03 (Repo-Umbau — needs typed photo_queue + enqueue_photo_analysis)
    - Wave 4 Plan 04 (SyncWorker — needs P9010/P9011 error codes)
    - Wave 4 Plan 05 (Foto-Queue — needs photo_queue table + enqueue_photo_analysis)
tech_stack:
  added:
    - tg_lww_guard trigger function (Last-Write-Wins guard, P9010/P9011)
    - photo_queue table with full LWW trigger trio + member-RLS
    - enqueue_photo_analysis SECURITY DEFINER RPC (pgmq.send + ai_jobs INSERT)
    - server_now() RPC (clock-skew-safe timestamp)
    - storage.objects RLS (4 policies, foldername-based garden member check)
    - photos storage bucket (private, 50MB limit, JPEG/PNG/WEBP/HEIC)
  patterns:
    - aa_/mm_/zz_ trigger naming convention for alphabetical ordering guarantee
    - IF NOT EXISTS + DROP IF EXISTS for idempotent migration re-deploy safety
    - pgmq schema in search_path for enqueue_photo_analysis (pgmq.send resolved)
key_files:
  created:
    - supabase/migrations/20260424000013_offline_sync_infrastructure.sql
    - supabase/tests/lww_guard.sql
    - supabase/tests/trigger_ordering.sql
    - supabase/tests/enqueue_photo_analysis.sql
    - supabase/tests/storage_photos_rls.sql
    - supabase/tests/photo-queue-rls.test.sql
    - packages/shared/src/types/supabase.ts
  modified: []
decisions:
  - "pgmq.send lives in pgmq schema (not pgmq_public/extensions) — search_path = public, pgmq, pg_temp for enqueue_photo_analysis"
  - "photos storage bucket created in migration (not pre-existing) — INSERT INTO storage.buckets added to Section 9"
  - "RAISE EXCEPTION positional message + USING ERRCODE only (no USING MESSAGE= — conflicts with positional string)"
  - "profiles.updated_at already existed from Migration 002 — ADD COLUMN IF NOT EXISTS skips gracefully (42701)"
  - "transfer_ownership L-9 patch: explicit updated_at = now() added for LWW-Guard compatibility"
metrics:
  duration_minutes: ~45
  completed_date: "2026-04-25"
  tasks_completed: 3
  files_created: 7
  files_modified: 0
---

# Phase 3 Plan 01: Supabase Offline-Sync Infrastructure Summary

**One-liner:** LWW-Trigger-Trio (aa_/mm_/zz_) + photo_queue + enqueue_photo_analysis RPC + Storage-RLS + Types auf Frankfurt-DB (vitrqkzxkiqvadqfzrcx) deployed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 03-01-01 | Migration 013 schreiben | 77aca9d | supabase/migrations/20260424000013_offline_sync_infrastructure.sql |
| 03-01-02 | SQL-Tests (5 Dateien) | 10bf7ea | supabase/tests/lww_guard.sql, trigger_ordering.sql, enqueue_photo_analysis.sql, storage_photos_rls.sql, photo-queue-rls.test.sql |
| 03-01-03 | DB Push + Types Regen + Test-Run | aab7c21 | packages/shared/src/types/supabase.ts (Migration fix included) |

## Migration 013 — Applied

**Path:** `supabase/migrations/20260424000013_offline_sync_infrastructure.sql`  
**Applied:** `supabase migration list --linked` zeigt `20260424000013 | 20260424000013 | 2026-04-24 00:00:13`  
**Project:** vitrqkzxkiqvadqfzrcx (Frankfurt, EU)

**Inhalt (11 Sections):**
1. Datei-Header (D-08, D-09, D-17, D-19, D-23, D-25, D-26; Trigger-Ordering L-7; SQLSTATE P9010/P9011)
2. `public.tg_lww_guard()` — P9010 (NULL updated_at) + P9011 (older write reject)
3. `deleted_at` auf 5 Tabellen + `profiles.updated_at` + `profiles.updated_by_user_id`
4. DROP alte Trigger (gardens_updated_at, gardens_updated_by, vereinsregeln_updated_at usw.)
5. aa_/mm_/zz_-Trigger-Trio per DO-Loop auf 5 Tabellen
6. `public.photo_queue` Tabelle + Member-RLS + Trigger-Trio (explizit)
7. `public.enqueue_photo_analysis` RPC (SECURITY DEFINER, `search_path = public, pgmq, pg_temp`)
8. `public.server_now()` RPC (STABLE, clock-skew-safe)
9. Storage-Bucket `photos` (INSERT ON CONFLICT DO NOTHING) + 4 `photos_garden_member_*` Policies
10. `transfer_ownership` L-9 Patch: `updated_at = now()` explizit
11. Post-migration Invariant-Block (4 Assertions — bestanden)

## SQL-Tests — Ergebnisse

Alle 5 Tests haben exit-code 0 (kein `ERROR:` / kein `unexpected status 4xx`).  
Supabase CLI 2.90 surfacet NOTICE nicht im JSON-output — Success via Absence-of-Error verifiziert (STATE.md Phase 02.5 P02 Decision).

| Test | Status | Prüft |
|------|--------|-------|
| `lww_guard.sql` | PASS | P9011 older-write reject + P9010 null updated_at + happy path |
| `trigger_ordering.sql` | PASS | aa_/mm_/zz_ Trigger-Trio auf 6 Tabellen per pg_trigger-Catalog |
| `enqueue_photo_analysis.sql` | PASS | non-member 42501 + member success + ai_jobs audit-row |
| `storage_photos_rls.sql` | PASS | foldername-basierte Member-RLS: member INSERT OK, non-member 42501, non-member SELECT 0 rows |
| `photo-queue-rls.test.sql` | PASS | **I-7 CLOSED**: non-member INSERT 42501 + SELECT 0 rows + member INSERT OK |

**I-7 Validierungsstatus: CLOSED by `photo-queue-rls.test.sql`**  
`photo_queue_rls_ok: non-member INSERT rejected with 42501`  
`photo_queue_rls_ok: non-member SELECT returns 0 rows (rows=0)`

## packages/shared/src/types/supabase.ts — Diff-Summary

**Neue Typen:**

```typescript
// photo_queue.Row
photo_queue: {
  Row: {
    created_at: string; created_by_user_id: string; deleted_at: string | null;
    garden_id: string; geo_lat: number | null; geo_lng: number | null; id: string;
    kind: string; last_attempted_at: string | null; last_error: string | null;
    local_uri: string; retry_count: number; storage_path: string | null;
    updated_at: string; updated_by_user_id: string | null; uploaded_at: string | null;
  }
  Insert: { /* alle Felder optional außer: created_by_user_id, garden_id, kind, local_uri */ }
  Update: { /* alle optional */ }
}

// RPCs
enqueue_photo_analysis: {
  Args: { p_garden_id: string; p_kind: string; p_storage_path: string }
  Returns: string  // uuid als string
}
server_now: { Args: never; Returns: string }
```

**Bestehende Typen** bleiben unverändert (gardens, vereinsregeln, ai_jobs, ai_results, profiles, garden_members, invite_codes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RAISE EXCEPTION MESSAGE-Option Doppelangabe**
- **Found during:** Task 03-01-03 (nach DB Push, beim ersten Test-Run)
- **Issue:** `tg_lww_guard()` nutzte `RAISE EXCEPTION 'message' USING ERRCODE = 'P9011', MESSAGE = '...'` — PostgreSQL wirft `42601: RAISE option already specified: MESSAGE` weil der erste String-Parameter bereits die Message ist
- **Fix:** `MESSAGE = '...'` aus `USING`-Klausel entfernt; Format-String im positional-Parameter direkt genutzt
- **Files modified:** `supabase/migrations/20260424000013_offline_sync_infrastructure.sql`
- **Commit:** aab7c21 (in Task-03-01-03-Commit enthalten)

**2. [Rule 2 - Missing Critical] Storage-Bucket 'photos' fehlte**
- **Found during:** Task 03-01-03 (storage_photos_rls.sql Test)
- **Issue:** `storage.objects` FK constraint `objects_bucketId_fkey` — INSERT schlug fehl mit `23503`, weil kein Bucket 'photos' in `storage.buckets` existierte. Plan-Context sagte "bucket 'photos' created in Migration 001", aber das war inkorrekt — nur Bucket 'vereinsregeln' existierte
- **Fix:** `INSERT INTO storage.buckets ... ON CONFLICT (id) DO NOTHING` in Section 9 der Migration eingefügt; auf Live-DB direkt angewendet (da Migration bereits deployed)
- **Files modified:** `supabase/migrations/20260424000013_offline_sync_infrastructure.sql`
- **Commit:** aab7c21

## Handoffs an Wave 2

**Plan 02 (StorageAdapter Row-Tables):**
- `photo_queue.Row` / `photo_queue.Insert` Typen aus `packages/shared/src/types/supabase.ts` verfügbar
- `EntityName`-Set muss `'photo_queue'` enthalten
- `RowBase`-Shape orientiert sich an photo_queue.Row (id: string, garden_id: string, updated_at: string, deleted_at: string | null)
- `OutboxEntry`-Shape bleibt wie in 03-PATTERNS.md §3 definiert

**Plan 04 (SyncWorker):**
- P9010 / P9011 SQLSTATE-Codes aktiv auf Live-DB — Error-Mapping im SyncWorker implementieren
- `server_now()` RPC verfügbar für Clock-Skew-Compensation

**Plan 05 (Foto-Queue):**
- `enqueue_photo_analysis(p_garden_id, p_storage_path, p_kind)` RPC verfügbar + typisiert
- photos-Bucket existiert (private, 50MB, JPEG/PNG/WEBP/HEIC)
- Storage-RLS aktiv: foldername-basierte Member-Check

## Live-DB Invariant-Prüfung

```
SELECT tgname FROM pg_trigger WHERE tgrelid IN (
  'public.gardens'::regclass, 'public.vereinsregeln'::regclass,
  'public.ai_jobs'::regclass, 'public.ai_results'::regclass,
  'public.profiles'::regclass, 'public.photo_queue'::regclass
) AND (tgname LIKE 'aa_%' OR tgname LIKE 'zz_%' OR tgname LIKE 'mm_%')
AND NOT tgisinternal ORDER BY tgrelid::regclass::text, tgname
```
→ 18 Trigger (3 pro Tabelle × 6 Tabellen) — alle vorhanden.

## Known Stubs

Keine. Migration 013 implementiert vollständig alle Artefakte ohne Platzhalter.

## Threat Flags

Keine neuen Threat-Oberflächen außerhalb des geplanten `<threat_model>`. Alle T-3-01-0x mitigations sind implementiert:
- T-3-01-02: Storage-RLS via `is_garden_member(foldername(name)[1]::uuid)` aktiv
- T-3-01-05: `enqueue_photo_analysis` SECURITY DEFINER + `SET search_path = public, pgmq, pg_temp` + `GRANT EXECUTE ... TO authenticated`
- T-3-01-07: Trigger-Ordering via aa_/mm_/zz_-Konvention enforced + `trigger_ordering.sql` prüft live
- T-3-01-08: `photo_queue_member_all` RLS (USING + WITH CHECK) — I-7 verifiziert

## Self-Check: PASSED

All created files verified on disk. All 3 commits verified in git log.

| Check | Result |
|-------|--------|
| supabase/migrations/20260424000013_offline_sync_infrastructure.sql | FOUND |
| supabase/tests/lww_guard.sql | FOUND |
| supabase/tests/trigger_ordering.sql | FOUND |
| supabase/tests/enqueue_photo_analysis.sql | FOUND |
| supabase/tests/storage_photos_rls.sql | FOUND |
| supabase/tests/photo-queue-rls.test.sql | FOUND |
| packages/shared/src/types/supabase.ts | FOUND |
| .planning/phases/03-offline-sync-2-user-shared-state/03-01-SUMMARY.md | FOUND |
| Commit 77aca9d (Migration 013) | FOUND |
| Commit 10bf7ea (SQL-Tests) | FOUND |
| Commit aab7c21 (DB Push + Types + Fix) | FOUND |
