# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Saison 2026 Ready

**Shipped:** 2026-09-09 (Code-Stand 2026-06-16; formaler Abschluss beim v2-Pivot)
**Phases:** 4 (8, 9, 9.1, 10) | **Plans:** 23 | **Sessions:** ~15 (Mai–Juni 2026, dazu 12 Quick-Tasks)

### What Was Built
- Pflanzen-Datenbank: 90 Pflanzen, 38 Companion-Paare, lizenzhygienisch (drei Wälle gegen Gartenplaner-Daten), Migration 019 + Edge Function `seed-plants`
- Companion-Hinweis: Konflikt/Companion-Toast beim Pflanzen-Setzen in beiden Editoren, persistentes Konflikt-Dreieck
- Editor-Element-Bearbeitung: Resize-/Rotations-Handles, Properties-Modal, Z-Order — auf Web funktionsfähig, auf Skia strukturell defekt (siehe Lessons)
- Aussaatkalender v1: DOY→KW-Engine, Klimazonen-Offset, Wochen-View, 12-Monats-Gantt, Fruchtfolge-Warnung, „Zu Plan hinzufügen"; UAT 8/8 im Desktop-Browser

### What Worked
- Wave-0-Test-Scaffolds (`it.todo`-Pins) vor der Implementierung: Phasen 8–10 kamen mit vollständiger Testabdeckung an; 777 Tests grün am Ende
- Reine Funktionen ohne Framework-Abhängigkeit (kalenderEngine, zOrder, rotationSnap) waren schnell zu testen und blieben stabil
- Gap-Closure-Wellen nach VERIFICATION/REVIEW (Phase 10: 3 Blocker + 7 Warnings in 5 kleinen Plänen) haben Qualität nachgezogen, ohne die Phase zu sprengen
- Quick-Tasks mit RED→GREEN-Commits für UAT-Befunde (Rotation-Sprung, Persistenz, Pfeiltasten, Multi-Select) — kleine, nachvollziehbare Fixes

### What Was Inefficient
- **Nie auf einem Handy getestet.** Alle nativen HUMAN-VERIFY-Checklisten (Phase 3, 7, 9.1) blieben offen; der Skia-Editor wurde drei Phasen lang weitergebaut, obwohl er auf Gerät weder platzieren noch verschieben konnte. Mocks (`GestureDetector` → children, rnsvg-`onClick` durchgereicht) haben Tests grün gehalten, die die Realität nicht abbildeten
- Zwei Editoren parallel: jede Funktion doppelt (Resize-Mathe, Rotation, Toolbar, Provenance-Parsing) — Phase 9.1 kostete dadurch etwa das Doppelte
- Sync-Kern wurde nie gegen echte zwei Geräte geprüft; die LWW-Semantik war seit Migration 013 falsch (Server-Trigger überschreibt Client-Stempel) und blieb bis zum Audit am 2026-09-08 unentdeckt
- Dokumentations-Drift: `CLAUDE.md` behauptete SDK 55/RN 0.83, installiert war ein SDK-52/53-Mix; `.planning` beschrieb den Editor als „iPhone first-class"
- 13 Lint-Fehler in Test-Dateien ließen die PR-CI monatelang rot, ohne dass es jemand als Blocker behandelte

### Patterns Established
- TDD-Commit-Paare (`test(…): RED` → `feat(…): GREEN`) als Repo-Konvention
- 3-Gate-Protokoll für Supabase-Pushes (`migration list` → `db push --dry-run` → `db push`)
- Jest-Projekte pro Schicht (node/stores/hooks/editor/components) mit eigenen Setups; `pnpm --filter app exec jest --testPathPattern=…` statt `--` (pnpm verschluckt es)
- Klick-Logik im Web nie auf `react-native-svg`-Elemente legen (`onClick` wird gestrippt), sondern auf den wrappenden `<div>`

### Key Lessons
1. Ein Feature ist erst fertig, wenn es auf dem Zielgerät lief. Human-Verify-Checklisten dürfen keine Phase abschließen lassen, solange sie `pending` sind (v2.0: Phase 25 ist ein eigener Gate).
2. Mocks müssen das reale Verhalten der Bibliothek abbilden (rnsvg-onClick-Stripping, GestureDetector braucht native View); sonst beweisen grüne Tests nichts.
3. Sync braucht einen Test gegen echtes Postgres mit zwei Clients, nicht nur gemockte Worker-Tests. v2.0 Phase 21 führt pgTAP-Tests für die Trigger-Semantik ein.
4. Eine Render-/Interaktions-Schicht pro Plattform-Kombination — nicht zwei. Pointer Events + ein reiner Controller decken Maus und Touch ab.
5. Erst die Distribution klären (wie kommt die App aufs Gerät, was kostet das), dann Features bauen. Der v2-Pivot wäre im Mai billiger gewesen als im September.

### Cost Observations
- Model mix: nicht erfasst (GSD-Profil „balanced"); Ausführung überwiegend Opus-Klasse mit Sonnet-Subagenten
- Sessions: ~15 Phasen-Sessions + ~12 Quick-Task-Sessions + 5 Audit-Agenten beim v2-Pivot (≈1,4 M Tokens für die Audits)
- Notable: Die fünf parallelen Audit-Agenten am 2026-09-08 fanden in einer Sitzung mehr strukturelle Defekte als drei Monate Phasen-Verifikation — Read-only-Audits mit klaren Scopes lohnen sich vor jedem Milestone

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~40 | 10 (inkl. 2.5, 6.5, 7.5a; Phase 4 superseded) | Pivots: Shared Garden (04-21), Zero-AI + Claude.ai-Bridge (05-08), Desktop primär (05-17); GSD-Workflow etabliert |
| v1.1 | ~27 | 4 (inkl. 9.1) | Wave-0-Test-Scaffolds, Gap-Closure-Wellen, Quick-Tasks für UAT-Befunde; Milestone nie formal geschlossen bis zum v2-Pivot |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~640 (Stand 2026-06-10) | n/a | StorageAdapter, Outbox, Import-Validator, kalenderEngine-Vorläufer |
| v1.1 | 864 (777 App + 87 Shared) | n/a | kalenderEngine, zOrder, rotationSnap, hitTest, plant-db-Validator |

### Top Lessons (Verified Across Milestones)

1. Verifikation ohne Zielgerät ist keine Verifikation — beide Milestones haben native Checks verschoben, beide haben dadurch strukturelle Defekte (Skia-Editor, Sync-Semantik) übersehen.
2. Reine, framework-freie Module (Engine, Geometrie, Validator) sind die stabilsten und billigsten Teile des Codes; UI-Schichten mit Plattform-Mocks die teuersten.
