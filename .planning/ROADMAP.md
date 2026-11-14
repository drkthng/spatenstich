# Roadmap: Kleingarten-App (Spatenstich)

> **Quellenlage (ab 2026-11-13):** `.planning/MASTERPLAN-v2.md` ist nicht mehr die alleinige Quelle der Wahrheit. Es bleibt die Detail-Spezifikation für **Sync** (WP 21.x, Kap. 3.5), **Editor-Mechanik** (WP 22.x) und **Navigation, Onboarding, Auth** (WP 23.x, Kap. 3.3): Arbeitspakete, Akzeptanzkriterien, Datei-Referenzen und SQL für diese Bereiche stehen dort. Ersetzt sind Kap. 3.4 (Design „Papier & Erde“ → „Feldführer“, siehe `.planning/sketches/`) und die Entscheidungen gegen In-App-KI (→ D-16/D-17 in `PROJECT.md`). Bei Widersprüchen gelten `PROJECT.md` und `REQUIREMENTS.md`.

> **Pivot 2026-11-13:** Die App nutzt die Claude-API über Dirks eigenen Schlüssel (Edge Function, Budget 100 $/Monat). v2.0 „Handy-Ready“ wurde nach Phase 20 geschlossen; dessen Phasen 21–25 und die Wochenaufgaben aus v2.1 sind in v3.0 aufgegangen. v3.0 zählt ab **Phase 30** weiter, damit die Nummern 21–29 (im Masterplan als Arbeitspaket-Namen WP 21.x … vergeben) eindeutig bleiben (D-20). Reihenfolge: Editor zuerst.

## Milestones

- ✅ **v1.0 Foundation** — Phasen 1–7.5a (shipped 2026-05-17) — Archiv: `milestones/v1.1-ROADMAP.md` (enthält v1.0-Details), Phasen-Verzeichnisse in `milestones/v1.0-phases/`
- ✅ **v1.1 Saison 2026 Ready** — Phasen 8–10 (shipped 2026-09-09) — Archiv: `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-phases/`, `milestones/v1.1-quick/`
- ✅ **v2.0 Handy-Ready** — nur Phase 20 (vorzeitig geschlossen 2026-11-13; Phasen 21–25 in v3.0 aufgegangen) — Archiv: `milestones/v2.0-ROADMAP.md`, `milestones/v2.0-REQUIREMENTS.md`, `milestones/v2.0-phases/`
- 🚧 **v3.0 Garten mit KI** — Phasen 30–39 (in Arbeit, nutzbar zum Vorkultur-Start Ende Februar 2027)

## Phases

<details>
<summary>✅ v1.0 Foundation (Phasen 1–7.5a) — SHIPPED 2026-05-17</summary>

- [x] Phase 1: Foundation — Monorepo, StorageAdapter, Supabase + RLS, CI (2026-04-17)
- [x] Phase 2: Auth & Profile — Account/lokal, PLZ/Klimazone, Archetyp; Vereinsregeln-Code hinter Flag (2026-04-20)
- [x] Phase 2.5: Shared Garden Model — gardens + garden_members, Member-RLS, Invite-Code (2026-04-23)
- [x] Phase 3: Offline & Sync — Outbox + 2-User-LWW (2026-06-10; Cross-Device-UAT übersprungen, siehe v3.0 Phase 33)
- [x] ~~Phase 4: Garten-Erfassung per Claude Vision~~ — SUPERSEDED durch Pivot M07
- [x] Phase 5: AI-Removal + Import-Schema `spatenstich-import.v1` (2026-05-09)
- [x] Phase 6: Import-Flow + Companion-Prompt (2026-05-09)
- [x] Phase 6.5: Draft-Sichtung + Promotion, Migration 017 (2026-05-12)
- [x] Phase 7: Plan-Editor (Skia, nativ) + Drafts-Tray, Migration 018 (2026-05-13; nie auf Gerät verifiziert, wird in v3.0 Phase 32 entfernt)
- [x] Phase 7.5a: Web Plan-Editor (SVG, Maus) (2026-05-17)

</details>

<details>
<summary>✅ v1.1 Saison 2026 Ready (Phasen 8–10) — SHIPPED 2026-09-09</summary>

- [x] Phase 8: Plant-DB Foundation — 90 Pflanzen, 38 Companion-Paare, Migration 019 (2026-05-17)
- [x] Phase 9: Companion-Hinweis — Konflikt/Companion-Toast in beiden Editoren (2026-05-29)
- [x] Phase 9.1: Editor-Element-Bearbeitung — Resize/Rotate/Properties/Z-Order (2026-05-29)
- [x] Phase 10: Aussaatkalender v1 — Wochen-View, Gantt, Klimazone, Fruchtfolge-Warnung (2026-06-12, UAT 8/8)
- Phase 7.5b (Web Editor Polish) — nicht gestartet, absorbiert durch v3.0 Phasen 30–32
- Quick-Tasks 260418–260616 — archiviert in `milestones/v1.1-quick/`

</details>

<details>
<summary>✅ v2.0 Handy-Ready (vorzeitig geschlossen 2026-11-13, nur Phase 20 ausgeliefert)</summary>

