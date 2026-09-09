# Deferred Items — Phase 03

## Pre-existing Test Failures (discovered during Plan 03-06 execution) — RESOLVED

Three pre-existing test failures were recorded here during Plan 03-06 (base commit 262e765). All three are closed as of 2026-09-09 (milestone v1.1 completion):

The `auth.test.ts` failures (SecureStore mock state pollution) were fixed by quick task 260610-jtf (Forensik-Sweep, commit dab65a9); the suite has been green in CI since (777/777 tests on 2026-09-08).

The `PhotoUploader.test.ts` and `photoQueueRepo.test.ts` failures became moot when the photo pipeline was removed in Phase 05 (M07 pivot, zero in-app AI); both files no longer exist.

No open deferred items remain for Phase 03.
