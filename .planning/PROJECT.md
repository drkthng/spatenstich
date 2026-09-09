# Kleingarten-App

## What This Is

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Die App ermöglicht manuelle Gartenplanung mit interaktivem 2D-Plan-Editor und kombiniert jahreszyklische Aussaat-/Pflanzplanung. Optional: KI-gestützte Analyse über externes Claude.ai-Projekt (Dirks Max-Abo), dessen strukturierte JSON-Ergebnisse per Import-Bridge in die App fließen. MVP für **2 Nutzer (Dirk + Partnerin) im Shared Garden Model** — beide bearbeiten unabhängig über eigene Accounts/Geräte (**Android-Handys + Desktop-Browser**) denselben Kleingarten. **Die App selbst macht null ausgehende KI-API-Aufrufe.** Ausgeliefert wird sie als installierbare Web-App (PWA) auf Cloudflare Pages mit Supabase Free — ohne laufende Kosten.

## Core Value

Manueller Plan-Editor + strukturierter Import aus Claude.ai: Dirk plant seine Parzelle digital — per Hand oder beschleunigt durch KI-Analyse im externen Claude.ai-Projekt. Die App ist der planbare Kleingarten-Assistent, den Paare gemeinsam pflegen können.

## Current State (nach v1.1, Stand 2026-09-09)

- Codebasis: 18.881 Zeilen TS/TSX (ohne Tests), 864 Tests grün, Typecheck grün, Web-Export 6,2 MB. Expo 53.0.27 mit React Native 0.76.7 / React 18.3.1 / expo-router 4 (SDK-Mix; Angleichung in Phase 29).
- Funktional vorhanden: Auth, Shared Garden mit Einladungscode, Offline-Speicher + Outbox, Import-Bridge, Draft-Sichtung, Web-Editor (Maus), Pflanzen-DB, Companion-Hinweis, Aussaatkalender.
- **Nie nativ auf einem Handy gelaufen.** Web-Editor ohne Touch, Sync-Semantik serverseitig fehlerhaft, kein Onboarding, keine Tabs, kein Design-System. Vollständige Diagnose: `MASTERPLAN-v2.md` Kap. 1.
- Betrieb: Supabase `vitrqkzxkiqvadqfzrcx` (Frankfurt), Migrationen 001–019 live, Repo public auf GitHub (AGPL-3.0), noch kein Web-Deploy.

## Next Milestone Goals (v2.0 „Handy-Ready", Phasen 20–25, Ziel Ende Oktober 2026)

Siehe `MASTERPLAN-v2.md`. Kurz: PWA auf beiden Android-Handys mit Teilen-Import aus der Claude-App; korrekter 2-Personen-Sync mit Realtime; ein Pointer-Event-Editor für Finger und Maus; Tabs + 3-Schritt-Onboarding + Passwort-Reset; Design-System „Papier & Erde"; Abnahme auf beiden Handys. Danach v2.1 „Saison 2027" (Wochenaufgaben, Journal, Fruchtfolge-Memory, SDK-Angleichung).

## Requirements

### Validated

- ✓ Monorepo, StorageAdapter (SQLite/IndexedDB), Supabase-Schema mit RLS, CI — v1.0
- ✓ Account-Auth (E-Mail/Passwort), persistente Session, PLZ→Klimazone-Lookup, Archetyp-Auswahl — v1.0 (PLZ-Persistenz im Account-Modus defekt → v2.0 SYNC2-05)
- ✓ Shared Garden: `gardens` + `garden_members`, Member-RLS, 6-stelliger Invite-Code per SECURITY-DEFINER-RPC — v1.0
- ✓ Offline-Outbox mit Delta-Pull, LWW-Guard-Trigger, Sync-Status-Badge — v1.0 (Semantik fehlerhaft → v2.0 SYNC2-01/02)
- ✓ Import-Schema `spatenstich-import.v1`, Companion-Prompt, Paste-/Datei-Import, Preview mit Konfidenz, Draft-Tabellen — v1.0
- ✓ Draft-Sichtung + Promotion zu `plan_elements` mit Provenance, Stale-Filter — v1.0
- ✓ Web-Plan-Editor (SVG, Maus): Select, Multi-Select, Drag, Drag-to-create, Resize, Rotate, Properties, Z-Order, Undo/Redo, Layer, Grid, Autosave — v1.0/v1.1
- ✓ Pflanzen-DB (90 Pflanzen, 38 Companion-Paare), `usePlants`, Edge Function `seed-plants` — v1.1
- ✓ Companion-Hinweis beim Pflanzen-Setzen (Konflikt/Companion-Toast, persistentes Dreieck) — v1.1
- ✓ Aussaatkalender v1 (CAL-01..CAL-06): Wochen-View, 12-Monats-Gantt, Klimazonen-Offset, „Nur meine Pflanzen", „Zu Plan hinzufügen", beet-scoped Fruchtfolge-Warnung — v1.1 (UAT 8/8 Desktop)

### Active (v2.0 — Details und IDs in `REQUIREMENTS.md`)

