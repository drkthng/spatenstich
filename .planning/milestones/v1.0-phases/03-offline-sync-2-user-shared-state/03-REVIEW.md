---
phase: 03-offline-sync-2-user-shared-state
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - app/app/(app)/_layout.tsx
  - app/app/(app)/settings.tsx
  - app/app/(app)/settings/privacy.tsx
  - app/app/(app)/settings/sync.tsx
  - app/app/_layout.tsx
  - app/src/components/SyncStatusBadge.tsx
  - app/src/components/SyncStatusBadge.styles.ts
  - app/src/hooks/useSyncStatus.ts
  - app/src/lib/errors.ts
  - app/src/lib/gardenRepo.ts
  - app/src/lib/inviteCodeRepo.ts
  - app/src/lib/mappers/rowMappers.ts
  - app/src/lib/migrateLocalToAccount.ts
  - app/src/lib/photos/PhotoUploader.ts
  - app/src/lib/photos/exifStrip.ts
  - app/src/lib/photos/exifStrip.native.ts
  - app/src/lib/photos/exifStrip.web.ts
  - app/src/lib/photos/photoQueueRepo.ts
  - app/src/lib/profileRepo.ts
  - app/src/lib/sync/SyncTriggers.ts
  - app/src/lib/sync/SyncWorker.ts
  - app/src/lib/sync/__tests__/SyncTriggers.test.ts
  - app/src/lib/sync/backoff.ts
  - app/src/lib/sync/events.ts
  - app/src/lib/vereinsregelnRepo.ts
  - app/src/storage/IndexedDbAdapter.ts
  - app/src/storage/SqliteAdapter.ts
  - app/src/storage/migrations.ts
  - app/src/stores/settingsStore.ts
  - packages/shared/src/index.ts
  - packages/shared/src/types/entities.ts
  - packages/shared/src/types/storage.ts
  - packages/shared/src/types/supabase.ts
findings:
  critical: 2
  warning: 7
  info: 6
  total: 15
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

This phase implements offline-first sync for the 2-user shared garden model: Row-Table storage adapters (SQLite + IndexedDB), a SyncWorker with push/pull/backoff, SyncTriggers, photo upload queue with EXIF stripping, and supporting UI (SyncStatusBadge, sync detail screen, privacy settings). The architecture is sound and the GDPR-by-default design (GPS opt-out) is correctly implemented.

Two critical issues were found: a RPC signature mismatch that will cause photo analysis to silently fail at runtime, and a module-level URL object leak on Web that can exhaust memory over a session. Seven warnings cover logic correctness issues including a `syncBooted` ref that is never reset on logout, the backoff timer gap where the worker receives `nextDelayMs` but never actually sleeps before retrying, the `uploadPending` function not emitting a final status event, and several missing-error-handling gaps. Six info items address dead code, a missing `LIKE` injection guard, stale type assertions, and minor test inconsistencies.

**Gap Closure (Plan 03-07):** The `uploadPending()` call has been correctly wired into both SyncTriggers reconnect handlers (NetInfo offline-to-online and AppState background-to-active). The implementation follows the established fire-and-forget `.catch()` pattern used by `syncAll()`, ensuring that a failure in photo uploads does not block sync operations and vice versa. Three new test cases cover the expected call behavior and rejection isolation. No new critical or warning-level issues were introduced by this change.

---

## Critical Issues

### CR-01: RPC Call Signature Mismatch — `enqueue_photo_analysis`

**File:** `app/src/lib/photos/PhotoUploader.ts:74-78`

**Issue:** `PhotoUploader.ts` calls `enqueue_photo_analysis` with a single argument `{ p_photo_id: row.id }`. However, the generated Supabase types in `packages/shared/src/types/supabase.ts` (line 462) declare the RPC signature as:

```ts
enqueue_photo_analysis: {
  Args: { p_garden_id: string; p_kind: string; p_storage_path: string }
  Returns: string
}
```

The `p_photo_id` parameter does not exist in the schema. The call is already cast with `(supabase as any).rpc(...)` which suppresses the TypeScript error, but at runtime the RPC will be invoked with wrong arguments. Depending on the Postgres function's implementation, this will either throw (and `handleUploadError` will mark the photo `failed` — silently abandoning analysis) or return `null` for `jobId`.

**Fix:** Align the call with the declared RPC signature:

