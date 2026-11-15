# Abnahme v3.0 „Garten mit KI“

Prüfliste für die Geräte-Abnahme (UAT3-01) und die Kostenmessung (UAT3-02).
Geprüft wird die ausgelieferte App unter `https://spatenstich.pages.dev`, nicht ein lokaler Stand.

- **Handy A:** Dirk, Android, Chrome, App installiert
- **Handy B:** Partnerin, Android, Chrome, App installiert
- **Desktop:** Chrome am PC

In die Spalten kommt `ok`, `Fehler` (mit Nummer unter „Befunde“) oder `–` (trifft auf dem Gerät nicht zu).
Jeder Fehler wird behoben und bekommt einen Test, der ihn künftig findet; erst dann gilt der Schritt als bestanden.

Welche Ausgabe geprüft wurde, steht unter „Mehr“ ganz unten (Version und Build): `________________`

## 0. Vorbereitung (einmalig, nur Dirk)

| # | Schritt | erledigt |
|---|---|---|
| V1 | Supabase-Dashboard, Edge Functions, Secrets: `ANTHROPIC_API_KEY` gesetzt. In der Anthropic Console ein Monatslimit von 100 $ gesetzt. | Schlüssel: ja (2026-11-15, Name steht in `supabase secrets list`). Limit: |
| V2 | Supabase-Dashboard, Authentication, Providers, Email: „Confirm email“ aus. | offen (2026-11-15 abgefragt: Bestätigung ist noch an) |
| V3 | Supabase-Dashboard, Authentication, Email Templates, „Reset Password“: Text enthält `{{ .Token }}` (der sechsstellige Code). | |
| V4 | GitHub, Settings, Secrets and variables, Actions, Variables: `EXPO_PUBLIC_IMPRINT` gesetzt, Zeilen mit `\|` getrennt (Name, Straße, Ort, E-Mail). Danach einmal neu ausliefern (Deploy-Workflow von Hand starten). | offen (2026-11-15: Variable fehlt) |
| V5 | Beide Handys: Chrome, Adresse öffnen, Menü, „App installieren“. | |

## 1. Installation, Teilen, Start ohne Netz (offen aus v2.0, Phase 20)

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 1.1 | App über das Symbol auf dem Startbildschirm öffnen | Startet ohne Adressleiste; Überschriften in Serifenschrift, warmweißer Grund | | | – |
| 1.2 | In der Claude-App ein Ergebnis teilen, „Spatenstich“ wählen | App öffnet die Import-Vorschau mit dem geteilten Inhalt | | | – |
| 1.3 | Flugmodus an, App schließen und neu öffnen | App startet, zeigt den letzten Plan und unter „Heute“ die Aufgabenliste | | | |
| 1.4 | Im Flugmodus ein Beet verschieben, Flugmodus aus | Speicherstatus zeigt erst „offen“, dann „Abgeglichen“; das andere Gerät sieht das Beet an der neuen Stelle | | | |
| 1.5 | Neue Ausgabe liegt vor (nach einem Deploy) | Hinweis „Neue Version verfügbar“, nach „Neu laden“ stimmt der Build unter „Mehr“ | | | |

## 2. Konto und erste Schritte

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 2.1 | Vor dem Anmelden auf dem Startbildschirm „Datenschutz“ und „Impressum“ öffnen | Beide Seiten lesbar, Pfeil führt zurück; im Impressum stehen Name und Anschrift | | | |
| 2.2 | Neues Konto ohne Einladungscode anlegen | Drei Schritte (Größe, Postleitzahl, Partner einladen) führen zum Plan | | – | |
| 2.3 | Partnerin registriert sich mit dem Einladungscode aus 2.2 | Sie sieht in unter drei Minuten den gemeinsamen Plan, kein zweiter leerer Garten | – | | – |
| 2.4 | „Passwort vergessen?“, Code aus der E-Mail eingeben, neues Passwort setzen | Geht ganz in der installierten App, ohne Wechsel in den Browser | | | |
| 2.5 | Beim Anmelden und Registrieren die Tastatur öffnen | Der Knopf zum Absenden bleibt sichtbar, nichts wird verdeckt | | | – |
| 2.6 | Abmelden mit einer noch nicht abgeglichenen Änderung | Warnung vor dem Abmelden; danach liegen keine Daten des Kontos mehr auf dem Gerät | | | |