- [x] Phase 20: Fundament, Aufräumen, PWA-Deploy — CI grün, Legacy entfernt, PWA-Shell mit Teilen-Ziel und Service Worker, Cloudflare-Pages-Deploy, Keep-alive (4 Pläne, 2026-09-29; Geräte-Abnahme offen → v3.0 Phase 39)
- Phasen 21–25 (Sync, ein Editor, Navigation, Design, Geräte-Abnahme) — nie begonnen, in v3.0 aufgegangen (Tabelle „Absorbiert aus v2.0/v2.1“ unten)
- v2.1 Saison 2027 (Phasen 26–29) — als Milestone entfallen: Wochenaufgaben → v3.0 Phase 36; Journal, Saisonwechsel, SDK-Angleichung und APK → Backlog
- Details und frühere Phasenbeschreibungen: `milestones/v2.0-ROADMAP.md`

</details>

### 🚧 v3.0 Garten mit KI (Phasen 30–39)

**Milestone-Ziel:** Beide planen den Garten an Handy und Desktop in einem exakten Editor, und die App nutzt Dirks Claude-API-Budget, um den Plan aus Fotos aktuell zu halten und zu sagen, was sich heute zu tun lohnt.

**Zuschnitt:** 75 Anforderungen in 10 Phasen. Das liegt über dem Richtwert für `standard` (4–6), weil der Editor in drei am Gerät einzeln prüfbare Phasen geteilt ist und die Vorgaben zur Reihenfolge (Editor, Sync, KI-Zugang, Aufgaben) je eine eigene Phase verlangen. Jede Phase trägt mindestens 5 Anforderungen mit nutzerbeobachtbaren Kriterien.

**Reihenfolge:**

- Editor zuerst (30–32): braucht kein Backend, das Supabase-Projekt kann währenddessen wiederhergestellt werden.
- Der Editor wird gleich im endgültigen Look gebaut: Tokens, Schriften und Plan-Zeichenstil (DESIGN3-01..03) liegen in Phase 30, der Rest des Designs folgt in Phase 38.
- Sync (33) vor allem Geteilten: Verbrauchsbuch, Befunde und Erledigt-Status setzen Zwei-Geräte-Konsistenz voraus.
- KI-Zugang (34) vor Foto-Abgleich (35) und KI-Sortierung der Aufgaben (36).
- Heute (36) vor Tabs und Onboarding (37): die Navigation braucht den Inhalt von „Heute“ und die Plan-Vorschau.
- Abnahme (39) zuletzt.

- [ ] **Phase 30: Feldführer-Fundament und Editor-Kern** - Tokens, Schriften, Plan als Tafel; verschieben, Größe, einseitig ziehen, drehen, umbenennen, Zoom/Pan mit Finger und Maus
- [ ] **Phase 31: Editor im Alltag** - Palette und Platzieren, Mehrfachauswahl, Rückgängig/Wiederholen, Tastatur, verlässliches Speichern
- [ ] **Phase 32: Präzision und ein Editor** - Pflanzen folgen dem Beet, Einrasten, freie Umrisse, Parzellengrenze, Skia raus, 200 Elemente flüssig
- [ ] **Phase 33: Verlässlicher Sync** - Backend zurück und überwacht, echtes Last-Write-Wins, Echtzeit, Konto- und Gartendaten
- [ ] **Phase 34: KI-Zugang mit Verbrauchsgrenze** - Edge Function, Schlüssel als Server-Secret, Verbrauchsbuch, Monatsgrenze, verständliche Fehler
- [ ] **Phase 35: Foto-Abgleich** - Fotos gegen den Plan, Befunde über die Sichtung, Katalogvorschlag, Nahaufnahme-Anfrage
- [ ] **Phase 36: Aufgaben für heute** - Heute-Bildschirm, Tagesliste, „Ich habe N Minuten“, KI-Sortierung, Wetter, Erledigt-Status
- [ ] **Phase 37: Navigation, Onboarding, Konto** - Tabs, Onboarding, Beitritt per Code, Passwort-Reset, Mehr
- [ ] **Phase 38: Feinschliff** - ein Icon-Satz, Klartext, Lesbarkeit im Freien, Kalender, Datenschutz und Impressum
- [ ] **Phase 39: Abnahme und Release** - Geräte-Abnahme auf beiden Handys und Desktop, Kostenmessung, Tag v3.0.0

## Phase Details

