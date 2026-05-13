---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Post-MVP
status: Phase 7 in progress (Wave 2 complete)
stopped_at: Phase 7 Plan 03 complete — editorStore + geometry + saveDebounce ready for Wave 3
last_updated: "2026-05-13T13:45:00.000Z"
last_activity: 2026-05-13
progress:
  total_phases: 11
  completed_phases: 8
  total_plans: 40
  completed_plans: 34
  percent: 85
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08)
See: docs/specs/M07-claude-ai-bridge.md (M07 Pivot Spec)

**Core value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai (zero In-App AI seit Pivot M07 2026-05-08)
**Current focus:** Phase 6.5 — Draft-Sichtung + Promotion (Wave 0 complete)

## Current Position

Phase: 7 (Plan-Editor + Drafts-Integration M2+M07.5) — Wave 2 COMPLETE
Plan: 3 of 6 (state + save + geometry + repo extensions) COMPLETE — editorStore (zundo limit:20) + 3 geometry modules + saveDebounce + writePlanElement + promoteBedDraft finalCoords param all green; 69 new assertions in Wave-0 stubs filled
Vorheriger Status: Phase 07 Plan 02 complete — Migration 018 + PlanElementRow.layer + Pitfall-8 lazy mapper default
Plans: 21/21 completed (Phase 01: 3/3, Phase 02: 4/4, Phase 02.5: 4/4, Phase 03: 6/7, Phase 04: ~~4/4 superseded~~, Phase 06.5: 5/5, Phase 07: 3/6)
Last activity: 2026-05-13

