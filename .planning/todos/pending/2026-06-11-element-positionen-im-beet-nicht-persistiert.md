---
created: 2026-06-11T13:30:00.000Z
title: Bug - Element-Positionen im Beet nach Speichern+Reload nicht persistiert (alle aufeinander)
area: ui
type: bug
source: Phase-10-UAT-Nachtest (2026-06-11, Web)
files:
  - app/src/stores/editorStore.ts
  - app/src/hooks/useKalenderData.ts
  - app/src/lib/editor/bedLayout.ts
---

## Problem

Elemente (Pflanzen) in einem Beet verschieben → speichern → App neu laden: Alle Elemente liegen wieder aufeinander gestapelt statt an den abgelegten Positionen. Die Verschiebung geht beim Persistieren oder beim Laden verloren.

**Hypothesen (zu verifizieren):**
1. Zusammenhang mit WR-06-Fix (quick: `addPlantToPlan` aus dem Kalender platziert JEDE Pflanze am Beet-Center → mehrere via Kalender hinzugefügte Pflanzen starten exakt übereinander). Wenn dann der Move im Editor nicht persistiert wird, liegen sie nach Reload wieder alle am Center.
2. Move-Commit im Editor schreibt xM/yM nicht über den Outbox-/Persistenz-Pfad (writePlanElement) — z. B. nur für Drafts, nicht für akzeptierte Elemente, oder der Speichern-Flow überschreibt mit DB-Werten (LWW-Konflikt mit altem updatedAt).
3. Load-Pfad re-layoutet Elemente mit parentBedId via bedLayout statt gespeicherte Koordinaten zu nutzen.

**Reproduktion:** Mehrere Pflanzen (z. B. via Kalender-CTA) in ein Beet → im Editor auseinanderziehen → speichern → Seite neu laden → Elemente wieder gestapelt.

## Solution

Erst Root Cause verifizieren (Persistenz-Pfad des Element-Moves tracen: editorStore Move-Commit → writePlanElement/Outbox → load), dann fixen. Test: Move → persist → reload → Positionen identisch.
