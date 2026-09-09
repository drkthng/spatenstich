---
phase: quick
plan: 260510-r5p
type: execute
status: complete
completed: 2026-05-10
duration_minutes: 12
commits:
  - aedb122  # Task 1 — mapper fix
  - 9372cad  # Task 2 — SyncWorker dispatchPush + handlers
  - a3321e1  # Task 3 — Web-safe file read
files_modified:
  - app/src/lib/mappers/rowMappers.ts
  - app/src/lib/sync/SyncWorker.ts
  - app/app/(app)/import/index.tsx
requirements_completed:
  - QUICK-260510-r5p
---

# Quick Task 260510-r5p — Phase 6 Import Bug Triple-Fix Summary

## One-liner

Three independent Phase-6 import bugs fixed: write-once mapper filter for `import_items`, SyncWorker dispatch cases for `garden_dimensions`/`plan_elements`, and Web-safe file read in the import screen.

## Files Touched (with line ranges)

### Fix 1 — Mapper: strip write-once columns for `import_items`

- **File:** `app/src/lib/mappers/rowMappers.ts`
- **Lines:** 430-490 (function `importEntityToDb` + JSDoc)
- **Change:**
  - JSDoc expanded to document the write-once filter and reference D-19 / migration 20260509000016 §2 / STATE.md [Phase 06 P02].
  - Renamed parameter `_entity` → `entity` so it can be referenced.
  - Added post-loop guard: when `entity === 'import_items'`, `delete result.updated_at` and `delete result.updated_by_user_id` before returning the snake_case row.
- **Commit:** `aedb122`

### Fix 2 — SyncWorker: dispatchPush cases + pushGardenDimensions + pushPlanElement

- **File:** `app/src/lib/sync/SyncWorker.ts`
- **Lines:**
  - Imports 9-34: added `GardenDimensionsRow`, `PlanElementRow` (types) and `gardenDimensionsToDb`, `planElementToDb` (mappers).
  - `dispatchPush` switch 226-243: added two explicit cases for `garden_dimensions` and `plan_elements` before the import-entity fallthrough block; aligned column spacing of all existing cases.
  - New handler `pushGardenDimensions` lines 340-363: handles delete via `deleted_at` stamp + `updated_at`/`updated_by_user_id` set from session; happy path calls `gardenDimensionsToDb(row)` then stamps `updated_by_user_id` from `useAuthStore` before `upsert(..., { onConflict: 'id' })`. Pattern matches `pushGarden`.
  - New handler `pushPlanElement` lines 365-387: identical structure for the `plan_elements` table using `planElementToDb`.
- **Commit:** `9372cad`

### Fix 3 — Import Screen: Web-safe file read

- **File:** `app/app/(app)/import/index.tsx`
- **Lines:**
  - Line 9: added `Platform` to the existing `react-native` import.
  - `useEffect` share-intent branch lines 30-45: now reads via `await (await fetch(fileUri)).text()` on Web, `FileSystem.readAsStringAsync(fileUri)` on native.
  - `handleFilePicker` lines 66-84: branches on `Platform.OS === 'web' && asset.file` → uses `asset.file.text()`; falls back to `FileSystem.readAsStringAsync(asset.uri)` on native.
- **Commit:** `a3321e1`

## Verification

| Check | Result |
|-------|--------|
| `pnpm run typecheck` (app workspace) | Clean (exit 0) — run after each of the three tasks |
| `grep "entity === 'import_items'" rowMappers.ts` | 1 match (inside `importEntityToDb`) |
| `grep "ImportItemRow" packages/shared/.../entities.ts` shows `updatedAt: string;` | Preserved at line 112 |
| `grep "case 'garden_dimensions'" SyncWorker.ts` | 1 match (line 235) |
| `grep "case 'plan_elements'" SyncWorker.ts` | 1 match (line 236) |
| `grep "private async pushGardenDimensions\|private async pushPlanElement" SyncWorker.ts` | 2 matches (lines 340, 365) |
| `grep "Platform.OS === 'web'" import/index.tsx` | 2 matches (useEffect line 36, handleFilePicker line 77) |
| `grep "asset.file.text" import/index.tsx` | 1 match (line 78) |
| `grep "FileSystem.readAsStringAsync" import/index.tsx` | 2 matches (lines 38, 79) — native fallback in both paths |

## Why `ImportItemRow.updatedAt` was preserved

`ImportItemRow.updatedAt` in `packages/shared/src/types/entities.ts:112` is kept untouched.

**Reason:** Per STATE.md `[Phase 06 P02]` — `ImportItemRow.updatedAt` is required as an alias for `createdAt` because the `StorageAdapter.writeWithOutbox` generic constraint `T extends AnyRow` requires the field at compile time. Removing it would ripple through every `importRepo.ts` call site (lines 95-106, 156-167, 217-228) and break the local storage layer that uses the same row shape.

The correct mitigation — applied here — is to filter the columns at the **mapper boundary** (Fix 1), so the type stays consistent for in-memory and local-storage use while the wire format for the write-once `import_items` table omits the non-existent columns.

## Deviations from Plan

None. Plan executed exactly as written. All three Grep verification checks returned the expected match counts. TypeScript compile clean throughout.

## Out of Scope (per planning constraint)

- The 5 stuck `sync_outbox` entries in IndexedDB are **not** cleared by this work.
- No DB migration. No new files. No `package.json` edits. No changes to `ImportItemRow`, `importRepo.ts`, or `importEntityFromDb`.
- `PULL_ENTITIES` was **not** extended with `garden_dimensions`/`plan_elements` — debug session was push-only.

## Reminder for User — Manual Step Before Re-Testing

Before re-testing the Web import flow, **manually flush the 5 stuck `sync_outbox` entries** in the browser:

1. Open the app in your browser (Expo Web build).
2. Open DevTools → **Application** → **IndexedDB** → `spatenstich` database → **`sync_outbox`** object store.
3. Delete all 5 stuck entries (`garden_dimensions` insert, `import_items` insert, `bed_drafts` insert, `plant_drafts` insert, `observation_drafts` insert).
   - Alternatively use any in-app "Verwerfen"-Button on the sync queue settings screen, if implemented.
4. Reload the page.
5. Test new import: open `/import` → click **"Datei auswählen"** → select a valid `spatenstich-import.v1` JSON file → should load, validate, navigate to `/import/preview` (no "Ungültiges JSON-Format" toast).
6. Complete import → expect the queue to drain to zero; `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` rows should appear in Supabase.

## Self-Check: PASSED

- `app/src/lib/mappers/rowMappers.ts` — FOUND, edited (commit `aedb122`)
- `app/src/lib/sync/SyncWorker.ts` — FOUND, edited (commit `9372cad`)
- `app/app/(app)/import/index.tsx` — FOUND, edited (commit `a3321e1`)
- All three commits present in `git log --oneline -5`.
- `pnpm run typecheck` clean.
- `ImportItemRow` interface in `packages/shared` unchanged (confirmed via Grep).
