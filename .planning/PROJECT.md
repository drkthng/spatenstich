# Kleingarten-App

## What This Is

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Zwei Personen (Dirk + Partnerin) pflegen über eigene Konten und Geräte (**Android-Handys + Desktop-Browser**) denselben Garten: Sie zeichnen und ändern den Plan in einem exakten 2D-Editor, sehen den Aussaatkalender und bekommen auf Wunsch eine Aufgabenliste für heute. **Seit dem Pivot vom 2026-11-13 nutzt die App die Claude-API über Dirks eigenen API-Schlüssel (Budget 100 $/Monat):** Sie gleicht Gartenfotos mit dem Plan ab und sortiert Aufgaben nach Wert und verfügbarer Zeit. Ausgeliefert wird sie als installierbare Web-App (PWA) auf Cloudflare Pages mit Supabase.

## Core Value

Ein Gartenplan, den beide gemeinsam exakt pflegen können, und eine App, die daraus sagt, was heute zu tun ist. Der Editor ist das Herzstück: Wenn alles andere ausfällt, muss sich jedes Element verschieben, in der Größe ändern, drehen und benennen lassen, am Handy wie am Desktop.

## Current State (nach v2.0-Teilabschluss, Stand 2026-11-13)

- Codebasis: rund 23.400 Zeilen TS/TSX/SQL (ohne Tests). Expo 53.0.27 mit React Native 0.76.7 / React 18.3.1 / expo-router 4 (SDK-Mix, Web-Export funktioniert).
- Ausgeliefert: PWA unter `https://spatenstich.pages.dev` (Deploy bei Push auf `master`), installierbar, mit Teilen-Ziel und Service Worker (v2.0 Phase 20). Geräte-Abnahme von Phase 20 steht noch aus.
- Funktional vorhanden: Auth, Shared Garden mit Einladungscode, Offline-Speicher + Outbox, Import-Bridge mit Sichtung, Web-Editor (nur Maus), Pflanzen-DB (90 Pflanzen), Companion-Hinweis, Aussaatkalender.
- **Offen aus v2.0:** Editor reagiert nicht auf Touch und hat weder Zoom noch Pan; Sync verliert Partner-Änderungen (Diagnose S1–S10 in `MASTERPLAN-v2.md` Kap. 1.4); kein Onboarding, keine Tabs, kein Design-System; keine Aufgabenliste.
- **Backend nicht erreichbar:** Der Hostname des Supabase-Projekts `vitrqkzxkiqvadqfzrcx` löst seit Anfang Oktober 2026 nicht mehr auf (Keep-alive zuletzt erfolgreich am 2026-10-04). Dirk stellt das Projekt im Dashboard wieder her. Login, Sync und alle KI-Funktionen hängen daran; der Editor nicht.

## Current Milestone: v3.0 Garten mit KI

**Goal:** Beide planen den Garten an Handy und Desktop in einem exakten Editor, und die App nutzt Dirks Claude-API-Budget, um den Plan aus Fotos aktuell zu halten und zu sagen, was sich heute zu tun lohnt.

**Target features:**
- Ein Editor für Finger und Maus: jedes Element verschieben, in der Größe ändern, einseitig ziehen, drehen und umbenennen; Zoom und Pan
- Design-System „Feldführer" in der ganzen App (Sketch 001, `.planning/sketches/`)
- KI-Zugang: API-Schlüssel als Server-Secret hinter einer Edge Function, von beiden Konten nutzbar, mit Verbrauchsanzeige und Monatsgrenze
- Foto-Abgleich: Foto gegen Plan, Vorschläge über die bestehende Sichtung, Katalogvorschlag für Unbekanntes, Bitte um Nahaufnahme bei Unklarem
- Aufgaben: Tagesliste auf Wunsch und „Ich habe N Minuten" mit den wertvollsten Aufgaben; Grundliste offline, KI sortiert
- Verlässlicher Sync zwischen zwei Personen und drei Geräten
- Tabs, Onboarding, Beitritt per Code, Passwort-Reset, Abnahme auf beiden Handys und am Desktop

## Requirements

### Validated