Progress: [██████░░░░] ~64% within Phase 7 (3/6 plans done; 36 of an estimated 40 plans complete cross-project)

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
| Phase 02.5 P01 | 9 | 5 tasks | 10 files |
| Phase 02.5 P02 | 45 | 5 tasks | 13 files |
| Phase 02.5 P03 | 90 | 4 tasks | 11 files |
| Phase 02.5 P04 | 60 | 3 tasks | 8 files |
| Phase 04 P01 | 15 | 2 tasks | 14 files | *(superseded)*
| Phase 04 P02 | 5 | 2 tasks | 4 files | *(superseded)*
| Phase 04 P03 | 13 | 2 tasks | 14 files | *(superseded)*
| Phase 04 P04 | 21 | 2 tasks | 15 files | *(superseded)*
| Phase 05 P02 | 35 | 2 tasks | 40 files |
| Phase 05 P03 | 168 | 2 tasks | 5 files |
| Phase 06 P01 | 5 | 2 tasks | 3 files |
| Phase 06 P02 | 45 | 2 tasks | 11 files |
| Phase 06 P03 | 35 | 2 tasks | 9 files |
| Phase 06 P04 | 5 | 2 tasks | 0 files |
| Phase 06.5 P01 | 12 | 2 tasks | 7 files |
| Phase 06.5 P02 | 10 | 2 tasks | 6 files |
| Phase 06.5 P03 | 6 | 2 tasks | 4 files |
| Phase 06.5 P04 | 14 | 2 tasks | 8 files |
| Phase 06.5 P05 | 66 | 3 tasks (1 wire + 1 push + 1 manual-deferred) | 3 files |
| Phase 07 P02 | 25 | 2 tasks (TDD RED-then-GREEN) | 9 files |
| Phase 07 P03 | 35 | 3 tasks (TDD GREEN, fills 8 Wave-0 stubs) | 18 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **[Pivot M07 2026-05-08]**: Kompletter Wegfall aller In-App AI-API-Aufrufe. Claude Vision, Pl@ntNet, Gemini — alles entfernt. App macht null ausgehende KI-Calls.
- **[Pivot M07 2026-05-08]**: Manuelle Gartenplanung als Default. Claude.ai Bridge-Import als Power-User-Beschleuniger, nicht als Pflichtweg.
- **[Pivot M07 2026-05-08]**: Phase 4 (Garten-Erfassung per Claude Vision) SUPERSEDED. Code wird in Phase 5 entfernt.
- **[Pivot M07 2026-05-08]**: `spatenstich-import.v1` JSON-Schema als Datenkontrakt zwischen Claude.ai-Projekt und App.
- **[Pivot M07 2026-05-08]**: Fotorealistisches Beet-Preview (alte Phase 8) DROPPED — keine In-App AI.
- **[Pivot M07 2026-05-08]**: Vereinsregeln-Aktivierung verschoben auf Phase 10, Claude PDF-Extraktion entfernt (manuelle Eingabe stattdessen).
- **[Pivot M07 2026-05-08]**: SEED-01 (Claude Vision Samentüten-Scan) entfällt. Saatgut-Inventar nur manuell.
- **[Pivot 2026-04-21]**: 2-User Shared Garden Model (Dirk + Frau).
- **[Pivot 2026-04-21]**: Phase 02 Vereinsregeln per Feature-Flag eingefroren.
- Roadmap: Start with react-native-svg in Phase 7; Skia upgrade decision gated at end of Phase 7 via profiling.
- Roadmap: Custom outbox sync (not PowerSync/Legend-State). LWW semantics.
- Roadmap: Phase 8 (M3 Seed inventory) depends only on Phase 3 (Sync), not Phase 7 — it can be built in parallel with Phase 7 if timeline pressure rises.
- [Phase 01]: Expo SDK 53 stable used instead of SDK 55 canary
- [Phase 01]: StorageAdapter (D-08): CRUD-only interface + schema version
- [Phase 01]: jest split-project config: node env for storage tests, expo env for RN component tests
- [Phase 01]: app typecheck script uses direct node invocation to bypass Windows/pnpm hoisted tsc shell wrapper bug
- [Phase 02.5 P02]: SECURITY-DEFINER-Helper-Pattern für selbst-referenzielle RLS
- [Phase 02.5 P02]: Migration-History ist append-only
- [Phase 04 P02]: Budget-Zählung per garden_id *(superseded — AI budget no longer relevant)*
- [Phase 04 P02]: Files API für Foto-Upload an Anthropic *(superseded — Anthropic client being removed)*
- [Phase ?]: spatenstich-import.v1 JSON Schema draft 2020-12 als Datenkontrakt Claude.ai Projekt → App definiert; sunExposure enum 'half' (nicht 'halfShade')
- [Phase 06 P01]: import_items ist write-once — keine LWW-Trigger (aa_/mm_), nur zz_set_updated_at auf mutable Draft-Tabellen
- [Phase 06 P01]: ImportItemRow extends nicht RowBase — write-once Semantik (kein updatedAt/updatedByUserId)
- [Phase 06 P01]: Companion Prompt in prompts/ als plain Markdown; Ziel-Modell Opus 4.7; Re-emit-Instruktion auf Deutsch
- [Phase 06 P02]: ImportItemRow.updatedAt als Alias für createdAt hinzugefügt — StorageAdapter.writeWithOutbox generic constraint T extends AnyRow erfordert updatedAt
- [Phase 06 P02]: pushImportEntity generisch (importEntityToDb mapper) — keine per-entity push-Methoden für write-once Draft-Rows
- [Phase 06 P02]: ajv compile auf Modul-Ebene (nicht in Funktion) — Performance-Pattern für Validator
- [Phase 06 P03]: expo-share-intent@4.1.2 unmet peer expo-constants@>=17.1.5 (found 17.0.8) — accepted as non-blocking; functionality intact
- [Phase 06 P03]: ShareIntentProvider wraps AppLayout; resetShareIntent() immediately after push prevents re-navigation loop
- [Phase 06 P03]: Import payload passed via Zustand importStore between screens (NOT navigation params — Pitfall 1)
- [Phase 06 P03]: confidence <0.6 defaults toggle OFF in preview; red+selected shows manual-review warning in ImportEntityCard
- [Phase 06.5 P01]: Wave-0 test-scaffold strategy — 7 stub files (4 hooks-project + 3 components-project) mit it.todo() shells; keine Imports von Production-Targets; Plans 02-04 müssen 39 named behaviours erfüllen (Crit-1..7 + Pitfall-1..3).
- [Phase 06.5 P01]: pnpm run-script "--" Forward-Bug für jest CLI Flags — use `pnpm --filter app exec jest --testPathPattern=...` instead of `pnpm --filter app test -- --testPathPattern=...` (pnpm v9 swallows second `--`).
- [Phase 06.5 P02]: PlanElementRow gains non-optional nullable fields importedFrom + provenance (matches confidence-style). DbPlanElementRowLoose stays optional on DB side for pre-migration-017 row tolerance via ?? null default in mapper.
- [Phase 06.5 P02]: Migration 017 file committed but NOT pushed — Plan 05 (Wave 4) owns supabase db push. Local schema state still pre-017 until Plan 05 runs.
- [Phase 06.5 P02]: Pre-existing supabase.ts first-line bug ('Initialising login role...') logged as DEFERRED-1 — blocks `pnpm --filter shared typecheck` but unrelated to Plan 02 scope. App-level typecheck green.
- [Phase 06.5]: [Phase 06.5 P03] Detection-first idempotency on promoteBedDraft — caller passes existingElements snapshot; repo checks importedFrom equality on a non-deleted plan_element and returns it without writing. Cheaper than multi-row transactions.
- [Phase 06.5]: [Phase 06.5 P03] nextFreeBedSlot exported as pure helper alongside async writers — enables layout tests without mocks, Plan 04 UI placement preview, and future Phase 7 snap-to-grid reuse.
- [Phase 06.5]: [Phase 06.5 P03] dismissDraft uses a single EntityName-narrowed writeWithOutbox<AnyRow> call with literal entity cast — keeps the generic across three draft tables without per-table duplication.
- [Phase 06.5]: [Phase 06.5 P03] promoteObservationDraft does NOT write plan_elements (Pitfall-3) — observations are annotations, single observation_drafts status update only. Third parameter _importItemId reserved for future caller-symmetry.
- [Phase 06.5]: [Phase 06.5 P04] Sichtungs-Screen at /(app)/import/review composes 3 sections + Auto-Promote toggle (threshold 0.8 pinned in reviewSettingsStore). Edit flow simplified to edit-then-promote (no separate persist-draft step per RESEARCH §Open Question 1).
- [Phase 06.5]: [Phase 06.5 P04] InlineBanner usage replaced with View+Text inside review.tsx (Deviation Rule 3) because lucide-react-native is ESM and the components jest project does not transform it. Same testIDs preserved (promoting-banner, promote-error-banner). Logged for future jest-config infrastructure plan.
- [Phase 06.5]: [Phase 06.5 P04] Plant promotion tolerates null parent: handleAcceptPlant resolves parent bed via elements.find(e => e.importedFrom === draft.bedDraftId && e.deletedAt === null), passing null when not found — prevents Auto-Promote ordering bugs.
- [Phase 06.5]: [Phase 06.5 P05] preview.tsx confirm now redirects to /(app)/import/review (one-line change at line 62) — closes visible half of import-uebernehmen-noop bug. TDD RED (`97a6b15`) before GREEN (`ad170c9`) preserved as separate commits even for one-liner.
- [Phase 06.5]: [Phase 06.5 P05] Migration 017 pushed to live Supabase (project ref vitrqkzxkiqvadqfzrcx, Frankfurt) via non-interactive `supabase db push --linked --yes` — DO-block notice `migration_017 ok` fired; `migration list --linked` confirms 20260512000017 in both Local and Remote columns. plan_elements now has imported_from + provenance; ai_result_id dropped.
- [Phase 06.5]: [Phase 06.5 P05] Auto-mode autonomous DB-push gate established: (1) `migration list --linked` exit 0 + full local/remote diff, (2) `db push --dry-run --yes` exit 0, THEN (3) real push with `--yes`. Otherwise checkpoint:human-action. Both pre-flight gates passed in this plan; push completed without escalation.
- [Phase 06.5]: [Phase 06.5 P05] lucide-react-native global jest mock added in `components/__tests__/setup.ts` (Rule 3 blocking fix) — unblocks every future component test that transitively imports lucide via InlineBanner. Preferable to per-test mocks; resolves the Plan 04 deferred infrastructure item.
- [Phase 06.5]: [Phase 06.5 P05] Debug session `import-uebernehmen-noop` marked RESOLVED in `.planning/debug/import-uebernehmen-noop.md` with full resolution trail across Phase 6.5 Plans 01–05.
- [Phase 07 P03] editorStore uses relative-path internal imports (`../lib/...` not `@/src/...`) so the same test files pass in both `stores` and `editor` jest projects — the `stores` project's moduleNameMapper lacks the `@/src/` alias and both projects pick up `editorStore.*.test.ts` per their testMatch.
- [Phase 07 P03] zundo temporal middleware config: `limit:20`, `partialize:(state)=>({elements:state.elements})`, `equality:(a,b)=>a.elements===b.elements`. Reference-equality dedup is the cheapest possible filter — works because every elements-mutating action returns a new array reference while no-op actions (setSelection/setViewport/setTool) keep the reference identical.
- [Phase 07 P03] selection-clear-on-undo/redo implemented as a module-load IIFE that replaces `temporalApi.getState().undo` + `.redo` via `temporalApi.setState(...)`. Callers get the behavior transparently; cheaper than writing custom zundo middleware.
- [Phase 07 P03] Pattern K two-stage debounce: editorSaveDebounce (5s per element) → writePlanElement → scheduleWriteDebounced (500ms outbox push). Per-element `Map<id, Timeout>` so concurrent edits on different ids don't stomp each other.
- [Phase 07 P03] promoteBedDraft gains optional 6th param `finalCoords?: { xM: number; yM: number }` — additive, existing 5-arg call sites unchanged. Editor drop handler in Wave 3 will pass touch-up coords to override the nextFreeBedSlot auto-layout.
- [Phase 07 P03] colors.ts extracted with strict `Record<PlanColorKey, string>` typing — GardenPlanView call site now uses `as keyof typeof PLAN_COLORS` narrowing cast with the existing `?? PLAN_COLORS.Sonstiges` fallback. Runtime behavior identical; visual contract preserved per UI-SPEC.

