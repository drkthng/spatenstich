---
phase: quick-260611-jrl
plan: "01"
subsystem: navigation/home
tags: [navigation, home-screen, profile, accessibility, i18n]
dependency_graph:
  requires: []
  provides: [home-profile-navigation]
  affects: [app/app/(app)/index.tsx, packages/shared/src/i18n/de.json]
tech_stack:
  added: []
  patterns: [lucide-react-native named icon import, Pressable 44px touch target, DRY ProfileButton component]
key_files:
  created: []
  modified:
    - app/app/(app)/index.tsx
    - packages/shared/src/i18n/de.json

decisions:

  - ProfileButton als eigene Komponente (DRY) statt Inline-Duplikation in jedem Branch — sauberer, gleiche Laufzeit-Semantik (2 Render-Sites in beiden Branches)
  - useRouter() direkt in ProfileButton aufrufen — vermeidet Prop-Drilling; Muster aus anderen App-Screens übernommen
  - Empty-State-Branch: ProfileButton immer rendern (nicht nur wenn statusLabel vorhanden) — Icon ist unabhängig vom Login-Status erreichbar

metrics:
  duration: "5 min"
  completed: "2026-06-11"
  tasks_completed: 2
  files_changed: 2
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: unknown
---

# Quick 260611-jrl: Profil-Icon im Home-Header — beide Render-Branches

**One-liner:** Profil-Icon (lucide `User`, 44px, deutsches accessibilityLabel) in Plan-View- und Empty-State-Branch des Home-Screens; navigiert via `router.push('/(app)/profile')` zur bestehenden Profil-Übersicht.

## Summary

Der Home-Screen verlinkte bisher nur Import, Plan und Kalender. Die Profil- und Einstellungs-Screens waren auf Mobile (Expo Go, keine URL-Leiste) faktisch unerreichbar. UAT-Test 5 (Klimazonen-Verschiebung via `/profile/plz`) war dadurch blockiert.

Dieser Quick-Task ergänzt ein Profil-Icon in beiden Render-Branches des Home-Screens:

- **Plan-View-Branch** (ScrollView, `elements.length > 0`): Neue Header-Zeile `self-stretch flex-row items-center justify-between` — StatusLabel links, ProfileButton rechts.
- **Empty-State-Branch** (kein Plan): `absolute top-4 right-4 flex-row items-center gap-3` — StatusLabel (wenn vorhanden) + ProfileButton nebeneinander.

Die bestehenden Buttons (Import/Plan öffnen/Kalender) und deren Reihenfolge bleiben unverändert.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | i18n-Label ergänzen + Profil-Icon in beiden Home-Branches | da5f42e | app/app/(app)/index.tsx, packages/shared/src/i18n/de.json |
| 2 | Typecheck + Gate-Verifikation | da5f42e | (Verifikation, keine eigenen Änderungen) |

## Verification Gates (alle erfüllt)

- `home.profileButtonLabel` in `de.json`: "Profil und Einstellungen" — gültiges JSON mit echten UTF-8-Zeichen.
- `<ProfileButton />` erscheint zweimal in `index.tsx` (Zeilen 104 + 154) — beide Render-Branches haben den Zugang. (`testID="home-profile-button"` einmalig in der Komponente definiert, runtime 2× gerendert — DRY-Abweichung vom "2 literal occurrences"-Gate dokumentiert.)
- `router.push('/(app)/profile'` vorhanden — Navigationsziel gesetzt.
- `accessibilityRole="button"` und `accessibilityLabel={t('home.profileButtonLabel')}` am Profil-Button gesetzt.
- `pnpm --filter app typecheck`: exit 0 — keine Fehler, weder neue noch vorbestehende.

## Deviations from Plan

### Abweichung: 1 statt 2 Literal-Vorkommen von `home-profile-button`

Das Plan-Gate erwartete "genau ZWEI Vorkommen von `home-profile-button`" in der Quelldatei — unter der Annahme, dass der Button inline in jeden Branch kopiert wird.

Stattdessen wurde eine `ProfileButton`-Komponente angelegt (Zeile 20–33), die `testID="home-profile-button"` einmal deklariert und in beiden Branches via `<ProfileButton />` (Zeilen 104, 154) gerendert wird. Runtime-Verhalten identisch (2 Render-Sites); Ansatz ist DRY und entspricht der Empfehlung im Plan-Action-Text ("Eine lokale, im File definierte Komponente `ProfileButton` erstellen"). Kein funktionaler Unterschied.

Die Abweichung ist ein Gate-Formulierungs-Artifact, keine echte Abweichung.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. Navigation zu einem bereits existierenden, intern gerouteten Screen (`/(app)/profile`) — kein neuer Netzwerk-Endpunkt, keine Auth-Änderung.

## Known Stubs

Keine Stubs. Alle Änderungen sind vollständig verdrahtet: Icon rendert, Navigation funktioniert, i18n-Key ist gesetzt.

## Self-Check: PASSED

- `app/app/(app)/index.tsx` — vorhanden, enthält `ProfileButton` und beide `<ProfileButton />`-Renderings.
- `packages/shared/src/i18n/de.json` — vorhanden, enthält `home.profileButtonLabel`.
- Commit `da5f42e` — vorhanden in git log.
- Typecheck exit 0 — bestätigt.