- ✓ Monorepo, StorageAdapter (SQLite/IndexedDB), Supabase-Schema mit RLS, CI — v1.0
- ✓ Account-Auth (E-Mail/Passwort), persistente Session, PLZ→Klimazone-Lookup — v1.0 (PLZ-Persistenz im Account-Modus defekt → v3.0 SYNC)
- ✓ Shared Garden: `gardens` + `garden_members`, Member-RLS, 6-stelliger Invite-Code per SECURITY-DEFINER-RPC — v1.0
- ✓ Offline-Outbox mit Delta-Pull, LWW-Guard-Trigger, Sync-Status-Badge — v1.0 (Semantik fehlerhaft → v3.0 SYNC)
- ✓ Import-Schema `spatenstich-import.v1`, Companion-Prompt, Paste-/Datei-Import, Preview mit Konfidenz, Draft-Tabellen — v1.0
- ✓ Draft-Sichtung + Promotion zu `plan_elements` mit Provenance — v1.0
- ✓ Web-Plan-Editor (SVG, Maus): Select, Multi-Select, Drag, Drag-to-create, Resize, Rotate, Properties, Z-Order, Undo/Redo, Layer, Grid, Autosave — v1.0/v1.1
- ✓ Pflanzen-DB (90 Pflanzen, 38 Companion-Paare), `usePlants`, Edge Function `seed-plants` — v1.1
- ✓ Companion-Hinweis beim Pflanzen-Setzen — v1.1
- ✓ Aussaatkalender v1 (CAL-01..CAL-06) — v1.1 (UAT 8/8 Desktop)
- ✓ DEPLOY: Lint/CI grün, Legacy (Foto-Pipeline, Feature-Flags, GPS-Opt-in) entfernt, PWA-Shell mit Teilen-Ziel und Service Worker, Cloudflare-Pages-Deploy, Keep-alive-Workflow — v2.0 Phase 20 (Geräte-Abnahme offen → v3.0 UAT)

### Active (v3.0 — Details und IDs in `REQUIREMENTS.md`)

- [ ] EDIT: ein Editor für Touch und Maus mit Verschieben, Größe, einseitigem Ziehen, Drehen, Umbenennen, Zoom/Pan
- [ ] DESIGN: Feldführer-Tokens, Schriften, Plan-Zeichenstil, Texte ohne Jargon
- [ ] SYNC: korrektes Last-Write-Wins nach Bearbeitungszeit, Realtime, keine stillen Verluste
- [ ] AI: Edge Function mit Server-Secret, Verbrauchsbuch, Monatsgrenze, für beide Konten
- [ ] PHOTO: Foto-Abgleich mit Plan, Katalogvorschlag, Nahaufnahme-Anfrage
- [ ] TASK: Tagesliste, Zeitbudget-Liste, Erledigt-Status für beide sichtbar
- [ ] NAV: Tabs, „Heute", Onboarding, Beitritt per Code, Passwort-Reset
- [ ] UAT: Abnahme auf beiden Android-Handys und am Desktop

### Out of Scope

- **KI-Aufrufe direkt aus dem Client** — der API-Schlüssel darf nie im Bundle oder auf einem Gerät liegen; KI läuft nur über die eigene Edge Function (Secret-Scan in CI bleibt aktiv)
- **Speichern analysierter Fotos** — Entscheidung 2026-11-13: Foto wird zur Analyse gesendet und verworfen, gespeichert werden nur die Befunde
- **Nativer Build** — D-01 bestätigt 2026-11-13: installierte Web-App reicht; Android-APK bleibt Option nach v3.0
- **iPhone/iOS** — beide Nutzer haben Android; die PWA liefe dort auch, nur ohne Teilen-Menü
- **Heimserver/VPS-Betrieb** — D-02
- **Lokal-Modus-Vollausbau** — D-04: Code bleibt, unsichtbar
- **Vereinsregeln-Aktivierung** — D-05: Code bleibt hinter `FEATURES.vereinsregeln`; PDF-Extraktion dauerhaft gestrichen
- **Automatische Plan-Änderungen durch KI ohne Bestätigung** — jede KI-Änderung am Plan geht durch die Sichtung
- Push-Benachrichtigungen, Garten-Journal, Saisonwechsel/Fruchtfolge-Memory, Saatgut-Inventar, Frost-Warnung, Plan-Export, iCal, Dark-Mode — Backlog (`BACKLOG.md`, Masterplan Kap. 4.4, frühere v2.1-Phasen 27–29)
- Social features, Marktplatz, AT/CH-Lokalisierung, 3D/AR, Mehr-als-2-Personen-Gärten — später oder nie

## Context