### Phase 30: Feldführer-Fundament und Editor-Kern
**Goal**: Der Plan sieht aus wie eine vermessene Tafel im Stil „Feldführer“, und jedes Element lässt sich am Handy mit dem Finger und am Desktop mit der Maus verschieben, in der Größe ändern, einseitig ziehen, drehen und benennen; Zoom und Pan inklusive.
**Depends on**: Phase 20 (ausgeliefert); kein Backend nötig
**Requirements**: DESIGN3-01, DESIGN3-02, DESIGN3-03, EDIT3-01, EDIT3-02, EDIT3-03, EDIT3-04, EDIT3-05, EDIT3-06, EDIT3-07, EDIT3-08
**Success Criteria** (what must be TRUE):
  1. Nach dem Öffnen erscheinen Überschriften in Fraunces und Fließtext in Newsreader, auch im Flugmodus nach dem ersten Laden, ohne Anfrage an fremde Server; kein Bildschirm zeigt graue Standard-Komponenten oder fremde Farben (DESIGN3-01, DESIGN3-02)
  2. Der Plan erscheint im Editor und in der schreibgeschützten Vorschau als Tafel mit feinen Tuschlinien, blassen Flächen, Schraffur auf Beeten, Maßstab und Nordpfeil; Beetnamen bleiben auf einem 375-px-Bildschirm lesbar (DESIGN3-03)
  3. Am Android-Handy wählt der Finger ein Element, verschiebt es, zieht Eckgriffe (Breite und Tiefe zugleich), einen Seitengriff (die Gegenkante bleibt auch bei gedrehtem Element stehen) und den Drehgriff (rastet in 15°-Schritten); am Desktop geht dasselbe mit der Maus im selben Editor (EDIT3-01, EDIT3-02, EDIT3-03, EDIT3-04)
  4. Zwei Finger oder das Mausrad zoomen zwischen 0,5× und 4× und verschieben den Plan, ein Knopf zeigt ihn wieder ganz; die Griffe bleiben bei jedem Zoom gleich groß, und ein kleines ausgewähltes Beet lässt sich weiter am Körper ziehen und umbenennen (EDIT3-07, EDIT3-08)
  5. Doppeltipp oder Doppelklick benennt ein Element direkt auf dem Plan um, im Eigenschaftenfeld lassen sich Breite, Tiefe und Drehung als Zahl eingeben (Meter mit Komma, Grad auf 1° genau), und der neue Name steht sofort auf dem Plan (EDIT3-05, EDIT3-06)
**Hinweis**: Der neue Editor ersetzt in dieser Phase den Plan-Bildschirm und die schreibgeschützte Vorschau (`GardenPlanView`). Ein einfacher Übergang zum Anlegen von Elementen genügt, damit sich alles am Gerät prüfen lässt; die volle Palette folgt in Phase 31. Der Icon-Satz wird hier mit der Werkzeugleiste gewählt, die app-weite Ablösung von Emoji und Glyphen bleibt Phase 38 (DESIGN3-04). Speichern läuft noch über den bestehenden Pfad; die Verlässlichkeit folgt in Phase 31.
**Plans**: ~5 (Tokens und Schriften; Token-Migration der bestehenden Bildschirme; Helfer und Interaktions-Controller; Tafel-Renderer, Pointer-Adapter und Viewport; Griffe, Umbenennen, Zahleneingabe)
**UI hint**: yes

### Phase 31: Editor im Alltag
**Goal**: Nutzer baut und ändert einen ganzen Plan im Editor, ohne dass eine Änderung verloren geht oder sich falsch zurücknehmen lässt.
**Depends on**: Phase 30
**Requirements**: EDIT3-09, EDIT3-10, EDIT3-11, EDIT3-16, EDIT3-17, EDIT3-18
**Success Criteria** (what must be TRUE):
  1. Nutzer wählt Beete, Pflanzen (mit Suche) und Anlagen aus einer Palette und setzt sie mit Vorschau auf den Plan; beim Setzen einer Pflanze erscheinen Abstands-Ring und Mischkultur-Hinweis (EDIT3-09, EDIT3-16)
  2. Das ausgewählte Element zeigt seine Maße auf eigenem Hintergrund; mehrere Elemente lassen sich auswählen und gemeinsam verschieben, duplizieren, nach vorn oder hinten legen und löschen, und ein Löschen lässt sich über einen Hinweis sofort zurücknehmen (EDIT3-10, EDIT3-16)
  3. Jede Änderung lässt sich rückgängig machen und wiederholen; das erste Rückgängig nach dem Öffnen leert den Plan nicht, und ein zurückgenommenes Anlegen taucht nach dem Neuladen nicht wieder auf (EDIT3-11)
  4. Am Desktop funktionieren Entf, Esc, Pfeiltasten (mit Umschalt in großen Schritten), Strg+Z, Strg+Y und Strg+A (EDIT3-17)
  5. Änderungen werden ohne Zutun gespeichert und der Speicherstatus ist sichtbar; wer direkt nach dem Verschieben den Tab schließt oder die App in den Hintergrund legt, findet die Änderung beim nächsten Öffnen vor (EDIT3-18)
**Hinweis**: WP 21.3 (Editor-Persistenz) aus dem Masterplan wird hier umgesetzt, nicht in Phase 33: Hydration ohne Schreiben und ohne Verlauf, Tombstone bei Rückgängig, Speichern beim Verlassen. Phase 33 prüft dasselbe gegen den Abgleich (SYNC3-05).
**Plans**: ~4 (Palette und Platzieren mit Ring; Mehrfachauswahl, Duplizieren, Z-Order, Löschen mit Rückgängig-Hinweis; Verlauf und Persistenz; Tastatur und Maßanzeige)
**UI hint**: yes

