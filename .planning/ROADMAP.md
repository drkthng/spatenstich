# Roadmap: Kleingarten-App (Spatenstich)

> **Quelle der Wahrheit für v2.x:** `.planning/MASTERPLAN-v2.md` (2026-09-08/09). Die Phasen 20–29 hier sind die Kurzform der dortigen Kapitel 4.1–4.2; Arbeitspakete, Akzeptanzkriterien, Datei-Referenzen und SQL stehen nur dort. Bei Widersprüchen gilt der Masterplan.

> **Pivot 2026-09-09 (v2):** Beide Nutzer haben Android-Handys. Auslieferung als installierbare Web-App (PWA, Chrome) statt nativem Build; ein Pointer-Event-SVG-Editor statt Skia; Sync-Kern neu (Client-`updated_at` als LWW-Wahrheit, `server_updated_at` als Pull-Cursor, Realtime). Entscheidungen D-01..D-15 im Masterplan Kap. 2.

## Milestones

- ✅ **v1.0 Foundation** — Phasen 1–7.5a (shipped 2026-05-17) — Archiv: `milestones/v1.1-ROADMAP.md` (enthält v1.0-Details), Phasen-Verzeichnisse in `milestones/v1.0-phases/`
- ✅ **v1.1 Saison 2026 Ready** — Phasen 8–10 (shipped 2026-09-09) — Archiv: `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-phases/`, `milestones/v1.1-quick/`
- 🚧 **v2.0 Handy-Ready** — Phasen 20–25 (in Arbeit, Ziel Ende Oktober 2026)
- 📋 **v2.1 Saison 2027** — Phasen 26–29 (geplant, Dezember 2026 – Februar 2027)

## Phases

<details>
<summary>✅ v1.0 Foundation (Phasen 1–7.5a) — SHIPPED 2026-05-17</summary>

- [x] Phase 1: Foundation — Monorepo, StorageAdapter, Supabase + RLS, CI (2026-04-17)
- [x] Phase 2: Auth & Profile — Account/lokal, PLZ/Klimazone, Archetyp; Vereinsregeln-Code hinter Flag (2026-04-20)
- [x] Phase 2.5: Shared Garden Model — gardens + garden_members, Member-RLS, Invite-Code (2026-04-23)
- [x] Phase 3: Offline & Sync — Outbox + 2-User-LWW (2026-06-10; Cross-Device-UAT übersprungen, siehe v2.0 Phase 21)
- [x] ~~Phase 4: Garten-Erfassung per Claude Vision~~ — SUPERSEDED durch Pivot M07
- [x] Phase 5: AI-Removal + Import-Schema `spatenstich-import.v1` (2026-05-09)
- [x] Phase 6: Import-Flow + Companion-Prompt (2026-05-09)
- [x] Phase 6.5: Draft-Sichtung + Promotion, Migration 017 (2026-05-12)
- [x] Phase 7: Plan-Editor (Skia, nativ) + Drafts-Tray, Migration 018 (2026-05-13; nie auf Gerät verifiziert, wird in v2.0 Phase 22 ersetzt)
- [x] Phase 7.5a: Web Plan-Editor (SVG, Maus) (2026-05-17)

</details>

<details>
<summary>✅ v1.1 Saison 2026 Ready (Phasen 8–10) — SHIPPED 2026-09-09</summary>

- [x] Phase 8: Plant-DB Foundation — 90 Pflanzen, 38 Companion-Paare, Migration 019 (2026-05-17)
- [x] Phase 9: Companion-Hinweis — Konflikt/Companion-Toast in beiden Editoren (2026-05-29)
- [x] Phase 9.1: Editor-Element-Bearbeitung — Resize/Rotate/Properties/Z-Order (2026-05-29)
- [x] Phase 10: Aussaatkalender v1 — Wochen-View, Gantt, Klimazone, Fruchtfolge-Warnung (2026-06-12, UAT 8/8)
- Phase 7.5b (Web Editor Polish) — nicht gestartet, absorbiert durch v2.0 Phase 22
- Quick-Tasks 260418–260616 — archiviert in `milestones/v1.1-quick/`

</details>

### 🚧 v2.0 Handy-Ready (Phasen 20–25, ~33 Entwicklertage)

