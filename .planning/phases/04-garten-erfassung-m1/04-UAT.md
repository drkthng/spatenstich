---
status: testing
phase: 04-garten-erfassung-m1
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: "2026-05-05T10:00:00Z"
updated: "2026-05-05T10:00:00Z"
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Capture Flow Navigation
expected: |
  Auf dem Home-Screen gibt es einen Button/Einstieg zum Foto-Capture-Flow.
  Tippen oeffnet den ersten Schritt ("Uebersicht-Foto"). Oben ist ein Fortschrittsindikator (z.B. Step 1/3) sichtbar.
awaiting: user response (paused — fixing login-from-settings bug first)

## Tests

### 1. Capture Flow Navigation
expected: Auf dem Home-Screen gibt es einen Button/Einstieg zum Foto-Capture-Flow. Tippen oeffnet den ersten Schritt ("Uebersicht-Foto"). Oben ist ein Fortschrittsindikator sichtbar.
result: [pending]

### 2. Foto aufnehmen / aus Galerie waehlen
expected: Im Capture-Step (z.B. "Uebersicht") kann man auf "Kamera" oder "Galerie" tippen. Es oeffnet sich der native Image Picker. Nach Auswahl zeigt der Step ein Thumbnail des Fotos.
result: [pending]

### 3. Alle 3 Fotos + Review-Screen
expected: Nach Aufnahme aller 3 Fotos (Uebersicht, Nord, Sued) gelangt man zum Review-Screen. Dort sind alle Fotos als Thumbnails sichtbar. Einzelne koennen geloescht/ersetzt werden.
result: [pending]

### 4. Nur 1 Foto - Warnung
expected: Wenn nur 1 Foto aufgenommen wurde und man zum Review geht, erscheint ein Warn-Hinweis (z.B. "Nur 1 Foto - Analyse kann ungenauer sein"), aber der Flow kann trotzdem fortgesetzt werden.
result: [pending]

### 5. Dimensionen-Eingabe + Form-Auswahl
expected: Nach Review kommt der Dimensions-Screen. Dort kann die Grundform (Rechteck, L-Form, Trapez, Freiform) gewaehlt werden. Je nach Form erscheinen passende Eingabefelder (Laenge, Breite). Werte werden in Metern eingegeben.
result: [pending]

### 6. Budget-Warnung bei Soft-Limit
expected: Wenn das Tages-Budget (50 Calls soft) erreicht waere, erscheint ein gelbes Banner mit Warnung. Bei unter 50 ist kein Banner sichtbar.
result: [pending]

### 7. Analyse-Loading-Screen
expected: Nach Absenden (Dimensionen + Fotos) erscheint ein Loading-Screen mit Animation/Fortschrittsanzeige. Der Screen blockiert nicht die UI (kein Freeze). Man wartet auf die Claude-Vision-Antwort.
result: [pending]

### 8. Element-Bestaetigung mit Confidence-Badges
expected: Nach Analyse erscheint eine Liste erkannter Elemente. Jedes Element hat einen Confidence-Badge ("sicher" gruen / "unsicher" gelb). Elemente koennen einzeln per Toggle akzeptiert/abgelehnt werden.
result: [pending]

### 9. Plan-Ansicht (SVG)
expected: Nach Bestaetigung zeigt ein neuer Screen den schematischen 2D-Plan als SVG. Der Plan hat einen skizzenhaften, warmen Stil (nicht fotorealistisch). Die Gartenform entspricht den eingegebenen Dimensionen. Bestaetigte Elemente sind als Symbole/Formen dargestellt.
result: [pending]

### 10. Home-Screen zeigt Plan
expected: Zurueck auf dem Home-Screen wird der erstellte Garten-Plan angezeigt (Vorschau oder direkter Link zum Plan-Screen). Ohne Plan zeigt der Home-Screen den Capture-Einstieg.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

- truth: "User im Lokal-Modus kann über Settings → 'Mit bestehendem Account anmelden' die Login-Seite erreichen und sich einloggen"
  status: failed
  reason: "User reported: Klick auf 'Mit bestehendem Account anmelden' navigiert zu /(auth)/login, aber GuardedStack in _layout.tsx erkennt identity !== null (lokale UUID) und redirected sofort zurück zu /(app). Login-Screen ist unerreichbar."
  severity: blocker
  test: pre-test (Auth-Status-Prüfung)
  artifacts:
    - app/app/_layout.tsx (GuardedStack, Zeile 53-57)
    - app/app/(app)/settings.tsx (Zeile 287: router.push('/(auth)/login'))
  missing: []
  root_cause: "GuardedStack auth guard treats local-mode identity (non-null UUID) same as account-mode identity. Any navigation to (auth) group while identity exists triggers immediate redirect back to (app)."
  fix_approach: "Add inline login form to settings.tsx (Option 3) — consistent with existing inline migration form pattern. No routing change needed."