### Phase 32: Präzision und ein Editor
**Goal**: Der Plan lässt sich exakt anlegen: Pflanzen folgen ihrem Beet, Kanten rasten ein, Beete und Parzelle haben beliebige Umrisse, und es gibt nur noch den einen Editor, der auch bei 200 Elementen flüssig bleibt.
**Depends on**: Phase 31
**Requirements**: EDIT3-12, EDIT3-13, EDIT3-14, EDIT3-15, EDIT3-19
**Success Criteria** (what must be TRUE):
  1. Pflanzen, die in einem Beet stehen, wandern, drehen und skalieren mit dem Beet; Pflanzen außerhalb bleiben stehen (EDIT3-12)
  2. Beim Verschieben und Ziehen rasten Kanten am Raster und an Kanten und Mitten benachbarter Elemente ein, Hilfslinien zeigen Ausrichtung und gleiche Abstände, und ein Schalter stellt das Einrasten ab (EDIT3-13)
  3. Nutzer zeichnet ein Beet mit freiem Umriss durch Antippen der Ecken und kann danach Ecken verschieben, hinzufügen und entfernen; der Umriss folgt Drehen und Größenänderung (EDIT3-14)
  4. Nutzer ändert die Größe der Parzelle im Editor und legt ihre Grenze als Rechteck oder freien Umriss fest (EDIT3-15)
  5. Handy und Desktop öffnen denselben Editor; der Skia-Editor und die Web-Sonderkomponenten sind entfernt; mit 200 Elementen bleiben Verschieben und Zoomen auf Android-Chrome flüssig, auch mit Einrasten und Hilfslinien; die Bedienlogik ist ohne Browser getestet (EDIT3-19)
**Hinweis**: Die Lösch-Inventur und der Performance-Teil stammen aus WP 22.4/22.5 des Masterplans (Skia, `reanimated-color-picker` und Web-Sonderkomponenten raus, Bundle kleiner, Trace unter 16 ms je Bild im Median).
**Plans**: ~4 (Beet-Bindung der Pflanzen; Einrasten und Hilfslinien; freie Umrisse und Parzellengrenze; Aufräumen und Performance)
**UI hint**: yes

### Phase 33: Verlässlicher Sync
**Goal**: Zwei Personen bearbeiten denselben Garten auf drei Geräten, jede Änderung landet binnen Sekunden beim anderen, nichts geht still verloren, und das Backend ist wieder erreichbar und wird überwacht.
**Depends on**: Phase 32 (neuer Editor); manueller Schritt von Dirk, siehe Hinweis
**Requirements**: SYNC3-01, SYNC3-02, SYNC3-03, SYNC3-04, SYNC3-05, SYNC3-06, SYNC3-07, SYNC3-08, SYNC3-09
**Success Criteria** (what must be TRUE):
  1. Die App meldet sich wieder am Backend an, die Ursache des Ausfalls vom Oktober 2026 steht dokumentiert im Repository, und Dirk erhält binnen eines Tages eine Nachricht, wenn das Backend erneut ausfällt (SYNC3-01)
  2. Ein offline angelegtes Element erscheint nach dem nächsten Abgleich beim Partner, auch wenn dessen Gerät zwischendurch online war; ändern beide dasselbe Element, gewinnt die spätere Bearbeitung unabhängig davon, wer zuerst abgleicht, und wer überschrieben wurde, sieht einen Hinweis (SYNC3-02, SYNC3-03)
  3. Verschiebt eine Person ein Beet, sieht die andere es binnen 5 Sekunden (binnen 60 Sekunden ohne Live-Verbindung), auch im geöffneten Editor; das bloße Öffnen des Editors erzeugt nichts zum Abgleichen und ändert weder Bearbeiter noch Zeitstempel (SYNC3-04, SYNC3-05)
  4. Postleitzahl und Klimazone sind für beide gleich und überleben ein Neuladen; nach Abmelden oder Nutzerwechsel bleiben keine Daten des vorigen Kontos auf dem Gerät, und vor dem Abmelden warnt die App bei nicht abgeglichenen Änderungen (SYNC3-06, SYNC3-07)
  5. Gelöschte Elemente, entfernte Mitglieder und verbrauchte Einladungscodes verschwinden auch beim Partner; ein dauerhaft fehlerhafter Eintrag blockiert den Abgleich nicht, und der Speicherstatus sagt in verständlichen Worten, was aussteht und was fehlgeschlagen ist (SYNC3-08, SYNC3-09)
**Hinweis**: Manueller Schritt (nur Dirk): das Supabase-Projekt `vitrqkzxkiqvadqfzrcx` im Dashboard wiederherstellen; DB-Backup (M5) vor der ersten Migration. Der Schritt kann schon während der Phasen 30–32 erfolgen und blockiert erst SYNC3-01 und alles danach. Technische Spezifikation: Masterplan WP 21.1, 21.2, 21.4, 21.5 (WP 21.3 liegt in Phase 31; WP 21.6 Vereinsregeln-Reparatur entfällt → Backlog RULES-F1).
**Plans**: ~6 (Backend zurück, Ursache und Überwachung; Migration Sync-Cursor und Realtime-Publikation; SyncWorker-Umbau mit echtem Last-Write-Wins; Realtime-Brücke und Oberfläche; Garten-Postleitzahl, Abmelden und Bereinigung; Löschungen, Fehlerbehandlung und Speicherstatus)
**UI hint**: yes (Speicherstatus, Überschreib-Hinweis, Abmelde-Warnung)

