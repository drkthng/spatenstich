---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Handy-Ready
current_phase: 20
current_phase_name: Fundament, Aufräumen, PWA-Deploy
status: Ready to plan
stopped_at: context exhaustion at 75% (2026-09-09)
last_updated: "2026-09-09T10:53:52.550Z"
last_activity: 2026-09-09
last_activity_desc: Milestone v1.1 abgeschlossen und archiviert (`milestones/v1.1-*`), v1.0-Phasenverzeichnisse nach `milestones/v1.0-phases/`, ROADMAP/PROJECT/REQUIREMENTS auf v2.0 umgestellt
state_head: d2755cad0b23397ab2e4d92319c8fc306e3930b5
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-09)
See: .planning/MASTERPLAN-v2.md (Quelle der Wahrheit für v2.0/v2.1 — Diagnose, Entscheidungen D-01..D-15, Arbeitspakete, UAT, Runbook)
See: docs/specs/M07-claude-ai-bridge.md (Import-Bridge)

**Core value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai (zero In-App AI seit Pivot M07 2026-05-08)
**Current focus:** Milestone v2.0 „Handy-Ready" — PWA auf beiden Android-Handys, Sync-Fix, ein Touch+Maus-Editor, Onboarding, Design-System

## Current Position

Phase: 20 (Fundament, Aufräumen, PWA-Deploy) — READY TO EXECUTE
Plan: —
Status: Ready to execute — 4 Pläne (Waves 1–4) vom Plan-Checker verifiziert (0 Blocker); Ausführung in frischer Session mit `/gsd-execute-phase 20`
Last activity: 2026-09-09 — Milestone v1.1 abgeschlossen und archiviert (`milestones/v1.1-*`), v1.0-Phasenverzeichnisse nach `milestones/v1.0-phases/`, ROADMAP/PROJECT/REQUIREMENTS auf v2.0 umgestellt

Progress: [░░░░░░░░░░░░░░░░░░░░] 0/27 plans (0%) — v2.0 Phasen 20–25

## Performance Metrics

**Velocity (v1.1):** 23 Pläne in ~4 Wochen Teilzeit (2026-05-17 → 2026-06-16), 202 Commits; Quick-Tasks im Schnitt 1 Session.

