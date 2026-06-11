---
created: 2026-06-11T11:55:00.000Z
title: Bug - Home verlinkt Profil und Einstellungen nicht (Screens verwaist)
area: ui
type: bug
source: Phase-10-UAT-Session (Test 5 blockiert, 2026-06-11)
files:
  - app/app/(app)/index.tsx
  - app/app/(app)/profile/index.tsx
  - app/app/(app)/settings.tsx
---

## Problem

Der Home-Screen (`app/app/(app)/index.tsx`) bietet nur 3 Navigationsziele: Import, Plan öffnen, Aussaatkalender. Die existierenden Screens `/profile` (mit PLZ/Klimazone-Änderung unter `/profile/plz`), `/profile/archetype`, `/profile/vereinsregeln` und `/settings` sind von nirgendwo erreichbar — auf Mobile (Expo Go, keine URL-Leiste) faktisch unzugänglich. UAT-Test 5 (Klimazonen-Verschiebung) war dadurch blockiert; Dirk konnte die PLZ-Änderung nicht finden.

Web-Workaround: direkte URL `http://localhost:8081/profile/plz`.

## Solution

Navigationszugang ergänzen — Optionen: (a) Profil-/Settings-Icon im Home-Header (z. B. lucide `user` / `settings`, 44px-Touch-Target), (b) vierte Karte/Button auf Home, oder (c) Tab-Navigation einführen (größerer Umbau). Empfehlung: (a) Header-Icon, minimal-invasiv. Zusätzlich erwägen: „Klimazone ändern"-Link direkt im Kalender-Screen (PLZ-Banner existiert dort bereits für den Fall plz=null — Sprungziel `/profile/plz` wiederverwenden).