### Phase 34: KI-Zugang mit Verbrauchsgrenze
**Goal**: Beide Gartenmitglieder nutzen KI-Funktionen über eine eigene Edge Function, ohne dass der API-Schlüssel je ein Gerät oder das Repository berührt, und das Monatsbudget bleibt unter Kontrolle.
**Depends on**: Phase 33 (zwei Konten, ein Garten, verlässlich abgeglichen); manuelle Schritte von Dirk, siehe Hinweis
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. Beide Gartenmitglieder lösen mit ihrer normalen Anmeldung eine Test-Anfrage aus und erhalten eine Antwort; eine Anfrage ohne Anmeldung oder von einem Nicht-Mitglied wird abgelehnt (AI-02)
  2. Die CI schlägt fehl, sobald ein Schlüssel im Repository oder im ausgelieferten Bundle steht, nachgewiesen mit einem absichtlich eingefügten Test-Schlüssel (AI-01)
  3. Beide sehen in der App, wie viel vom Monatsbudget verbraucht und wie viel übrig ist; jede Anfrage steht mit Garten, Person, Funktion, Token-Zahl und Kosten im Verbrauchsbuch (AI-03, AI-04)
  4. Der Besitzer stellt die Monatsgrenze ein (Vorgabe 100 $); bei 80 % erscheint eine Warnung, bei 100 % lehnt die App weitere KI-Anfragen bis zum Monatswechsel mit klarer Meldung ab (AI-05)
  5. Ohne Netz, bei erreichter Grenze, Dienstfehler, Ablehnung oder Überlastung sagt die App verständlich, was los ist, zeigt nie rohen Fehlertext und erlaubt erneutes Versuchen; alles ohne KI bleibt nutzbar; eine Person kann nur begrenzt viele Anfragen pro Stunde auslösen, und große Fotos werden vor dem Senden verkleinert (AI-06, AI-07, AI-08)
**Hinweis**: Manuelle Schritte (nur Dirk): API-Schlüssel als Secret der Edge Function hinterlegen (nie in Repository, Log oder Bundle) und das 100-$-Limit zusätzlich in der Anthropic Console setzen. Standardmodell `claude-opus-5-5` (`PROJECT.md`). Verbrauchsanzeige und Grenze liegen bis zu den Tabs in den bestehenden Einstellungen; Phase 37 zieht sie nach „Mehr“. Die Verkleinerung der Fotos entsteht hier als gemeinsamer Baustein und wird in Phase 35 genutzt.
**Plans**: ~4 (Edge Function mit Anmeldung, Mitgliedsprüfung und Schlüssel-Scan in der CI; Verbrauchsbuch mit Migration und RLS; Monatsgrenze, Stundenbegrenzung und Bild-Verkleinerung; Verbrauchsanzeige und verständliche Fehlermeldungen in der App)
**UI hint**: yes (Verbrauchsanzeige, Grenze einstellen, Fehlermeldungen)

### Phase 35: Foto-Abgleich
**Goal**: Nutzer gleicht Fotos mit dem Plan ab und erhält Befunde, die er einzeln annimmt oder ablehnt; der Plan und der Katalog ändern sich nie ohne seine Bestätigung.
**Depends on**: Phase 34 (KI-Zugang); Phasen 30–32 (Markierung auf dem Plan); Phase 33 (Befunde für den Partner)
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07, PHOTO-08, PHOTO-09, PHOTO-10, PHOTO-11
**Success Criteria** (what must be TRUE):
  1. Nutzer nimmt am Handy ein Foto auf oder wählt eines aus der Galerie (am Desktop eine Bilddatei) und sendet bis zu sechs Fotos aus verschiedenen Blickwinkeln in einem Abgleich (PHOTO-01, PHOTO-02)
  2. Weicht der Garten vom Plan ab (Größe, Lage, Name, nicht mehr vorhanden), erhält Nutzer einen Befund mit konkretem Änderungsvorschlag; erkennt die App etwas, das im Plan fehlt, schlägt sie die Aufnahme vor; jeder Befund zeigt seine Sicherheit, unsichere sind gekennzeichnet, und auf dem Plan ist markiert, auf welches Beet oder welche Stelle er sich bezieht (PHOTO-03, PHOTO-04, PHOTO-08, PHOTO-11)
  3. Nutzer nimmt jeden Befund einzeln an, lehnt ihn ab oder bearbeitet ihn vorher; ohne Bestätigung ändert sich nichts am Plan oder Katalog; das Foto wird nach dem Abgleich verworfen, nur die Befunde bleiben gespeichert, und offene Befunde sieht auch der Partner (PHOTO-07, PHOTO-10)
  4. Erkennt die App eine Pflanze außerhalb des Katalogs, schlägt sie einen Eintrag vor (Name, botanischer Name, Familie, Aussaat-, Pflanz- und Erntefenster, Abstand); nach dem Annehmen steht er beiden in Palette und Kalender zur Verfügung und lässt sich bearbeiten (PHOTO-05)
  5. Kann die App etwas nicht sicher bestimmen, bittet sie um eine Nahaufnahme und sagt, wovon, und aktualisiert den Befund, wenn Nutzer sie nachreicht; Schädlinge, Krankheiten und Entwicklungsstadium werden gemeldet, mit dem Angebot, daraus eine Aufgabe zu machen (PHOTO-06, PHOTO-09)