- [ ] DEPLOY: CI grün, Legacy entfernt, PWA installierbar mit Teilen-Ziel, Cloudflare-Pages-Deploy, Supabase-Keep-alive, Offline-Start
- [ ] SYNC2: `server_updated_at`-Cursor, echtes LWW nach Bearbeitungszeit, Hydration ohne Writes, Realtime + Polling, Logout-Cleanup, PLZ am Garten, Outbox-Härtung, Soft-Delete-Propagation, Vereinsregeln-Reparatur
- [ ] EDIT2: ein Pointer-Event-Editor (Controller + SVG-Renderer) für Touch und Maus mit Zoom/Pan, Polygon, Maßen, Abstands-Ring; Skia entfernt
- [ ] NAV: Tabs Heute/Plan/Kalender/Mehr, „Heute"-Screen, 3-Schritt-Onboarding, Beitritt per Code bei Registrierung, Passwort-Reset per Code, Safe-Areas + Tastatur
- [ ] DESIGN: Tokens „Papier & Erde", Nunito/Caveat, lucide + Illustrationen, alle Strings in `de.json` ohne Jargon, Kalender-Politur, Import-UX, Datenschutz/Impressum, Barrierefreiheit
- [ ] UAT: 23 Prüfpunkte auf beiden Android-Handys + Desktop, Tag v2.0.0

### Out of Scope

- **In-App KI-API-Aufrufe jeglicher Art** — Pivot M07 2026-05-08; KI nur im externen Claude.ai-Projekt
- **Foto-Analyse in der App** — Fotos nur im Claude.ai-Projekt; Journal-Fotos (v2.1) sind reine Ablage ohne Analyse
- **Nativer Build in v2.0** — D-01; Android-APK optional in Phase 29 (kostenlos per EAS Free + Sideload)
- **iPhone/iOS** — beide Nutzer haben Android (2026-09-09); PWA liefe dort auch, nur ohne Teilen-Menü; nativ bräuchte Apple Developer Program
- **Heimserver/VPS-Betrieb** — D-02; Cloudflare Pages + Supabase Free reicht, Fallback dokumentiert (Masterplan Kap. 3.1.3)
- **Expo Go** — nicht lauffähig (SDK-Mix, Share-Intent-Modul)
- **Lokal-Modus-Vollausbau** — D-04: Code bleibt, unsichtbar bis Backlog-Phase „Lokal-Modus vollständig"
- **Vereinsregeln-Aktivierung** — D-05: Code bleibt, Reparatur in WP 21.6, Aktivierung als Backlog 7 (alte Phase 16); PDF-Extraktion dauerhaft gestrichen
- Saatgut-Inventar, Frost-Warnung, Plan-Export, iCal, Companion-Score, Dark-Mode — Backlog (`BACKLOG.md`, Masterplan Kap. 4.4)
- Social features, Marktplatz, AT/CH-Lokalisierung, 3D/AR, Mehr-als-2-Personen-Gärten — v2+ oder nie

## Context

- **Primäre Nutzer:** Dirk (Product Owner) + Partnerin — Shared Garden Model seit 2026-04-21. Beide Android-Handys (Chrome) + Desktop-Browser. Partnerin nutzt für die Claude.ai-Bridge einen eigenen kostenlosen Claude-Account mit kopiertem Projekt (D-14).
- **Distribution (D-01/D-02):** PWA auf Cloudflare Pages (Free), Supabase Free mit Keep-alive-Cron (GitHub Actions + 24/7-PC). 0 € laufend. Nächtliches `pg_dump`-Backup vom 24/7-PC (Masterplan Kap. 7.4).
- **KI-Strategie (M07):** Null In-App-KI. Claude.ai-Projekt „Spatenstich Garden" emittiert `spatenstich-import.v1`; Import per Teilen-Menü (Web Share Target, Android), Zwischenablage oder Datei.
- **Regulatorischer Kontext:** BKleingG 1/3-Nutzgartenpflicht, Vereinsregeln — Aktivierung nach v2.1.
- **Geo-Scope:** Deutschland, 7 Klimazonen via PLZ; Klimazone gehört zum Garten (D-10).
- **Open-Source-Kern:** AGPL-3.0, Repo public.
- **Inspirations-Apps:** GrowVeg/GardenPlanner (Editor), Vera (DE UX), Fryd (Markt-Benchmark). Stil: gezeichnet, warm, nicht-klinisch → Design-System „Papier & Erde" (Masterplan Kap. 3.4).

## Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export, aktuell Expo 53.0.27 / RN 0.76.7 / React 18.3.1 / expo-router 4 — web-first, nativer Build deaktiviert bis Phase 29. Ziel-Browser Chrome auf Android (D-15).
- **Backend:** Supabase Frankfurt (Postgres + Auth + Realtime + Storage). RLS immer Member-Check. Migrationen append-only, 3-Gate-Push.
- **Keine In-App AI:** Zero outbound AI calls. Erlaubte externe Dienste: Supabase, Sentry (EU), später Open-Meteo.
- **Offline:** App-Shell + letzter Plan starten ohne Netz (Service Worker + IndexedDB). Sync erfordert Verbindung.
- **Plan-Rendering:** react-native-svg (Web-DOM), ein `PlanEditor` mit Pointer-Events; Skia entfernt (D-03).
- **Lokale Persistenz:** IndexedDB (Web) / expo-sqlite (nativ) hinter `StorageAdapter`; Outbox + LWW nach Client-Bearbeitungszeit, Pull-Cursor `server_updated_at` (D-07).
- **Datenschutz:** Fotos bleiben auf dem Gerät oder im Claude.ai-Chat; EU-Hosting; Impressum/Datenschutz in der App (Phase 24).
- **Monorepo:** pnpm workspaces `app/`, `supabase/`, `packages/shared`. UI-Strings nur in `de.json`, UTF-8-Umlaute.
- **Timeline:** v2.0 bis Ende Oktober 2026, v2.1 bis Ende Februar 2027 (Vorkultur-Start Saison 2027).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo (React Native) statt PWA-only oder Native | Eine Codebase; TypeScript | ⚠️ Revisit: web-first bewährt, nativ nie gebaut; Stack bleibt, Auslieferung als PWA |
| Supabase (Frankfurt) als Backend | Postgres + Auth + RLS, EU | ✓ Good |
| Null In-App KI-API-Aufrufe (Pivot M07) | Kosten, Datenschutz | ✓ Good |
| Claude.ai Bridge statt In-App AI | One-way JSON-Import | ✓ Good (Teilen-Menü auf Android macht den Weg kurz) |
| Manueller Plan-Editor als Default | Import ist Beschleuniger | ✓ Good |
| 2-User Shared Garden | Nutzungsrealität | ✓ Good |
| AGPL-3.0 | Schutz vor proprietären Clones | ✓ Good |
| Skia-Editor für iPhone (Phase 7) | 60 fps @ 200 Elemente | ✗ Verworfen: nie auf Gerät gelaufen, Handles/Palette unverdrahtet → D-03 |
| Custom Outbox-Sync mit LWW (Phase 3) | Einfach für 2 Nutzer | ⚠️ Revisit: Trigger-Semantik falsch → D-07 |
| Feature-Flags über Supabase-Tabelle | Schnelle Experimente | ✗ Nie benutzt → Compile-Time-Konstante (WP 20.2) |
| **D-01 PWA statt nativ** (2026-09-09) | 0 €, Android-Chrome liefert Teilen/Push/Speicher | — Pending (v2.0) |
| **D-02 Cloudflare Pages + Supabase Free** | 0 €, SPA-Fallback, Keep-alive | — Pending |
| **D-03 Ein Pointer-Event-Editor, Skia raus** | Maus + Touch + Stift, testbar ohne DOM | — Pending |
| **D-04 Lokal-Modus bleibt, unsichtbar** | User-Wunsch; Vollausbau später | — Pending |
| **D-05 Vereinsregeln bleiben, Reparatur + Flag** | User-Wunsch; 1 Tag Reparatur | — Pending |
| **D-06 Foto-/Flag-/GPS-Reste löschen** | M07 zu Ende führen | — Pending |
| **D-07 Client-`updated_at` = LWW, `server_updated_at` = Cursor, Realtime** | behebt S1/S2/S4 | — Pending |
| **D-08 Vier Tabs, Editor Vollbild** | Daily-Use-Frage auf Tab 1 | — Pending |
| **D-09 Onboarding 3 Schritte, Invite bei Registrierung** | < 5 min | — Pending |
| **D-10 PLZ/Klimazone am Garten** | beide teilen die Zone | — Pending |
| **D-11 „Papier & Erde", light-only, Nunito + Caveat** | Tokens zuerst | — Pending |
| **D-12 Passwort-Reset per Code** | funktioniert in Browser und App | — Pending |
| **D-13 SDK-Angleichung erst Phase 29** | erst nutzbar, dann sauber | — Pending |
| **D-14 Partnerin: eigener Free-Claude-Account** | ToS-konform, kostenneutral | — Pending |
| **D-15 Ziel-Browser Chrome/Android, kein iOS** | beide Android | — Pending |

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
<summary>Archiv: Requirements-Übersicht vor v2 (M07/M2–M6-Blöcke, Stand 2026-06-12)</summary>

Die früheren Active-Blöcke M07 (Manual Planning + Claude.ai Bridge), M2 (Plan-Editor), M3 (Saatgut-Inventar), M4 (Kalender), M5 (Profil), M6 (Shared Garden) und „Onboarding" sind in `milestones/v1.1-REQUIREMENTS.md` (Traceability) und `milestones/v1.1-ROADMAP.md` (Phasen-Details) archiviert. M3 bleibt Backlog; alles andere ist entweder validiert (oben) oder in den v2.0-Requirements neu gefasst.

</details>

---
*Last updated: 2026-09-09 after v1.1 milestone — v2.0 „Handy-Ready" angelegt (Masterplan v2)*
