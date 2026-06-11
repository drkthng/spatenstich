---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: "Saison 2026 Ready" — Hot Path
status: Milestone complete
stopped_at: Phase 10 Plan 09 abgeschlossen — WR-05 Filter-Chip geschlossen, Phase 10 vollstaendig
last_updated: "2026-06-11T12:12:53.766Z"
last_activity: 2026-06-11
progress:
  total_phases: 13
  completed_phases: 13
  total_plans: 63
  completed_plans: 63
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08)
See: docs/specs/M07-claude-ai-bridge.md (M07 Pivot Spec)

**Core value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai (zero In-App AI seit Pivot M07 2026-05-08)
**Current focus:** Phase 10 — Aussaatkalender v1 (Gap-Closure)

## Current Position

Phase: 10
Plan: Not started
Next: Phase 10 — Aussaatkalender v1
Note: Phase 7.5b (Web Editor Polish) remains optional/open.
Plans: 31/31 completed (Phase 01: 3/3, Phase 02: 4/4, Phase 02.5: 4/4, Phase 03: 7/7, Phase 04: ~~4/4 superseded~~, Phase 05: 3/3, Phase 06: 4/4, Phase 06.5: 5/5, Phase 07: 6/6, Phase 07.5a: 1/1, Phase 08: 4/4, Phase 09: 4/4, Phase 09.1: 6/6)
Last activity: 2026-06-11

Progress: [████████████] v1.0 Foundation complete; v1.1 Hot Path: Phase 10 next

## Performance Metrics

**Velocity:**

