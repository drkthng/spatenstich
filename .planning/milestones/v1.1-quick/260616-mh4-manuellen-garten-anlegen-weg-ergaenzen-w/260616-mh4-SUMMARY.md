---
phase: quick-260616-mh4
plan: 01
subsystem: plan-editor
tags: [ux, onboarding, garden-setup, i18n, tdd]
dependency_graph:
  requires: [gardenPlanRepo.saveDimensions, authStore]
  provides: [/(app)/plan/new, home-create-garden-button-empty, web-create-garden-cta, native-create-garden-cta]
  affects: [app/app/(app)/index.tsx, app/app/(app)/plan/index.tsx]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN, plz.tsx-Form-Muster, authStore-Guard, parseDim-Dezimalkomma]
key_files:
  created:
    - app/app/(app)/plan/new.tsx
    - app/src/components/__tests__/plan-new-screen.test.tsx
    - app/src/components/__tests__/create-garden-entrypoints.test.tsx
  modified:
    - packages/shared/src/i18n/de.json
    - app/app/(app)/index.tsx
    - app/app/(app)/plan/index.tsx

decisions:

  - "plan/new.tsx rectangle-only (MVP): l_shape/trapezoid/freehand deferred, als Kommentar im File dokumentiert"
  - "Lokal-Modus zeigt Hinweis + Settings-CTA statt Form — kein Crash, kein saveDimensions-Aufruf"
  - "Home-CTA nur im Account-Modus (mode==='account'), da Gärten account-only"

metrics:
  duration: "7 Minuten"
  completed: "2026-06-16"
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Phase quick-260616-mh4 Plan 01: Manueller "Garten anlegen"-Weg Summary

**One-liner:** Manueller Garten-Anlege-Weg via NewGardenScreen (Breite/Höhe → saveDimensions → Editor) mit 3 Einstiegspunkten und vollständigem TDD-Zyklus.

## Was wurde gebaut

### Task 1: Neuer "Garten anlegen"-Screen + i18n + Tests (RED → GREEN)

**`app/app/(app)/plan/new.tsx`** — Neuer Screen `/(app)/plan/new`:

- Form mit zwei Eingabefeldern (Breite m, Höhe m), Default-Werte 10/5
- `parseDim()`: deutsches Komma toleriert (`'5,5'` → `5.5`)
- Validierung: gültig wenn finite Zahl UND 0,5 ≤ x ≤ 100; Inline-Fehler nach erstem Submit (testID `garden-dims-error`)
- Account-Guard: bei `mode !== 'account'` → Hinweis-Text (testID `account-required-hint`) + Settings-CTA; kein `saveDimensions`-Aufruf
- Submit-Handler `onCreate`: `saveDimensions(mode, activeGardenId, { shape:'rectangle', widthM, heightM, extraDims:null })` → `router.replace('/(app)/plan')`
- Button testID `create-garden-submit`, disabled während `saving`

**`packages/shared/src/i18n/de.json`** — Neuer Block `plan.new.*`:

- title, intro, widthLabel, heightLabel, submit, error_invalid, account_required, account_required_cta
- Alle Strings mit echten UTF-8-Umlauten (ö, ü, ß); kein ASCII-Ersatz

### Task 2: Einstiegspunkte — Home-Empty-State + Editor-No-Dimensions-Fallback (RED → GREEN)

**`app/app/(app)/index.tsx`** — Empty-State-Branch:

- Neuer Button `home-create-garden-button-empty` nach dem Import-Button
- Nur bei `mode === 'account'` gerendert (Lokal-Modus: kein Anlege-Button)
- `onPress` → `router.push('/(app)/plan/new')`

**`app/app/(app)/plan/index.tsx`** — Beide No-Dimensions-Branches:

- Web-Branch: `Pressable` testID `web-create-garden-cta` unter dem bestehenden `web-empty-review-cta` (Import-CTA bleibt erhalten)
- Native-Branch: `Pressable` testID `native-create-garden-cta` unter dem bestehenden Hinweis-Text
- Beide `router.push('/(app)/plan/new')`

## Test-Ergebnisse

### Neue Tests

**`plan-new-screen.test.tsx`** — 4 Tests, alle grün:

1. Account + Default-Werte: `saveDimensions` mit korrekten Parametern aufgerufen + `router.replace('/(app)/plan')` nach Erfolg
2. Ungültige Eingabe (Breite 0): `saveDimensions` NICHT aufgerufen; `garden-dims-error` sichtbar
3. Lokal-Modus: `saveDimensions` NICHT aufgerufen; `account-required-hint` sichtbar
4. Navigation erst nach `saveDimensions`-Resolve (kontrolliertes Promise)

**`create-garden-entrypoints.test.tsx`** — 4 Tests, alle grün:

1. Home Empty-State (Account, `loadDimensions=null`): `home-create-garden-button-empty` → `/(app)/plan/new`
2. Home Empty-State (Lokal): `home-create-garden-button-empty` NICHT vorhanden
3. Editor Web ohne Dims: `web-create-garden-cta` → `/(app)/plan/new`; `web-empty-review-cta` weiterhin vorhanden (Regression-Schutz)
4. Editor Native ohne Dims: `native-create-garden-cta` → `/(app)/plan/new`

### Volle App-Test-Suite

**777 Tests, 100 Test-Suites — alle PASS. 0 Regressionen.**

(Zuvor: 769 Tests; +8 neue Tests)

## Commits

| Hash | Typ | Beschreibung |
|------|-----|-------------|
| 77316e4 | test (RED) | plan-new-screen.test.tsx — 4 failing tests |
| a6c0e31 | feat (GREEN) | plan/new.tsx + de.json plan.new.* |
| 791fafc | test (RED) | create-garden-entrypoints.test.tsx — 4 failing tests |
| f1e34ab | feat (GREEN) | index.tsx + plan/index.tsx Einstiegspunkte |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `saveDimensions` ist der echte Repo-Aufruf; keine Placeholder-Werte in der UI.

Deferred (als Kommentar in `plan/new.tsx` dokumentiert):

- Erweiterte Formen `l_shape`/`trapezoid`/`freehand` — MVP rectangle-only

## Threat Flags

Keine neuen sicherheitsrelevanten Oberflächen eingeführt. Der Account-Guard in `new.tsx` verhindert `saveDimensions`-Aufrufe im Lokal-Modus; der bestehende `assertAccount()`-Guard in `gardenPlanRepo.ts` bleibt als zweite Defense-Linie erhalten.

## Self-Check: PASSED

- `app/app/(app)/plan/new.tsx`: FOUND
- `app/src/components/__tests__/plan-new-screen.test.tsx`: FOUND
- `app/src/components/__tests__/create-garden-entrypoints.test.tsx`: FOUND
- Commit 77316e4: FOUND
- Commit a6c0e31: FOUND
- Commit 791fafc: FOUND
- Commit f1e34ab: FOUND
- `de.json` valid JSON: CONFIRMED
- Full suite: 777/777 PASS