```typescript
const { data: jobId, error: rpcErr } = await (supabase as any).rpc(
  'enqueue_photo_analysis',
  {
    p_garden_id: row.gardenId,
    p_kind: 'garden_photo',
    p_storage_path: remotePath,
  },
);
```

If the Postgres function was intentionally changed to accept `p_photo_id`, update `supabase.ts` types to match and remove the comment `"S-9: enqueue_photo_analysis is not in generated Database types yet"`.

---

### CR-02: Blob URL Memory Leak in `exifStrip.web.ts`

**File:** `app/src/lib/photos/exifStrip.web.ts:43`

**Issue:** `URL.createObjectURL(blob)` creates a blob URL that is never revoked. The returned `strippedUri` is stored in `PhotoQueueRow.storagePath`. After `uploadOne` succeeds in `PhotoUploader.ts`, `patchPhoto` updates `storagePath` to the remote key — but the original blob URL is never passed back for revocation. Over a session where many photos are taken, or across retries of failed uploads, these object URLs accumulate and hold the JPEG data in memory indefinitely. On mobile browsers (Safari/Chrome on iOS) this can exhaust the available memory budget.

**Fix:** The caller (`PhotoUploader.uploadOne`) must revoke the local blob URL after upload succeeds or permanently fails. Add a revocation step in `uploadOne`:

```typescript
async function uploadOne(row: PhotoQueueRow): Promise<void> {
  const isLocalBlob = row.storagePath.startsWith('blob:');
  try {
    // ... existing upload logic ...

    // 4. Patch local row: status=uploaded, storagePath=remote key, jobId
    await patchPhoto(row.id, {
      storagePath: remotePath,
      uploadStatus: 'uploaded',
      uploadError: null,
      jobId: jobId as string,
    });
    // Revoke blob URL now that remote path is stored
    if (isLocalBlob) URL.revokeObjectURL(row.storagePath);
    // ...
  } catch (e) {
    await handleUploadError(row, e);
    // Also revoke on permanent failure to avoid leaking
    if (isLocalBlob && /* max attempts reached */ ...) {
      URL.revokeObjectURL(row.storagePath);
    }
  }
}
```

Alternatively, `enqueuePhoto` in `photoQueueRepo.ts` could store the blob in a `Map<photoId, blobUrl>` and return the URL for the caller to revoke after the upload pipeline completes.

---

## Warnings

### WR-01: `syncBooted` Ref Is Never Reset — SyncWorker Remains Registered After Logout

**File:** `app/app/_layout.tsx:101-115`

**Issue:** `syncBooted` is a `useRef(false)` declared at the component level of `GuardedStack`. The `useEffect` sets `syncBooted.current = true` when the worker is registered and the cleanup sets it back to `false`. However, `GuardedStack` is a singleton in the tree (rendered once inside `RootLayoutInner`) — it is never unmounted on logout. When `identity` becomes `null` (after `signOut`) the condition `if (!identity || ...)` causes the effect to re-run with `syncBooted.current === false` (correctly reset by the prior cleanup), so re-registration is possible on a subsequent login. This is correct.