## 3. Plan und Editor

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 3.1 | Plan öffnen, „Bearbeiten“ | Tafel mit Tuschlinien, Schraffur auf Beeten, Maßstab, Nordpfeil; Beetnamen lesbar | | | |
| 3.2 | Element antippen, verschieben, an Eck-, Seiten- und Drehgriff ziehen | Folgt dem Finger bzw. der Maus; Seitengriff lässt die Gegenkante stehen; Drehen rastet in 15°-Schritten | | | |
| 3.3 | Mit zwei Fingern bzw. Mausrad zoomen und verschieben, dann „Ganzen Plan zeigen“ | Zoom zwischen 0,5× und 4×; Griffe bleiben gleich groß | | | |
| 3.4 | Doppeltipp auf ein Element, Namen ändern; Breite, Tiefe, Drehung als Zahl eingeben | Name steht sofort auf dem Plan; Komma als Dezimalzeichen geht | | | |
| 3.5 | Über „Hinzufügen“ ein Beet, eine Pflanze (mit Suche) und eine Anlage setzen | Vorschau vor dem Setzen; bei der Pflanze Abstandsring und Hinweis zu guten und schlechten Nachbarn (ohne Emoji) | | | |
| 3.6 | Mehrere auswählen, gemeinsam verschieben, duplizieren, löschen, Löschen zurücknehmen | Alles wirkt auf die ganze Auswahl; „Rückgängig“ holt Gelöschtes zurück | | | |
| 3.7 | Rückgängig und Wiederholen mehrmals; am Desktop Entf, Esc, Pfeiltasten, Strg+Z, Strg+Y, Strg+A | Jede Änderung einzeln zurück; das erste Rückgängig leert den Plan nicht | | | |
| 3.8 | Ein Beet mit Pflanzen verschieben und drehen | Die Pflanzen im Beet wandern mit, Pflanzen außerhalb bleiben stehen | | | |
| 3.9 | Beet mit freiem Umriss zeichnen, Ecke verschieben, Ecke hinzufügen und entfernen | Umriss folgt; Drehen und Größe ändern gehen weiter | | | |
| 3.10 | Größe der Parzelle ändern, Grenze als freien Umriss festlegen | Plan passt sich an | | | |
| 3.11 | Direkt nach dem Verschieben die App in den Hintergrund legen bzw. den Tab schließen | Beim nächsten Öffnen ist die Änderung da | | | |
| 3.12 | Obere Leiste des Editors am Handy | „Fertig“, ein Zeichen für den Speicherstatus und fünf Knöpfe, alle ganz sichtbar; nichts überlappt | | | – |
| 3.13 | Plan mit vielen Elementen (wenn vorhanden) verschieben und zoomen | Bleibt flüssig | | | |

## 4. Abgleich zu zweit

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 4.1 | A verschiebt ein Beet, B hat den Plan offen | B sieht es binnen 5 Sekunden, auch im geöffneten Editor | | | |
| 4.2 | A und B ändern offline dasselbe Beet, erst B, dann A geht online | Die spätere Bearbeitung gilt; wer überschrieben wurde, sieht einen Hinweis | | | – |
| 4.3 | A löscht ein Element | Es verschwindet auch bei B | | | |
| 4.4 | Den Editor nur öffnen und wieder schließen | Speicherstatus bleibt „Abgeglichen“, „zuletzt bearbeitet“ ändert sich nicht | | | |
| 4.5 | „Mehr“, „Speicherstatus“ | Sagt in Worten, was aussteht oder fehlgeschlagen ist | | | |

## 5. KI-Zugang und Foto-Abgleich

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 5.1 | „Mehr“, „KI und Verbrauch“, „KI testen“ | Antwort erscheint, Kosten unter einem Cent, Eintrag im Verbrauchsbuch mit Namen | | | |
| 5.2 | Foto-Abgleich mit zwei bis sechs Fotos (Kamera und Galerie, am Desktop Datei) | Befunde nach höchstens zwei Minuten; Kosten des Abgleichs werden genannt | | | |
| 5.3 | Befunde ansehen | Jeder Befund nennt Art, Vorschlag und Sicherheit; auf dem Plan ist markiert, worum es geht | | | |
| 5.4 | Einen Befund annehmen, einen ablehnen, einen vorher bearbeiten | Nur der angenommene ändert den Plan; die anderen nichts | | | |
| 5.5 | B öffnet „Befunde“ | Sieht die offenen Befunde von A | – | | |
| 5.6 | Pflanze fotografieren, die nicht im Katalog steht | Vorschlag für einen Katalogeintrag; nach dem Annehmen in Palette und Kalender bei beiden | | | |
| 5.7 | Unsicherer Befund | App bittet um eine Nahaufnahme und sagt wovon; danach ist der Befund aktualisiert | | | |
| 5.8 | Befund zu Schädling oder Krankheit „Als Aufgabe vormerken“ | Steht danach in der Aufgabenliste | | | |
| 5.9 | Flugmodus, dann Foto-Abgleich starten | Verständliche Meldung, kein roher Fehlertext; alles andere geht weiter | | | |

