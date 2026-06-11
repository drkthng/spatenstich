# Phase 10 — Aussaatkalender v1: Manuelle Geräte-Verifikation

**Checkpoint:** Task 2 — Human-verify Aussaatkalender on device (CAL-01..CAL-06 visual + add round-trip)
**Plan:** 10-04
**Checkpoint-Typ:** checkpoint:human-verify
**Datum:** 2026-06-11
**Status:** Auto-genehmigt (--auto-Chain, Policy: human-verify auto-approval)

---

## Genehmigungshinweis

Dieser Checkpoint wurde am 2026-06-11 im Rahmen einer `--auto`-Chain-Ausführung automatisch genehmigt.
Die GSD-Auto-Mode-Richtlinie erlaubt die automatische Genehmigung von `checkpoint:human-verify`-Checkpoints
(ausgenommen Paket-Legitimations-Prüfungen mit `gate="blocking-human"`).

**Ausstehende Aufgabe:** Die folgenden 8 Verifikationsschritte müssen manuell auf einem echten Gerät
(iPhone via Expo Go oder Web-Browser) durchgeführt werden. Sie gelten als **USER FOLLOW-UP** für das UAT
(User Acceptance Testing) und werden durch `/gsd-verify-work 10` abgefragt.

---

## Ausstehende Verifikationsschritte (PENDING — manuelle UAT erforderlich)

### Schritt 1 — App starten und Kalender-Einstieg vom Home-Screen

**Voraussetzung:** Account-Modus, ein Garten mit mindestens einem Beet und ≥ 1 Pflanze im Plan.
Starte die App mit `pnpm --filter app start` und öffne sie auf dem iPhone (Expo Go) oder im Browser.

**Aktion:** Vom Home-Screen auf „Zum Kalender" tippen (testID: `home-kalender-button`).

**Erwartetes Ergebnis:** Der Wochen-View öffnet sich mit Überschrift „Aussaatkalender" und Unterzeile „KW {n} · 2026".

**Status:** PENDING

---

### Schritt 2 — „Diese Woche"-Karte mit farbigen Aktions-Badges (CAL-03)

**Aktion:** Die „Diese Woche"-Karte im Wochen-View prüfen.

**Erwartetes Ergebnis:** Aktuelle Wochenaktionen sind mit farbigen Badges dargestellt:
- Vorkultur → violett (`#A78BFA`)
- Direktsaat → grün (`#34D399`)
- Auspflanzen → blau (`#60A5FA`)
- Ernte → orange (`#FB923C`)
- Korrekte deutsche Beschriftungen (z. B. „Vorkultur", „Direktsaat")
- Falls keine Aktionen diese Woche: Leer-Zustand-Text erscheint

**Status:** PENDING

---

### Schritt 3 — „Nur meine Pflanzen"-Filter-Chip (CAL-04)

**Aktion:** Den Filter-Chip „Nur meine Pflanzen" ein- und ausschalten.

**Erwartetes Ergebnis:**
- Aktiv = grüner Hintergrund (`#4A7C59`), gefüllt
- Inaktiv = Rahmen-Stil (Outline)
- Die Jahresübersicht filtert: aktiv zeigt nur Plan-Pflanzen, inaktiv zeigt alle Pflanzen

**Status:** PENDING

---

### Schritt 4 — Pflanzen-Detail mit 12-Monats-Gantt + Monatsbezeichnungen + Legende (CAL-01 + CAL-02)

**Aktion:** Eine Pflanzzeile in der Jahresübersicht antippen → Pflanzen-Detail-Screen öffnet sich.

**Erwartetes Ergebnis:**
- Volle Breite: 12-Monats-Gantt mit farbigen Phasen-Balken
- Monatsbezeichnungen Jan…Dez (klein, `text-xs`, in Steingrau)
- 4-Farben-Legende (Vorkultur / Direktsaat / Auspflanzen / Ernte)
- Phase-8-Pflanzendaten sichtbar: Mindestabstand (cm), Sonnenbedarf, Familie

**Status:** PENDING

---

### Schritt 5 — Klimazonen-Verschiebung (CAL-02)

**Aktion:** Profil-PLZ auf eine andere Klimazone ändern (z. B. Zone 1 vs. Zone 7) und eine Pflanzen-Detail-Seite erneut öffnen (z. B. Tomate).

**Erwartetes Ergebnis:** Die Gantt-Phasenbalken verschieben sich um ~1–4 Kalenderwochen entsprechend der Klimazone.

**Status:** PENDING

---

### Schritt 6 — „Auf welchem Beet?" + „Zu Plan hinzufügen" CTA (CAL-05)

**Aktion:** Im Pflanzen-Detail den Abschnitt „Auf welchem Beet?" prüfen und auf „Zu Plan hinzufügen" tippen.

**Erwartetes Ergebnis:**
- Platzierte Pflanzen zeigen ihren Beet-Namen an
- Nicht platzierte Pflanzen zeigen „Noch nicht im Plan"
- Tippen auf „Zu Plan hinzufügen" → Erfolgs-Banner „{name} wurde dem Plan hinzugefügt" erscheint
- Die Pflanze ist danach im Plan-Editor sichtbar
- Bei einem Plan ohne Beet: `keinBeetImPlan`-InlineBanner ersetzt den Hinzufügen-Button

**Status:** PENDING

---

### Schritt 7 — Fruchtfolge-Warnung (CAL-06)

**Aktion:** Zwei Pflanzen der gleichen Familie (z. B. Tomate + Paprika = Solanaceae) in einem Beet platzieren, dann den Detail-Screen einer dritten Pflanze derselben Familie öffnen.

**Erwartetes Ergebnis:** Der Fruchtfolge-Warnungs-Banner erscheint (testID: `fruchtfolge-warnung`).

**Status:** PENDING

---

### Schritt 8 — UTF-8-Umlaute und Zeichensatz-Prüfung

**Aktion:** Mehrere Screens durchgehen und auf korrekte deutsche Zeichen achten.

**Erwartetes Ergebnis:** Alle deutschen Umlaute und Sonderzeichen werden korrekt dargestellt:
- ä, ö, ü, Ä, Ö, Ü, ß
- Beispiele: „Jahresübersicht", „hinzugefügt", „öffnen", „Auf welchem Beet?"
- Keine Fragezeichen, Kästchen oder ASCII-Ersetzungen (ae/oe/ue/ss)

**Status:** PENDING

---

## Zusammenfassung

| # | Bereich | CAL-Kriterien | Status |
|---|---------|---------------|--------|
| 1 | App-Start + Home-Kalender-Button | — | PENDING |
| 2 | Diese-Woche-Karte + Aktions-Badges | CAL-03 | PENDING |
| 3 | Filter-Chip Nur-meine-Pflanzen | CAL-04 | PENDING |
| 4 | Pflanzen-Detail Gantt + Monatsbezeichnungen + Legende | CAL-01, CAL-02 | PENDING |
| 5 | Klimazonen-Verschiebung | CAL-02 | PENDING |
| 6 | Auf-welchem-Beet + Zu-Plan-hinzufügen | CAL-05 | PENDING |
| 7 | Fruchtfolge-Warnung | CAL-06 | PENDING |
| 8 | UTF-8-Umlaute durchgehend | — | PENDING |

**Alle 8 Schritte sind ausstehend.** Führe `/gsd-verify-work 10` aus, um durch die UAT-Prüfung geführt zu werden.

---

*Erstellt: 2026-06-11 | Auto-genehmigt: 2026-06-11 | Manuelle Verifikation: ausstehend*
