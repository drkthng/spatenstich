---
status: testing
phase: 10-aussaatkalender-v1
source: [10-VERIFICATION.md, 10-HUMAN-VERIFY.md]
started: 2026-06-11T00:00:00Z
updated: 2026-06-11T00:00:00Z
---

## Current Test

number: 1
name: App-Start + Kalender-Einstieg vom Home-Screen
expected: |
  App starten (`pnpm --filter app start`), auf iPhone (Expo Go) oder im Browser öffnen
  (Account-Modus, Garten mit ≥ 1 Beet und ≥ 1 Pflanze im Plan). Vom Home-Screen auf
  „Zum Kalender" tippen (testID: `home-kalender-button`). Der Wochen-View öffnet sich
  mit Überschrift „Aussaatkalender" und Unterzeile „KW {n} · 2026".
awaiting: user response

## Tests

### 1. App-Start + Kalender-Einstieg vom Home-Screen
expected: Wochen-View öffnet sich vom Home-Button mit Header „Aussaatkalender" und „KW {n} · 2026"
result: [pending]

### 2. „Diese Woche"-Karte mit farbigen Aktions-Badges (CAL-03)
expected: Aktionen mit farbigen Badges — Vorkultur violett (#A78BFA), Direktsaat grün (#34D399), Auspflanzen blau (#60A5FA), Ernte orange (#FB923C), deutsche Labels; bei leerer Woche Leer-Zustand-Text
result: [pending]

### 3. Filter-Chip „Nur meine Pflanzen" (CAL-04)
expected: Aktiv = grün gefüllt (#4A7C59), inaktiv = Outline; Jahresübersicht UND Diese-Woche-Karte filtern entsprechend; manueller Toggle wird nicht automatisch zurückgesetzt
result: [pending]

### 4. Pflanzen-Detail: 12-Monats-Gantt + Monatslabels + Legende (CAL-01, CAL-02)
expected: Voller 12-Monats-Gantt mit farbigen Phasen-Balken, Monatslabels Jan…Dez, 4-Farben-Legende, Phase-8-Infos (Mindestabstand, Sonnenbedarf, Familie)
result: [pending]

### 5. Klimazonen-Verschiebung (CAL-02)
expected: Profil-PLZ auf andere Klimazone ändern (z. B. Zone 1 vs. 7), Pflanzen-Detail (z. B. Tomate) erneut öffnen → Gantt-Balken verschieben sich um ~1–4 KW
result: [pending]

### 6. „Auf welchem Beet?" + „Zu Plan hinzufügen" (CAL-05)
expected: Platzierte Pflanzen zeigen Beet-Name; unplatzierte „Noch nicht im Plan"; CTA → Erfolgs-Banner „{name} wurde dem Plan hinzugefügt", Pflanze danach im Plan-Editor UND im Beet (nach Reload sichtbar); ohne Beet im Plan ersetzt keinBeetImPlan-Banner den Button
result: [pending]

### 7. Fruchtfolge-Warnung beet-scoped (CAL-06)
expected: Zwei Pflanzen gleicher Familie (z. B. Tomate + Paprika, Solanaceae) in EINEM Beet → Detail einer dritten Pflanze derselben Familie zeigt fruchtfolge-warnung-Banner; gleiche Familie nur in ANDEREM Beet → keine Warnung
result: [pending]

### 8. UTF-8-Umlaute durchgehend
expected: ä/ö/ü/Ä/Ö/Ü/ß korrekt auf allen Kalender-Screens („Jahresübersicht", „hinzugefügt", „öffnen"); keine Fragezeichen, Kästchen oder ASCII-Ersetzungen
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

<!-- Bekannte offene Follow-ups (kein UAT-Blocker, aus 10-REVIEW.md):
WR-08: Feldsalat/Grünkohl-Erntefenster (jahresüberspannend) unsichtbar in WochenCard + Gantt
WR-09: Fruchtfolge-Check bei unplatzierter Pflanze prüft alle Beete, CTA platziert ins erste
WR-10: findBeeteForPlant ignoriert parentBedId; konkave Polygone → false negative
-->
