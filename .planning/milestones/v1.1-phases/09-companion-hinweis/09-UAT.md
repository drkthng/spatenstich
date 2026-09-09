---
status: testing
phase: 09-companion-hinweis
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md
started: 2026-05-17T15:00:00Z
updated: 2026-05-17T15:00:00Z
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  gap_snapshot: "testing::scenarios=6"
---

## Current Test

number: 1
name: Conflict Detection — Red Triangles
expected: |
  Platziere Kartoffel und Tomate im gleichen Beet.
  Beide Pflanzen zeigen ein rotes Dreieck-Symbol (oben rechts am Pflanz-Kreis).
awaiting: user response

## Tests

### 1. Conflict Detection — Red Triangles

expected: Platziere Kartoffel und Tomate im gleichen Beet. Beide Pflanzen zeigen ein rotes Dreieck-Symbol (oben rechts am Pflanz-Kreis).
result: [pending]

### 2. Conflict Toast — Red Banner

expected: Beim Platzieren der zweiten kollidierenden Pflanze erscheint ein roter Toast-Banner unten im Editor mit Hinweis auf den Konflikt.
result: [pending]

### 3. Toast Auto-Dismiss

expected: Der rote Toast verschwindet automatisch nach ~4 Sekunden. Die roten Dreiecke an den Pflanzen bleiben bestehen.
result: [pending]

### 4. Conflict Resolved — Triangles Disappear

expected: Lösche eine der kollidierenden Pflanzen (z.B. Tomate entfernen). Die roten Dreiecke an der verbleibenden Pflanze verschwinden.
result: [pending]

### 5. Good Companion — Green Toast

expected: Platziere Basilikum neben Tomate im gleichen Beet. Ein grüner Toast-Banner erscheint mit positivem Hinweis (gute Nachbarn).
result: [pending]

### 6. No Toast Outside Bed

expected: Platziere eine Pflanze außerhalb eines Beets. Kein Toast erscheint — weder rot noch grün.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

[none yet]
