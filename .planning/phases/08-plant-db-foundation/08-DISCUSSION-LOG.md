# Phase 8: Plant-DB Foundation - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-05-17
**Mode:** `--auto` (Claude selected recommended defaults; no interactive Q&A)
**Areas discussed:** Datenmodell, Daten-Inhalt, Code-Architektur, Migration+Seed, Daten-Qualität

---

## Datenmodell

| Frage | Optionen | Gewählt |
|---|---|---|
| Quelle of Truth | Supabase only / JSON-Bundle only / **Beide (Supabase + JSON-Fallback)** | ✓ Beide |
| `plants` Felder | minimal vs. rich | ✓ rich (Familie, Phänologie, Klimazone, nitrogen_fixing, perennial) |
| `plant_companions` Storage | symmetric (2 rows) / asymmetric canonical (1 row, kleinere UUID first) | ✓ kanonisch — speichert 1×, Query symmetrisch |
| Beziehungstypen | binary (companion/incompatible) / ternary (+neutral) | ✓ ternary — neutral als explizite Konfliktauflösung |
| RLS | per-Garten / global read-only | ✓ global read-only (`auth.uid() IS NOT NULL`) |

## Daten-Inhalt

| Frage | Optionen | Gewählt |
|---|---|---|
| Anzahl Pflanzen | 50 / 80 / **100-120** / 200+ | ✓ 100-120, fokussiert deutsche Kleingärten Klimazone 7a-8a |
| Quellen-Mix | nur eine / mehrere mit Cross-Reference | ✓ mehrere: Gardeneus (Schema), garden-planner (Companions), Gartenplaner (DE-Namen als Fakten), eigene Recherche |
| License-Strategie für Gartenplaner | direkte CSV-Kopie / Fakten-Re-Recherche | ✓ Fakten-Re-Recherche (Gartenplaner license unclear; Pflanzennamen + Mischkultur sind Fakten) |
| Konflikt-Resolution | aggressive (eine Seite wählen) / konservativ (neutral) | ✓ konservativ (neutral mit notes) |

## Code-Architektur

| Frage | Optionen | Gewählt |
|---|---|---|
| Type-Definitionen | inline / shared package | ✓ shared package (`packages/shared/src/types/plants.ts`) |
| Repo-Location | app/lib/ | ✓ `app/src/lib/plantRepo.ts` |
| Hook-Pattern | Zustand / TanStack Query | ✓ TanStack Query (`usePlants()`) — pattern bereits etabliert |
| JSON-Bundle-Location | shared/ / app/assets/ | ✓ `packages/shared/src/data/plants.json` (typed, validated via ajv) |
| Cache-Strategie | nur Supabase / nur Bundle / Bundle + Supabase merge | ✓ Bundle als Cold-Start-Sync, Supabase als async background |

## Migration + Seed

| Frage | Optionen | Gewählt |
|---|---|---|
| Migration 019 Inhalt | Schema only / Schema + Seed | ✓ Schema only — Seed separat |
| Seed-Mechanismus | Embedded JSON in SQL / Edge Function / Runtime-Seed | ✓ Edge Function `seed-plants` (idempotent, upsert by slug) |
| Push-Gate | manuell / autonom mit Checkpoint | ✓ autonom mit Checkpoint (Pattern Phase 6.5 P05 + Phase 7 P06) |

## Daten-Qualität

| Frage | Optionen | Gewählt |
|---|---|---|
| Test-Anchors | keine / wenige / viele | ✓ viele (Tomate=Solanaceae, Bohne=nitrogenFixing=true, Apfel=perennial=true, kanonische Companion-Ordnung) |
| Schema-Validation | manuell / ajv | ✓ ajv build-time + runtime |
| Pflege-Workflow | direkte DB-Edits / nur via PR + Seed | ✓ nur via PR (JSON edit) + Re-Seed |

## Claude's Discretion

- Exakte Pflanzenliste-Reihenfolge im JSON (alphabetisch für Diff-Lesbarkeit)
- Genaue DOY-Werte pro Pflanze (Mitteldeutschland-Standardwerte)
- icon_emoji-Auswahl pro Pflanze
- Wave-Aufteilung (in plan-phase entschieden)

## Deferred Ideas (nicht in Phase 8)

- Pflanzen-Sorten/Varietäten → Phase 13
- Klimazone-spezifische Aussaat-Anpassung → Phase 10
- Multilingual → spätere v2.x
- Pflanzen-Bilder → Phase 14
- Pl@ntNet → nie (M07-Pivot)
- User-Custom-Pflanzen → Phase 17 oder später
- Companion-Stärke (schwach/stark) → spätere Iteration
