---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "Phase 02 code-complete + re-verified PASS-pending-human-verify (gaps #1+#2 closed); deferred checkpoints 2-02-04 + 2-04-04 remain for device QA"
last_updated: "2026-04-20T00:00:00.000Z"
last_activity: 2026-04-20 -- Phase 02 gap fixes (Supabase column mapping + inline edit wire) landed; re-verification GREEN
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 10
  completed_plans: 7
  percent: 70
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Foto rein → Plan und Kalender raus
**Current focus:** Phase 01 — foundation

## Current Position

Phase: 02 (auth-profile-vereinsregeln) — CODE COMPLETE + VERIFIED; HUMAN-VERIFY PENDING
Plan: 4 of 4 (02-01 … 02-04 code complete); 2 verifier-flagged gaps closed post-hoc
Status: re-verified PASS-pending-human-verify; checkpoints 2-02-04 + 2-04-04 outstanding (scripts in respective SUMMARYs)
Last activity: 2026-04-20 -- gap fixes (e6b8c30 Supabase column mapping + d885901 inline edit wire); 99/99 tests green, typecheck clean

Progress: [███████░░░] 70%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 13 | 6 tasks | 33 files |
| Phase 01 P02 | 14 | 5 tasks | 18 files |
| Phase 01 P03 | 10 | 4 tasks | 14 files |
| Phase 02 P04 | 13 | 3 tasks | 17 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Start with react-native-svg in Phase 5; Skia upgrade decision gated at end of Phase 5 via profiling (100 elements on real device). Do not pre-emptively adopt Skia.
- Roadmap: Custom outbox sync (not PowerSync/Legend-State). LWW semantics for single-user MVP.
- Roadmap: Vereinsregeln placed in Phase 2 (onboarding) — rules feed editor warnings in Phase 5 but input is captured early.
- Roadmap: Phase 6 (M3 Seed inventory) depends only on Phase 3 (Sync), not Phase 5 — it can be built in parallel with Phase 5 if timeline pressure rises.
- [Phase 01]: Expo SDK 53 stable used instead of SDK 55 canary — upgrade path is a version bump when SDK 55 stable releases
- [Phase 01]: StorageAdapter (D-08): CRUD-only interface + schema version, Platform.select export at storage/index.ts — callers never know which adapter
- [Phase 01]: jest split-project config: node env for storage tests (ts-jest + fake-indexeddb), expo env for RN component tests
- [Phase 01]: app typecheck script uses direct node invocation to bypass Windows/pnpm hoisted tsc shell wrapper bug
- [Phase 01]: SET LOCAL ROLE authenticated required in supabase db query RLS tests — Management API runs as postgres superuser, bypassing RLS without explicit role switch
- [Phase 01]: jest hooks project uses ts-jest/node (not jest-expo) — jest-expo setup.js crashes in multi-project Node context; pattern extends Plan 01 fix
- [Phase 01]: enqueueAiJob uses (supabase as any).schema('pgmq_public') — pgmq_public not in generated Database type; any-cast intentional and documented
- [Phase 01]: supabase functions invoke removed in CLI v2.90.0 — deployment verified via functions list (ACTIVE status); manual invoke documented in e2e-pgmq-smoke.sql
- [Phase 01]: SUPABASE_SERVICE_ROLE_KEY is NOT a GitHub secret — lives only in Supabase Function Secrets (T-3-06 mitigation)
- [Phase 01]: Sentry.init guarded by !!process.env.EXPO_PUBLIC_SENTRY_DSN — no-op in local dev without DSN
- [Phase 01]: EAS Build uses --no-wait flag — CI queues build on expo.dev without blocking runner
- [Phase 02-04]: Vereinsregeln checklist rendered flat (not 7-category) — VereinsregelChecklistItem in @spatenstich/shared has no `kategorie` field; grouping deferred pending shared-type extension
- [Phase 02-04]: Migration rollback invariant — storage.delete STRICTLY AFTER every Supabase upsert succeeds (T-2-04-03); signUp failure or upsert failure leaves local data intact for retry
- [Phase 02-04]: BKleingG seed rows keep deterministic `bk-<userId>-<index>` id across migration so DB CHECK constraint and client guard continue to recognise them
- [Phase 02-04]: Settings logout uses inline confirmation expansion (no Modal, UI-SPEC line 234); Sentry.setUser(null) gated on EXPO_PUBLIC_SENTRY_DSN (T-2-04-04 mitigation, mirrors Plan 01-03 pattern)
- [Phase 02-04]: Swipe-to-delete deferred — react-native-gesture-handler not in stack; tap-trash fallback used per plan Behavior 14 permission
- [Phase 02-04]: ExtractionLoader uses NativeWind animate-pulse (not Reanimated worklet) — adequate for MVP, no added surface
- [Phase 02-04 post-hoc]: Supabase column contract enforced via toRow/fromRow in vereinsregelnRepo — Postgres column is `ist_bkleingg` (snake_case); camelCase `istBKleingG` would be silently dropped on upsert. migrateLocalToAccount routed through toRow. Fix shipped 2026-04-20 (e6b8c30).
- [Phase 02-04 post-hoc]: confirm.tsx inline-edit wires VereinsregelRow.onEdit → vereinsregelnStore.updateRule. Closes SC5 edit-reachability gap. Fix shipped 2026-04-20 (d885901).

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-q01 | Fix CI: add react-native-web to app deps | 2026-04-18 | 12c988d | [260418-q01-fix-react-native-web-ci](.planning/quick/260418-q01-fix-react-native-web-ci/) |

### Blockers/Concerns

- Open question: NativeWind v4 + Reanimated v3 compatibility on SDK 55 unconfirmed. Spike needed in Phase 1 before any styling work.
- Open question: expo-sqlite WASM + COOP/COEP headers on EAS Hosting — must be validated in Phase 1.
- Open question: @supabase/supabase-js >= 2.49.5 stable release — check npm before first sprint.
- Open question: pnpm + EAS Build compatibility (eas-cli issue #3247) — full EAS Build must be tested in Phase 1.
- Risk: Claude Vision structural extraction quality for German allotment plots is MEDIUM confidence. Run 5-10 photo test harness before locking Phase 4 architecture.

## Session Continuity

Last session: 2026-04-20T00:00:00.000Z
Stopped at: Phase 02 re-verified PASS-pending-human-verify — gaps #1+#2 closed; deferred checkpoints 2-02-04 + 2-04-04 in respective SUMMARYs
Resume file: .planning/phases/02-auth-profile-vereinsregeln/CHECKPOINT-HUMAN-VERIFY.md