- [ ] **Phase 20: Fundament, Aufräumen, PWA-Deploy** — CI grün, Legacy raus, Manifest mit Teilen-Ziel, Service Worker, Icon, Cloudflare Pages, Keep-alive
- [ ] **Phase 21: Sync und Datenintegrität** — server_updated_at-Cursor, echtes LWW, Hydration-Fix, Realtime, Logout-Cleanup, PLZ am Garten, Vereinsregeln-Reparatur
- [ ] **Phase 22: Ein Editor für Maus und Touch** — Interaction-Controller, SVG-Renderer, Pointer-Adapter, Zoom/Pan, Polygon, Maße, Skia raus
- [ ] **Phase 23: Navigation, Onboarding, Auth** — Tabs, „Heute", 3-Schritt-Onboarding, Beitritt per Code, Passwort-Reset, Safe-Areas
- [ ] **Phase 24: Design-System, Copy, Politur** — Tokens, Nunito/Caveat, lucide, Illustrationen, de.json ohne Jargon, Kalender-Politur, Datenschutz
- [ ] **Phase 25: Geräte-Abnahme** — 23 Prüfpunkte auf beiden Android-Handys + Desktop, Fix-Budget, Tag v2.0.0

### 📋 v2.1 Saison 2027 (Phasen 26–29, ~18 Entwicklertage)

- [ ] **Phase 26: Wochenaufgaben** — Task-Generator aus Plan + Kalender, done/snooze, optional Web Push
- [ ] **Phase 27: Garten-Journal** — Schnellnotizen pro Beet/Pflanze, optional Foto, Import-Beobachtungen
- [ ] **Phase 28: Saisonwechsel und Fruchtfolge-Memory** — season-Feld, Archivierung, 3-Jahres-Regel
- [ ] **Phase 29: SDK-Angleichung und optionales Android-APK** — aktuelles Expo-SDK, expo-doctor grün; APK nur auf Wunsch

## Phase Details

### Phase 20: Fundament, Aufräumen, PWA-Deploy

**Goal**: Repo sauber, CI grün, PWA live unter `https://spatenstich.pages.dev`, aus der Claude-App per Teilen importierbar, Supabase bleibt wach.
**Depends on**: —
**Requirements**: DEPLOY-01..DEPLOY-07
**Masterplan**: Kap. 4 → WP 20.1 (Repo-Hygiene + CI), 20.2 (Dead Code + Migration 020), 20.3 (PWA-Shell mit Teilen-Ziel), 20.4 (Deploy + Keep-alive)
**Success Criteria**:
1. `pnpm -r run lint` exit 0; CI-Workflow mit `EXPO_PUBLIC_*`-Vars grün
2. Foto-Pipeline, Feature-Flags, GPS-Opt-in, `expo-share-intent` entfernt; Migration 020 live (Buckets nur wenn leer)
3. Lighthouse „installable"; Chrome „App installieren" auf beiden Handys; Flugmodus-Start zeigt letzten Plan
4. Claude-App → Teilen → „Spatenstich" → Import-Vorschau (Datei und Text)
5. Push auf master → Deploy < 10 min; Keep-alive-Workflow läuft
**Plans**: 4 (je ein WP)
**UI hint**: yes (Install-Banner, Import-Einstieg)

### Phase 21: Sync und Datenintegrität

**Goal**: Zwei Personen bearbeiten denselben Garten auf drei Geräten, jede Änderung landet in Sekunden beim anderen, keine stillen Verluste.
**Depends on**: Phase 20 (WP 20.2)
**Requirements**: SYNC2-01..SYNC2-09
**Masterplan**: WP 21.1 (Migration 021/022), 21.2 (SyncWorker), 21.3 (Editor-Persistenz), 21.4 (Realtime + UI-Invalidierung), 21.5 (Konto/Garten/Bootstrap), 21.6 (Vereinsregeln-Reparatur, D-05)
**Success Criteria**:
1. Gerät B legt Beet offline an, A war zwischenzeitlich online → Beet erscheint bei A nach B's Sync
2. Beide ändern dasselbe Element offline; die spätere Bearbeitung gewinnt unabhängig von der Sync-Reihenfolge; Verlierer bekommt Toast
3. Editor öffnen erzeugt 0 Outbox-Einträge; Undo nach Anlegen löscht auch auf Gerät B
4. Partner-Änderung sichtbar < 5 s (Realtime) bzw. < 60 s (Polling)
5. PLZ/Klimazone überleben Reload und sind für beide gleich; Logout hinterlässt keine fremden Daten
6. Vereinsregeln speichern im Konto-Modus ohne 22P02 (Flag an im Dev-Build)
**Plans**: 6
**UI hint**: minimal (Toasts, Speicherstatus)

### Phase 22: Ein Editor für Maus und Touch