- **Primäre Nutzer:** Dirk (Product Owner) + Partnerin im Shared Garden Model. Beide Android-Handys (Chrome) + Desktop-Browser.
- **Distribution (D-01/D-02):** PWA auf Cloudflare Pages (Free), Supabase mit Keep-alive (GitHub Actions + 24/7-PC). Der Keep-alive hat das Verschwinden des Backends im Oktober 2026 nicht verhindert; Ursache ist offen und gehört in die Sync-Phase.
- **KI-Strategie (ab 2026-11-13):** Die App ruft die Claude-API über eine Supabase Edge Function auf. Der API-Schlüssel ist ein Server-Secret, beide Gartenmitglieder nutzen ihn über ihre normale Anmeldung. Budget 100 $/Monat, als harte Grenze zusätzlich in der Anthropic Console zu setzen. Standardmodell Claude Opus 5.5 (`claude-opus-5-5`). Die bestehende Claude.ai-Import-Bridge bleibt unverändert als zweiter Weg.
- **Wiederverwendung:** Der Foto-Abgleich liefert Vorschläge in derselben Struktur wie der Import (`beds`, `plants`, `observations` mit Konfidenz) und nutzt Sichtung und Promotion aus v1.0.
- **Regulatorischer Kontext:** BKleingG 1/3-Nutzgartenpflicht, Vereinsregeln — Aktivierung nach v3.0.
- **Geo-Scope:** Deutschland, 7 Klimazonen via PLZ; Klimazone gehört zum Garten (D-10).
- **Open-Source-Kern:** AGPL-3.0, Repo public. Folge: Der API-Schlüssel darf in keinem Commit, Log oder Bundle auftauchen.
- **Gestaltung:** „Feldführer" — wie ein gut gemachtes Pflanzenbuch: Serifen (Fraunces, Newsreader), Tinte auf warmem Weiß, Haarlinien statt Karten und Schatten, der Plan als vermessene Tafel. Aus fünf Richtungen gewählt in Sketch 001 (`.planning/sketches/MANIFEST.md`). Die frühere Spezifikation „Papier & Erde" (Masterplan Kap. 3.4) ist ersetzt.
- **Detail-Spezifikation:** `MASTERPLAN-v2.md` bleibt gültig für Sync (WP 21.x, Kap. 3.5), Editor-Mechanik (WP 22.x) und Navigation/Onboarding/Auth (WP 23.x, Kap. 3.3). Ersetzt sind Kap. 3.4 (Design) und die Entscheidungen gegen In-App-KI.

## Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export, aktuell Expo 53.0.27 / RN 0.76.7 / React 18.3.1 / expo-router 4 — web-first, kein nativer Build. Ziel-Browser Chrome auf Android (D-15) und Desktop-Browser.
- **Backend:** Supabase Frankfurt (Postgres + Auth + Realtime + Edge Functions). RLS immer Member-Check. Migrationen append-only, 3-Gate-Push.
- **KI nur serverseitig:** Aufrufe ausschließlich aus der Edge Function mit dem offiziellen Anthropic-SDK. Kein Schlüssel im Client. Jede Anfrage wird dem Garten zugeordnet und im Verbrauchsbuch erfasst; bei erreichter Monatsgrenze lehnt die Function ab.
- **Offline:** App-Shell, letzter Plan und die Grund-Aufgabenliste funktionieren ohne Netz. Foto-Abgleich und KI-Sortierung brauchen Verbindung und sagen das klar.
- **Plan-Rendering:** SVG im Web-DOM, ein `PlanEditor` mit Pointer-Events; Skia wird entfernt (D-03).
- **Lokale Persistenz:** IndexedDB hinter `StorageAdapter`; Outbox + LWW nach Client-Bearbeitungszeit, Pull-Cursor `server_updated_at` (D-07).
- **Datenschutz:** Fotos verlassen das Gerät nur zur Analyse (Edge Function → Anthropic API) und werden nicht gespeichert; gespeichert und synchronisiert werden nur Befunde. EU-Hosting für alle gespeicherten Daten. Datenschutzerklärung in der App nennt die Übermittlung an Anthropic.
- **Monorepo:** pnpm workspaces `app/`, `supabase/`, `packages/shared`. UI-Strings nur in `de.json`, UTF-8-Umlaute.
- **Timeline:** Nutzbar zum Vorkultur-Start der Saison 2027 (Ende Februar 2027). Reihenfolge: Editor zuerst.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo (React Native) statt PWA-only oder Native | Eine Codebase; TypeScript | ⚠️ Revisit: web-first bewährt, nativ nie gebaut; Stack bleibt, Auslieferung als PWA |
| Supabase (Frankfurt) als Backend | Postgres + Auth + RLS, EU | ⚠️ Revisit: Projekt seit Oktober 2026 nicht erreichbar, Ursache offen |
| Null In-App KI-API-Aufrufe (Pivot M07) | Kosten, Datenschutz | ✗ Aufgehoben 2026-11-13 → D-16 |
| Claude.ai Bridge statt In-App AI | One-way JSON-Import | ✓ Good als zweiter Weg; nicht mehr der einzige |
| Manueller Plan-Editor als Default | Import ist Beschleuniger | ✓ Good |
| 2-User Shared Garden | Nutzungsrealität | ✓ Good |
| AGPL-3.0 | Schutz vor proprietären Clones | ✓ Good |
| Skia-Editor für iPhone (Phase 7) | 60 fps @ 200 Elemente | ✗ Verworfen: nie auf Gerät gelaufen → D-03 |
| Custom Outbox-Sync mit LWW (Phase 3) | Einfach für 2 Nutzer | ⚠️ Revisit: Trigger-Semantik falsch → D-07 |
| Feature-Flags über Supabase-Tabelle | Schnelle Experimente | ✗ Ersetzt durch Compile-Time-Konstante (v2.0 Phase 20) |
| **D-01 PWA statt nativ** (2026-09-09) | 0 €, Android-Chrome liefert Teilen/Push/Speicher | ✓ Good: live seit 2026-09-29, bestätigt 2026-11-13 |
| **D-02 Cloudflare Pages + Supabase Free** | 0 €, SPA-Fallback, Keep-alive | ⚠️ Revisit: Deploy gut, Backend-Ausfall trotz Keep-alive |
| **D-03 Ein Pointer-Event-Editor, Skia raus** | Maus + Touch + Stift, testbar ohne DOM | — Pending (v3.0) |
| **D-04 Lokal-Modus bleibt, unsichtbar** | User-Wunsch; Vollausbau später | ✓ Good (v2.0 Phase 20: crashfrei) |
| **D-05 Vereinsregeln bleiben, Reparatur + Flag** | User-Wunsch | — Pending (Flag gesetzt, Reparatur offen) |
| **D-06 Foto-/Flag-/GPS-Reste löschen** | M07 zu Ende führen | ✓ Erledigt (v2.0 Phase 20); Foto-Abgleich kommt in v3.0 neu und anders zurück |
| **D-07 Client-`updated_at` = LWW, `server_updated_at` = Cursor, Realtime** | behebt S1/S2/S4 | — Pending (v3.0) |
| **D-08 Vier Tabs, Editor Vollbild** | Daily-Use-Frage auf Tab 1 | — Pending (v3.0) |
| **D-09 Onboarding 3 Schritte, Invite bei Registrierung** | < 5 min | — Pending (v3.0) |
| **D-10 PLZ/Klimazone am Garten** | beide teilen die Zone | — Pending (v3.0) |
| **D-11 „Papier & Erde", light-only, Nunito + Caveat** | Tokens zuerst | ✗ Ersetzt 2026-11-13 → D-18 (light-only bleibt) |
| **D-12 Passwort-Reset per Code** | funktioniert in Browser und App | — Pending (v3.0) |
| **D-13 SDK-Angleichung nach Auslieferung** | erst nutzbar, dann sauber | — Pending (nach v3.0) |
| **D-14 Partnerin: eigener Free-Claude-Account** | ToS-konform, kostenneutral | ✓ Good, nur noch für die optionale Import-Bridge nötig |
| **D-15 Ziel-Browser Chrome/Android, kein iOS** | beide Android | ✓ Good |
| **D-16 In-App-KI über eigenen API-Schlüssel** (2026-11-13) | 100 $/Monat Budget vorhanden; Foto-Abgleich und Aufgaben-Sortierung brauchen ein Modell in der App | — Pending |
| **D-17 Schlüssel nur als Server-Secret hinter Edge Function, Verbrauchsbuch pro Garten** | Repo ist public; beide sollen dasselbe Budget nutzen, ohne den Schlüssel zu kennen | — Pending |
| **D-18 Design „Feldführer"** (Sketch 001) | erkennbar eigen, elegant durch Schrift und Linie, im Tageslicht lesbar | — Pending |
| **D-19 Analysierte Fotos werden nicht gespeichert** | wenig personenbezogene Daten auf dem Server, kein Storage-Umfang | — Pending |
| **D-20 v2.0 vorzeitig geschlossen, v3.0 ab Phase 30** | nur Phase 20 ausgeliefert; Pivot ändert Ziel und Reihenfolge; keine Kollision mit Masterplan-Nummern 21–29 | — Pending |
| **D-21 Griff-Trefferflächen außerhalb des Elements, nach innen begrenzt** (Sketch 001) | sonst lässt sich ein kleines ausgewähltes Beet weder ziehen noch umbenennen | — Pending |
| **D-22 KI ändert den Plan nie ohne Bestätigung** | Vertrauen in den Plan; alles läuft durch die Sichtung | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

<details>
<summary>Archiv</summary>

- Requirements-Übersicht vor v2 (M07/M2–M6-Blöcke): `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-ROADMAP.md`.
- v2.0 „Handy-Ready" (vorzeitig geschlossen 2026-11-13, nur Phase 20 ausgeliefert): `milestones/v2.0-ROADMAP.md`, `milestones/v2.0-REQUIREMENTS.md`, `milestones/v2.0-phases/`. Die geplanten v2.1-Phasen 26–29 (Wochenaufgaben, Journal, Saisonwechsel, SDK-Angleichung) sind dort als Kurzform erhalten; Wochenaufgaben sind in v3.0 TASK aufgegangen, der Rest ist Backlog.

</details>

---
*Last updated: 2026-11-13 after pivot — v2.0 vorzeitig geschlossen, v3.0 „Garten mit KI" angelegt*
