---
created: 2026-06-11T11:43:01.550Z
title: Selektiertes Element per Pfeiltasten verschieben
area: ui
type: feature
source: Phase-10-UAT-Session (Editor-Beobachtung)
files:
  - app/src/components/editor/
  - app/src/stores/editorStore.ts
---

## Problem

Im Plan-Editor (Web/Desktop) kann ein selektiertes Element nur per Maus/Touch verschoben werden. Für präzises Positionieren wäre Verschieben per Pfeiltasten (←↑→↓) deutlich komfortabler — Standard-UX in jedem Grafik-/Plan-Editor.

## Solution

Keyboard-Listener bei aktiver Selektion (nur Web/Desktop relevant): Pfeiltaste = kleiner Schritt (z. B. 0,1 m oder Raster-Schritt), Shift+Pfeil = größerer Schritt. Bestehende Move-/Commit-Logik des editorStore wiederverwenden (gleiche Persistenz wie Drag-Move). Fokus-Handling beachten, damit Eingabefelder nicht gekapert werden. TBD: Schrittweite mit Dirk abstimmen.
