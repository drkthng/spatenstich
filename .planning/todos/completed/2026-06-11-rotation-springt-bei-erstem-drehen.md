---
created: 2026-06-11T11:43:01.550Z
title: Bug - erste Rotation springt um ~90/270 Grad
area: ui
type: bug
source: Phase-10-UAT-Session (Editor-Beobachtung, 2026-06-11)
files:
  - app/src/components/editor/RotationHandle.tsx
  - app/src/components/editor/WebRotationHandle.tsx
  - app/src/lib/editor/rotationSnap.ts
---

## Problem

Element selektieren und am Rotations-Handle drehen: Die erste Rotation „springt" sofort um ~90° (bzw. 270° je nach Sichtweise), statt sanft von der aktuellen Lage zu starten. Vermutlich wird der Start-Winkel des Drags nicht relativ zur aktuellen Element-Rotation initialisiert (Offset zwischen Greifpunkt-Winkel und gespeicherter Rotation fehlt), oder ein Snap greift sofort beim ersten Move-Event.

Reproduktion: Plan-Editor öffnen → Element selektieren → Rotations-Handle greifen und minimal bewegen → Element springt um ~90°/270°.

## Solution

Beim Drag-Start den Winkel-Offset erfassen: `offset = winkelZumGreifpunkt - aktuelleRotation`, dann während des Drags `neueRotation = winkelZumPointer - offset`. Snap-Logik (rotationSnap) erst ab Bewegungs-Schwelle anwenden. Auf Web UND Native prüfen (zwei Handle-Implementierungen).
