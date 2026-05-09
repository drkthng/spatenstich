---
phase: 06-import-flow-companion-prompt-m07-3-m07-4
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, import, claude-ai, companion-prompt]

# Dependency graph
requires:
  - phase: 05-ai-removal-import-schema
    provides: spatenstich-import.v1 JSON schema + examples
  - phase: 04-garden-plan-editor
    provides: is_garden_member RLS function + migration pattern (014)

provides:
  - prompts/garden-project-system-prompt.md — German companion prompt for Dirk's Claude.ai project
  - supabase/migrations/20260509000016_import_drafts.sql — 5 import draft tables with RLS
  - EntityName union extended with 5 new entity names
  - ImportRow, ImportItemRow, BedDraftRow, PlantDraftRow, ObservationDraftRow interfaces
  - ImportPayload + sub-types matching spatenstich-import.v1 schema

affects:
  - 06-02 (import validator + importStore logic layer)
  - 06-03 (ImportFromClaudeAiScreen UI)
  - 06-04 (share intent handler + offline queue)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Write-once tables (import_items) omit LWW triggers — only zz_set_updated_at on mutable drafts"
    - "Companion prompt ends every analysis turn with fenced ```json spatenstich-import.v1 block"

key-files:
  created:
    - prompts/garden-project-system-prompt.md
    - supabase/migrations/20260509000016_import_drafts.sql
  modified:
    - packages/shared/src/types/entities.ts

key-decisions:
  - "import_items is write-once: no LWW triggers (aa_lww_guard, mm_set_updated_by) per D-19"
  - "Companion prompt targets Opus 4.7 and instructs Claude to never fabricate low-confidence data"
  - "sunExposure enum uses 'half' (not 'halfShade') to match spatenstich-import.v1 schema"
  - "ImportItemRow does not extend RowBase — write-once semantics, no updatedAt field"

patterns-established:
  - "Migration 016 pattern: NO aa_/mm_ trigger trio for write-once tables; zz_ only for mutable drafts"
  - "Companion prompts live in prompts/ directory as plain Markdown"

requirements-completed: [IMPORT-03, IMPORT-08]

# Metrics
duration: 5min
completed: 2026-05-09
---

# Phase 6 Plan 01: Companion Prompt + Import Drafts Schema Summary

**German Claude.ai companion prompt (M07.3) + 5 Supabase import-draft tables (M07.4 foundation) with RLS + TypeScript row types and ImportPayload contract**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-09T09:21:50Z
- **Completed:** 2026-05-09T09:26:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `prompts/garden-project-system-prompt.md` (280 lines, German): covers BKleingG/Saechsische RKO regulations, Klimazone 7a plant-ID heuristics, spatenstich-import.v1 output discipline, re-emit instruction, and full setup guide for Dirk
- Created migration 016 with 5 tables (imports, import_items, bed_drafts, plant_drafts, observation_drafts), each with RLS `is_garden_member` policy; write-once import_items has no LWW triggers; DO $$ assertion block verifies all tables + policies
- Extended `packages/shared/src/types/entities.ts`: EntityName union +5, AnyRow union +4, plus ImportRow, ImportItemRow, BedDraftRow, PlantDraftRow, ObservationDraftRow, ImportPayload and sub-types

## Task Commits

1. **Task 1: Claude.ai Companion Prompt** - `02443ce` (feat)
2. **Task 2: Migration 016 + Shared Types** - `94cfa64` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `prompts/garden-project-system-prompt.md` — German system prompt for Spatenstich Garden Claude.ai project (M07.3)
- `supabase/migrations/20260509000016_import_drafts.sql` — 5 draft tables + RLS + indexes + DO $$ assertions
- `packages/shared/src/types/entities.ts` — EntityName union, row interfaces, ImportPayload types

## Decisions Made

- `import_items` is write-once (no `updated_at`, no LWW triggers) because it stores raw payload snapshots that should never be modified after creation
- Companion prompt explicitly instructs Claude to use `"half"` (not `"halfShade"`) for sun exposure to match the v1 schema enum
- `ImportItemRow` does not extend `RowBase` since it lacks `updatedAt`/`updatedByUserId` — its write-once nature requires a separate interface shape
- Re-emit instruction added in German ("letzten Payload nochmal") per D-04 risk mitigation for lost JSON files

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing `src/types/supabase.ts` in the shared package has a corrupted first line ("Initialising login role...") causing TypeScript errors unrelated to this plan. Confirmed `entities.ts` has zero TypeScript errors. The supabase.ts issue is out-of-scope for this plan and logged for deferred fix.

## Known Stubs

None — this plan creates schema/migration/types only, no UI or data-rendering components.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. All 5 tables enforce `is_garden_member(garden_id)` RLS per T-06-01 mitigation. Companion prompt contains no secrets (T-06-03 accepted).

## User Setup Required

None — no external service configuration required for this plan. The companion prompt itself must be pasted into Dirk's Claude.ai project manually (one-time setup, documented in the prompt file).

## Next Phase Readiness

- Migration 016 is ready for `supabase db push` to the Frankfurt Supabase project (vitrqkzxkiqvadqfzrcx)
- All downstream plans (06-02 importStore, 06-03 ImportFromClaudeAiScreen) can import `ImportPayload`, `BedDraftRow`, etc. from `@spatenstich/shared`
- Companion prompt ready for Dirk to paste into Claude.ai "Spatenstich Garden" project

---
*Phase: 06-import-flow-companion-prompt-m07-3-m07-4*
*Completed: 2026-05-09*
