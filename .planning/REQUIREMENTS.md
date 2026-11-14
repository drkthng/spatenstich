# Requirements: Kleingarten-App (Spatenstich)

**Defined:** 2026-11-14 (Milestone v3.0 „Garten mit KI")
**Core Value:** Ein Gartenplan, den beide gemeinsam exakt pflegen können, und eine App, die daraus sagt, was heute zu tun ist.

> Technische Details für Sync, Editor-Mechanik und Navigation stehen weiterhin in `MASTERPLAN-v2.md` (WP 21.x, 22.x, 23.x, Kap. 3.3 und 3.5). Die Anforderungen hier beschreiben, was die beiden Nutzer danach können. Design-Quelle ist `.planning/sketches/` (Sketch 001, Richtung „Feldführer"). Die v2.0-Anforderungen liegen in `milestones/v2.0-REQUIREMENTS.md`.

## v3.0 Requirements

### Editor (EDIT3)

- [ ] **EDIT3-01**: Nutzer kann im selben Editor am Handy mit dem Finger und am Desktop mit der Maus ein Element auswählen und verschieben
- [ ] **EDIT3-02**: Nutzer kann ein Element an den Eckgriffen in Breite und Tiefe zugleich vergrößern und verkleinern
- [ ] **EDIT3-03**: Nutzer kann ein Element an einem Seitengriff einseitig ziehen; die gegenüberliegende Kante bleibt stehen, auch wenn das Element gedreht ist
- [ ] **EDIT3-04**: Nutzer kann ein Element am Drehgriff drehen; die Drehung rastet in 15°-Schritten und lässt sich frei auf 1° genau einstellen
- [ ] **EDIT3-05**: Nutzer kann jedes Element direkt auf dem Plan umbenennen (Doppeltipp oder Doppelklick) und im Eigenschaftenfeld; der Name erscheint sofort auf dem Plan
- [ ] **EDIT3-06**: Nutzer kann Breite, Tiefe und Drehung eines Elements als Zahl eingeben (Meter mit Komma, Grad)
- [ ] **EDIT3-07**: Nutzer kann den Plan mit zwei Fingern oder dem Mausrad zwischen 0,5× und 4× zoomen, verschieben und mit einem Knopf wieder ganz anzeigen
- [ ] **EDIT3-08**: Griffe sind bei jedem Zoom gleich groß und mit dem Finger sicher zu treffen (Trefferfläche mindestens 44 px, überwiegend außerhalb des Elements, nach innen begrenzt); ein kleines ausgewähltes Element lässt sich weiterhin am Körper verschieben und umbenennen
- [ ] **EDIT3-09**: Nutzer kann Beete, Pflanzen (mit Suche) und Anlagen aus einer Palette wählen und mit Vorschau auf dem Plan platzieren
- [ ] **EDIT3-10**: Nutzer kann mehrere Elemente auswählen und gemeinsam verschieben, Elemente duplizieren, nach vorn oder hinten legen und löschen; ein Löschen lässt sich über einen Hinweis sofort zurücknehmen
- [ ] **EDIT3-11**: Nutzer kann jede Änderung rückgängig machen und wiederholen; das erste Rückgängig nach dem Öffnen leert den Plan nicht, und ein zurückgenommenes Anlegen taucht nach dem Neuladen nicht wieder auf
- [ ] **EDIT3-12**: Pflanzen, die in einem Beet stehen, wandern, drehen und skalieren mit dem Beet
- [ ] **EDIT3-13**: Beim Verschieben und Ziehen rasten Kanten am Raster und an Kanten und Mitten benachbarter Elemente ein; Hilfslinien zeigen Ausrichtung und gleiche Abstände; das Einrasten lässt sich abschalten
- [ ] **EDIT3-14**: Nutzer kann ein Beet mit freiem Umriss zeichnen und danach einzelne Eckpunkte verschieben, hinzufügen und entfernen; der Umriss folgt Drehen und Größenänderung
- [ ] **EDIT3-15**: Nutzer kann im Editor die Größe der Parzelle ändern und ihre Grenze als Rechteck oder freien Umriss festlegen
- [ ] **EDIT3-16**: Das ausgewählte Element zeigt seine Maße; beim Setzen einer Pflanze erscheinen Abstands-Ring und Mischkultur-Hinweis
- [ ] **EDIT3-17**: Am Desktop funktionieren Entf, Esc, Pfeiltasten (mit Umschalt in großen Schritten), Strg+Z, Strg+Y und Strg+A
- [ ] **EDIT3-18**: Änderungen werden ohne Zutun gespeichert, der Speicherstatus ist sichtbar, und eine Änderung geht nicht verloren, wenn die App unmittelbar danach geschlossen oder in den Hintergrund gelegt wird
- [ ] **EDIT3-19**: Es gibt nur noch einen Editor (Skia-Editor und Web-Sonderkomponenten entfernt); 200 Elemente lassen sich auf Android-Chrome flüssig bewegen; die Bedienlogik ist ohne Browser getestet

### Design (DESIGN3)

- [ ] **DESIGN3-01**: Die ganze App verwendet die Feldführer-Tokens (Farben, Linien, Ecken) aus Sketch 001; keine hartkodierten Farben, keine grauen Standard-Komponenten, nur helles Erscheinungsbild
- [ ] **DESIGN3-02**: Überschriften erscheinen in Fraunces, Fließtext in Newsreader; die Schriften sind mit der App ausgeliefert, laden offline und erzeugen keine Anfrage an fremde Server
- [ ] **DESIGN3-03**: Der Plan ist in Editor und Vorschau als Tafel gezeichnet: feine Tuschlinien, blasse Flächen, Schraffur auf Beeten, Maßstab und Nordpfeil
- [ ] **DESIGN3-04**: Die App verwendet einen einzigen Icon-Satz; Emoji, Unicode-Glyphen und Text-Pfeile als Bedienelemente sind entfernt
- [ ] **DESIGN3-05**: Alle Texte stehen in `de.json`, sind frei von Fachjargon und internen Begriffen, und ein Test verhindert Rückfälle
- [ ] **DESIGN3-06**: Texte und Linien sind auf dem Handy im Freien lesbar: Kontrast AA, Linien mindestens 1 px, Bedienflächen mindestens 48 px, Schriftvergrößerung bis 130 % ohne abgeschnittene Inhalte
- [ ] **DESIGN3-07**: Der Kalender folgt dem neuen Stil und zeigt eine Heute-Markierung, eine Suche und die Abschnitte „In eurem Plan" und „Alle Pflanzen"
- [ ] **DESIGN3-08**: Unter „Mehr" findet der Nutzer Datenschutzhinweise mit einem Abschnitt zur Übermittlung von Fotos an Anthropic, das Impressum sowie Version und Build

### Sync (SYNC3)

- [ ] **SYNC3-01**: Das Backend ist wieder erreichbar, die Ursache des Ausfalls vom Oktober 2026 ist geklärt und dokumentiert, und Dirk wird binnen eines Tages benachrichtigt, wenn es erneut ausfällt
- [ ] **SYNC3-02**: Ein offline angelegtes Element erscheint nach dem nächsten Abgleich beim Partner, auch wenn dessen Gerät zwischendurch online war
- [ ] **SYNC3-03**: Ändern beide dasselbe Element, gewinnt die spätere Bearbeitung unabhängig von der Reihenfolge des Abgleichs; wer überschrieben wurde, sieht einen Hinweis
- [ ] **SYNC3-04**: Eine Änderung des Partners ist binnen 5 Sekunden sichtbar (binnen 60 Sekunden ohne Live-Verbindung), auch im geöffneten Editor
- [ ] **SYNC3-05**: Das bloße Öffnen des Editors schreibt nichts und verändert weder Bearbeiter noch Zeitstempel
- [ ] **SYNC3-06**: Postleitzahl und Klimazone gehören zum Garten, sind für beide gleich und überleben ein Neuladen
- [ ] **SYNC3-07**: Nach dem Abmelden oder einem Nutzerwechsel bleiben keine Daten des vorigen Kontos auf dem Gerät; vor dem Abmelden warnt die App bei noch nicht abgeglichenen Änderungen
- [ ] **SYNC3-08**: Gelöschte Elemente, entfernte Mitglieder und verbrauchte Einladungscodes verschwinden auch beim Partner
- [ ] **SYNC3-09**: Ein dauerhaft fehlerhafter Eintrag blockiert den Abgleich nicht; der Speicherstatus zeigt in verständlichen Worten, was aussteht und was fehlgeschlagen ist

### KI-Zugang (AI)

- [ ] **AI-01**: Der API-Schlüssel liegt ausschließlich als Server-Secret vor; ein Prüfschritt in der CI schlägt fehl, sobald ein Schlüssel im Repository oder im ausgelieferten Bundle auftaucht
- [ ] **AI-02**: Beide Gartenmitglieder können die KI-Funktionen mit ihrer normalen Anmeldung nutzen; Anfragen ohne Anmeldung oder von Nicht-Mitgliedern werden abgelehnt
- [ ] **AI-03**: Jede KI-Anfrage wird mit Garten, Person, Funktion, Token-Zahl und Kosten im Verbrauchsbuch festgehalten
- [ ] **AI-04**: Beide sehen in der App, wie viel vom Monatsbudget verbraucht und wie viel übrig ist
- [ ] **AI-05**: Der Besitzer kann die Monatsgrenze einstellen (Vorgabe 100 $); bei 80 % erscheint eine Warnung, bei 100 % lehnt die App weitere KI-Anfragen bis zum Monatswechsel mit klarer Meldung ab
- [ ] **AI-06**: Ohne Netz, bei erreichter Grenze oder bei einem Fehler des Dienstes sagt die App verständlich, was los ist; alle Funktionen ohne KI bleiben nutzbar
- [ ] **AI-07**: Lehnt das Modell eine Anfrage ab oder ist es überlastet, sieht der Nutzer eine verständliche Meldung und kann es erneut versuchen; roher Fehlertext erscheint nie
- [ ] **AI-08**: Eine Person kann nur eine begrenzte Zahl von Anfragen pro Stunde auslösen, und Fotos werden vor dem Senden verkleinert, sodass ein Versehen das Budget nicht aufbraucht

### Foto-Abgleich (PHOTO)

- [ ] **PHOTO-01**: Nutzer kann am Handy ein Foto aufnehmen oder aus der Galerie wählen und am Desktop eine Bilddatei wählen, um es mit dem Plan abgleichen zu lassen
- [ ] **PHOTO-02**: Nutzer kann bis zu sechs Fotos aus verschiedenen Blickwinkeln in einem Abgleich senden
- [ ] **PHOTO-03**: Weicht der Garten vom Plan ab (Größe, Lage, Name, nicht mehr vorhanden), erhält der Nutzer einen Befund mit einem konkreten Änderungsvorschlag
- [ ] **PHOTO-04**: Erkennt die App etwas, das im Plan fehlt, schlägt sie vor, es als Element oder Pflanze aufzunehmen
- [ ] **PHOTO-05**: Erkennt die App eine Pflanze, die nicht im Katalog steht, schlägt sie einen Katalogeintrag vor (Name, botanischer Name, Familie, Aussaat-, Pflanz- und Erntefenster, Abstand); nach dem Annehmen steht der Eintrag beiden in Palette und Kalender zur Verfügung und lässt sich bearbeiten
- [ ] **PHOTO-06**: Kann die App etwas nicht sicher bestimmen, bittet sie um eine Nahaufnahme und sagt, wovon; reicht der Nutzer sie nach, wird der Befund aktualisiert
- [ ] **PHOTO-07**: Nutzer kann jeden Befund einzeln annehmen, ablehnen oder vor dem Annehmen bearbeiten; ohne Bestätigung ändert sich nichts am Plan oder Katalog
- [ ] **PHOTO-08**: Jeder Befund zeigt auf dem Plan, auf welches Beet oder welche Stelle er sich bezieht
- [ ] **PHOTO-09**: Der Abgleich meldet auch Schädlinge, Krankheiten und das Entwicklungsstadium und bietet an, daraus eine Aufgabe zu machen
- [ ] **PHOTO-10**: Fotos werden nach dem Abgleich verworfen und nirgends gespeichert; gespeichert werden nur die Befunde, und offene Befunde sieht auch der Partner
- [ ] **PHOTO-11**: Jeder Befund zeigt, wie sicher er ist; unsichere Befunde sind als solche gekennzeichnet, und die App rät nicht, sondern fragt nach (PHOTO-06)

### Aufgaben (TASK)

- [ ] **TASK-01**: Nutzer kann sich auf Wunsch eine Liste der heutigen Aufgaben anzeigen lassen, abgeleitet aus Plan, Kalender, Jahreszeit und Klimazone
- [ ] **TASK-02**: Jede Aufgabe nennt, was zu tun ist, wo (Beet oder Pflanze), wie lange es etwa dauert, wie dringend es ist und in einem Satz warum
- [ ] **TASK-03**: Nutzer kann angeben, wie viele Minuten er hat, und erhält die wertvollsten Aufgaben, die in diese Zeit passen, mit der Summe der Dauer; der Rest steht darunter als „Wenn noch Zeit bleibt"
- [ ] **TASK-04**: Die Grundliste entsteht ohne Netz auf dem Gerät; mit Netz verbessert die KI Reihenfolge und Begründung, und die Liste zeigt, ob sie KI-sortiert ist
- [ ] **TASK-05**: Nutzer kann eine Aufgabe abhaken; der Partner sieht das binnen Sekunden, und die Aufgabe erscheint erst wieder, wenn sie erneut fällig ist
- [ ] **TASK-06**: Nutzer kann eigene Aufgaben anlegen, einmalig oder wiederkehrend, mit Dauer; sie erscheinen in den Listen und werden mitsortiert
- [ ] **TASK-07**: Frost, Regen und Hitze aus der Vorhersage für die Postleitzahl des Gartens verändern die Dringlichkeit, und die Begründung nennt das Wetter; ohne Netz gilt die zuletzt geladene Vorhersage oder keine
- [ ] **TASK-08**: Aufgaben aus angenommenen Foto-Befunden erscheinen in der Liste
- [ ] **TASK-09**: Die Liste eines Tages bleibt bei unveränderten Eingaben gleich; die KI-Sortierung wird pro Tag und Zeitbudget höchstens einmal berechnet und nicht bei jedem Öffnen erneut
- [ ] **TASK-10**: Der Tab „Heute" öffnet mit der Aufgabenliste und der Zeitbudget-Auswahl

### Navigation, Onboarding, Konto (NAV3)

- [ ] **NAV3-01**: Die App hat die Bereiche Heute, Plan, Kalender und Mehr (Tabs am Handy, Seitenleiste am Desktop); der Editor öffnet im Vollbild; jeder Bildschirm hat einen Titel und ist in höchstens zwei Schritten erreichbar
- [ ] **NAV3-02**: Nach der Registrierung führt die App in drei Schritten zu einem nutzbaren Plan: Gartengröße, Postleitzahl, Partner einladen oder Code eingeben
- [ ] **NAV3-03**: Eine neue Person kann bei der Registrierung einen Einladungscode eingeben und sieht in unter drei Minuten den gemeinsamen Plan
- [ ] **NAV3-04**: Nutzer kann sein Passwort über einen sechsstelligen Code aus einer E-Mail zurücksetzen, auch in der installierten App
- [ ] **NAV3-05**: Statusleiste, Gestenleiste und Bildschirmtastatur verdecken nie Inhalte oder Knöpfe
- [ ] **NAV3-06**: Unter „Mehr" kann der Nutzer den Gartennamen ändern, Mitglieder sehen, den Einladungscode kopieren, den Speicherstatus einsehen und sich abmelden; Fehlermeldungen sind verständlich formuliert
- [ ] **NAV3-07**: Der Import aus dem Claude.ai-Projekt bleibt unter „Mehr" erreichbar, mit einer kurzen Anleitung

### Abnahme (UAT3)

- [ ] **UAT3-01**: Eine Prüfliste für Editor, Sync, Foto-Abgleich, Aufgaben, Onboarding und die offene Abnahme aus v2.0 Phase 20 (Installation, Teilen-Menü, Offline-Start) ist auf beiden Android-Handys und am Desktop bestanden; Befunde sind mit Regressionstest behoben
- [ ] **UAT3-02**: Die tatsächlichen Kosten je Foto-Abgleich und je Aufgaben-Sortierung sind gemessen und dokumentiert; bei üblicher Nutzung durch zwei Personen bleibt der Monat unter der Grenze
- [ ] **UAT3-03**: Milestone abgeschlossen, Tag `v3.0.0`, README und Projekt-Dokumente aktuell

## Future Requirements

Erfasst, aber nicht in dieser Roadmap.

### Aufgaben

- **TASK-F1**: Aufgabe auf später verschieben oder für diese Saison ausblenden
- **TASK-F2**: Aufgabe übernehmen („mache ich"), damit nicht beide dasselbe tun
- **TASK-F3**: Benachrichtigung am Morgen (Web Push)
- **TASK-F4**: Aufgaben als Kalender-Abo (iCal)

### Garten

- **GARDEN-F1**: Garten-Journal mit Notizen pro Beet und Pflanze
- **GARDEN-F2**: Analysierte Fotos aufbewahren (Speicher, Zugriffsregeln, Löschfunktion)
- **GARDEN-F3**: Saisonwechsel und Fruchtfolge über drei Jahre
- **GARDEN-F4**: Saatgut-Inventar
- **GARDEN-F5**: Plan als Bild exportieren und drucken

### Regeln und Technik

- **RULES-F1**: Vereinsregeln reparieren und aktivieren (früher SYNC2-09; Funktion ist derzeit per Schalter verborgen)
- **TECH-F1**: Expo-SDK angleichen (`expo-doctor` grün)
- **TECH-F2**: Natives Android-APK
- **TECH-F3**: Dunkles Erscheinungsbild

## Out of Scope

| Feature | Reason |
|---------|--------|
| KI-Aufrufe direkt vom Gerät | Der Schlüssel dürfte dann im Bundle liegen; das Repository ist öffentlich |
| KI ändert Plan oder Katalog ohne Bestätigung | Der Plan muss verlässlich bleiben; jede Änderung geht durch die Sichtung |
| Speichern analysierter Fotos | Entscheidung 2026-11-13: möglichst wenige persönliche Daten auf dem Server |
| Automatische tägliche KI-Läufe im Hintergrund | Aufgaben nur auf Wunsch; schützt das Budget |
| Nativer Build, iOS | Installierte Web-App auf Android-Chrome und Desktop genügt beiden Nutzern |
| Lokal-Modus ohne Konto | Code bleibt, unsichtbar (D-04); kein Nutzen für zwei Personen mit gemeinsamem Garten |
| Mehr als zwei Mitglieder pro Garten | Nutzungsrealität |
| Chat mit der KI in der App | Nicht gewünscht; dafür gibt es das Claude.ai-Projekt und die Import-Bridge |

## Traceability

Jede Anforderung gehört zu genau einer Phase (Roadmap vom 2026-11-14, Phasen 30–39, siehe `ROADMAP.md`).

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT3-01 | Phase 30 | Pending |
| EDIT3-02 | Phase 30 | Pending |
| EDIT3-03 | Phase 30 | Pending |
| EDIT3-04 | Phase 30 | Pending |
| EDIT3-05 | Phase 30 | Pending |
| EDIT3-06 | Phase 30 | Pending |
| EDIT3-07 | Phase 30 | Pending |
| EDIT3-08 | Phase 30 | Pending |
| EDIT3-09 | Phase 31 | Pending |
| EDIT3-10 | Phase 31 | Pending |
| EDIT3-11 | Phase 31 | Pending |
| EDIT3-12 | Phase 32 | Pending |
| EDIT3-13 | Phase 32 | Pending |
| EDIT3-14 | Phase 32 | Pending |
| EDIT3-15 | Phase 32 | Pending |
| EDIT3-16 | Phase 31 | Pending |
| EDIT3-17 | Phase 31 | Pending |
| EDIT3-18 | Phase 31 | Pending |
| EDIT3-19 | Phase 32 | Pending |
| DESIGN3-01 | Phase 30 | Pending |
| DESIGN3-02 | Phase 30 | Pending |
| DESIGN3-03 | Phase 30 | Pending |
| DESIGN3-04 | Phase 38 | Pending |
| DESIGN3-05 | Phase 38 | Pending |
| DESIGN3-06 | Phase 38 | Pending |
| DESIGN3-07 | Phase 38 | Pending |
| DESIGN3-08 | Phase 38 | Pending |
| SYNC3-01 | Phase 33 | Pending |
| SYNC3-02 | Phase 33 | Pending |
| SYNC3-03 | Phase 33 | Pending |
| SYNC3-04 | Phase 33 | Pending |
| SYNC3-05 | Phase 33 | Pending |
| SYNC3-06 | Phase 33 | Pending |
| SYNC3-07 | Phase 33 | Pending |
| SYNC3-08 | Phase 33 | Pending |
| SYNC3-09 | Phase 33 | Pending |
| AI-01 | Phase 34 | Pending |
| AI-02 | Phase 34 | Pending |
| AI-03 | Phase 34 | Pending |
| AI-04 | Phase 34 | Pending |
| AI-05 | Phase 34 | Pending |
| AI-06 | Phase 34 | Pending |
| AI-07 | Phase 34 | Pending |
| AI-08 | Phase 34 | Pending |
| PHOTO-01 | Phase 35 | Pending |
| PHOTO-02 | Phase 35 | Pending |
| PHOTO-03 | Phase 35 | Pending |
| PHOTO-04 | Phase 35 | Pending |
| PHOTO-05 | Phase 35 | Pending |
| PHOTO-06 | Phase 35 | Pending |
| PHOTO-07 | Phase 35 | Pending |
| PHOTO-08 | Phase 35 | Pending |
| PHOTO-09 | Phase 35 | Pending |
| PHOTO-10 | Phase 35 | Pending |
| PHOTO-11 | Phase 35 | Pending |
| TASK-01 | Phase 36 | Pending |
| TASK-02 | Phase 36 | Pending |
| TASK-03 | Phase 36 | Pending |
| TASK-04 | Phase 36 | Pending |
| TASK-05 | Phase 36 | Pending |
| TASK-06 | Phase 36 | Pending |
| TASK-07 | Phase 36 | Pending |
| TASK-08 | Phase 36 | Pending |
| TASK-09 | Phase 36 | Pending |
| TASK-10 | Phase 36 | Pending |
| NAV3-01 | Phase 37 | Pending |
| NAV3-02 | Phase 37 | Pending |
| NAV3-03 | Phase 37 | Pending |
| NAV3-04 | Phase 37 | Pending |
| NAV3-05 | Phase 37 | Pending |
| NAV3-06 | Phase 37 | Pending |
| NAV3-07 | Phase 37 | Pending |
| UAT3-01 | Phase 39 | Pending |
| UAT3-02 | Phase 39 | Pending |
| UAT3-03 | Phase 39 | Pending |

**Coverage:**
- v3.0 requirements: 75 total
- Mapped to phases: 75 ✓
- Unmapped: 0

**Anforderungen je Phase:** 30: 11 · 31: 6 · 32: 5 · 33: 9 · 34: 8 · 35: 11 · 36: 10 · 37: 7 · 38: 5 · 39: 3

---
*Requirements defined: 2026-11-14*
*Last updated: 2026-11-14 after roadmap creation (Traceability gefüllt, 75/75 zugeordnet)*