- Total plans completed: 13
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 09 | 4 | - | - |
| 10 | 9 | - | - |

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
| Phase 07 P04 | 11 | 3 tasks (TDD GREEN, fills 3 Wave-0 component stubs) | 10 files |
| Phase 07 P05 | 12 | 4 tasks (TDD GREEN, fills last Wave-0 stub DraftsTray) | 9 files |
| Phase 08 P01 | 6 | 6 tasks (Wave-0 test scaffold + stubs) | 14 files |
| Phase 10 P01 | 8 | 2 tasks | 8 files |
| Phase 10 P02 | 8 | 2 tasks | 4 files |
| Phase 10 P03 | 12 | 2 tasks (TDD RED+GREEN + Task 2) | 7 files |
| Phase 10 P03 | 12 | 2 tasks | 7 files |
| Phase 10 P04 | 6 | 2 tasks (Task 1 implementiert + Task 2 Checkpoint auto-genehmigt) | 4 files |
| Phase 10-aussaatkalender-v1 P05 | 6 | 2 tasks | 5 files |
| Phase 10-aussaatkalender-v1 P06 | 6 | 2 tasks | 2 files |
| Phase 10-aussaatkalender-v1 P07 | 3min | 2 tasks | 3 files |
| Phase 10-aussaatkalender-v1 P08 | 9min | 2 tasks (TDD RED+GREEN×2) | 2 files |

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
- [Phase 07 P04] EditorCanvas gesture handlers use `.onChange()` (not `.onUpdate()`) for Pan/Pinch — the PanGestureChangeEventPayload/PinchGestureChangeEventPayload types carry the per-frame deltas (changeX/changeY/scaleChange) accessed via the `.onChange` overload in gesture-handler v2.31. `.onUpdate` only sees translationX/Y/scale cumulative.
- [Phase 07 P04] Single outer Group transform via `useDerivedValue` — collects 3 SharedValues (tx/ty/scale) into one Transforms3d array on the UI thread. Skia's `AnimatedProp<Transforms3d>` accepts `T | { value: T }`, so a SharedValue<Transforms3d> works but per-element SharedValues inside the array don't. The derived value is the idiomatic glue.
- [Phase 07 P04] Skia Line testID cast via `const LineAny = Line as unknown as React.FC<Record<string, unknown>>`. Skia v1.12.4 LineProps doesn't declare testID; runtime renderer ignores unknown props; jest mock surfaces them. Local cast + comment, no `any` proliferation. Required for Revision B2 grid-line smoke-test queryAllByTestId assertion.
- [Phase 07 P04] EditorToolbar temporal subscribe wiring uses `useEditorStore.temporal.subscribe(update)` in a useEffect; re-reads pastStates/futureStates lengths on every zundo snapshot. Simpler than wrapping zundo with a `useTemporalSelector` hook (zundo doesn't export one).
- [Phase 07 P04] Editor jest setup.ts gains DashPathEffect (W6 dashed polygon) + onBegin/onChange chain methods on Gesture mock. Additive extensions — existing Wave 2 tests unchanged; enables Wave-3 callers without forcing per-test mock overrides.
- [Phase 07 P04] Rotation accumulator helper extracted: commitRotation(rotationRadians) lives outside the `.onEnd((e) => runOnJS(commitRotation)(e.rotation))` worklet so the JS-thread store write never runs inside a worklet (Pattern 9). Helper defaults provenance.rotateDeg to 0 if absent, adds radians→degrees conversion, dispatches updateElement with { provenance: nextProvenance }.
- [Phase 07 P05] DraftReviewCard `entityType?` opt-in prop (Revision B3): when supplied (tray sites pass 'bed' | 'plant' | 'observation'), Annehmen Button emits testID `accept-button-${entityType}-${draft.id}`. Phase 6.5 P04 review.tsx callers omit the prop and fall back to the legacy `accept-${draft.id}` testID — zero behavior change. Unlocks real DRAFT-02 unit test addressing the actual button vs the loose card-press fallback.
- [Phase 07 P05] Stale detection (DRAFT-03) is client-side: loadPendingDraftsWithImportedAt JOINs import_items → imports via in-memory Map<itemId, importedAt>. No migration, no Edge Function — RESEARCH §Code Examples §9. Date.now() - importedAt > 30 * 24 * 60 * 60 * 1000 = "stale"; future-dated importedAt (clock skew) is rendered "fresh" — safe failure (T-07-23 accept).
- [Phase 07 P05] Bottom-sheet kept minimal (chip ↔ expanded 50% View) per plan discretion — reanimated 50%/90% snap-point worklets deferred to v1.1 polish. Sufficient for DRAFT-01 "drafts visible as a tray" contract.
- [Phase 07 P05] Revision B4 screen-root Pan in plan/index.tsx: `Gesture.Pan().activateAfterLongPress(220).onEnd(e => { if (bedDraftDragging.value) { screenToGarden(e.absoluteX, e.absoluteY, viewport.value) → runOnJS(handleBedDropAt)(xM, yM); } })`. The .activateAfterLongPress(220) matches the tray LongPress activation window so the tray seeds the shared value first. handleBedDropAt invokes promoteBedDraft via the 6-arg finalCoords form (Plan 03 signature).
- [Phase 07 P05] BedPickerModal uses native `<Modal>` (not a new Expo Router route) — modal is local to the editor screen; simpler than introducing /(app)/plan/pick-bed. RN Modal stub added to app/src/__mocks__/react-native.ts (Rule 3 deviation — Modal was missing from mock and BedPickerModal tests couldn't render).
- [Phase 07 P05] PlantDraftRow exposes `commonNameDe` not `label`; ObservationDraftRow exposes `summary`. DraftsTrayBottomSheet maps these into the DraftReviewCard.draft.label slot at the call site so the card UX is uniform across all 3 entity types without changing the shared card contract.
- [Phase 07 P05] _layout.tsx left UNCHANGED — Expo Router auto-discovers `plan/index.tsx`. Per-route header set via inline `<Stack.Screen options={{ headerTitle: t('editor.title') }} />` inside plan/index.tsx (review.tsx analog).
- [Phase 07 P05] D-18 Annehmen-tap accessibility fallback (Revision W8): Switch-Control / Voice-Control / non-touch users can drive bed-draft promotion via the Annehmen button which fires onBedDraftDragStart (same callback path as the long-press shared value seed). Both paths converge on promoteBedDraft with finalCoords. Documented in must_haves as a parallel a11y path, not a replacement for the long-press drag.
- [Phase 07 P06] Migration 20260513000018 (plan_elements.layer) pushed to live Supabase project (ref `vitrqkzxkiqvadqfzrcx`, Frankfurt) — verified via `supabase migration list --linked` showing Local + Remote columns populated (`20260513000018 | 20260513000018 | 2026-05-13 00:00:18`). DO-block notice `migration_018 ok: plan_elements.layer added with CHECK + plant backfill` fired. Both pre-flight gates green (Gate 1 `migration list --linked` exit 0, Gate 2 `db push --dry-run --linked --yes` exit 0); real push completed non-interactively. plan_elements now has `layer text NOT NULL DEFAULT 'infrastructure'` + CHECK `layer in ('infrastructure','seasonal')`; backfill promoted existing `element_type='Pflanze'` rows to `seasonal`. Date: 2026-05-13.
- [Phase 07 P06] 07-HUMAN-VERIFY.md written with 4 deferred manual smoke sections (EDIT-12 60fps@200, EDIT-09 autosave-crash, DRAFT-02 bed-drop, DRAFT-03 stale-filter). Status `pending` until Dirk runs on iPhone; `/gsd-verify-work` should flag these 4 as outstanding manual-pass.
- [Phase 08 P01] dataSource enum gates license hygiene at the JSON Schema layer — `"gartenplaner"` literal is FORBIDDEN; smoke-test PLANT-DB-09 anchor is second wall; LICENSES.md is third (PR-review aid). Three independent walls so any future Gartenplaner-CSV ingestion path that forgets re-attribution gets caught at PR time.
- [Phase 08 P01] plants.json empty stub WILL FAIL schema's `minItems:80` — intentional. Wave 0 smoke tests use `it.todo` so jest does not assert; Wave 2 (Plan 03) fills the bundle and validator returns `{ok:true}`. Schema stays authoritative (no relax-then-tighten ratchet considered).
- [Phase 08 P01] PlantRow does NOT extend RowBase (no LWW triggers, no `updatedByUserId`, no `deletedAt`) — global ref DB has different lifecycle than user-scoped rows. `PlantCompanionRow` likewise omits LWW fields. Wire-format `PlantDbBundle` uses `Omit<PlantRow, 'id' | 'createdAt' | 'updatedAt'>` for plants array (no UUIDs in bundle, slug-based cross-refs in companions).
- [Phase 08 P01] Jest moduleNameMapper added only in `hooks` + `editor` + `components` projects — not in `node`/`stores`/`photos` — because no plants tests run there in Phase 8 (additive minimal-noise rule). Future phases can extend if/when plants surfaces in those projects.
- [Phase 08 P01] All test stubs use `it.todo()` exclusively — no `it.skip()`, no `expect(false)`. Plans 02–04 fill the 42 todos (16 smoke + 12 validator + 10 plantRepo + 4 usePlants); jest reports todo counts as a coverage-progress signal during downstream waves.
- [Phase 08 P02] Migration 019 (plants + plant_companions) file committed to git; NOT pushed (Plan 04 owns push gate). plant-db-v1 validator filled with full cross-ref check loop; 12 validator tests GREEN. pgTAP RLS skeleton filled (5 invariants for PLANT-DB-04). REQUIREMENTS.md gained 9 PLANT-DB-* IDs; SEED-02..SEED-06 re-pointed to Phase 13; CAL-* re-pointed to Phase 10. Date: 2026-05-17.
- [Phase 08 P03] plants.json curated with 90 plants + 38 companion pairs covering Gemüse/Kraut/Beere/Obstbaum/Blume distribution per CONTEXT D-05. Anker-Tests GREEN (Tomate=Solanaceae, Erdbeere=Rosaceae, Buschbohne nitrogenFixing, Apfel perennial, Tomate-Basilikum companion). License-hygiene PLANT-DB-09 enforced — `dataSource` enum strict; zero `"gartenplaner"` literals; plants split own-research=78 / merged=11 / gardeneus=1 / garden-planner=0; companions own-research=25 / merged=7 / gardeneus=6 / garden-planner=0. 16 smoke tests + 12 validator tests = 28 plant-db tests GREEN; full shared-package suite shows 61 passed. LICENSES.md updated with per-source counts. Native UTF-8 Umlaute throughout. Date: 2026-05-17.
- [Phase 08 P04] Migration 019 pushed live (vitrqkzxkiqvadqfzrcx, Frankfurt). Edge Function seed-plants deployed via Docker (Pitfall 1 fix — `--use-api` bundled ohne plants.json). Seed via SQL-Fallback (Option C) mit LEAST/GREATEST UUID-Canonicalization. Verified: 90 plants + 38 companions in Supabase. plantRepo 10 GREEN + usePlants 4 GREEN; shared suite 61 GREEN. Phase 8 COMPLETE — PLANT-DB-01..09 closed. Date: 2026-05-17.
- [Phase ?]: Pure DOY->KW engine (kalenderEngine.ts) in packages/shared — no date-fns, 6-line UTC arithmetic
- [Phase ?]: zoneOffset() guard: invalid/null/out-of-range klimazone -> return 0 (Zone-4-Baseline, T-10-01 mitigated)
- [Phase ?]: [Phase 10 P01] Wave-0 it.todo stub pattern for downstream Plans 02/03 — no production imports, pass immediately
- [Phase ?]: Phase 10 P02: useKalenderData loads via loadAcceptedElements (NOT editorStore); findBeeteForPlant reuses pointInPolygon; useAuthStore mock combines hook+getState via Object.assign pattern
- [Phase 10 P03]: FARBEN exported from GanttStreifen.tsx — single source of truth for Aktionstyp phase colors (#A78BFA/#34D399/#60A5FA/#FB923C), imported by KalenderWochenCard
- [Phase 10 P03]: Filter-Chip useEffect-Sync — lazy-initializer returns false on async hook load; useEffect corrects after first data load (per UI-SPEC default-ON rule when meinePflanzenslugs.size > 0)
- [Phase 10 P03]: klimazone??4 fallback in PflanzenKalenderZeile prevents NaN from propagating to GanttStreifen; Zone-4-Baseline matches zoneOffset() Security Guard
- [Phase ?]: Phase 10 P04: t() helper extended with vars param; Fruchtfolge check falls back to all beds when plant not yet placed
- [Phase ?]: WR-03: Direkte UTC-Arithmetik statt DOY-Umweg in getAktuelleKw eliminiert DST-Drift
- [Phase ?]: WR-04 Engine: Kantenpinning (s<=7 startKw=1; e>=359 endKw=53) normalisiert ISO-Wrap in addWindow-Closure
- [Phase ?]: WR-04 Komponente: Separates Testmodul GanttStreifen.guard.test.tsx mit Modul-Level-Mock fuer jest.mock()-Hoisting-Kompatibilitaet
- [Phase ?]: Phase 10 P06: beetToPolygon center fix + findPflanzenInBeet exportiert
- [Phase ?]: CR-01: Hook-Guard nach handleAddToPlan; WR-02: findPflanzenInBeet beet-scoped Fruchtfolge
- [Phase 10 P08]: WR-06 In-Bed-Placement: addPlantToPlan platziert Pflanze am Beet-Center + parentBedId (D-03 Fast-Path) statt via nextFreeBedSlot neben den Beeten — findBeeteForPlant findet die Pflanze jetzt
- [Phase 10 P08]: WR-07 cancelled-Flag: Lade-Effekt nach index.tsx-Muster; bei activeGardenId=null: setElements([]) + setDimensions(null) statt nur setLoading(false) — kein stale Cross-Garden-State
- [Phase 10 P08]: IN-04 expliziter mode-Guard: if (mode !== 'account') throw new Error('account_erforderlich') VOR writePlanElement — Defense-in-depth mit assertAccount als zweite Linie
- [Phase ?]: [Phase 10 P09]: WR-05 useKalenderData({ nurMeinePflanzen }) mit Chip-State

### Roadmap Evolution

- Phase 6.5 inserted after Phase 6 (2026-05-12): Draft-Sichtung + Promotion-Flow Draft → `plan_elements` (URGENT). Trigger: Debug-Session `import-uebernehmen-noop` — Phase 6 endete mit Drafts gespeichert, aber kein Pfad zur Anzeige im Plan; Home-Screen zeigt "Noch kein Gartenplan" obwohl Import erfolgreich. Phase 7's `depends_on` sollte überprüft werden (jetzt logisch Phase 6.5 statt Phase 6).
- Phase 09.1 inserted after Phase 9: Editor-Element-Bearbeitung: Resize/Rotate/Properties/Z-Order (URGENT)

### Pending Todos

3 offen (Notizen aus Phase-10-UAT, 2026-06-11):

- [Selektiertes Element per Pfeiltasten verschieben](todos/pending/2026-06-11-element-per-pfeiltasten-verschieben.md)
- [Beet per Klick-Ziehen-Loslassen aufziehen](todos/pending/2026-06-11-beet-per-drag-aufziehen.md)
- [Automatisches Speichern bei Beet-Veränderungen](todos/pending/2026-06-11-autosave-bei-beetaenderungen.md)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-q01 | Fix CI: add react-native-web to app deps | 2026-04-18 | 12c988d | [260418-q01-fix-react-native-web-ci](.planning/quick/260418-q01-fix-react-native-web-ci/) |
| 260421-v43 | Roadmap-Pivot: shared-garden MVP, defer vereinsregeln+photorealism to post-MVP | 2026-04-21 | (pending) | [260421-v43-roadmap-pivot](.planning/quick/260421-v43-roadmap-pivot/) |
| 260508-m07 | M07 Pivot: Manual Planning + Claude.ai Bridge — roadmap overhaul | 2026-05-08 | (pending) | - |
| 260510-r5p | Phase-06 Import-Bug Triple Fix: file-picker + sync-cases + import-items updated_at | 2026-05-11 | a3321e1 | [260510-r5p-phase-06-import-bug-triple-fix-file-pick](.planning/quick/260510-r5p-phase-06-import-bug-triple-fix-file-pick/) |
| 260610-jtf | Forensik-Sweep: CI-Fixes (supabase.ts, auth-Mock, rotated-resize, storage-Proxy) + Repo-Hygiene + Planning-Konsistenz | 2026-06-10 | dab65a9 | [260610-jtf-forensik-sweep-ci-fixes-repo-hygiene-pla](.planning/quick/260610-jtf-forensik-sweep-ci-fixes-repo-hygiene-pla/) |
| 260611-jrl | Home-Header: Profil-Icon ergänzt — Profil/Einstellungen wieder erreichbar (UAT-Test-5-Blocker) | 2026-06-11 | da5f42e | [260611-jrl-home-header-profil-icon-erg-nzen-navigat](.planning/quick/260611-jrl-home-header-profil-icon-erg-nzen-navigat/) |
| 260611-jzl | Editor-Bug: Rotations-Sprung beim ersten Drehen gefixt — Start-Offset in beiden RotationHandles | 2026-06-11 | 98a75d0 | [260611-jzl-editor-bug-erste-rotation-springt-um-90-](.planning/quick/260611-jzl-editor-bug-erste-rotation-springt-um-90-/) |
| 260611-kpl | Web-Editor: Text-Selektion beim Rotieren/Resizen/Verschieben unterbunden (preventDefault + userSelect:none) | 2026-06-11 | 8f5d230 | [260611-kpl-web-editor-text-selektion-beim-rotieren-](.planning/quick/260611-kpl-web-editor-text-selektion-beim-rotieren-/) |
| 260611-l5y | Persistenz-Bug gefixt: Gesture-End-Flush im editorStore — Move/Resize/Rotate erreichen jetzt den Outbox-Pfad | 2026-06-11 | 42fa000 | [260611-l5y-persistenz-bug-element-positionen-im-bee](.planning/quick/260611-l5y-persistenz-bug-element-positionen-im-bee/) |

### Blockers/Concerns

- Open question: NativeWind v4 + Reanimated v3 compatibility on SDK 55 unconfirmed.
- Open question: expo-sqlite WASM + COOP/COEP headers on EAS Hosting.
- Open question: @supabase/supabase-js >= 2.49.5 stable release.
- Open question: pnpm + EAS Build compatibility (eas-cli issue #3247).
- ~~Risk: Claude Vision structural extraction quality for German allotment plots.~~ — **RESOLVED by M07 Pivot (no in-app AI)**
- ~~Open question: API-Key-Strategie für Claude Vision / Gemini / PDF-Extraktion.~~ — **RESOLVED by M07 Pivot (zero API keys needed)**
- ~~Phase 03 uploadPending() wiring gap.~~ — **RESOLVED: SyncTriggers.ts confirmed wired (reconnect + foreground syncAll)**
- ~~DEFERRED-1: supabase.ts first-line CLI stdout garbage.~~ — **RESOLVED by quick-260610-jtf (2026-06-10)**
- **NEW**: Schema drift risk between Claude.ai project prompt and app's `spatenstich-import.v1` schema. Mitigated by "Copy current schema" button in import error screen.
- ~~Pre-existing red tests in hooks project (migrateLocalToAccount.rowtables Test 1, useSyncStatus Tests 5+7).~~ — **RESOLVED by quick-260610-jtf Nachtrag: storage-Proxy set-Trap (jest.spyOn schlug am get-only-Proxy still fehl) + Test-Angleichung an reale EntityName-Liste (photo_queue war nie Row-Sync-Entity)**

## Session Continuity

Last session: 2026-06-11T09:35:58.792Z
Stopped at: Phase 10 Plan 09 abgeschlossen — WR-05 Filter-Chip geschlossen, Phase 10 vollstaendig
Resume file: None
Next: /gsd-verify-work 10 für manuelle UAT-Verifikation (CAL-01..CAL-06 auf Gerät), dann nächste Phase