The real risk: if `identity` transitions from `account`→`null` (logout), the `return () => { unregister(); syncBooted.current = false; }` runs correctly. But because `GuardedStack` never unmounts, `syncBooted.current` lives forever. If the user logs out then logs back in, `syncBooted.current` will be `false` (cleanup ran it), so re-registration works — but the **cleanup from the first session only runs when the dep array changes**, not on component unmount. If `unregister()` (from `registerSyncTriggers`) is not idempotent (it isn't — it calls `netInfoUnsub()` + `appStateUnsub.remove()` once), and React StrictMode fires the effect twice, the first cleanup correctly unregisters. However there is a gap: on hot-reload in dev, `syncBooted.current` survives (refs survive hot-reload) but the prior subscription may have been cleaned up, leaving the ref at `true` and the worker never re-registered until the process restarts.

**Fix:** Reset `syncBooted.current = false` explicitly at the top of the effect's cleanup rather than relying on it being set before the guard condition prevents re-entry:

```typescript
React.useEffect(() => {
  if (syncBooted.current) return;
  if (!identity || mode !== 'account' || !activeGardenId) return;
  syncBooted.current = true;
  const unregister = registerSyncTriggers();
  getSyncWorker().syncAll().catch(/* ... */);
  return () => {
    syncBooted.current = false; // reset BEFORE unregister so that hot-reload re-runs
    unregister();
  };
}, [identity, mode, activeGardenId]);
```

(The current code already does this — `syncBooted.current = false` is in the cleanup. This is documenting a subtle hot-reload edge case; verify the order is correct under fast-refresh scenarios.)

---

### WR-02: Backoff Delay Is Computed But Never Applied — Retry Is Immediate

**File:** `app/src/lib/sync/SyncWorker.ts:381-388`

**Issue:** `handlePushError` calls `nextBackoffMs(nextAttempts)` and emits a `push_retry` event with `nextDelayMs`, but the computed delay is never awaited. `push()` calls `pushOne(entry)` for every entry in a loop (`for (const entry of entries)`); after an error, `handlePushError` updates the outbox entry and returns. The outer loop immediately moves to the next entry. When `syncAll()` / `push()` is called again by a reconnect trigger, all entries are retried immediately regardless of how many attempts they have — the backoff has no effect on actual retry timing.

This is not a crash, but means noisy logs and unnecessary Supabase traffic after transient failures.

**Fix:** Apply the delay inside `handlePushError` (acceptable for a sequential loop) or skip entries whose `nextRetryAt` has not yet elapsed. The simplest fix is to store a `nextRetryAt` timestamp on the outbox entry and skip entries with `nextRetryAt > Date.now()` in `push()`:

```typescript
// In handlePushError, after computing delayMs:
const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
await this.storage.updateOutboxEntry(entry.id, {
  attempts: nextAttempts,
  lastError: msg,
  // requires adding nextRetryAt to OutboxEntry + adapters
});

// In push():
const entries = (await this.storage.listOutboxEntries(50))
  .filter(e => !e.nextRetryAt || e.nextRetryAt <= new Date().toISOString());
```

Alternatively, simply `await new Promise(r => setTimeout(r, delayMs))` before returning from `handlePushError` if sequential-wait is acceptable for an MVP.

---

### WR-03: `uploadPending` Does Not Emit Final `status_change` Event

**File:** `app/src/lib/photos/PhotoUploader.ts:27-46`

**Issue:** `uploadPending` emits `{ type: 'status_change', status: 'syncing' }` at the start, but never emits `idle` or `degraded` when it finishes. `useSyncStatus` derives its badge state partly from `activelySyncing` (set by `status_change` events). After photo uploads complete, the badge will remain in `syncing` state until the next `SyncWorker.push()` or `pull()` run emits an `idle`/`degraded` event.

**Fix:** Emit a final status event in the `finally` block:

```typescript
} finally {
  uploadInFlight = false;
  // Check for remaining failed photos to surface the right status
  const remaining = await storage.getRowsByGarden<PhotoQueueRow>(
    'photo_queue', activeGardenId,
  ).catch(() => []);
  const hasFailed = remaining.some(r => r.uploadStatus === 'failed');
  syncEvents.emit({ type: 'status_change', status: hasFailed ? 'degraded' : 'idle' });
}
```

---

### WR-04: SQL `LIKE` Injection in `SqliteAdapter.list()`

**File:** `app/src/storage/SqliteAdapter.ts:87`

**Issue:** `list(prefix?)` passes the prefix directly as `LIKE ?` with `${prefix}%`. The `%` and `_` characters in the prefix have special meaning in SQL LIKE expressions. If a caller ever passes a key prefix containing these characters (e.g. `"photo_"`) the `_` matches any single character, returning more rows than intended.

While the current callers all use simple fixed-string prefixes, this is a latent correctness bug that could affect any future caller.

**Fix:** Escape LIKE special characters in the prefix before binding:

```typescript
async list(prefix?: string): Promise<string[]> {
  const db = await this.dbPromise;
  if (!prefix) {
    const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM kv');
    return rows.map((r) => r.key);
  }
  const escaped = prefix.replace(/[%_\\]/g, (c) => `\\${c}`);
  const rows = await db.getAllAsync<{ key: string }>(
    'SELECT key FROM kv WHERE key LIKE ? ESCAPE \'\\\'',
    `${escaped}%`,
  );
  return rows.map((r) => r.key);
}
```

---

### WR-05: `gardenToLocalRow` Silently Drops `plz`/`klimazone`/`archetype` Patch Fields

**File:** `app/src/lib/gardenRepo.ts:126-140`

**Issue:** `updateGarden` calls `gardenToLocalRow(gardenId, { name: patch.name }, userId, existing)` — only forwarding the `name` field. The extended fields `plz`, `klimazone`, and `archetype` are then manually spread onto `extendedUpdated` in lines 135-139. The problem is that `gardenToLocalRow` also sets `updatedAt = now.toISOString()` internally (line 89 of `rowMappers.ts`), so `extendedUpdated` gets the correct timestamp. However, the `ownerUserId` field is only set in `gardenToLocalRow` via the base row (`existingRow?.ownerUserId`). If `existingRow` is `null` (a fresh row), `ownerUserId` defaults to `userId` inside `gardenToLocalRow` — correct. But the mapper signature accepts an `ownerUserId` patch that is never passed. This is confusing and fragile: a future caller passing `{ ownerUserId: ... }` to `gardenToLocalRow` would have it take effect, while a caller using `updateGarden` with the same intent would not.

The more concrete bug: `extendedUpdated` is the source-of-truth for the Outbox `payload`, but `payload` is set to `extendedUpdated as unknown as Record<string, unknown>` — this includes any stale `gardenId`-related field only if it existed on `existing`. If `existing` is `null`, the extended fields `plz`/`klimazone`/`archetype` are only present if the patch supplied them, which is correct. However if `existing` was a row that previously had `plz` but the new patch only updates `name`, the existing `plz` from `existing` does NOT flow into `extendedUpdated` because `gardenToLocalRow` receives only `{ name }` and the extend-spread only applies `patch.plz` when it is `!== undefined`. So the pushed Outbox payload could be missing the existing `plz`, causing the server to overwrite `plz = null` on a name-only update.

**Fix:** Forward all extended fields through `gardenToLocalRow`:

```typescript
const updated = gardenToLocalRow(
  gardenId,
  {
    name: patch.name,
    plz: patch.plz,
    klimazone: patch.klimazone,
    archetype: patch.archetype,
  },
  userId,
  existing,
);
// Remove the manual extendedUpdated spread — gardenToLocalRow handles it.
await storage.writeWithOutbox('gardens', updated, { ... });
```

And update `gardenToLocalRow`'s mapper to forward `plz`/`klimazone`/`archetype` from both the patch and the `base` (existing row) to preserve fields across partial updates.

---

### WR-06: `discardOp` in `SyncWorker` Does Not Handle Missing Entry Gracefully Before Pull

**File:** `app/src/lib/sync/SyncWorker.ts:172-183`

**Issue:** `discardOp` fetches all outbox entries to find the target, then calls `storage.deleteOutboxEntry(opId)`. If the entry exists, it does a corrective `pull(entry.entity)`. This is correct. However, `storage.deleteOutboxEntry` on `SqliteAdapter` executes `DELETE FROM sync_outbox WHERE id = ?` — if the row is already gone (e.g. the user double-taps Discard) it silently does nothing. This is fine. But then `if (entry)` — the `entry` was found in the `entries` snapshot from before the delete, so it will always be truthy if it was in the snapshot. The race: if `discardOp` is called while `push()` is running and `pushOne` deletes the same entry after a success, the `entry` snapshot still holds the old reference and a redundant `pull(entity)` is triggered. The pull is harmless but wastes bandwidth.

More importantly: `retryOp` calls `storage.updateOutboxEntry` and then `syncAll()`. If the entry was silently deleted concurrently (e.g. by `pushOne` completing at the same time), `updateOutboxEntry` on `SqliteAdapter` does a `UPDATE ... WHERE id = ?` which is a no-op for missing rows and does not throw. `syncAll()` then runs with no matching entry. This is safe but could silently succeed while the user expects a retry to occur.

**Fix:** In `retryOp`, check that `updateOutboxEntry` found a row and throw if not:

```typescript
async retryOp(opId: string): Promise<void> {
  const entries = await this.storage.listOutboxEntries();
  const entry = entries.find((e) => e.id === opId);
  if (!entry) throw new Error('outbox_entry_not_found');
  await this.storage.updateOutboxEntry(opId, { attempts: 0, lastError: null });
  // Verify the update landed (re-read to confirm):
  const after = (await this.storage.listOutboxEntries()).find(e => e.id === opId);
  if (!after) throw new Error('outbox_entry_not_found'); // was deleted concurrently
  syncEvents.emit({ type: 'status_change', status: 'syncing' });
  await this.syncAll();
}
```

---

### WR-07: `vereinsregelnFromDbRows` Uses `dbRows[0]!.erstellt_am` — Non-existent Field

**File:** `app/src/lib/mappers/rowMappers.ts:231`

**Issue:** The `vereinsregelnFromDbRows` mapper accesses `dbRows[0]!.erstellt_am` to populate `createdAt`. Looking at the Supabase type definition for `vereinsregeln` in `supabase.ts` (lines 388-445), the column `erstellt_am` exists as a DB column (`erstellt_am: string` in the Row type). The `DbVereinsregelnRow` type alias is `Database['public']['Tables']['vereinsregeln']['Row']`, so `erstellt_am` is a valid field. This is fine.

However, the field is accessed without a null check: `dbRows[0]!.erstellt_am`. The `!` asserts the array is non-empty — which is guaranteed by the `if (dbRows.length === 0) return null` guard on line 211. This is correct.

What IS a bug: the `mostRecentUpdated` computation on line 224 uses `.sort()` without a comparator. `Array.prototype.sort()` with no argument sorts lexicographically, which works correctly for ISO-8601 strings, but only when all strings are the same length/format. If any `updated_at` value is a partial date or non-ISO string (e.g. due to a bad migration), lexicographic sort would produce incorrect ordering. This is a latent correctness issue:

**Fix:**

```typescript
const mostRecentUpdated = dbRows
  .map((r) => r.updated_at)
  .sort((a, b) => a.localeCompare(b))  // explicit string comparison; ISO-8601 safe
  .pop() ?? new Date().toISOString();
```

---

## Info

### IN-01: `toRow` in `vereinsregelnRepo.ts` Is Dead Code

**File:** `app/src/lib/vereinsregelnRepo.ts:32-50`

**Issue:** The `toRow` export is documented as a "backward compat" shim for `migrateLocalToAccount.ts`. However, `migrateLocalToAccount.ts` already imports directly from `rowMappers` (`vereinsregelnToLocalRow`, `vereinsregelnToDbRows`) and does not import `toRow` from this module. The comment on line 30 says "Plan 03-03 Task 03 will update migrateLocalToAccount to import from rowMappers directly" — that update has already been done. `toRow` is no longer called anywhere.

**Fix:** Remove the `toRow` export and its comment block.

---

### IN-02: `normalizeCode` in `inviteCodeRepo.ts` Allows Lowercase Letters Through After Uppercase Conversion

**File:** `app/src/lib/inviteCodeRepo.ts:46-48`

**Issue:** `normalizeCode` converts to uppercase then filters with `/[^A-Z1-9]/g`. The Crockford Base32 alphabet excludes `0`, `O`, `I`, `L`, `U`. After `toUpperCase()`, a lowercase `o` becomes `O` which is then kept by `[A-Z]`. The comment says "confusable-chars removed" but `O` passes through the regex. If the DB RPC rejects `O`/`I`/`L` as invalid Crockford characters, a user entering `o` or `i` will get an error that bypasses the normalization intent.

**Fix:** Either add a second replacement step to map confusable characters:

```typescript
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
    .replace(/[^A-Z1-9]/g, '')  // remove non-alpha/digit
    .replace(/[OILU]/g, '')      // remove Crockford-invalid chars
    .slice(0, 6);
}
```

Or map confusables before stripping: `O -> 0`, `I -> 1`, etc. (standard Crockford decoding convention).

---

### IN-03: `dataUrlToBlob` in `exifStrip.web.ts` Returns Synchronously Instead of `Promise<Blob>`

**File:** `app/src/lib/photos/exifStrip.web.ts:62-73`

**Issue:** The function signature is `function dataUrlToBlob(dataUrl: string): Blob` (synchronous), but it is called with `await dataUrlToBlob(stripped)` at line 42. In TypeScript `await` on a non-Promise value is valid (returns the value directly), so there is no runtime bug. But the inconsistency between the declared return type and the `await` call is confusing and may mislead future maintainers into thinking it is async.

**Fix:** Either remove the `await` at the call site, or declare the function as `async` and return `Promise<Blob>` for consistency with `ensureDataUrl`.

---

### IN-04: `supabase.ts` Has Stray "Initialising login role..." at Top of File

**File:** `packages/shared/src/types/supabase.ts:1`

**Issue:** The file begins with `Initialising login role...` as a bare text line outside any comment or string. This would cause a TypeScript parse error if not preceded by a valid export/import — but since it appears before the first real code and there are no preceding exports, it will parse as an expression statement of the identifier `Initialising` followed by a label `login` — which is syntactically valid (TypeScript treats `role...` as a sequence of labels/identifiers). At runtime this is dead code. This is likely a copy-paste artefact from Supabase's `gen-types` output.

**Fix:** Remove line 1 (`Initialising login role...`). It serves no purpose and may confuse tools that parse the file as documentation.

---

### IN-05: `useSyncStatus` `refreshCounts` Not Stable — Missing `useCallback`

**File:** `app/src/hooks/useSyncStatus.ts:50-63`

**Issue:** `refreshCounts` is defined as a plain function inside the component body (not via `useCallback`). It captures `debounceTimerRef` from the closure, which is stable (a ref). The function itself is only called inside the `useEffect` that has an empty dep array, so it is captured once at mount and will not change. There is no functional bug. However, if a future refactor adds `refreshCounts` to a dep array or exposes it via the return value, it would be recreated on every render, causing unbounded re-subscriptions.

**Fix:** Wrap in `useCallback` with an empty dep array for correctness-under-refactoring:

```typescript
const refreshCounts = React.useCallback(() => {
  // ... existing body ...
}, []);
```

---

### IN-06: Test Functions Declared `async` Without `await` (Gap Closure Tests)

**File:** `app/src/lib/sync/__tests__/SyncTriggers.test.ts:107, 114`

**Issue:** Two of the three new gap closure tests (`ruft uploadPending() bei offline->online` at line 107 and `ruft uploadPending() bei background->active` at line 114) are declared `async` but contain no `await` expressions. Jest handles this correctly (the returned resolved promise is awaited), so there is no functional bug. However, this is inconsistent with the project pattern: the third new test (line 121) correctly uses `await` for a microtask flush, and the older tests in the same file use `async` only when an `await` is present.

**Fix:** Remove the `async` keyword from the two test callbacks that do not use `await`, or add a comment explaining the intent:

```typescript
it('ruft uploadPending() bei offline->online (SC-2 gap closure)', () => {
  registerSyncTriggers();
  netInfoListener({ isConnected: false });
  netInfoListener({ isConnected: true, isInternetReachable: true });
  expect(uploadPending).toHaveBeenCalledTimes(1);
});
```

---

## Gap Closure: Plan 03-07 Assessment

**Scope:** Wire `uploadPending()` from `PhotoUploader` into `SyncTriggers` reconnect handlers to close the SC-2 / SYNC-02 gap identified in the phase verification report.

**Files changed:**
- `app/src/lib/sync/SyncTriggers.ts` -- added import + 2 `uploadPending().catch()` call sites
- `app/src/lib/sync/__tests__/SyncTriggers.test.ts` -- added mock + 3 test cases

**Assessment:** The implementation is clean and correct. Key observations:

1. **Fire-and-forget pattern is consistent.** Both `uploadPending()` and `syncAll()` are called as independent fire-and-forget promises with `.catch()` handlers. A rejection in one does not affect the other. This matches the existing pattern established in the prior phase execution.

2. **Error handling is adequate.** The `.catch()` handlers log warnings only in `__DEV__` mode, consistent with the existing `syncAll()` catch handlers. Unhandled promise rejections are prevented.

3. **Serialization is safe.** `uploadPending()` has its own `uploadInFlight` lock (line 17 of PhotoUploader.ts), so concurrent triggers from both NetInfo and AppState will not cause parallel upload runs.

4. **Test coverage is sufficient.** The three new tests cover: (a) NetInfo reconnect triggers `uploadPending`, (b) AppState foreground triggers `uploadPending`, (c) `uploadPending` rejection does not block `syncAll`. The rejection isolation test at line 121 is particularly valuable.

5. **No regressions.** The existing tests are unaffected. The new `PhotoUploader` mock is properly isolated with `jest.mock()` hoisting, and `jest.clearAllMocks()` in `beforeEach` resets it between tests.

**Verdict:** Gap SC-2 / SYNC-02 is closed. No new critical or warning-level issues introduced.

---

_Reviewed: 2026-04-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