**Hinweis**: Befunde nutzen die vorhandene Struktur und Sichtung der Import-Bridge (`beds`, `plants`, `observations` mit Konfidenz; D-22). Reihenfolge innerhalb der Phase: Abgleich und Befunde zuerst, dann Katalogvorschlag, zuletzt Nahaufnahme und Schädlinge. Das Vormerken als Aufgabe (PHOTO-09) wird in Phase 36 zum Eintrag in der Liste (TASK-08). Forschung in der Planung: Prompt und strukturierte Ausgabe, Bildgrößen und Kosten je Abgleich.
**Plans**: ~7 (Aufnahme und Auswahl mit Mehrfach-Fotos; Abgleich-Function und Befundstruktur; Befund-Sichtung mit Plan-Markierung; Befunde speichern, teilen, Foto verwerfen; Katalogvorschlag; Nahaufnahme-Anfrage; Schädlinge, Krankheiten, Stadium)
**UI hint**: yes

### Phase 36: Aufgaben für heute
**Goal**: „Heute“ sagt auf Wunsch, was sich heute zu tun lohnt: Die Grundliste entsteht offline auf dem Gerät, die KI sortiert nach Wert und verfügbarer Zeit, und beide sehen den Erledigt-Status.
**Depends on**: Phase 33 (Erledigt-Status zwischen Geräten); Phase 34 (KI-Sortierung); Phase 35 (Aufgaben aus Foto-Befunden)
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07, TASK-08, TASK-09, TASK-10
**Success Criteria** (what must be TRUE):
  1. Die App öffnet mit „Heute“: Aufgabenliste und Zeitbudget-Auswahl stehen oben; auf Wunsch erscheint die Liste der heutigen Aufgaben aus Plan, Kalender, Jahreszeit und Klimazone, auch im Flugmodus, und jede Aufgabe nennt, was zu tun ist, wo, wie lange, wie dringend und in einem Satz warum (TASK-10, TASK-01, TASK-02)
  2. Nutzer gibt an, wie viele Minuten er hat, und erhält die wertvollsten Aufgaben, die hineinpassen, mit der Summe der Dauer; der Rest steht darunter als „Wenn noch Zeit bleibt“ (TASK-03)
  3. Nutzer hakt eine Aufgabe ab, der Partner sieht das binnen Sekunden, und die Aufgabe erscheint erst wieder, wenn sie erneut fällig ist; eigene Aufgaben (einmalig oder wiederkehrend, mit Dauer) erscheinen in den Listen und werden mitsortiert (TASK-05, TASK-06)
  4. Mit Netz verbessert die KI Reihenfolge und Begründung, und die Liste zeigt, dass sie KI-sortiert ist; bei unveränderten Eingaben bleibt die Liste eines Tages gleich, und die KI-Sortierung wird je Tag und Zeitbudget höchstens einmal berechnet (TASK-04, TASK-09)
  5. Frost, Regen und Hitze aus der Vorhersage für die Postleitzahl des Gartens verändern die Dringlichkeit, und die Begründung nennt das Wetter (ohne Netz gilt die zuletzt geladene Vorhersage oder keine); angenommene Foto-Befunde erscheinen als Aufgaben in der Liste (TASK-07, TASK-08)
**Hinweis**: Heute wird hier als Startbildschirm gebaut; die Tabs darum folgen in Phase 37. Forschung in der Planung: Wetterquelle (Vorhersage nach Postleitzahl, DSGVO-tauglich, ohne eigenen Schlüssel auf dem Gerät) und Regelwerk der Grundliste aus Kalender und Plan.
**Plans**: ~6 (Aufgabenmodell mit Migration, Sync und Erledigt-Status; Grundlisten-Regeln offline; Zeitbudget-Auswahl und Heute-Bildschirm; eigene und wiederkehrende Aufgaben; KI-Sortierung mit Tages-Zwischenspeicher; Wetter und Foto-Aufgaben)
**UI hint**: yes

### Phase 37: Navigation, Onboarding, Konto
**Goal**: Die Partnerin installiert die App, registriert sich mit Code und sieht in unter drei Minuten den gemeinsamen Plan; die App hat vier klare Bereiche, und nichts verdeckt Inhalte oder Knöpfe.
**Depends on**: Phase 36 (Inhalt von „Heute“); Phase 32 (schreibgeschützte Plan-Vorschau); Phase 33 (Beitritt und Einladungscodes); manueller Schritt von Dirk, siehe Hinweis
**Requirements**: NAV3-01, NAV3-02, NAV3-03, NAV3-04, NAV3-05, NAV3-06, NAV3-07
**Success Criteria** (what must be TRUE):
  1. Am Handy gibt es die Tabs Heute, Plan, Kalender und Mehr, am Desktop eine Seitenleiste; der Editor öffnet im Vollbild; jeder Bildschirm hat einen Titel und ist in höchstens zwei Schritten erreichbar (NAV3-01)
  2. Eine neue Person registriert sich mit Einladungscode und sieht in unter drei Minuten den gemeinsamen Plan; ohne Code führen drei Schritte (Gartengröße, Postleitzahl, Partner einladen oder Code eingeben) zu einem nutzbaren Plan (NAV3-02, NAV3-03)
  3. Nutzer setzt sein Passwort über einen sechsstelligen Code aus einer E-Mail zurück, auch in der installierten App ohne Wechsel in den Browser (NAV3-04)
  4. Statusleiste, Gestenleiste und Bildschirmtastatur verdecken nie Inhalte oder Knöpfe, etwa den Anmelden-Knopf bei geöffneter Tastatur (NAV3-05)
  5. Unter „Mehr“ ändert Nutzer den Gartennamen, sieht die Mitglieder, kopiert den Einladungscode, sieht den Speicherstatus und meldet sich ab; der Import aus dem Claude.ai-Projekt ist dort mit kurzer Anleitung erreichbar; Fehlermeldungen sind verständlich formuliert (NAV3-06, NAV3-07)