### Roadmap Evolution

- Phase 6.5 inserted after Phase 6 (2026-05-12): Draft-Sichtung + Promotion-Flow Draft → `plan_elements` (URGENT). Trigger: Debug-Session `import-uebernehmen-noop` — Phase 6 endete mit Drafts gespeichert, aber kein Pfad zur Anzeige im Plan; Home-Screen zeigt "Noch kein Gartenplan" obwohl Import erfolgreich. Phase 7's `depends_on` sollte überprüft werden (jetzt logisch Phase 6.5 statt Phase 6).

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-q01 | Fix CI: add react-native-web to app deps | 2026-04-18 | 12c988d | [260418-q01-fix-react-native-web-ci](.planning/quick/260418-q01-fix-react-native-web-ci/) |
| 260421-v43 | Roadmap-Pivot: shared-garden MVP, defer vereinsregeln+photorealism to post-MVP | 2026-04-21 | (pending) | [260421-v43-roadmap-pivot](.planning/quick/260421-v43-roadmap-pivot/) |
| 260508-m07 | M07 Pivot: Manual Planning + Claude.ai Bridge — roadmap overhaul | 2026-05-08 | (pending) | - |
| 260510-r5p | Phase-06 Import-Bug Triple Fix: file-picker + sync-cases + import-items updated_at | 2026-05-11 | a3321e1 | [260510-r5p-phase-06-import-bug-triple-fix-file-pick](.planning/quick/260510-r5p-phase-06-import-bug-triple-fix-file-pick/) |

