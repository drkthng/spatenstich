# Deferred Items — Phase 03

## Pre-existing Test Failures (discovered during Plan 03-06 execution)

These failures exist on commit 262e765 (base of Plan 03-06 worktree) and are not caused by Plan 03-06 changes.

| Suite | Failures | Root Cause (suspected) |
|-------|----------|----------------------|
| `src/lib/__tests__/auth.test.ts` | 2 tests fail | SecureStore mock state pollution between tests (`getOrCreateLocalUUID` returns null after `clearLocalUUID`) |
| `src/lib/photos/__tests__/PhotoUploader.test.ts` | multiple | Pre-existing — unrelated to sync UI |
| `src/lib/photos/__tests__/photoQueueRepo.test.ts` | multiple | Pre-existing — unrelated to sync UI |

**Action:** These should be investigated and fixed in a follow-up quick task or during Phase 03 wrap-up verification.
