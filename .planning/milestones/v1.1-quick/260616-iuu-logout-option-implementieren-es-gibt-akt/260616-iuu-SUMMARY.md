---
phase: quick-260616-iuu
plan: "01"
subsystem: home-navigation
tags: [navigation, settings, logout, ux, tdd]
dependency_graph:
  requires: []
  provides: [home-settings-button, settings-nav-entry-point]
  affects: [app/app/(app)/index.tsx]
tech_stack:
  added: []
  patterns: [ProfileButton-mirror, lucide-icon-44px-touch-target, TDD-RED-GREEN]
key_files:
  created:
    - app/src/components/__tests__/home-settings-button.test.tsx
  modified:
    - app/app/(app)/index.tsx
    - packages/shared/src/i18n/de.json

decisions:

  - "SettingsButton in beiden Modi sichtbar (account + local) — Einstellungen/Logout ist in beiden Modi nutzbar"
  - "react-native-svg inline-mock im Test-File (nicht in setup.ts) — minimaler Impact, GardenPlanView-Dependency isoliert"
  - "SettingsButton direkt links von ProfileButton (beide Branches) — konsistente Reihenfolge"

metrics:
  duration: "~10 min"
  completed: "2026-06-16"
  tasks_completed: 1
  files_modified: 3
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Quick 260616-iuu Plan 01: Logout erreichbar machen — Settings-Zahnrad Summary

**One-liner:** Zahnrad-Icon (lucide Settings) im Home-Header in beiden Render-Branches ergänzt — navigiert zu `/(app)/settings`, wo der bestehende Logout-Flow liegt.

## What Was Built

Der fehlende Einstiegspunkt zum Einstellungen-Screen wurde geschlossen. Auf Mobile (Expo Go, keine URL-Leiste) war `/(app)/settings` faktisch unerreichbar. Jetzt ist das Zahnrad-Icon in beiden Render-Branches (Plan-View-Header + Empty-State) und in beiden Modi (account + local) sichtbar.

### Komponenten

**`SettingsButton`** (neu, `app/app/(app)/index.tsx`):

- Identisches Muster wie `ProfileButton` (Quick 260611-jrl)
- `Pressable` mit `onPress={() => router.push('/(app)/settings')}`, `accessibilityRole="button"`, `accessibilityLabel={t('home.settingsButtonLabel')}`, `testID="home-settings-button"`
- 44px Touch-Target (`min-w-[44px] min-h-[44px]`), `Settings`-Icon stone-Palette (`#78716C`)
- Kein Modus-Guard — in account- und local-Modus sichtbar

**Plan-View-Branch:** Beide Buttons in `<View className="flex-row items-center gap-3">` rechts im Header (Zahnrad links, Profil rechts).

**Empty-State-Branch:** `<SettingsButton />` direkt vor `<ProfileButton />` im `absolute top-4 right-4`-Container.

**`de.json`:** `home.settingsButtonLabel = "Einstellungen"` (echter UTF-8, gültiges JSON).

**`settings.tsx`:** Unverändert — Logout-Flow intakt.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Settings-Icon im Home-Header + i18n + Test (TDD RED+GREEN) | DONE | RED: `e772935`, GREEN: `109b038` |

## TDD Gate Compliance

- RED commit `e772935`: `test(quick-260616-iuu-01): add failing test for home-settings-button (RED)` — 2 von 3 Tests rot, 1 grün (Profil-Regressions-Test ohne Implementierung schon grün, korrekt)
- GREEN commit `109b038`: `feat(quick-260616-iuu-01): Settings-Zahnrad im Home-Header — Logout erreichbar` — alle 3 Tests grün

## Test Results

```
PASS components src/components/__tests__/home-settings-button.test.tsx
  home-settings-button
    ✓ rendert home-settings-button im Account-Modus (Empty-State) und navigiert zu /(app)/settings
    ✓ rendert home-settings-button im Lokal-Modus (Empty-State) und navigiert zu /(app)/settings
    ✓ home-profile-button bleibt vorhanden und navigiert weiterhin zu /(app)/profile (Regressions-Schutz)
```

**Volle App-Suite (Ende):** 769 Tests bestanden, 98 Test-Suites, 0 Fehler, 0 Regressions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-native-svg inline-mock im Test-File**

- **Found during:** Task 1 (RED-Phase, erster Test-Run)
- **Issue:** `HomeScreen` importiert transitiv `GardenPlanView` → `react-native-svg`. Die `components`-Jest-Konfiguration transformiert `node_modules` nicht; `react-native-svg` wirft `TypeError: Cannot destructure property 'Mixin' of '_reactNative.Touchable'` in jsdom-Umgebung.
- **Fix:** `jest.mock('react-native-svg', ...)` inline in der Testdatei mit No-Op-Komponenten für alle verwendeten Exports (Svg, Rect, Line, Circle, Text, G, Path, ...). Nicht in `setup.ts` — minimale Auswirkung auf andere Tests.
- **Files modified:** `app/src/components/__tests__/home-settings-button.test.tsx`

## Verification

- [x] `home.settingsButtonLabel` existiert als gültiger UTF-8-String in de.json: `"Einstellungen"`
- [x] `index.tsx` enthält `SettingsButton`-Komponente und rendert sie in beiden Render-Branches
- [x] `router.push('/(app)/settings'` vorhanden in `index.tsx`
- [x] Test `home-settings-button.test.tsx` grün (Account + Lokal navigieren zu `/(app)/settings`; profile-button unverändert)
- [x] `pnpm --filter app typecheck` exit 0
- [x] `app/app/(app)/settings.tsx` unverändert (Logout-Flow intakt, `git diff` leer)

## Known Stubs

Keine.

## Threat Flags

Keine neue Angriffsfläche — reine clientseitige Navigation zu bereits existierender, intern gerouteter Route. Bestehender GuardedStack schützt `/(app)/settings` unverändert.

## Self-Check: PASSED

- `app/app/(app)/index.tsx`: FOUND (modifiziert)
- `packages/shared/src/i18n/de.json`: FOUND (modifiziert)
- `app/src/components/__tests__/home-settings-button.test.tsx`: FOUND (neu erstellt)
- Commits `e772935` (RED) und `109b038` (GREEN): FOUND in `git log`
- Volle Test-Suite: 769/769 PASSED
