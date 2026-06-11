---
created: 2026-06-11T13:30:00.000Z
title: Bug - Text wird beim Rotieren/Drag markiert (Web Text-Selection)
area: ui
type: bug
source: Phase-10-UAT-Nachtest (2026-06-11, Web)
files:
  - app/src/components/editor/WebRotationHandle.tsx
  - app/src/components/editor/
---

## Problem

Beim Rotieren eines Elements im Web-Editor wird der Text des Feldes (und der Elemente) gehighlighted/markiert — der Browser interpretiert den Drag als Text-Selektion. Stört die Bedienung massiv.

## Solution

Browser-Text-Selektion während Drag-Gesten unterbinden: `e.preventDefault()` im `mousedown`-Handler des WebRotationHandle (und ggf. weiterer Web-Drag-Handles wie Resize/Move), plus `userSelect: 'none'` auf dem Editor-Canvas-Container (RN-Web style prop) während aktiver Drag-Operation. Prüfen, ob auch WebResizeHandle/Move-Drag betroffen sind — einheitlich fixen.
