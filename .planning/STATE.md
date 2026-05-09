---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Post-MVP
status: Phase 6 planned — ready to execute
stopped_at: Phase 6 planning complete — 4 plans in 4 waves
last_updated: "2026-05-09T09:18:02.763Z"
last_activity: 2026-05-09
progress:
  total_phases: 10
  completed_phases: 6
  total_plans: 29
  completed_plans: 25
  percent: 86
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-08)
See: docs/specs/M07-claude-ai-bridge.md (M07 Pivot Spec)

**Core value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai (zero In-App AI seit Pivot M07 2026-05-08)
**Current focus:** Phase 6 — Import-Flow + Companion-Prompt

## Current Position

Phase: 6 (Import-Flow + Companion-Prompt) — CONTEXT GATHERED
Plan: 0 of TBD
Vorheriger Status: Phase 5 complete — AI-Removal + Import-Schema abgeschlossen
Plans: 14/18 completed (Phase 01: 3/3, Phase 02: 4/4, Phase 02.5: 4/4, Phase 03: 6/7, Phase 04: ~~4/4 superseded~~)
Last activity: 2026-05-09

Progress: [█████░░░░░] 56% (14/18 Plans — Phase 4 plans excluded from count as superseded)

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

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-q01 | Fix CI: add react-native-web to app deps | 2026-04-18 | 12c988d | [260418-q01-fix-react-native-web-ci](.planning/quick/260418-q01-fix-react-native-web-ci/) |
| 260421-v43 | Roadmap-Pivot: shared-garden MVP, defer vereinsregeln+photorealism to post-MVP | 2026-04-21 | (pending) | [260421-v43-roadmap-pivot](.planning/quick/260421-v43-roadmap-pivot/) |
| 260508-m07 | M07 Pivot: Manual Planning + Claude.ai Bridge — roadmap overhaul | 2026-05-08 | (pending) | - |

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

Last session: 2026-05-09T09:18:02.750Z
Stopped at: context exhaustion at 92% (2026-05-09)
Resume file: None