### Blockers/Concerns

- Open question: NativeWind v4 + Reanimated v3 compatibility on SDK 55 unconfirmed.
- Open question: expo-sqlite WASM + COOP/COEP headers on EAS Hosting.
- Open question: @supabase/supabase-js >= 2.49.5 stable release.
- Open question: pnpm + EAS Build compatibility (eas-cli issue #3247).
- ~~Risk: Claude Vision structural extraction quality for German allotment plots.~~ — **RESOLVED by M07 Pivot (no in-app AI)**
- ~~Open question: API-Key-Strategie für Claude Vision / Gemini / PDF-Extraktion.~~ — **RESOLVED by M07 Pivot (zero API keys needed)**
- **NEW**: Schema drift risk between Claude.ai project prompt and app's `spatenstich-import.v1` schema. Mitigated by "Copy current schema" button in import error screen.
- **NEW**: Phase 4 code needs clean removal in Phase 5 — significant deletion scope (Edge Functions, capture screens, parseElements, photoResizer, ai-job-consumer).

## Session Continuity

Last session: 2026-05-13T13:45:00.000Z
Stopped at: Completed Phase 7 Plan 03 (Wave 2 — state + save + geometry + repo extensions)
Resume file: None
Next: Phase 7 Plan 04 (Wave 3 — Skia canvas + gestures + EditorToolbar/DraftsTray/ElementPalette composition on top of useEditorStore)
