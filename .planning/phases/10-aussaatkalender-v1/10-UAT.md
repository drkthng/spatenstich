---
status: passed
phase: 10-aussaatkalender-v1
source: [10-VERIFICATION.md, 10-HUMAN-VERIFY.md]
started: 2026-06-11T00:00:00Z
updated: 2026-06-11T12:00:00Z
---

## Current Test

Alle Tests abgeschlossen.

## Tests

### 1. App-Start + Kalender-Einstieg vom Home-Screen
expected: Wochen-View öffnet sich vom Home-Button mit Header „Aussaatkalender" und „KW {n} · 2026"
result: pass

### 2. „Diese Woche"-Karte mit farbigen Aktions-Badges (CAL-03)
expected: Aktionen mit farbigen Badges (Vorkultur violett, Direktsaat grün, Auspflanzen blau, Ernte orange), deutsche Labels
result: pass

### 3. Filter-Chip „Nur meine Pflanzen" (CAL-04)
expected: Aktiv = grün gefüllt, inaktiv = Outline; filtert Jahresliste UND Diese-Woche-Karte; kein Auto-Reset
result: pass

### 4. Pflanzen-Detail: 12-Monats-Gantt + Monatslabels + Legende (CAL-01, CAL-02)
expected: Voller Gantt mit farbigen Phasen-Balken, Jan…Dez, 4-Farben-Legende, Phase-8-Infos
result: pass

### 5. Klimazonen-Verschiebung (CAL-02)
expected: PLZ-Wechsel (andere Klimazone) verschiebt Gantt-Balken um ~1–4 KW
result: pass — Hinweis: PLZ-Änderung war nur per Direkt-URL /profile/plz erreichbar (Home verlinkt Profil nicht); als Bug-Todo erfasst (2026-06-11-home-navigation-profil-settings-fehlt.md)

### 6. „Auf welchem Beet?" + „Zu Plan hinzufügen" (CAL-05)
expected: Unplatziert „Noch nicht im Plan" → CTA → Erfolgs-Banner → Pflanze im Beet
result: pass

### 7. Fruchtfolge-Warnung beet-scoped (CAL-06)
expected: Warnung bei gleicher Familie im selben Beet; keine Warnung bei anderem Beet
result: pass

### 8. UTF-8-Umlaute durchgehend
expected: ä/ö/ü/ß überall korrekt, keine ASCII-Ersetzungen
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Keine UAT-Gaps. Bekannte dokumentierte Follow-ups (kein Phasen-Blocker, siehe 10-REVIEW.md):
- WR-08: Feldsalat/Grünkohl-Erntefenster (jahresüberspannend) unsichtbar
- WR-09: Fruchtfolge-Check bei unplatzierter Pflanze prüft alle Beete
- WR-10: findBeeteForPlant ignoriert parentBedId (konkave Polygone)
- Home-Navigation zu Profil/Settings fehlt (Todo, wird via gsd-quick gefixt)
