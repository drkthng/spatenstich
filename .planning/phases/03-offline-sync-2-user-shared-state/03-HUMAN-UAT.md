---
status: partial
phase: 03-offline-sync-2-user-shared-state
source: [03-VERIFICATION.md]
started: 2026-04-26T10:30:00Z
updated: 2026-04-26T10:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 2-User LWW Conflict — Winner Label
expected: After two devices edit the same garden offline and reconnect, the losing device's local view should update via delta-pull and the garden screen should show 'zuletzt bearbeitet von [winner name]' reflecting the LWW-winning write
result: [pending]

### 2. Offline Plan Render — No Spinner, No Blank Screen
expected: Kill network on device, close and reopen app — the garden plan renders immediately from StorageAdapter Row-Tables with no loading indicator and no blank state
result: [pending]

### 3. Desktop Browser (IndexedDB) Plan Sync
expected: Open the app in Chrome/Safari after editing on iPhone (after sync) — the same plan data appears with all recent changes
result: [pending]

### 4. Edits Appear in Supabase Within 30s of Reconnect
expected: Make an offline edit, restore network, observe Supabase Postgres row updated within 30 seconds and SyncStatusBadge transitions syncing → synced
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
