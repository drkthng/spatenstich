---
created: 2026-06-11T11:43:01.550Z
title: Beet per Klick-Ziehen-Loslassen aufziehen (Größe direkt setzen)
area: ui
type: feature
source: Phase-10-UAT-Session (Editor-Beobachtung)
files:
  - app/src/components/editor/ElementPalette.tsx
  - app/src/stores/editorStore.ts
  - app/src/lib/editor/bedLayout.ts
---

## Problem

Beim Ausbringen eines Beetes ist aktuell nur ein Klick möglich — das Beet entsteht mit Standardgröße und muss danach per Resize-Handle angepasst werden (zwei Arbeitsschritte). Erwartete UX: Mausklick → Ziehen → Loslassen = Beet mit direkt aufgezogener Größe (wie Rechteck-Tool in Zeichenprogrammen).

## Solution

Platzierungsmodus erweitern: pointerdown setzt Ankerpunkt, pointermove zeichnet Vorschau-Rechteck (Geister-Beet), pointerup committet Element mit aufgezogenen Maßen (Mindestgröße erzwingen). Einfacher Klick ohne Drag behält das bisherige Verhalten (Standardgröße) als Fallback. Bestehende bedLayout-/Commit-Pfade wiederverwenden; Center-Konvention (xM/yM = Bbox-Center) beachten.