**Goal**: Ein `PlanEditor`, der auf dem Handy mit dem Finger und am Desktop mit der Maus alles kann, was der Web-Editor heute kann, plus Zoom/Pan, Polygon, Maßangaben, Abstands-Ring. Skia-Editor und Web-Sonderkomponenten gelöscht.
**Depends on**: Phase 21 (WP 21.3)
**Requirements**: EDIT2-01..EDIT2-10
**Masterplan**: WP 22.1 (Helfer), 22.2 (Interaction-Controller), 22.3 (Renderer + Pointer-Adapter), 22.4 (Feature-Port + Chrome), 22.5 (Performance)
**Success Criteria**:
1. ≥ 40 Controller-Tests ohne DOM grün
2. Auf Android-Chrome: Tap-Select, Drag, Pinch-Zoom, Handles, Long-Press/Doppel-Tipp-Modal, Polygon, Platzieren mit Ghost + Abstands-Ring
3. Desktop: Maus + Tastatur (Entf, Esc, Pfeile, Ctrl+Z/Y, Marquee) wie heute
4. `EditorCanvas.tsx`, `WebPlanEditor.tsx` & Co. gelöscht; `@shopify/react-native-skia` raus; Bundle < 4,5 MB
5. 200 Elemente flüssig (Remote-Debugging-Trace < 16 ms/Frame Median)
**Plans**: 5
**UI hint**: yes (mobile Werkzeugleiste, Palette als Bottom-Sheet)

### Phase 23: Navigation, Onboarding, Auth