**Hinweis**: Manueller Schritt (nur Dirk, M4): E-Mail-Bestätigung im Dashboard ausschalten und das Reset-Template mit dem Code (`{{ .Token }}`) setzen, vor NAV3-04. Technische Spezifikation: Masterplan WP 23.1, 23.3, 23.4, 23.5 (WP 23.2 „Heute“ ist in Phase 36 aufgegangen).
**Plans**: ~4 (Tabs, Seitenleiste, Header und Vollbild-Editor; Onboarding und Beitritt per Code; Passwort-Reset und Sicherheitsabstände; „Mehr“ mit Garten, Konto und Import)
**UI hint**: yes

### Phase 38: Feinschliff
**Goal**: Die App wirkt überall wie aus einem Guss, spricht Klartext, ist im Freien lesbar und nennt offen, was mit Fotos geschieht.
**Depends on**: Phase 37 (alle Bildschirme und „Mehr“ existieren); manueller Schritt von Dirk, siehe Hinweis
**Requirements**: DESIGN3-04, DESIGN3-05, DESIGN3-06, DESIGN3-07, DESIGN3-08
**Success Criteria** (what must be TRUE):
  1. Auf jedem Bildschirm erscheint derselbe Icon-Satz; Emoji, Unicode-Glyphen und Text-Pfeile dienen nirgends mehr als Bedienelement (DESIGN3-04)
  2. Ein Durchgang durch alle Bildschirme zeigt keine Fachbegriffe oder internen Bezeichnungen; alle Texte stehen in `de.json`, und ein Test schlägt bei Rückfällen fehl (DESIGN3-05)
  3. Der Kalender folgt dem neuen Stil und zeigt eine Heute-Markierung, eine Suche und die Abschnitte „In eurem Plan“ und „Alle Pflanzen“ (DESIGN3-07)
  4. Auf dem Handy im Freien sind Texte und Linien lesbar: Kontrast AA, Linien mindestens 1 px, Bedienflächen mindestens 48 px, und bei 130 % Schriftvergrößerung ist nichts abgeschnitten (DESIGN3-06)
  5. Unter „Mehr“ findet Nutzer Datenschutzhinweise mit einem Abschnitt zur Übermittlung von Fotos an Anthropic, das Impressum sowie Version und Build (DESIGN3-08)
**Hinweis**: Manueller Schritt (nur Dirk, M7): Impressum-Text liefern, vor DESIGN3-08. Technische Spezifikation: Masterplan WP 24.2–24.6 (Stil dort durch „Feldführer“ ersetzt).
**Plans**: ~4 (Icon-Satz app-weit; Klartext und `de.json`-Test; Kalender; Lesbarkeit im Freien, Datenschutz, Impressum und Version)
**UI hint**: yes

### Phase 39: Abnahme und Release
**Goal**: Beide Android-Handys und der Desktop bestehen die Prüfliste, die tatsächlichen KI-Kosten sind gemessen, und v3.0 ist ausgeliefert.
**Depends on**: Phasen 30–38
**Requirements**: UAT3-01, UAT3-02, UAT3-03
**Success Criteria** (what must be TRUE):
  1. Die Prüfliste für Editor, Sync, Foto-Abgleich, Aufgaben, Onboarding und die offene Abnahme aus v2.0 Phase 20 (Installation, Teilen-Menü, Offline-Start) ist auf beiden Android-Handys und am Desktop bestanden (UAT3-01)
  2. Jeder bei der Abnahme gefundene Fehler ist behoben und durch einen Regressionstest abgesichert (UAT3-01)
  3. Die tatsächlichen Kosten je Foto-Abgleich und je Aufgaben-Sortierung stehen im Verbrauchsbuch und sind dokumentiert; bei üblicher Nutzung durch zwei Personen bleibt der Monat unter der Grenze (UAT3-02)
  4. Das Repository trägt den Tag `v3.0.0`, und README und Projekt-Dokumente beschreiben die ausgelieferte App (UAT3-03)
**Plans**: ~2 (Prüfliste, Geräte-Abnahme und Fehlerrunde; Kostenmessung und Release)

## Absorbiert aus v2.0/v2.1

Die früheren Phasen 21–29 aus dem Masterplan sind nicht mehr als Phasen geplant; ihre Arbeitspakete (WP-Namen) bleiben als Spezifikation gültig.