## 6. Heute und Aufgaben

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 6.1 | App öffnen | „Heute“ mit Wetterzeile und Zeitauswahl; Liste auf Wunsch | | | |
| 6.2 | „30 Min.“ wählen, Aufgaben anzeigen | Aufgaben, die hineinpassen, mit Summe; der Rest unter „Wenn noch Zeit bleibt“; jede nennt was, wo, wie lange, wie dringend, warum | | | |
| 6.3 | Liste mit Netz anzeigen | „Von der KI sortiert“; ein zweites Öffnen am selben Tag kostet nichts (Verbrauchsbuch) | | | |
| 6.4 | Aufgabe abhaken | Wandert zu „Heute erledigt“ mit Namen; B sieht es binnen Sekunden | | | |
| 6.5 | Eigene Aufgabe anlegen (einmalig und wiederkehrend) | Erscheint in der Liste, die wiederkehrende kommt wieder | | | |
| 6.6 | Flugmodus, Liste anzeigen | Grundliste ohne KI, mit Hinweis | | | |
| 6.7 | Wintergemüse im Plan (Feldsalat, Grünkohl, Lauch) von November bis März | „… ernten“ steht in der Liste, Begründung nennt das Ende im Frühjahr | | | |

## 7. Kalender

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 7.1 | Kalender öffnen | „Diese Woche“, Suche, „In eurem Plan“, „Alle Pflanzen“ von A bis Z; auf jedem Jahresstreifen eine Linie für heute | | | |
| 7.2 | In der Suche „moehre“ und „Daucus“ tippen | Findet die Möhre; das Kreuz leert die Suche | | | |
| 7.3 | Eine Pflanze öffnen | Jede Tätigkeit mit Zeit in Worten und eigenem Streifen; was gerade ansteht, trägt „jetzt“ | | | |
| 7.4 | „Zum Plan hinzufügen“ | Pflanze steht danach im Plan und unter „In eurem Plan“ | | | |

## 8. Mehr, Lesbarkeit, Rechtliches

| # | Prüfschritt | Erwartung | Handy A | Handy B | Desktop |
|---|---|---|---|---|---|
| 8.1 | „Mehr“ durchgehen | Garten umbenennen, Mitglieder sehen, Code kopieren, Speicherstatus, Abmelden, Import mit Anleitung, Datenschutz, Impressum, Version | | | |
| 8.2 | Alle Bildschirme durchgehen | Keine Emoji oder Textpfeile als Knöpfe; keine Wörter aus der Technik (Account, Sync, JSON …) | | | |
| 8.3 | Draußen bei Tageslicht Plan, Heute und Kalender lesen | Texte und Linien gut lesbar | | | – |
| 8.4 | Android-Einstellungen, Schriftgröße eine bis zwei Stufen größer, App neu öffnen | Nichts abgeschnitten, Knöpfe erreichbar, auch im Editor | | | – |
| 8.5 | Mit dem Daumen bedienen | Jeder Knopf lässt sich sicher treffen | | | – |
| 8.6 | Datenschutz lesen | Abschnitt zur Übermittlung von Fotos an Anthropic vorhanden und zutreffend | | | |

## 9. Kostenmessung (UAT3-02)

Die Beträge stehen im Verbrauchsbuch unter „Mehr“, „KI und Verbrauch“.

| Anfrage | 1. | 2. | 3. | Mittel |
|---|---|---|---|---|
| Foto-Abgleich mit 2 Fotos | | | | |
| Foto-Abgleich mit 6 Fotos | | | | |
| Nahaufnahme nachreichen | | | | |
| Aufgaben sortieren | | | | |

Üblicher Monat für zwei Personen (Annahme, bei Bedarf anpassen): 8 Foto-Abgleiche, 4 Nahaufnahmen, 60 Sortierungen (je Person eine am Tag).

Monatskosten = 8 × Abgleich + 4 × Nahaufnahme + 60 × Sortierung = `________ $` (Grenze: 100 $)

## Befunde

| Nr. | Schritt | Gerät | Was ist passiert | Behoben in (Commit) | Test, der es künftig findet |
|---|---|---|---|---|---|
| | | | | | |
