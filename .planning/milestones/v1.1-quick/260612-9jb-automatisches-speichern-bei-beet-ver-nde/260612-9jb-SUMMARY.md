---
phase: quick-260612-9jb
plan: "01"
subsystem: editor
tags: [autosave, leave-flush, debounce, beforeunload, persistence]
dependency_graph:
  requires: [saveDebounce.ts, editorStore, authStore, writePlanElement, writeWithOutbox]
  provides: [hasPendingSaves, flushOnLeave, leave-flush-on-unmount, beforeunload-web-flush]
  affects: [plan/index.tsx]
tech_stack:
  added: []
  patterns: [leave-flush-pattern, beforeunload-guard, store-singleton-reads-at-flush-time]
key_files:
  created: []
  modified:
    - app/src/lib/editor/saveDebounce.ts
    - app/src/lib/editor/__tests__/editorSaveDebounce.test.ts
    - app/app/(app)/plan/index.tsx

decisions:

  - "hasPendingSaves/flushOnLeave im saveDebounce-Modul — account-guard an einer Stelle, kein Duplikat in Aufrufern"
  - "Effekte in PlanScreen-Top-Level (vor conditional returns) statt in WebEditorShell — vermeidet doppelte beforeunload-Listener und Rules-of-Hooks-Verletzungen"
  - "mode + byId zum Flush-Zeitpunkt aus Store-Singletons lesen — verhindert stale-mode nach Garten-/Auth-Wechsel"

metrics:
  duration: "~15min"
  completed: "2026-06-12"
  tasks: 2
  files: 3
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Quick Task 260612-9jb: Automatisches Speichern bei Beet-Veränderungen — SUMMARY

**One-liner:** Leave-Flush schließt 5s-Datenverlust-Fenster: hasPendingSaves()+flushOnLeave() in saveDebounce plus Unmount/beforeunload-Hooks in PlanScreen, ausschließlich über den bestehenden Outbox-LWW-Pfad.

## Objective

Schließt die letzte Autosave-Lücke: verlässt der Nutzer den Editor (Zurück-Button, Navigation, Tab-Reload) innerhalb des 5-Sekunden-Debounce-Fensters nach einer Beet-Änderung, werden die ausstehenden Timer sofort geflusht — keine Änderung geht verloren.

## Tasks Completed

### Task 1 — hasPendingSaves() + flushOnLeave() im saveDebounce-Modul (TDD)

**RED commit:** `767bf51` — 4 neue Failing-Tests (hasPendingSaves true→false, account-flush, local-no-write, no-op)

**GREEN commit:** `c337ab4` — Implementierung in `saveDebounce.ts`

- `hasPendingSaves(): boolean` — gibt `timers.size > 0` zurück; synchroner Guard für beforeunload-Pfad
- `flushOnLeave(mode, byId): Promise<void>` — bei `mode !== 'account'` sofortiger no-op; sonst Delegation an `flushAllPendingSaves`
- Account-Guard lebt an einer Stelle (gleiche Invariante wie editorStore-Subscription Zeile 225)
- Kein neuer Persistenzmechanismus — ausschließlich `writePlanElement` → `writeWithOutbox` LWW

### Task 2 — Leave-Flush im PlanScreen

**Commit:** `dad1296`

- `useEffect(cleanup)` mit leerem Deps-Array ruft `flushOnLeave` bei Unmount/Back auf (alle Plattformen)
- Zweiter `useEffect` registriert `beforeunload`-Listener nur auf Web (`Platform.OS === 'web'`)
- `hasPendingSaves()`-Gate im beforeunload-Handler — kein unnötiger Flush wenn nichts aussteht
- Kein `e.preventDefault()/returnValue` — keine "Seite verlassen?"-Browserwarnung
- Beide Effekte vor allen `if (loading) return` / `if (!dimensions) return` Zweigen — Rules-of-Hooks eingehalten
- `mode` und `byId` werden zum Flush-Zeitpunkt aus `useAuthStore.getState()` / `useEditorStore.getState()` gelesen — kein stale capture

## Test Results

```
pnpm --filter app exec jest --testPathPattern=editorSaveDebounce
Tests: 13 passed, 13 total
```

Alle bestehenden 9 Tests + 4 neue Tests GREEN.

## Verification

- `pnpm --filter app exec jest --testPathPattern=editorSaveDebounce` — 13/13 PASS
- `pnpm --filter app exec tsc --noEmit -p tsconfig.json` — 0 Errors

## Deviations from Plan

**WebEditorShell-Effekte weggelassen (plankonform):**

Plan sagte: "lege sie in den `WebEditorShell` (web) und in den nativen Render-Zweig ein resp. hebe sie auf PlanScreen-Top-Level vor die conditional returns — **wähle die Variante, die die Rules-of-Hooks nicht verletzt**."

Gewählt: PlanScreen-Top-Level-Variante. Effekte in WebEditorShell hätten doppelte beforeunload-Listener erzeugt (PlanScreen + WebEditorShell beide registrieren), da WebEditorShell ein Kind von PlanScreen ist. Die PlanScreen-Top-Level-Variante deckt alle Render-Pfade (web + native, loading + loaded) durch Positionierung VOR den conditional returns ab. Keine funktionale Abweichung — identisches Verhalten, sauberere Implementierung.

## Known Stubs

Keine. Alle implementierten Pfade sind vollständig verdrahtet.

## Threat Surface Scan

Keine neue Netzwerk-Endpunkte, Auth-Pfade oder Schema-Änderungen. Ausschließlich Nutzung bestehender Outbox-LWW-Infrastruktur.

## Self-Check: PASSED

- app/src/lib/editor/saveDebounce.ts — FOUND
- app/app/(app)/plan/index.tsx — FOUND
- Commit 767bf51 (RED tests) — FOUND
- Commit c337ab4 (GREEN saveDebounce) — FOUND
- Commit dad1296 (plan/index.tsx leave-flush) — FOUND