**Goal**: Partnerin installiert die App, registriert sich mit Code, sieht in unter drei Minuten den gemeinsamen Plan.
**Depends on**: Phase 21 (WP 21.5), Phase 22 (WP 22.3); parallel zu 22.4/22.5 möglich
**Requirements**: NAV-01..NAV-07
**Masterplan**: WP 23.1 (Tabs + Header), 23.2 („Heute"), 23.3 (Onboarding + Beitritt), 23.4 (Auth-Härtung), 23.5 (Garten und Konto)
**Success Criteria**:
1. Tabs Heute · Plan · Kalender · Mehr; jede Route ≤ 2 Taps; kein Screen ohne Titel; keine Doppel-Header
2. „Heute" zeigt ohne weiteren Tap Wochenaktionen, Plan-Vorschau, nächsten Schritt
3. Registrierung mit Einladungscode → 3 Onboarding-Screens → gemeinsamer Plan in < 3 min
4. Passwort-Reset per Code in der installierten App; Tastatur verdeckt nie einen Button
5. Kein roher Exception-Text im UI
**Plans**: 5
**UI hint**: yes

### Phase 24: Design-System, Copy, Politur

**Goal**: Die App sieht aus wie ein warmes Gartenheft („Papier & Erde"), spricht die Sprache der beiden und ist auf 375 px angenehm.
**Depends on**: Phase 23
**Requirements**: DESIGN-01..DESIGN-07
**Masterplan**: WP 24.1 (Tokens/Fonts/Text), 24.2 (Icons/Illustrationen/Canvas), 24.3 (Copy + i18n), 24.4 (Kalender), 24.5 (Import-UX, Rechtliches, Speicherstatus), 24.6 (Barrierefreiheit)
**Success Criteria**:
1. Keine Hex-Literale außerhalb `tokens.ts`/`colors.ts`; keine `dark:`-Klassen; Nunito/Caveat sichtbar
2. Nur lucide-Icons; drei Illustrationen; Canvas-Stil nach Kap. 3.4
3. Alle Strings in `de.json`; Verbotsliste-Test (Jargon, ASCII-Umlaute, Phase-Leaks) grün
4. Kalender: Heute-Marker, Abschnitte, Suche, Klimazonen-Name, Enum-Labels
5. Import per Teilen < 20 s, per Einfügen < 30 s; Datenschutz/Impressum/Version vorhanden
6. Alle icon-only-Buttons benannt, Tasten ≥ 48 dp, Kontrast AA
**Plans**: 6
**UI hint**: yes

### Phase 25: Geräte-Abnahme

**Goal**: Beide Android-Handys + Desktop laufen den UAT-Katalog (Masterplan Kap. 6, 23 Punkte) durch; alles Gefundene ist gefixt; Tag v2.0.0.
**Depends on**: Phasen 20–24
**Requirements**: UAT-01, UAT-02
**Plans**: 1 Abnahme + `/gsd-quick` pro Befund (Budget 2 Tage)
**UI hint**: no

### Phase 26: Wochenaufgaben

**Goal**: Aus Kalender + Plan generierte Aufgaben mit done/snooze pro Person, für beide sichtbar, wiederkehrend (Gießen nach Wasserbedarf); „Heute" zeigt Aufgaben. Optional Web Push (Chrome Android).
**Depends on**: Phase 25
**Requirements**: TASK-01..TASK-05 (in v2.1-REQUIREMENTS zu definieren)
**Plans**: TBD (~4)

### Phase 27: Garten-Journal

**Goal**: Schnellnotizen pro Beet/Pflanze/Garten (Text, Datum, Art), optional 1 Foto (Supabase Storage `journal`, EU, RLS Member-Check); Import-Beobachtungen werden Journal-Einträge.
**Depends on**: Phase 26
**Requirements**: JOURNAL-01..JOURNAL-04
**Plans**: TBD (~3)

### Phase 28: Saisonwechsel und Fruchtfolge-Memory

**Goal**: `plan_elements.season`, „Neue Saison starten" archiviert Vorjahrespflanzen, Fruchtfolge-Warnung mit 3-Jahres-Regel pro Beet, „Was war letztes Jahr auf Beet 3?".
**Depends on**: Phase 27
**Requirements**: SEASON-01..SEASON-04
**Plans**: TBD (~3)

### Phase 29: SDK-Angleichung und optionales Android-APK

**Goal**: Aktuelles stabiles Expo-SDK, `expo-doctor` grün, Tests + Web-Export grün. Danach nur auf Wunsch des Users: natives Android-APK per EAS Free + Sideload (Masterplan Kap. 4.2, D-01/M9).
**Depends on**: Phase 28
**Requirements**: SDK-01..SDK-03
**Plans**: TBD (~2)

## Mapping alter Phasen (v1.2/v1.3-Planung, absorbiert)

| Alt | Neu |
|---|---|
| 7.5b Web Editor Polish | Phase 22 |
| 11 Garten-Journal | Phase 27 |
| 12 Task-Generator | Phase 26 |
| 13 Saatgut-Inventar | Backlog (BACKLOG.md, nach v2.1) |
| 14 Modernes Design | Phase 24 |
| 15 Fruchtfolge-Memory | Phase 28 |
| 16 Vereinsregeln-Aktivierung | Backlog 7 (nach WP 21.6: Flag an, Regel-Editor polieren, BKleingG-1/3-Check) |
| 17 Stale-Imports + Sharing-UX | Phase 22 (Drafts-Tray) + Phase 23 (WP 23.5) |

## Progress

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1–7.5a (v1.0) | 34/34 | ✅ Shipped | 2026-05-17 |
| 8–10 (v1.1) | 23/23 | ✅ Shipped | 2026-09-09 |
| 20. Fundament, Aufräumen, PWA-Deploy | 0/4 | Not started | - |
| 21. Sync und Datenintegrität | 0/6 | Not started | - |
| 22. Ein Editor für Maus und Touch | 0/5 | Not started | - |
| 23. Navigation, Onboarding, Auth | 0/5 | Not started | - |
| 24. Design-System, Copy, Politur | 0/6 | Not started | - |
| 25. Geräte-Abnahme | 0/1 | Not started | - |
| 26. Wochenaufgaben | 0/TBD | Planned (v2.1) | - |
| 27. Garten-Journal | 0/TBD | Planned (v2.1) | - |
| 28. Saisonwechsel + Fruchtfolge | 0/TBD | Planned (v2.1) | - |
| 29. SDK-Angleichung + APK | 0/TBD | Planned (v2.1) | - |

## Backlog

Siehe `.planning/BACKLOG.md` (999.x) und Masterplan Kap. 4.4 (Frost-Warnung, Plan-Export, JSON-Export, iCal, Companion-Score, Saatgut-Inventar, Vereinsregeln-Aktivierung, Dark-Mode, iOS, Lokal-Modus vollständig).

---

## Roadmap Evolution (Decisions Log)

- **2026-09-09 (v2-Pivot)**: Fünf Audits (Datenschicht/Sync, UX/Design, Editor, Distribution, Build-Health) → `MASTERPLAN-v2.md`. Milestone v1.1 abgeschlossen und archiviert; v1.0-Phasenverzeichnisse nach `milestones/v1.0-phases/`. Alte Phasen 11–17 absorbiert (Tabelle oben). Beide Nutzer Android → PWA statt nativ. Lokal-Modus und Vereinsregeln bleiben (D-04/D-05).
- **2026-06-11**: Feature-Sweep (Marktrecherche + 4 Referenz-App-Analysen), Backlog 999.2–999.12.
- **2026-05-17**: Desktop primär + Saison-2026-Hot-Path (Phasen 8–10 vorgezogen).
- **2026-05-08 (Pivot M07)**: Null In-App-AI, Claude.ai-Bridge.
- **2026-04-21 (Pivot)**: 2-User Shared Garden.

---

*Last updated: 2026-09-09 — Milestone v1.1 abgeschlossen, v2.0 „Handy-Ready" angelegt (Masterplan v2)*