| Alt | Neu |
|---|---|
| 7.5b Web Editor Polish | Phasen 30–32 |
| 21 Sync und Datenintegrität | Phase 33; WP 21.3 (Editor-Persistenz) in Phase 31; WP 21.6 (Vereinsregeln-Reparatur) → Backlog RULES-F1 |
| 22 Ein Editor für Maus und Touch | Phasen 30–32 |
| 23 Navigation, Onboarding, Auth | Phase 36 („Heute“, WP 23.2) und Phase 37 |
| 24 Design-System, Copy, Politur | Phase 30 (Fundament) und Phase 38 (Feinschliff); Stil „Feldführer“ statt „Papier & Erde“ |
| 25 Geräte-Abnahme | Phase 39 |
| 26 Wochenaufgaben | Phase 36 |
| 11 / 27 Garten-Journal | Backlog (GARDEN-F1) |
| 28 / 15 Saisonwechsel und Fruchtfolge-Memory | Backlog (GARDEN-F3) |
| 29 SDK-Angleichung und optionales APK | Backlog (TECH-F1, TECH-F2) |
| 12 Task-Generator | Phase 36 |
| 13 Saatgut-Inventar | Backlog (GARDEN-F4) |
| 14 Modernes Design | Phasen 30 und 38 |
| 16 Vereinsregeln-Aktivierung | Backlog (RULES-F1) |
| 17 Stale-Imports + Sharing-UX | Phase 37 (NAV3-06, NAV3-07) |

## Progress

**Execution Order:**
Phasen laufen in numerischer Reihenfolge: 30 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39. Die Plananzahl von v3.0 ist eine Schätzung und wird in `/gsd-plan-phase` festgelegt.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1–7.5a (v1.0) | 34/34 | ✅ Shipped | 2026-05-17 |
| 8–10 (v1.1) | 23/23 | ✅ Shipped | 2026-09-09 |
| 20 (v2.0; 21–25 in v3.0 aufgegangen) | 4/4 | ✅ Shipped (Geräte-Abnahme → Phase 39) | 2026-09-29 |
| 30. Feldführer-Fundament und Editor-Kern | 0/~5 | Not started | - |
| 31. Editor im Alltag | 0/~4 | Not started | - |
| 32. Präzision und ein Editor | 0/~4 | Not started | - |
| 33. Verlässlicher Sync | 0/~6 | Not started | - |
| 34. KI-Zugang mit Verbrauchsgrenze | 0/~4 | Not started | - |
| 35. Foto-Abgleich | 0/~7 | Not started | - |
| 36. Aufgaben für heute | 0/~6 | Not started | - |
| 37. Navigation, Onboarding, Konto | 0/~4 | Not started | - |
| 38. Feinschliff | 0/~4 | Not started | - |
| 39. Abnahme und Release | 0/~2 | Not started | - |

## Backlog

Siehe `.planning/BACKLOG.md` (999.x), die „Future Requirements“ in `REQUIREMENTS.md` (TASK-F1..F4, GARDEN-F1..F5, RULES-F1, TECH-F1..F3) und Masterplan Kap. 4.4 (Frost-Warnung, Plan-Export, JSON-Export, iCal, Companion-Score, Saatgut-Inventar, Vereinsregeln-Aktivierung, Dark-Mode, iOS, Lokal-Modus vollständig).

---

## Roadmap Evolution (Decisions Log)

- **2026-11-14 (Roadmap v3.0)**: 75 Anforderungen auf Phasen 30–39 verteilt. Der Editor ist in drei Phasen geteilt (Kern mit Design-Fundament, Alltag, Präzision), damit jede am Gerät einzeln prüfbar ist. Sync vor allem Geteilten, KI-Zugang vor Foto-Abgleich und Aufgaben-Sortierung, „Heute“ vor den Tabs.
- **2026-11-13 (Pivot v3.0)**: In-App-KI über eigenen API-Schlüssel (D-16/D-17), Design „Feldführer“ (D-18), analysierte Fotos werden nicht gespeichert (D-19). v2.0 nach Phase 20 geschlossen, Phasen 21–25 und die Wochenaufgaben aus v2.1 in v3.0 aufgegangen, Nummerierung ab 30 (D-20).
- **2026-09-09 (v2-Pivot)**: Fünf Audits (Datenschicht/Sync, UX/Design, Editor, Distribution, Build-Health) → `MASTERPLAN-v2.md`. Milestone v1.1 abgeschlossen und archiviert; v1.0-Phasenverzeichnisse nach `milestones/v1.0-phases/`. Beide Nutzer Android → PWA statt nativ. Lokal-Modus und Vereinsregeln bleiben (D-04/D-05).
- **2026-06-11**: Feature-Sweep (Marktrecherche + 4 Referenz-App-Analysen), Backlog 999.2–999.12.
- **2026-05-17**: Desktop primär + Saison-2026-Hot-Path (Phasen 8–10 vorgezogen).
- **2026-05-08 (Pivot M07)**: Null In-App-AI, Claude.ai-Bridge (ab 2026-11-13 durch D-16 ergänzt: die Bridge bleibt als zweiter Weg).
- **2026-04-21 (Pivot)**: 2-User Shared Garden.

---

*Last updated: 2026-11-14 — Roadmap für Milestone v3.0 „Garten mit KI“ erstellt (Phasen 30–39)*
