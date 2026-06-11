---
created: 2026-06-11T11:43:01.550Z
title: Automatisches Speichern bei Beet-Veränderungen
area: ui
type: feature
source: Phase-10-UAT-Session (Editor-Beobachtung)
files:
  - app/src/stores/editorStore.ts
  - app/src/lib/sync/
---

## Problem

Veränderungen an Beeten (verschieben, vergrößern, drehen) werden im Plan-Editor nicht automatisch gespeichert — Änderungen können verloren gehen, wenn der Nutzer den Editor verlässt, ohne explizit zu speichern. Erwartung (gerade im 2-User Shared Garden): Änderungen persistieren automatisch.

## Solution

Debounced Autosave nach Commit-Operationen im editorStore (z. B. 1–2 s nach letzter Änderung bzw. sofort bei Blur/Navigation): über den bestehenden Persistenz-/Sync-Pfad (Operation-Log, Last-Write-Wins) schreiben, damit Offline-Queue und 2-User-Sync konsistent bleiben. UI-Feedback klein halten (z. B. „Gespeichert"-Indikator). Abgrenzung klären: Gilt der bisherige explizite Speichern-Flow als Draft-Mechanik? Dann Autosave nur für angenommene Elemente. TBD mit Dirk.