**By Phase (v2.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 20 | 0/4 | - | - |
| 21 | 0/6 | - | - |
| 22 | 0/5 | - | - |
| 23 | 0/5 | - | - |
| 24 | 0/6 | - | - |
| 25 | 0/1 | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (D-01..D-15 mit Begründung in MASTERPLAN-v2.md Kap. 2).
Für v2.0 verbindlich:

- **[2026-09-09 D-01/D-02]**: PWA auf Cloudflare Pages + Supabase Free; kein nativer Build in v2.0; Ziel-Browser Chrome auf Android (D-15).
- **[2026-09-09 D-03]**: Ein `PlanEditor` (Pointer Events, SVG); Skia und Web-Sonderkomponenten werden in Phase 22 gelöscht.
- **[2026-09-09 D-04/D-05]**: Lokal-Modus und Vereinsregeln bleiben im Code (User-Entscheidung); Vereinsregeln-Reparatur in WP 21.6 hinter `FEATURES.vereinsregeln`.
- **[2026-09-09 D-07]**: Client-`updated_at` ist LWW-Wahrheit, `server_updated_at` ist Pull-Cursor; Realtime + Polling.
- **[2026-09-09 D-12]**: Passwort-Reset per 6-stelligem Code; E-Mail-Bestätigung wird im Dashboard deaktiviert (manueller Schritt M4).
- Repo-Konventionen bleiben: TDD RED→GREEN-Commits, 3-Gate-Supabase-Push, UTF-8-Umlaute in `de.json`, Draft-PRs, ein Branch pro Phase (`gsd/phase-NN-slug`).

### Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| debug_sessions | import-uebernehmen-noop | resolved (Datei-Status unknown) | 2026-09-09 | v1.1 |
| quick_tasks | 260610-jtf-forensik-sweep-ci-fixes-repo-hygiene-pla | unknown (erledigt lt. Tabelle) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-jrl-home-header-profil-icon-erg-nzen-navigat | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-jzl-editor-bug-erste-rotation-springt-um-90- | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-kpl-web-editor-text-selektion-beim-rotieren- | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-l5y-persistenz-bug-element-positionen-im-bee | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-ln5-feature-selektiertes-element-per-pfeilta | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-usp-beet-per-klick-ziehen-loslassen-aufziehe | missing (Duplikat von vk4) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-vk4-beet-per-drag-aufziehen-au-erdem-wenn-el | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260612-9jb-automatisches-speichern-bei-beet-ver-nde | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260615-utj-mehrfach-selektion-im-web-plan-editor-me | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260616-iuu-logout-option-implementieren-es-gibt-akt | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260616-mh4-manuellen-garten-anlegen-weg-ergaenzen-w | unknown (erledigt) | 2026-09-09 | v1.1 |
| uat_gaps | 03/03-HUMAN-UAT.md | partial — Cross-Device-UAT übersprungen → v2.0 Phase 21/25 | 2026-09-09 | v1.1 |
| uat_gaps | 04/04-UAT.md | testing — Phase superseded (M07) | 2026-09-09 | v1.1 |
| uat_gaps | 09/09-UAT.md | testing — nativ nie geprüft → v2.0 Phase 25 | 2026-09-09 | v1.1 |
| uat_gaps | 10/10-UAT.md | passed (Status-Feld nur formal offen) | 2026-09-09 | v1.1 |
| verification_gaps | 03/03-VERIFICATION.md | human_needed → v2.0 Phase 21/25 | 2026-09-09 | v1.1 |
| verification_gaps | 05/05-VERIFICATION.md | gaps_found — Rest-Legacy → WP 20.2 | 2026-09-09 | v1.1 |
| verification_gaps | 06.5/06.5-VERIFICATION.md | gaps_found — Drafts-Tray/Editor → Phase 22 | 2026-09-09 | v1.1 |
| verification_gaps | 07/07-VERIFICATION.md | human_needed — Skia-Editor wird ersetzt (D-03) | 2026-09-09 | v1.1 |
| verification_gaps | 09/09-VERIFICATION.md | human_needed → Phase 25 | 2026-09-09 | v1.1 |
| verification_gaps | 09.1/09.1-VERIFICATION.md | human_needed → Phase 22/25 | 2026-09-09 | v1.1 |
| deferred_items | 07/deferred-items.md: DEFERRED-P7-1 (drei Alt-Testsuiten) | acknowledged — seit quick-260610-jtf grün | 2026-09-09 | v1.1 |

### Pending Todos

Keine. (`todos/freier-foto-upload.md` gestrichen — Foto-Upload ist seit M07 out of scope.)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|

*v1.1-Quick-Tasks archiviert in `milestones/v1.1-quick/`.*

### Blockers/Concerns

- **Manuelle Schritte (nur Dirk), Details MASTERPLAN-v2.md Kap. 5:** M1 Cloudflare-Konto + Token, M2 GitHub-Variablen/Secrets (Supabase-URL, Anon-Key, Sentry-DSN EU), M3 Supabase Site-URL — vor WP 20.4; M5 DB-Backup — vor Migration 021 (Phase 21); M4 E-Mail-Bestätigung aus + Reset-Template mit Code — vor WP 23.4; M7 Impressum-Text — vor WP 24.5.
- Migration 020 (Cleanup) ist destruktiv (Buckets nur wenn leer, `profiles.plz/klimazone/archetype` droppen) — vorher Backup nach Kap. 7.4.
- SDK-Mix (Expo 53 / RN 0.76.7 / React 18.3.1 / zwei SDK-55-Module) bleibt bis Phase 29; Web-Export funktioniert damit.
- Sentry-DSN in `app/.env` zeigt auf US-Ingest, `.env.example` auf EU — bei M2 EU-DSN verwenden.

## Session Continuity

Last session: 2026-09-09T10:53:52.504Z
Stopped at: context exhaustion at 75% (2026-09-09)
Resume file: None
Next: `/gsd-execute-phase 20` in frischer Session (Branch `gsd/phase-20-fundament-aufr-umen-pwa-deploy` wird von GSD angelegt). Drei Human-Gates darin: Paket-Prüfung sharp/workbox-cli (20-03 T1), Backup M5 vor `supabase db push` (20-02 T6), M1–M3 vor dem Live-Deploy (20-04 T4)

## Operator Next Steps

1. `/gsd-execute-phase 20` (Pläne 20-01…20-04 liegen vor, Waves 1→4 sequenziell)
2. Parallel (Dirk): M2 (GitHub-Variablen) vor dem ersten CI-Lauf, M5 (Backup) vor 20-02 Task 6, M1 + M3 (Cloudflare, Supabase Site-URL) vor 20-04 Task 5
3. Draft-PR, Merge nach master → erster Cloudflare-Deploy; danach `/gsd-plan-phase 21`
