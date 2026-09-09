# Spatenstich — Masterplan v2 „Auf dem Handy"

**Stand:** 2026-09-08 · **Supabase:** `vitrqkzxkiqvadqfzrcx` (Frankfurt, EU) · **Repo:** `https://github.com/drkthng/spatenstich` (public, master) · **Basis-Commit:** `bd3330c` auf `ci/test-pr` (5 Commits vor `master`)

> Dieses Dokument ist die einzige Quelle der Wahrheit für den Umbau. Es ersetzt für die Milestones v2.0/v2.1 die Phasen 11–17 in `ROADMAP.md`. Es wurde nach fünf unabhängigen Audits (Datenschicht/Sync, UX/Design, Editor, Distribution/Kosten, Build-Health) geschrieben. Jede Zahl und jede Datei-Referenz darin ist verifiziert, nicht geraten.

---

## 0. Für den ausführenden Agenten — ZUERST LESEN

### 0.1 Zweck und Ziel

Dirk und seine Partnerin sollen die App **auf ihren Android-Handys und im Desktop-Browser** täglich benutzen, **ohne laufende Kosten** außer Dirks Claude-Max-Abo. Die App ist heute funktional weit (777 Tests grün, Import-Bridge, Pflanzen-DB, Kalender), aber (a) nie nativ auf einem Handy gelaufen, (b) im Web nur mit der Maus bedienbar, (c) im Sync-Kern fehlerhaft, (d) ohne Onboarding, Navigation und Design-System.

**Ziel v2.0 „Handy-Ready":** installierbare PWA (Chrome „App installieren") auf beiden Android-Handys + Desktop, Import direkt aus dem Teilen-Menü der Claude-App, korrekter 2-Personen-Sync, ein einziger Touch-und-Maus-Editor, geführtes Onboarding, warmes „gezeichnetes" Design.
**Ziel v2.1 „Saison 2027":** Wochenaufgaben, Journal, Fruchtfolge-Memory, damit die App ab Februar 2027 (Vorkultur-Start) der tägliche Begleiter ist.

### 0.2 Wie du dieses Dokument benutzt

1. Lies Kapitel 0–3 vollständig (Regeln, Diagnose, Entscheidungen, Zielbild).
2. Arbeite die Arbeitspakete (WP) in Kapitel 4 **in der angegebenen Reihenfolge** ab. Jedes WP ist ein GSD-Plan (`/gsd-plan-phase` bzw. `/gsd-quick` für Kleinkram). Abhängigkeiten stehen pro Phase.
3. Ein WP ist erst fertig, wenn **alle** Akzeptanzkriterien erfüllt sind und die Verifikationskommandos (0.4) grün sind.
4. Wenn du im Code etwas findest, das diesem Plan widerspricht: **Plan gewinnt bei Entscheidungen (Kap. 2), Code gewinnt bei Fakten** (z. B. exakte Zeilennummern). Notiere Abweichungen in der SUMMARY des WP.
5. Frage den User nur bei den in Kap. 5 markierten manuellen Schritten oder wenn eine Entscheidung aus Kap. 2 umgestoßen werden müsste.

### 0.3 Unverrückbare Regeln

| # | Regel | Warum |
|---|---|---|
| R1 | **Null ausgehende KI-API-Aufrufe** aus der App. Kein Anthropic-SDK, kein Pl@ntNet, kein Gemini. Erlaubt: Supabase, Sentry, (später) Open-Meteo. | Pivot M07, Kosten, Datenschutz |
| R2 | **Alle UI-Strings in `packages/shared/src/i18n/de.json`**, echte UTF-8-Umlaute (ä ö ü ß —), niemals `ae/oe/ue/ss`. Du-Form. Für den gemeinsamen Garten Plural („euer Garten", „ihr habt …"). | Memory-Feedback, UAT-Erfahrung |
| R3 | **RLS immer Member-Check** (`is_garden_member`), nie `user_id = auth.uid()` auf Gartendaten. | 2-User Shared Garden |
| R4 | **Tests bleiben grün.** Vor jedem Commit: `pnpm -r run typecheck && pnpm -r run lint && pnpm -r run test`. Neue Logik bekommt Tests (Repo-Konvention: RED-Commit, dann GREEN-Commit). | CI, Regressionen |
| R5 | **Migrationen sind append-only.** Neue Datei `supabase/migrations/2026MMDD0000NN_*.sql`, idempotent (`if not exists`, `drop … if exists`), Push nur nach dem 3-Gate-Protokoll (Kap. 0.5). | Live-DB mit echten Daten |
| R6 | **Web-first.** Native Codepfade (`*.native.ts`) dürfen bleiben, werden aber nicht mehr gebaut. Keine neuen nativen Module ohne Entscheidung des Users. | Kap. 2, D-01 |
| R7 | **Keine Secrets im Repo.** Anon-Key im Web-Bundle ist erwartet (RLS schützt). Service-Role-Key nie im Client. `scripts/check-claude-key-in-bundle.sh` bleibt in CI. | Public Repo |
| R8 | **PRs immer als Draft** (`gh pr create --draft`). Ein Branch pro Phase: `gsd/phase-NN-slug`. Merge nach master nur bei grüner CI. master deployt automatisch. | Globale User-Regel |
| R9 | **Keine Datenlöschung ohne Backup.** Vor Migration 020/021: `scripts/backup-supabase.ps1` (Kap. 7) ausführen bzw. den User bitten. | Dirks echter Gartenplan liegt in der DB |
| R10 | Keine neuen Abhängigkeiten ohne Prüfung: läuft es im Web-Export? Ist es gewartet? Größe? Alternativen in Bordmitteln? | Bundle ist schon 5,7 MB |

### 0.4 Verifikationskommandos

```bash
# Repo-Root D:\AiProjects\garden-app
pnpm -r run typecheck                      # muss 0 Fehler liefern
pnpm -r run lint                           # muss exit 0 liefern (ab WP 20.1)
pnpm --filter app exec jest --ci           # 100 Suites / 777 Tests (Stand heute), 0 failed
pnpm --filter @spatenstich/shared exec jest --ci   # 7 Suites / 87 Tests
pnpm --filter app exec jest --selectProjects editor   # Projekte: node, stores, hooks, editor, components (photos wird gelöscht)
pnpm --filter app run build:web            # ab WP 20.3: expo export + Workbox; Ergebnis in app/dist
pnpm --filter app web                      # Dev-Server auf Port 8095 (--offline bei Expo-CLI-Versionscheck-Bug)
bash scripts/check-claude-key-in-bundle.sh app/dist
npx expo-doctor                            # erst in Phase 29 grün erwartet
```

Jest-Fallstrick: `pnpm --filter app test -- --testPathPattern=x` verschluckt das zweite `--`. Immer `pnpm --filter app exec jest --testPathPattern=x`.

### 0.5 Supabase-Push-Protokoll (3 Gates)

```bash
supabase migration list --linked                       # Gate 1: exit 0, Local/Remote-Diff lesen
supabase db push --linked --dry-run --yes              # Gate 2: exit 0
supabase db push --linked --yes                        # Gate 3: echter Push
supabase migration list --linked                       # Nachweis: neue Migration in beiden Spalten
```

Vor Gate 3 bei destruktiven Migrationen (020, 021): Backup (Kap. 7.4) oder User fragen.

### 0.6 GSD-Mapping

- Milestone anlegen: `/gsd-new-milestone` → „v2.0 Handy-Ready" mit Phasen 20–25, dann „v2.1 Saison 2027" mit Phasen 26–29. Alte Phasen 11–17 in `ROADMAP.md` als „absorbiert durch v2.x (siehe MASTERPLAN-v2.md Kap. 4.3)" markieren, nicht löschen.
- Pro Phase: `/gsd-plan-phase NN` mit diesem Dokument als Kontext; die WPs hier sind die Plan-Tasks. `/gsd-execute-phase NN` ausführen. `/gsd-verify-work` mit den Akzeptanzkriterien.
- Kleine Nacharbeiten (< 2 h): `/gsd-quick`.

### 0.7 Definition of Done pro WP

1. Akzeptanzkriterien erfüllt und in SUMMARY nachgewiesen (Kommando + Ausgabe).
2. Tests: neue Behaviors getestet, Gesamtsuite grün, keine `console.error` aus Produktionscode in Tests (heute 24, siehe 1.4).
3. `de.json` erweitert, keine hartkodierten Strings in neuen/geänderten Screens.
4. Keine `as any` neu eingeführt (vorhandene dürfen beim Anfassen entfernt werden).
5. Doku: falls Verhalten geändert → `README.md`/`CLAUDE.md`-Stack-Tabelle aktuell.

---

## 1. Ist-Zustand (Diagnose)

### 1.1 Zahlen

| Metrik | Wert |
|---|---|
| Quellcode (ohne Tests) | 18.881 Zeilen TS/TSX in 155 Dateien |
| Tests | 17.106 Zeilen, 103 Dateien, 777 App-Tests + 87 Shared-Tests, alle grün |
| Typecheck | grün |
| Lint | **rot**: 13 Fehler (`react/display-name`, nur Test-Dateien) + 315 Warnungen → CI auf PRs ist rot |
| Web-Export | grün, 6,2 MB (ein JS-Bundle 5,96 MB, `output: 'single'`) |
| expo-doctor | **rot**: 23 Versions-Mismatches. Installiert: `expo@53.0.27`, aber `react-native@0.76.7`, `react@18.3.1`, `expo-router@4.0.22` (SDK-52-Stand) plus `expo-document-picker@55`, `expo-image-manipulator@55` (SDK-55-Module). `CLAUDE.md` behauptet SDK 55/RN 0.83/React 19.2 — falsch. |
| Nativer Build | nie erfolgreich, nie versucht. `app.config.ts` hat keinen `android`-Block (kein Paketname) — Android ist gar nicht baubar; dazu der SDK-Mix. Expo Go: die SDK-52-JS-Schicht passt nicht zu Expo Go SDK 53/54; `expo-share-intent` läuft in Expo Go gar nicht. |
| Größte Dateien | `WebPlanEditor.tsx` 1042, `SyncWorker.ts` 641, `rowMappers.ts` 555, `settings/garden.tsx` 532, `EditorCanvas.tsx` 425 |
| Hartkodierte Hex-Farben außerhalb `colors.ts` | 146 |
| Tailwind-Tokens | keine (`theme: { extend: {} }`) |
| UI-Strings hartkodiert in TSX statt `de.json` | ca. 40 % |
| `t()`-Helper-Kopien | 33 Dateien, zwei inkompatible Interpolations-Syntaxen (`{n}` vs `{{plantA}}`) |
| App-Icon / Splash / Manifest / Service Worker | nicht vorhanden (`app/assets/` existiert nicht) |

### 1.2 Was funktioniert und bleibt

Auth (E-Mail/Passwort), Shared Garden mit Invite-Code (RPCs, RLS-Helper), StorageAdapter (SQLite/IndexedDB) + Outbox, Import-Bridge (Schema `spatenstich-import.v1`, Paste + Datei, Preview, Sichtung, Promotion), Pflanzen-DB (90 Pflanzen, 38 Companion-Paare, MIT-lizenzhygienisch), Companion-Warnung, Aussaatkalender (Engine, Wochen-View, Gantt, Fruchtfolge-Warnung), editorStore mit Undo/Redo (zundo), Web-Editor-Featureset (Select, Multi-Select, Drag, Resize, Rotate, Drag-to-create, Properties-Modal, Z-Order, Pfeiltasten), CI-Grundgerüst, Secret-Scan.

### 1.3 Abweichungen von der Vision

| Vision (PROJECT.md / ROADMAP) | Ist | Konsequenz |
|---|---|---|
| „Handy + Desktop-Browser, beide müssen funktionieren" | Nur Desktop-Browser je getestet. Nativer Build unmöglich (SDK-Mix, kein `android`-Block). Web-Editor reagiert nicht auf Touch. | **Auf dem Handy heute nicht benutzbar.** |
| „In < 5 Minuten von Installation zu erstem nutzbaren Plan" | Kein Onboarding-Flow. Nach Registrierung landet man auf Home mit vier gleichwertigen Buttons. PLZ versteckt hinter Profil-Icon. „Einem Garten beitreten" auf dem Startscreen ist eine Sackgasse (`(auth)/join-by-code.tsx:47-51`). | Partnerin kann ohne Anleitung nicht beitreten. |
| „2-User Shared Garden, LWW, beide sehen identischen Plan" | Server-Trigger `zz_set_updated_at` überschreibt den Client-Zeitstempel → „wer zuerst synct gewinnt", nicht „letzte Änderung gewinnt". Delta-Pull übersieht neu angelegte Elemente der Partnerin (Trigger nur BEFORE UPDATE). Kein Realtime, keine Aktualisierung geöffneter Screens. | **Partner-Änderungen gehen verloren oder erscheinen nicht.** |
| „Manueller Plan-Editor ist Kern" | Zwei Editoren. Skia-Editor (nativ) kann weder Elemente aus der Palette setzen (`draggingShared` wird nie gelesen) noch verschieben; Handles in `GestureDetector` innerhalb `<Canvas>` sind architektonisch wirkungslos. Web-Editor: nur Maus-Events. | Editor auf dem Handy: reiner Viewer. |
| „Stil: gezeichnet, warm, nicht-klinisch" | Chrome ist shadcn-Stone-Grau mit Systemfont. Nur der Plan-Canvas ist warm. Vier Icon-Systeme (lucide, Unicode-Glyphen, Text-Chevrons, Emoji). Dark-Mode halb kaputt (`darkMode:'class'` ohne Klassen-Setzung, aber `userInterfaceStyle:'automatic'`). | Wirkt generisch; auf dem Handy dunkler Header über hellem Body. |
| „App komplett ohne Claude.ai nutzbar" | Home-Empty-State stellt Import und Garten-anlegen gleichwertig dar; Sichtungs-Screen ist erste CTA im leeren Web-Editor. | Manueller Weg ist nicht der Default-Weg. |
| „Offline: App startet und zeigt letzten Plan" | Im Web ohne Service Worker kein Offline-Start. Mobile Browser feuern `beforeunload` unzuverlässig → Leave-Flush greift nicht. Autosave-Timer sterben bei App-Kill. | Datenverlust-Pfade (< 5 s alte Edits). |
| „Profil: PLZ → Klimazone beeinflusst Kalender" | Im Account-Modus wird PLZ/Klimazone nicht persistiert (`profileRepo.ts:88-94` speichert nur `displayName`); Kalender fällt auf Zone 4 zurück. | Kalender rechnet für beide falsch. |
| „Vereinsregeln per Flag aus bis v1.3" | Banner „Regeln einrichten" live im Profil; PDF-Karte verspricht Extraktion; jeder Save erzeugt 22P02 (Nicht-UUID-IDs in `uuid`-Spalte) und vermüllt die Outbox. | Sichtbar kaputtes Feature. |
| „Lokal nutzen ohne Account" | Karte fehlt auf dem Startscreen; alle Garten/Plan-Repos werfen im Lokal-Modus. Dead Code in 5 Screens. | Halbfertig, ungenutzt. |
| Foto-Pipeline entfernt (M07) | `lib/photos/*`, `captureStore`, `settings/privacy.tsx` (GPS-Opt-in), `photo_queue`-Tabelle, `enqueue_photo_analysis`-RPC, Storage-Buckets, `feature_flags` existieren noch. | Ballast, irreführende UI. |
| „Desktop primär" (Pivot 2026-05-17) und „iPhone first-class" (Phase 7) | Beides halb. | Entscheidung nötig → D-01. |

### 1.4 Kritische Defekte nach Schicht (Kurzliste, Details in den WPs)

**Sync/Daten (WP 21):** S1 LWW-Semantik (Trigger überschreibt `updated_at`); S2 Delta-Pull übersieht INSERTs und Rows zwischen `server_now()`-RPC und Select; S3 Editor-Öffnen schreibt alle N Elemente neu (Autosave-Subscription auf Hydration) und produziert Ping-Pong-Pulls + `updated_by`-Verfälschung; S4 kein Realtime/Polling, Screens laden einmal pro Mount; S5 Vereinsregeln-Push strukturell kaputt; S6 harte Deletes (`garden_members`, Vereinsregeln) propagieren nie; S7 P9011 lässt lokale Row stale, keine UI; S8 Outbox: 50 failed Einträge am Kopf blockieren alles, Backoff nie geschedult; S9 `garden_dimensions`-ID-Divergenz; S10 Logout löscht weder Rows noch Cursor (nächster Login = falscher Delta-Pull); R1 PLZ/Klimazone nicht persistiert; R3 jede Token-Refresh registriert Sync-Trigger neu und läuft `syncAll` erneut; `migrateLocalToAccount` scheitert bei jemals gespeicherten Regeln.

**Editor (WP 22):** E1 Skia: Palette-Platzierung unverdrahtet, kein Element-Drag, Handles wirkungslos, `gestureActive` bleibt nach einfachem Tap `true` → Autosave dauerhaft aus; E2 Web: nur `mouse*`, kein verlässliches `dblclick` per Touch (Modal unerreichbar), keine Zoom/Pan-Viewport, Handles 12 px; E3 Undo eines `addElement` löscht nicht persistent (Timer im Closure) → Element taucht nach Reload wieder auf und synct zur Partnerin; E4 zundo trackt `setState({elements})` beim Laden → erster Undo zeigt leeren Plan, History überlebt Sessions und kann Partner-Änderungen mit frischem `updatedAt` überschreiben; E5 `beforeunload` (mobil unzuverlässig) statt `pagehide`/`visibilitychange`; E6 Polygon-Punkte werden bei Rotate/Resize nicht transformiert → Companion/Kalender testen gegen falsches Polygon; E7 Koordinaten-Konvention (Center vs. Top-Left) in `draftPromotionRepo.nextFreeBedSlot` und `promotePlantDraft` falsch.

**UX (WP 23/24):** keine Tabs, keine Safe-Areas (`SafeAreaView`/`useSafeAreaInsets` nirgends), kein `KeyboardAvoidingView`, kein „Passwort vergessen", Doppel-Header (Editor, Vereinsregeln), Home-Karte „Diese Woche" fehlt, Touch-Targets < 44 pt (Toolbar 40, Web-Toolbar ~32, Sync-Screen ~24, Filter-Chips ~26), Kontrast `text-stone-400` ≈ 2,4:1, Jargon (Drafts, Stale, Payload, Sync, Layer, Outbox-Rows `plan_elements · upsert`), Roadmap-Leaks („in Phase 4 angelegt"), rohe Exceptions im UI (`settings/garden.tsx:94,164,176`), Kalender ohne Heute-Marker, Enum-Leak `halb_schattig`.

**Build/CI (WP 20):** Lint rot; CI setzt keine `EXPO_PUBLIC_*`-Variablen → CI-Bundle würde beim Start crashen (`supabase.ts:7-11` wirft); kein Deploy-Schritt; `eas-build.yml` kann nicht erfolgreich sein; `index.html lang="en"`; Test-Rauschen: `useAuthStore.getState is not a function` in `create-garden-entrypoints.test.tsx:61-64`, 13× act()-Warnungen, Worker force-exit (Timer-Leak).

---

## 2. Entscheidungen

Diese Entscheidungen sind getroffen. Sie gelten, bis der User sie explizit ändert.

| ID | Entscheidung | Begründung |
|---|---|---|
| **D-01** | **Distribution = PWA** (Web-Export, in Chrome auf beiden Android-Handys als App installiert + Desktop-Browser). Kein nativer Build in v2.0. | 0 € und sofort. Chrome-Android-PWAs bekommen alles, was ein nativer Build böte: Teilen-Menü (Web Share Target), Web Push, dauerhaften Speicher (`navigator.storage.persist()`), Install-Prompt, Statusleisten-Farbe. Ein natives APK wäre auf Android zwar kostenlos per Sideload, braucht aber erst die SDK-Angleichung (Phase 29) und dauerhafte Build-Pflege. Web-Editor + IndexedDB + Paste-Import existieren schon. |
| **D-02** | **Hosting = Cloudflare Pages (Free) + Supabase Free** mit Keep-alive-Cron. Heimserver/VPS **nicht** in v2.0. Fallback-Stufen: (1) Supabase Pro 25 $/Monat, (2) Self-Host auf dem 24/7-PC (Kap. 3.1.3). | Cloudflare Pages: SPA-Fallback automatisch, `_headers` möglich, 500 Builds/Monat. Supabase Free: 500 MB DB, pausiert nach 7 Tagen Inaktivität (Cron + reale Nutzung verhindern das; Restore bis 1 Jahr). Ein Heimserver macht Dirk zum Admin (Docker, Backups, Updates, Strom ≈ 100 €/Jahr) ohne funktionalen Gewinn. |
| **D-03** | **Ein Editor.** Neuer `PlanEditor` (react-native-svg, Pointer Events, reiner Interaction-Controller). `EditorCanvas.tsx` (Skia) und die Web-Sonderkomponenten werden gelöscht; `@shopify/react-native-skia` fliegt aus `package.json`. | Skia-Editor ist unbenutzbar und nicht auslieferbar; jede Funktion kostete 2×. Pointer Events decken Maus, Touch, Stift ab. Der Controller ist ohne DOM testbar. |
| **D-04** | **Lokal-Modus bleibt im Code, wird in v2.0 nicht ausgebaut und bleibt unsichtbar** (keine Startscreen-Karte, wie heute). Vollausbau als eigene Backlog-Phase (Kap. 4.4, Nr. 10). | User-Entscheidung 2026-09-09. Heute erreicht ihn kein Nutzer, Garten/Plan/Import-Repos werfen darin. Für die beiden Nutzer bringt er nichts, für spätere Nutzer ohne Konto könnte er die Einstiegshürde senken. Regel für alle Umbauten: `mode === 'local'`-Zweige mitziehen, nicht löschen; Screens dürfen im Lokal-Modus nicht crashen (statt `assertAccount`-Exception ein Hinweis „Dafür brauchst du ein Konto"). |
| **D-05** | **Vereinsregeln bleiben, werden repariert und hinter einen Schalter gelegt.** WP 21.6 behebt die Nicht-UUID-IDs und den Sync; `FEATURES.vereinsregeln = false` in `packages/shared/src/constants/flags.ts` versteckt Banner und Routen, bis die Aktivierungsphase (Backlog 7, alte Phase 16) sie fertigstellt. PDF-Karte und Extraktions-Texte fliegen sofort (WP 20.2). | User-Entscheidung 2026-09-09. Heute scheitert jeder Speichervorgang im Konto-Modus mit `22P02` und bleibt in der Warteschlange hängen; die Reparatur kostet etwa einen Tag und rettet die Arbeit aus Phase 2. |
| **D-06** | **Foto-/Capture-Reste, Feature-Flags, GPS-Opt-in, `photo_queue`, `enqueue_photo_analysis`, Storage-Buckets `photos`/`vereinsregeln` werden gelöscht** (Code + Cleanup-Migration). | M07-Pivot ist seit Mai beschlossen. Buckets nur löschen, wenn leer (prüfen). |
| **D-07** | **Sync-Modell: Client-`updated_at` ist die LWW-Wahrheit, Server-`server_updated_at` ist der Pull-Cursor.** Realtime (`postgres_changes`) + 60-s-Polling im Vordergrund. | Behebt S1/S2/S4 grundsätzlich statt punktuell. |
| **D-08** | **Navigation = 4 Tabs: Heute · Plan · Kalender · Mehr.** Editor ist Vollbild-Route über dem Plan-Tab („Bearbeiten"/„Fertig"). | Daily-Use-Frage („Was tue ich diese Woche?") landet auf Tab 1. Editor braucht auf dem Handy den ganzen Bildschirm. |
| **D-09** | **Onboarding = 3 Schritte** nach Registrierung: Gartengröße → PLZ → Partnerin einladen/Code eingeben. Archetyp entfällt aus dem Pfad (Spalte bleibt). Invite-Code optional schon bei der Registrierung. | < 5 Minuten zum ersten Plan. Archetyp beeinflusst heute nichts. |
| **D-10** | **PLZ/Klimazone gehören zum Garten** (`gardens.plz/klimazone`), nicht zum Profil. `profiles.plz/klimazone/archetype` werden gedroppt. | Beide Partner teilen automatisch dieselbe Klimazone; Spalten existieren bereits. |
| **D-11** | **Design-System „Papier & Erde": Light-only in v2.0**, NativeWind-Tokens, Nunito (UI) + Caveat (Überschriften/Canvas-Labels), lucide-Icons, drei Line-Art-Illustrationen als SVG-Komponenten. `dark:`-Klassen werden entfernt, `userInterfaceStyle: 'light'`. | Ein halb funktionierender Dark-Mode ist schlechter als keiner. Tokens zuerst, dann evtl. Dark in v2.2. |
| **D-12** | **Passwort-Reset per 6-stelligem E-Mail-Code** (`verifyOtp type:'recovery'`), nicht per Link. E-Mail-Bestätigung bei Registrierung wird im Supabase-Dashboard deaktiviert. | Ein Code funktioniert unabhängig davon, ob der Mail-Link im Browser oder in der installierten App aufgeht, und lässt sich auf dem Handy abtippen. Zwei bekannte Nutzer brauchen keine Bestätigung. |
| **D-13** | **SDK-Angleichung erst in Phase 29** (nach Auslieferung), dann auf das jeweils aktuelle stabile Expo-SDK, `expo-doctor` grün als Abnahme. Bis dahin bleibt die heutige Kombination, weil der Web-Export damit funktioniert. | Risiko-Reihenfolge: erst nutzbar, dann sauber. |
| **D-14** | **Claude.ai-Bridge für die Partnerin: eigener kostenloser Claude-Account + kopiertes Projekt** (Prompt + Schema als Knowledge-Files). Account-Sharing verstößt gegen die Consumer Terms; Projekt-Sharing gibt es nur in Team/Enterprise. Die App bekommt einen „Projekt-Anleitung kopieren"-Button. | Kostenneutral, regelkonform. |
| **D-15** | **Ziel-Browser auf dem Handy = Chrome (Android).** Samsung Internet funktioniert für alles außer Push; Firefox Android hat kein Web Share Target. iPhones werden nicht mehr eingeplant (die PWA liefe dort auch, nur ohne Teilen-Menü). | Beide Nutzer haben Android-Handys (Stand 2026-09-09). |

---

## 3. Zielbild

### 3.1 Distribution und Betrieb

#### 3.1.1 Kostenmatrix (verifiziert 2026-09-08)

| Option | Einmalig | Laufend/Jahr | Offline | Push | Teilen-Menü-Import | Setup | Risiko |
|---|---|---|---|---|---|---|---|
| **A: PWA auf Cloudflare Pages + Supabase Free** (gewählt) | 0 € | 0 € (optional Domain ~10 €) | ja (Service Worker + IndexedDB, `storage.persist()`) | ja (Web Push in Chrome, auch ohne Installation) | ja (Web Share Target: `.json`-Datei oder Text aus der Claude-App) | 4–6 h | Supabase-Pause bei Inaktivität (Cron) |
| B: PWA + Supabase Pro | 0 € | ~300 $ | wie A | wie A | wie A | 4–6 h | keins |
| C: PWA auf 24/7-PC (Cloudflare Tunnel) + Self-Host Supabase (Docker) | Domain ~10 € | Strom ~100–130 € + Domain | wie A | wie A | wie A | 12–20 h + Wartung | PC aus = App aus; Backups, Updates, TLS, SMTP selbst |
| D: Natives Android-APK per EAS Free (Sideload) | 0 € + SDK-Upgrade (8–20 h) | 0 € | ja | ja | ja (`expo-share-intent`) | 12–25 h | Build-Pflege bei jedem Expo-Release; Android Developer Verification ab 2027 weltweit (kostenloses Limited-Distribution-Konto, max. 20 Geräte, kein Ausweis); 15 Builds/Monat |
| E: Google Play (interner Test) | 25 $ | 0 € | wie D | wie D | wie D | D + 3 h | Play-Konto mit Ausweis-Verifikation |
| F: Expo Go | — | — | — | — | — | — | nicht möglich (SDK-Mix, Share-Intent) |

#### 3.1.2 Betriebsbild (Option A)

```
GitHub master ──push──► GitHub Actions: pnpm build:web ─► wrangler pages deploy ─► https://spatenstich.pages.dev
                                        │
                                        └─ cron alle 3 Tage: REST-Ping an Supabase (Keep-alive)

Android Dirk ── Chrome „App installieren" ────┐
Android Partnerin ────────────────────────────┼──► PWA (IndexedDB, Service Worker) ──► Supabase vitrqkzxkiqvadqfzrcx
Desktop-Browser ──────────────────────────────┘        (Auth, Postgres+RLS, Realtime)

Claude-App (Dirk: Max / Partnerin: Free) ── Teilen → „Spatenstich" (Web Share Target) ──► Import-Vorschau
                                         └─ oder JSON kopieren ──► „Importieren → Aus Zwischenablage"
24/7-PC: Task Scheduler nächtlich pg_dump ──► lokales Backup (Kap. 7.4)
```

#### 3.1.3 Fallback C (Heimserver) — nur wenn der User es will

Schritte in Kurzform, damit es planbar bleibt: Docker Desktop auf dem 24/7-PC, `git clone supabase/supabase && cd docker`, `.env` mit eigenen Secrets (nie Defaults), `docker compose up -d` (min. 4 GB RAM), Cloudflare Named Tunnel (braucht Domain im Cloudflare-Konto) für `api.<domain>` → Kong :8000 und `app.<domain>` → statischer `dist`-Ordner (z. B. `caddy file-server`), Auth-SMTP konfigurieren (sonst keine Reset-Mails), `supabase db push --db-url postgres://…` gegen die lokale DB, nächtliches `pg_dump`. Aufwand 12–20 h. Nicht in v2.0.

### 3.2 Architektur (Soll)

```
app/app/                         Expo Router 4 (web)
  _layout.tsx                    Auth-Guard (imperativ), Sync-Bootstrap (keyed auf userId), SW-Update-Toast
  (auth)/  index | login | register(+Invite-Code) | reset-request | reset-verify
  (app)/(tabs)/_layout.tsx       Tabs: index(Heute) | plan | kalender | mehr
  (app)/plan/edit.tsx            Vollbild-Editor (PlanEditor mode="edit")
  (app)/onboarding/{groesse,plz,partner}.tsx
  (app)/import/{index,preview,review}.tsx
  (app)/mehr/{garten,konto,sync,datenschutz}.tsx
  (app)/profile/vereinsregeln/*   bleibt, nur sichtbar mit FEATURES.vereinsregeln (D-05)
app/src/components/editor/
  PlanEditor.tsx                 SVG-Renderer (beide Plattformen), readOnly|edit
  PlanEditor.web.tsx             Pointer-Adapter (div: pointerdown/move/up/cancel, wheel, keydown)
  EditorToolbar.tsx, ElementPalette.tsx (Bottom-Sheet mobil), ElementEditorModal.tsx, DraftsTray.tsx
app/src/lib/editor/
  interactionController.ts       Zustandsautomat ohne DOM (PointerSample → Store-Actions)
  hitTest.ts (rotation-aware), handleGeometry.ts, provenance.ts, elementFactory.ts, clamp.ts, polygonTransform.ts
app/src/lib/sync/
  SyncWorker.ts (Cursor = server_updated_at, Pagination, P9011 → Re-Pull), RealtimeBridge.ts, SyncTriggers.ts
app/src/lib/i18n.ts              EIN t(key, vars) mit {var}-Syntax
app/src/theme/                   tokens.ts (Farben/Radien), fonts.ts (Nunito, Caveat), illustrations/
packages/shared/                 Typen (provenance typisiert), de.json, plants.json, kalenderEngine, newId()
supabase/migrations/020_cleanup.sql, 021_sync_cursor.sql, 022_realtime_publication.sql
public/ manifest.json (mit share_target), icons/, _headers, index.html (Template); app/sw-src.js → dist/sw.js (Workbox injectManifest)
.github/workflows/ ci.yml (lint/test/export mit EXPO_PUBLIC_*), deploy-web.yml, supabase-keepalive.yml
```

### 3.3 Informationsarchitektur und Screens

**Tab „Heute"** (`(app)/(tabs)/index.tsx`):
1. Kopf: Gartenname (editierbar in „Mehr → Garten"), Klimazone-Chip „Zone 7 · Leipzig", Sync-Punkt (grün/grau/rot).
2. Karte „Diese Woche (KW 37)": Aktionen aus `useKalenderData` (aussäen/pflanzen/ernten), max. 6 Zeilen, Tap → Pflanzen-Detail; leer → Illustration Gießkanne + „Diese Woche ist nichts fällig".
3. Plan-Vorschau: `PlanEditor readOnly` in einer Karte (max-w 480), Tap → Plan-Tab; Untertitel „zuletzt bearbeitet von {Name}, vor 2 Std."
4. Kontext-Karte (nur eine, nach Priorität): „Lade deine Partnerin ein" (solange < 2 Mitglieder) → „PLZ eintragen" (solange `klimazone` null) → „3 offene Import-Vorschläge sichten" (solange pending Drafts) → sonst keine.
5. `useFocusEffect` lädt neu; `pull_success` invalidiert.

**Tab „Plan"** (`(app)/(tabs)/plan.tsx`): `PlanEditor readOnly` als Vollfläche mit Pinch/Pan, Tap auf Element zeigt Info-Chip (Name, Maße, Pflanzdatum). Primär-Button unten rechts „Bearbeiten" → `/(app)/plan/edit`. Ohne `garden_dimensions`: Illustration Spaten + „Lege zuerst die Gartengröße fest" → Onboarding-Schritt 1.

**Editor** (`/(app)/plan/edit`, Vollbild, kein Tab-Bar):
```
┌──────────────────────────────────────────┐
│ ‹ Fertig    Undo  Redo         ● gespeichert │  Top-Bar 48 px (Safe-Area oben)
│                                          │
│              SVG-Canvas                  │  touch-action:none; Pinch=Zoom, 1-Finger auf leerer
│    (Papier, Gitter, Elemente, Handles)   │  Fläche=Pan im Modus „Bewegen", Marquee im Modus „Auswählen"
│                                          │
├──────────────────────────────────────────┤
│ [Bewegen|Auswählen] [＋ Hinzufügen] [Beet zeichnen] [Gitter] [Ebenen] │ Action-Bar 56 px
│  ── bei Selektion: [Bearbeiten] [Duplizieren] [Nach vorn] [Nach hinten] [Löschen] ── │
└──────────────────────────────────────────┘ + Safe-Area unten
```
Desktop (≥ 768 px): Toolbar oben in einer Zeile, Palette als linke Leiste, Tastatur: Entf, Esc, Pfeile (+Shift), Ctrl/Cmd+Z/Y, Ctrl/Cmd+Klick, Marquee auf leerer Fläche. Touch: Long-Press 500 ms oder Doppel-Tipp → Properties-Modal; Handles visuell 12 px, Trefferradius 22 px, in Bildschirm-Pixeln (skalieren nicht mit Zoom). Löschen → Snackbar „Element gelöscht · Rückgängig" (5 s) statt Bestätigungsdialog. „＋ Hinzufügen" öffnet Bottom-Sheet: Tabs Beete | Pflanzen (Suche, „In eurem Plan" zuerst, Emoji + Name + Familie) | Anlagen (Laube, Weg, Rasen, Kompost, Wasserstelle, Zaun, Baum, Sitzplatz, Sonstiges). Nach Wahl: Platzierungsmodus mit Hinweisleiste „Tippe auf den Plan, um {Element} zu setzen · Abbrechen"; Geist-Element folgt Finger/Maus; Pflanzenabstands-Ring (`GhostRing`) grün/rot.

**Tab „Kalender"**: wie heute (Wochen-View + Jahresliste), plus Heute-Marker im Gantt, Abschnitte „In eurem Plan" / „Alle Pflanzen A–Z" mit Suche, Klimazonen-Name, Sonnenbedarf als Label.

**Tab „Mehr"**: Liste: Garten (Name, Mitglieder, Einladungscode mit „Kopiert"-Feedback, Besitz übertragen, Garten verlassen/löschen), Importieren (Claude.ai), Import-Vorschläge sichten, Konto (E-Mail, Passwort ändern, Abmelden mit Warnung bei ungesyncten Änderungen), Speicherstatus (ehemals Sync), Datenschutz & Impressum, Version + Build-Hash, „Claude-Projekt einrichten" (Anleitung + Prompt kopieren).

**Onboarding** (`/(app)/onboarding/*`, Redirect solange `garden_dimensions` fehlt und kein Invite angenommen):
1. „Wie groß ist euer Garten?" Länge × Breite in m (Default 10 × 5, Komma erlaubt, 1–100 m). Skizze aktualisiert live.
2. „Wo liegt der Garten?" PLZ → Klimazone-Name sofort. „Überspringen" möglich (Kontext-Karte erinnert).
3. „Gärtnert ihr zu zweit?" Einladungscode groß + „Teilen"/„Kopieren" | „Ich habe einen Code" → Feld. „Später".
Abschluss → Editor mit Empty-State „Zeichne euer erstes Beet".

**Auth**: Startscreen: Logo/Illustration, „Anmelden", „Konto erstellen" („Lokal starten" erst mit dem Vollausbau des Lokal-Modus, Backlog 10). Registrierung mit optionalem Einladungscode (wird nach Login vor `ensure_default_garden_for_user` eingelöst, damit kein Leergarten entsteht). „Passwort vergessen?" → E-Mail → 6-stelliger Code → neues Passwort. Alle Formulare: `KeyboardAvoidingView`, `SafeAreaView`, Fehler unter dem Feld, Passwort-Auge.

**Import**: Vier Wege, klar priorisiert: (1) Teilen-Menü der Claude-App → „Spatenstich" (Web Share Target, öffnet direkt die Vorschau; `.json`-Datei oder geteilter Text), (2) „Aus Zwischenablage einfügen" (großer Button), (3) Textfeld, (4) Datei wählen. Erklärungstext: „Im Claude-Projekt ‚Spatenstich Garden' endet jede Antwort mit einem JSON-Block. Teile ihn mit Spatenstich oder kopiere ihn hier hinein." Link „Projekt einrichten". Preview/Sichtung: Begriffe „Vorschläge" statt „Drafts", „Übernehmen"/„Ablehnen"/„Bearbeiten", Erfolgs-Toast pro Aktion.

### 3.4 Design-System „Papier & Erde"

Tokens (`app/tailwind.config.js` → `theme.extend.colors`, gespiegelt in `app/src/theme/tokens.ts` für SVG/Inline):

| Token | Hex | Verwendung |
|---|---|---|
| `paper` | `#F6F1E7` | App- und Canvas-Hintergrund (ersetzt `#F9F7F4`, `stone-50`) |
| `karton` | `#EDE5D6` | Karten, Sheets, Toolbar, Inputs |
| `erde` | `#5B4636` | Primärtext, Icons, Rahmen (25 %) |
| `erde-muted` | `#8B7355` | Sekundärtext (≥ 14 px), Maßangaben, Gartengrenze |
| `moos` / `moos-dark` | `#4A7C59` / `#3D6649` | Primär-Aktion, aktive Chips, Links / pressed |
| `lehm` | `#C4956A` | Sekundär-Akzent, Beet-Füllung, Badges |
| `mohn` | `#C2452D` | Destruktiv, Konflikte |
| `sonne` | `#D9A441` | Warnung, „älter als 30 Tage" |
| `teich` | `#2F6F8F` | Selektion, Handles, Info-Banner |

Kontraste: erde/paper 9,5:1, erde-muted/paper 4,6:1, weiß/moos 4,8:1. `text-stone-400` wird als Textfarbe abgeschafft.

Typografie: `expo-font` + `@expo-google-fonts/nunito` (400/600/700) für UI, `@expo-google-fonts/caveat` (500/700) nur für H1/H2 ≥ 18 px, Empty-State-Titel und Canvas-Labels. `ui/text.tsx` bekommt `variant="h1|h2|title|body|label|caption"`; alle 50 direkten `Text`-Importe aus `react-native` in Screens/Components werden auf `@/src/components/ui/text` umgestellt. Radien: Buttons/Inputs 12, Karten 16, Sheets 20, Chips voll. Keine Schatten; Tiefe über 1,5-px-Rahmen `erde/25` + 2-px-„Papierkante" unten. Trenner gestrichelt `erde/30`.

Icons: nur lucide (`strokeWidth 1.75`, Farbe `erde`). Palette-Map: Beet `Sprout`, Pflanze `Leaf`, Rasen `Wheat`, Weg `Route`, Laube `Home`, Kompost `Recycle`, Wasserstelle `Droplets`, Zaun `Fence`, Baum `TreeDeciduous`, Sitzplatz `Armchair`, Sonstiges `Shapes` (Namen gegen installierte lucide-Version prüfen). Unicode-Glyphen, Text-Chevrons und Emoji-Präfixe in `de.json` (`companion.*`) verschwinden.

Illustrationen (`app/src/theme/illustrations/{LeererPlan,LeereWoche,Einladen}.tsx`): react-native-svg-Pfade, eine Linie `erde` 1,75 px, runde Enden, ~160 px, keine Bild-Assets.

Canvas (`app/src/lib/colors.ts` erweitern, gilt für Editor und Vorschau): Grenze `erde-muted` 2 px gestrichelt 6/3; Gitter `#D6CFC4` 0,5 px 35 %; Rasen `#8DB580` 50 % (immer unterste Ebene); Beet `lehm` 75 % + Rand `darken 25 %` 1,5 px, `rx 6`, Label in Caveat; Pflanze Kreis `#9BC07A` mit `moos`-Rand, Emoji ab r·scale ≥ 12 px; Laube `#A0785A` 80 % + zwei Giebelstriche; Weg `#D4C5A9` gepunktet; Wasserstelle `#7EB5C4` + zwei Wellen; Kompost `#7A6148` gestrichelt; Baum Kreis `#6B9B5E` 65 % gepunktet + Stamm-Punkt; Zaun Linie `erde-muted` 2 px gestrichelt mit Ticks alle 0,5 m; Sitzplatz `#C9B99A` `rx 10`; Sonstiges `#B8AFA7`; Selektion `teich` 2 px gestrichelt 4/2, Handles 12 px weiß mit `teich`-Rand; Platzierungsvorschau `moos` 15 % gestrichelt; Konflikt-Dreieck `mohn`. Maßangaben „2,0 × 0,8 m" in `erde-muted` 11 px an der Unterkante jedes Beets ab Zoom ≥ 30 px/m.

App-Icon: Spaten + Keimblatt als Line-Art `erde` auf `paper`, `assets/icon.svg` → per `scripts/gen-icons.mjs` (sharp) zu 192/512 (`purpose: any`), 192/512 maskable (Motiv mit 20 % Sicherheitsrand auf `paper`), 512 monochrome (Android-13-Themed-Icon), 32/16 (favicon), 1024 (späterer Store). Splash: `paper` mit Icon zentriert.

### 3.5 Sync-Modell (neu)

- Jede synchronisierte Tabelle bekommt `server_updated_at timestamptz not null default now()` + Trigger `BEFORE INSERT OR UPDATE` → `now()`. **Pull-Filter ist ausschließlich `server_updated_at`**, sortiert aufsteigend, Seiten à 500, Cursor = größtes gelesenes `server_updated_at`, beim nächsten Pull Filter `> cursor - 10 s` (Überlappung, Upserts sind idempotent).
- `updated_at` (Client-Edit-Zeit) wird vom Server **nicht mehr überschrieben**, außer der Client hat es nicht verändert (server-seitige RPC-Updates) oder es liegt > 5 min in der Zukunft. Der bestehende Guard `aa_lww_guard` (P9011 bei `NEW.updated_at < OLD.updated_at`) wird damit zu echtem LWW nach Edit-Zeit.
- Lokaler Upsert vom Server: nur überschreiben, wenn `server.updatedAt >= local.updatedAt` **und** keine Outbox-Row für diese ID pendent ist.
- P9011: Outbox-Eintrag verwerfen, Entity sofort re-pullen, Event `conflict_resolved` → Toast „Änderung von {Name} übernommen".
- Realtime: `postgres_changes` (INSERT/UPDATE) für `plan_elements, garden_dimensions, imports, import_items, bed_drafts, plant_drafts, observation_drafts, garden_members, gardens` gefiltert `garden_id=eq.<id>` → debounced `pull(entity)`. Fallback-Polling 60 s im Vordergrund. `pull_success(entity)` erhöht einen Invalidations-Zähler, den `useGardenData`-Hooks beobachten.
- Löschungen: nur Soft-Delete (`deleted_at`), auch für `garden_members` (neue Spalte) und Einladungscodes; `garden_members`/`invite_codes` werden pro Garten „replace-all" gepullt.
- Logout und Nutzerwechsel: `storage.clearAll()` (Rows, Outbox, sync_state). Lokale Schema-Version 5 setzt alle Cursor auf null → einmaliger Voll-Pull nach Deploy.
- Outbox: permanente SQLSTATEs (`22P02, 23502, 23505, 23514, 42501, 42P01`) sofort als failed; `nextAttemptAt` wird gespeichert und respektiert; pro `rowId` nur der jüngste Snapshot; keine `LIMIT 50 + skip`-Blockade.

---

## 4. Phasen und Arbeitspakete

Aufwände sind Entwickler-Tage (Agent-gestützt realistisch ½–⅔ davon). Reihenfolge ist verbindlich innerhalb einer Phase; Phasen 22 und 23 können parallel laufen, wenn zwei Agenten arbeiten (unterschiedliche Dateien).

### Milestone v2.0 „Handy-Ready" (Phasen 20–25, ~33 Tage)

---

#### Phase 20 — Fundament, Aufräumen, PWA-Deploy (3 Tage)

**Ziel:** Repo sauber, CI grün, PWA live unter `https://spatenstich.pages.dev`, Supabase bleibt wach. Nach dieser Phase können beide die heutige App schon auf dem Home-Bildschirm installieren (noch ohne Touch-Editor).

**WP 20.1 Repo-Hygiene und CI (½ Tag)**
- `git checkout master && git merge ci/test-pr` (fast-forward), Branch `ci/test-pr` löschen, `gsd/phase-20-fundament` anlegen.
- Lint grün: in `app/eslint.config.js` für `**/__tests__/**` und `**/__mocks__/**` die Regeln `react/display-name`, `import/first`, `@typescript-eslint/no-require-imports` auf `off`; `import/no-duplicates` in `app/app/(app)/settings.tsx:14-15` fixen; ungenutzte Importe entfernen: `SyncWorker.ts:14-24`, `plan/index.tsx:25`, `import/preview.tsx:17`, `SyncStatusBadge.tsx:7`, `WebPaletteBar.tsx:11`, `WebPlanEditor.tsx:12`, `IndexedDbAdapter.ts:16`; `react-hooks/exhaustive-deps` in `(app)/_layout.tsx:21`, `import/index.tsx:46`, `EditorCanvas.tsx:52` beheben (nicht per disable).
- Test-Rauschen: `create-garden-entrypoints.test.tsx:61-64` — `useAuthStore`-Mock um `getState` ergänzen (`Object.assign(fn, { getState })`-Muster wie in `useKalenderData.test.ts`). Worker-Leak: `--detectOpenHandles` einmal laufen lassen, Timer in `reconnect-*.integration.test.ts` mit `jest.useFakeTimers()`/`afterEach(clearAll)` schließen.
- `ci.yml`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` als `env:` aus GitHub-Vars setzen (Kap. 5). `eas-build.yml` auf `workflow_dispatch` umstellen (Kommentar: „nativer Build erst nach Phase 29").
- `CLAUDE.md` Stack-Tabelle auf Ist korrigieren (Expo 53.0.27 / RN 0.76.7 / React 18.3.1 / expo-router 4.0.22; „Web-first PWA, nativer Build deaktiviert bis Phase 29"). `pnpm-workspace.yaml`-Kommentar ebenso. `README.md` Status-Tabelle aktualisieren.
- Akzeptanz: `pnpm -r run lint` exit 0; Jest ohne `console.error`-Blöcke aus `create-garden-entrypoints`; CI-Workflow auf einem Test-PR grün.

**WP 20.2 Dead Code entfernen (1 Tag)** — Lösch-Inventar in Anhang A.
- Client: `app/src/lib/photos/**` (+ Jest-Projekt `photos` in `app/jest.config.ts:62-81`), `app/src/stores/captureStore.ts`, `app/src/stores/settingsStore.ts` + Test, `app/app/(app)/settings/privacy.tsx` (wird in WP 24.5 als Datenschutz/Impressum neu geschrieben — bis dahin Link entfernen), `app/src/hooks/useFlag.ts` + Test, `packages/shared/src/constants/flags.ts`, `supabase/seed.sql`-Flag-Seeds, `expo-share-intent` samt `ShareIntentProvider` in `(app)/_layout.tsx` und Plugin-Eintrag in `app.config.ts`, `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `aes-js`-Nutzung bleibt (LargeSecureStore, native).
- Lokal-Modus (D-04): **nichts löschen.** `migrateLocalToAccount.ts`, `auth.ts`-Local-UUID, KV-Zweige in `profileRepo`/`vereinsregelnRepo` und alle `mode === 'local'`-Zweige bleiben. Einzige Änderung: Home-Buttons, die im Lokal-Modus in eine Exception laufen („Plan öffnen", „Importieren", „Kalender" in `(app)/index.tsx:183-224`), zeigen dort den Hinweis `common.accountRequired` („Dafür brauchst du ein Konto") statt zu crashen.
- Vereinsregeln (D-05): **nur aufräumen, nichts löschen.** `profile/vereinsregeln/upload.tsx` (Stub mit ASCII-Umlauten) und die PDF-Karte `profile/vereinsregeln/index.tsx:56-62` samt `rules.upload.*`-Keys und `VereinsregelSource 'pdf_extraction'` entfernen; `packages/shared/src/constants/flags.ts` auf eine Compile-Time-Konstante `FEATURES = { vereinsregeln: false }` umstellen (DB-Tabelle `feature_flags` und `useFlag` gehen trotzdem, beides ohne Nutzer); Banner in `profile/index.tsx`, die Routen unter `profile/vereinsregeln/` und den Sync-Push für `vereinsregeln` hinter `FEATURES.vereinsregeln` legen, damit bis WP 21.6 keine `22P02`-Einträge mehr in der Outbox entstehen. Tests bleiben und laufen mit Flag `true` im Test-Setup.
- Migration `supabase/migrations/20260910000020_cleanup_legacy.sql` (Anhang C.1): drop `photo_queue` (+ Policies/Trigger), `enqueue_photo_analysis`, Buckets `photos` und `vereinsregeln` samt Policies **nur wenn `select count(*) from storage.objects where bucket_id in ('photos','vereinsregeln')` = 0**, Tabelle `feature_flags`, Spalten `profiles.plz/klimazone/archetype` (vorher `grep -rn "profiles.plz\|p.plz\|plz" supabase/migrations` — Funktionen, die sie lesen, neu definieren), `transfer_ownership` ohne die `created_by_user_id`-Überschreibung (Regression aus 013:316-320) neu anlegen. Stale SQL-Tests unter `supabase/tests/` löschen oder anpassen (`garden_plan_rls.sql` Test 6, `storage_photos_rls.sql`, `trigger_ordering.sql`, `migration_003_atomic.sql`, `rls_foundation.sql`, `rls_member_check.sql`).
- Akzeptanz: `git grep -n -i "plantnet\|anthropic\|captureStore\|exif\|useFlag" app/src app/app` liefert nur Kommentare; `git grep -n "rules.upload\|pdf_extraction" app packages` leer; im Profil ist ohne Flag kein Vereinsregeln-Einstieg sichtbar; Bundle-Größe sinkt (Ziel < 5,2 MB); Tests grün (Zahl sinkt entsprechend, in SUMMARY notieren); Migration 020 nach 3-Gate live.

**WP 20.3 PWA-Shell mit Teilen-Ziel (1,5 Tage)**
- `app/public/manifest.json`: `name: "Spatenstich"`, `short_name: "Spatenstich"`, `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `lang: "de"`, `background_color: "#F6F1E7"`, `theme_color: "#4A7C59"`, Icons 192/512 (`purpose: "any"`), 192/512 (`purpose: "maskable"`), 512 (`purpose: "monochrome"`), und das Teilen-Ziel:
  ```json
  "share_target": { "action": "/share-target", "method": "POST", "enctype": "multipart/form-data",
    "params": { "title": "title", "text": "text", "url": "url",
                "files": [{ "name": "file", "accept": ["application/json", ".json", "text/plain", ".txt"] }] } }
  ```
- Icons: `app/assets/icon.svg` (Line-Art, Kap. 3.4) + `scripts/gen-icons.mjs` mit `sharp` (devDependency) → `app/public/icons/icon-192.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png`, `icon-512-mono.png`, `favicon-32.png`, `favicon.ico`; `app.config.ts`: `icon`, `web.favicon`, `splash.backgroundColor '#F6F1E7'`, `orientation: 'default'` (Editor im Querformat erlaubt), `userInterfaceStyle: 'light'`, `web.headers` entfernen (nur EAS-Hosting-relevant), `expo-share-intent`-Plugin raus, `experiments.typedRoutes` behalten.
- HTML-Template: `app/public/index.html` anlegen (Struktur aus dem heutigen `app/dist/index.html` übernehmen) mit `<html lang="de">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<link rel="manifest" href="/manifest.json">`, `<meta name="theme-color" content="#4A7C59">`, `<link rel="icon" href="/icons/favicon-32.png">`, `<style>html,body,#root{height:100%;overscroll-behavior:none;background:#F6F1E7}body{touch-action:manipulation}</style>`. **Verifikation:** nach `expo export` muss `app/dist/index.html` diese Tags enthalten. Falls Expo das Template nicht übernimmt (Version 53 + `output:'single'` ist hier nicht garantiert): Fallback `scripts/inject-html-head.mjs`, das `dist/index.html` nach dem Export patcht — im `build:web`-Script verdrahten. Die SUMMARY hält fest, welcher Weg griff.
- Service Worker (handgeschrieben, weil das Teilen-Ziel einen eigenen `fetch`-Handler braucht): `workbox-cli` devDependency, Quelle `app/sw-src.js` mit `precacheAndRoute(self.__WB_MANIFEST)`, `registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/_expo\//, /^\/share-target/] }))`, **kein** `skipWaiting` (nur auf Nachricht `SKIP_WAITING`), und dem Teilen-Handler:
  ```js
  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;
    event.respondWith((async () => {
      const fd = await event.request.formData();
      const file = fd.get('file');
      const text = file && typeof file.text === 'function' ? await file.text() : String(fd.get('text') || '');
      await putShareInbox({ text, receivedAt: Date.now() });   // IndexedDB 'spatenstich-share', Store 'inbox', Key 'latest' — reine indexedDB-API, kein Import
      return Response.redirect('/import?from=share', 303);
    })());
  });
  ```
  `app/workbox-config.js` (`globDirectory:'dist'`, `globPatterns:['**/*.{html,js,css,png,svg,ico,json,woff2}']`, `swSrc:'sw-src.js'`, `swDest:'dist/sw.js'`), Script `"build:web": "expo export --platform web && node ../scripts/inject-html-head.mjs && workbox injectManifest workbox-config.js"`. Registrierung in `app/app/_layout.tsx` nur wenn `Platform.OS==='web' && 'serviceWorker' in navigator && location.protocol==='https:'`; `registration.onupdatefound` → Toast „Neue Version verfügbar · Neu laden" (postMessage `SKIP_WAITING`, dann `location.reload()`), niemals automatisch während `hasPendingSaves()`.
- App-Seite des Teilen-Ziels: `app/app/(app)/import/index.tsx` liest bei `?from=share` den Inbox-Eintrag (`app/src/lib/shareInbox.ts`, gleiche IndexedDB), füllt das Textfeld, validiert sofort, springt bei gültigem Payload direkt zur Vorschau und leert die Inbox. Ist der Nutzer nicht angemeldet, greift der Auth-Guard; nach Login landet er wieder auf `/import?from=share` (Ziel-Route in `authStore.pendingRoute` merken).
- Install-Prompt: `beforeinstallprompt` in `_layout.tsx` (Web) abfangen, Event im Store halten; Banner „Spatenstich als App installieren" auf „Heute" (WP 23.2) und unter „Mehr"; Tap → `prompt()`; ausblenden, wenn `matchMedia('(display-mode: standalone)')` passt.
- Speicher: nach Login `navigator.storage.persist()` anfragen (Chrome gewährt es installierten Apps); `navigator.storage.estimate()` bei App-Start, Warn-Banner ab 80 % Quota.
- `app/public/_headers`: `/index.html` und `/sw.js` → `Cache-Control: no-cache`; `/_expo/static/*` → `Cache-Control: public, max-age=31536000, immutable`; `/*` → `X-Content-Type-Options: nosniff`. Keine `404.html` erzeugen (Cloudflare-SPA-Fallback).
- `app/src/lib/supabase.ts`: Web `detectSessionInUrl: true` (D-12 braucht es nicht, schadet nicht), `auth.storage` bleibt localStorage.
- Akzeptanz: Lighthouse-PWA-Check „installable" grün; `dist/sw.js` enthält Precache-Manifest und Teilen-Handler; auf dem Android-Handy: Chrome → ⋮ → „App installieren" → Icon korrekt (auch rund maskiert), Start ohne Browser-Leiste, Statusleiste in Moos; zweiter Start im Flugmodus zeigt die App-Shell mit letztem Plan; in der Claude-App „Teilen" auf eine `.json`-Datei **und** auf einen kopierten Text → „Spatenstich" erscheint im Teilen-Menü → Import-Vorschau zeigt den Payload.

**WP 20.4 Deploy + Keep-alive (½ Tag)**
- `.github/workflows/deploy-web.yml`: `on: push: branches: [master]` + `workflow_dispatch`; Steps: pnpm install --frozen-lockfile → `pnpm --filter app run build:web` (env `EXPO_PUBLIC_*` aus Vars, `EXPO_PUBLIC_SENTRY_DSN` aus Secret) → `bash scripts/check-claude-key-in-bundle.sh app/dist` → `cloudflare/wrangler-action@v3` mit `command: pages deploy app/dist --project-name spatenstich --branch main` (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
- `.github/workflows/supabase-keepalive.yml`: `schedule: cron: '0 6 */3 * *'` + `workflow_dispatch`; `curl -sf "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/plants?select=slug&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"` (Tabelle `plants` ist für `authenticated` lesbar; für `anon` liefert sie leer, zählt aber als DB-Aktivität). Hinweis in README: GitHub deaktiviert Cron nach 60 Tagen ohne Repo-Aktivität → zusätzlich Task-Scheduler-Ping auf dem 24/7-PC (Kap. 7.3).
- README: Abschnitte „Installation auf dem Android-Handy (Chrome)" (5 Schritte mit Screenshots-Platzhaltern), „Import aus der Claude-App per Teilen" und „Claude-Projekt einrichten".
- Akzeptanz: Push auf master → Deploy < 10 min → URL erreichbar; Keep-alive-Workflow manuell erfolgreich.

---

#### Phase 21 — Sync und Datenintegrität (6 Tage)

**Ziel:** Zwei Personen bearbeiten denselben Garten auf drei Geräten, und jede Änderung landet innerhalb weniger Sekunden beim anderen. Keine stillen Verluste.

**Abhängigkeit:** WP 20.2 (Legacy raus, Vereinsregeln hinter Flag).

**WP 21.1 Migration 021 „sync cursor" (1 Tag)** — SQL in Anhang C.2.
- Neue Spalte `server_updated_at` + Trigger `zy_set_server_updated_at_<table>` (BEFORE INSERT OR UPDATE) auf: `gardens, profiles, garden_members, invite_codes, garden_dimensions, plan_elements, imports, import_items, bed_drafts, plant_drafts, observation_drafts`. Backfill `= coalesce(updated_at, created_at, now())`. Index `(garden_id, server_updated_at)` auf allen garten-skopierten Tabellen; `(id, server_updated_at)` auf `gardens`/`profiles`.
- `garden_members`: Spalten `updated_at`, `updated_by_user_id`, `deleted_at` ergänzen (Soft-Delete), RLS-Policies prüfen, dass `deleted_at`-Rows für Mitglieder sichtbar bleiben (Pull braucht den Tombstone), aber `is_garden_member()` sie ausschließt.
- `tg_set_updated_at()` neu definieren: `IF TG_OP='UPDATE' AND NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN NEW.updated_at := now(); END IF; IF NEW.updated_at > now() + interval '5 minutes' THEN NEW.updated_at := now(); END IF; RETURN NEW;` — Client-Stempel bleiben erhalten (D-07). Alle bestehenden `zz_set_updated_at_*`-Trigger nutzen diese Funktion (prüfen via `select tgname, tgrelid::regclass from pg_trigger where tgname like 'zz_%'`).
- `garden_dimensions`: `UNIQUE(garden_id)` durch partiellen Unique-Index `where deleted_at is null` ersetzen.
- Realtime-Publikation (Migration 022, idempotent über `pg_publication_tables`): obige Tabellen zu `supabase_realtime`.
- pgTAP-Tests in `supabase/tests/sync_cursor.sql`: (a) INSERT setzt `server_updated_at`, (b) UPDATE mit älterem `updated_at` → P9011, (c) UPDATE mit neuerem Client-Stempel behält ihn, (d) UPDATE ohne Stempeländerung bumpt.
- Akzeptanz: Migration nach 3-Gate live; pgTAP grün (`supabase test db` lokal oder per Skript gegen linked DB).

**WP 21.2 SyncWorker-Umbau (1,5 Tage)**
- `app/src/lib/sync/SyncWorker.ts`: `pull(entity)` liest `sync_state.lastPullAt`, Filter `server_updated_at > (cursor - 10s)`, `order('server_updated_at').order('id')`, `limit(500)`, Schleife bis Seite < 500; Cursor = letztes `server_updated_at` der Seite; kein `server_now`-RPC mehr. `garden_members`/`invite_codes`: Replace-all pro Garten (`storage.replaceRowsForGarden`). In-flight-Guard für `pull` wie für `push`.
- `upsertRowsFromServer` (`SqliteAdapter.ts:326-354`, `IndexedDbAdapter.ts`): pro Row `if (local && (pendingOutbox.has(id) || local.updatedAt > server.updatedAt)) skip`.
- `handlePushError`: P9011 → Outbox-Eintrag löschen, `pull(entity)` sofort, Event `conflict_resolved {entity,rowId,winnerUserId}`; permanente SQLSTATEs sofort failed; `nextAttemptAt` in `OutboxEntry` (Schema-Migration v5 der lokalen Adapter) und `listOutboxEntries` filtert `nextAttemptAt <= now`; pro `rowId` Snapshots zusammenfassen (jüngster gewinnt) beim Enqueue in `writeWithOutbox`.
- `rowMappers.ts` + `entities.ts`: `serverUpdatedAt` mappen; `klimazone` als `number | null` typisieren (`rowMappers.ts:49-103`); tote `'delete'`-Zweige entfernen (`SyncWorker.ts:276-287, 359-370, 386-397`); `packages/shared/src/types/supabase.ts` neu generieren (`supabase gen types typescript --linked > packages/shared/src/types/supabase.ts`, erste Zeile prüfen!) und als `Database` exportieren, `database.ts` löschen, die 11 `as any` in `SyncWorker.ts` entfernen.
- Lokale Schema-Version 5 (`app/src/storage/migrations.ts`): alle `sync_state.lastPullAt = null` (einmaliger Voll-Pull).
- Tests: `SyncWorker.test.ts` Fixtures auf `server_updated_at` umstellen; neue Tests: Pagination (2 Seiten), Überlappung idempotent, lokale pendente Row wird nicht überschrieben, P9011 → Re-Pull + Event, permanenter Fehler → sofort failed, `nextAttemptAt` respektiert.
- Akzeptanz: Zwei Browserprofile (A/B) im selben Garten: B legt Beet an → A sieht es nach Foreground/Reconnect (Realtime kommt in 21.4); A und B ändern dasselbe Element offline, A zuletzt (später Stempel), B synct zuerst → nach beiden Syncs zeigt jeder A's Stand.

**WP 21.3 Editor-Persistenz (1 Tag)**
- `editorStore.ts`: neue Action `hydrate(elements)` → `temporal.pause()`, `set({elements})`, `temporal.resume()`, `temporal.getState().clear()`; Autosave-Subscription (`:273-284`) entfernen; `scheduleSaveElement` explizit in `addElement/updateElement/deleteElement/polygonCommit/moveSelectedBy` und im Gesture-End-Diff; bei `deleteElement` und bei Undo/Redo: für IDs, die aus `elements` verschwinden, sofort `writePlanElement({...prev, deletedAt: now})` bzw. für wieder auftauchende IDs Restore schreiben (Undo-Wrapper `:213-230` erweitern: Diff zwischen Vorher/Nachher-Elements).
- `saveDebounce.ts`: `cancelSaveElement(id)`; `flushOnLeave` cancelt Timer **synchron** vor `await`; Fehler → Event `save_failed` → Banner im Editor (nicht nur `console.warn`).
- `plan/index.tsx`: `beforeunload` durch `pagehide` + `visibilitychange==='hidden'` ersetzen (Web); `AppState` `background` → `flushAllPendingSaves()` (native Pfad bleibt).
- `gardenPlanRepo.writePlanElement`: Vergleich mit gespeicherter Row, keine Outbox bei identischem Snapshot; nicht mehr alle Rows des Gartens pro Write lesen (`getRow(entity,id)`).
- `useCompanionDetection.ts:266-277`: `enrichPlantSlug` als Teil des `addElement`-Payloads statt nachträglichem `updateElement`.
- Tests: `editorStore.hydrate.test.ts` (kein Save, keine History), `editorStore.undoDelete.test.ts` (Undo nach add schreibt Tombstone), `saveDebounce` cancel/flush-Reihenfolge.
- Akzeptanz: Editor öffnen erzeugt 0 Outbox-Einträge; Undo nach Reload ist deaktiviert; Beet anlegen → Undo → Reload → Beet fehlt auch auf Gerät B.

**WP 21.4 Realtime + UI-Invalidierung (1 Tag)**
- `app/src/lib/sync/RealtimeBridge.ts`: `supabase.channel('garden:'+id).on('postgres_changes', {event:'*', schema:'public', table, filter:'garden_id=eq.'+id}, …)` für die Tabellen aus 3.5; pro Tabelle debounced (300 ms) `getSyncWorker().pull(table)`; `gardens`/`garden_members` über `id`/`garden_id`. Start/Stop in `_layout.tsx` Sync-Bootstrap; bei `CHANNEL_ERROR`/`TIMED_OUT` Polling 60 s (nur `AppState==='active'`/`document.visibilityState==='visible'`).
- `app/src/hooks/useGardenData.ts`: Hook, der `pull_success(entity)` in einen Zähler übersetzt; `index`, `plan`, `kalender`, `import/review`, `DraftsTray` laden bei Änderung neu; Editor: wenn `pull_success('plan_elements')` während Bearbeitung → Merge: fremde Rows (nicht in lokalem Pending-Set) in den Store übernehmen (`hydrateForeign(rows)` ohne History), Toast „{Name} hat den Plan geändert".
- `SyncStatusBadge`: Zustände synced/pending/offline/error, Tap → Speicherstatus; Konflikt-Toast aus 21.2.
- Tests: RealtimeBridge mit gemocktem Channel (Subscribe/Unsubscribe, Debounce, Fallback-Polling-Timer), `useGardenData` Zähler.
- Akzeptanz: A verschiebt Beet → B sieht Bewegung < 5 s ohne Interaktion (Realtime) bzw. < 60 s (Polling-Fallback bei getrenntem Websocket).

**WP 21.5 Konto, Garten, Bootstrap (½ Tag)**
- PLZ/Klimazone auf den Garten (D-10): `useProfile.setPlz` → `updateGarden(...)`; `profileStore` aus `loadGarden` hydrieren; `profileRepo` auf `displayName` reduzieren.
- `_layout.tsx`: Effekte auf `identity?.userId` keyen (nicht Objekt); `ensureDefaultGardenForUser` offline → Banner „Keine Verbindung — versuche es gleich noch mal" + Retry bei Reconnect; Invite-Code aus `authStore.pendingInviteCode` **vor** `ensureDefaultGardenForUser` einlösen (Vorbereitung für WP 23.3).
- `storage.clearAll()` in beiden Adaptern; Aufruf bei `signOut` und bei `userId`-Wechsel; Logout warnt bei `outbox.length > 0`.
- `nextFreeBedSlot`/`promotePlantDraft` auf Center-Konvention (E7) korrigieren; Test in `draftPromotionRepo.layout.test.ts` anpassen.
- `SyncTriggers.ts`: `startAutoRefresh/stopAutoRefresh` an `AppState` koppeln (Supabase-Empfehlung).
- Akzeptanz: PLZ setzen → Reload → Klimazone bleibt, Partnerin sieht dieselbe Zone; Logout → Login als andere Person → keine fremden Rows sichtbar (IndexedDB leer).

**WP 21.6 Vereinsregeln reparieren (1 Tag, D-05)**
- Migration 023: `vereinsregeln` bekommt `seed_key text` (nullable) + partiellen Unique-Index `(garden_id, seed_key) where seed_key is not null and deleted_at is null`; `server_updated_at` kommt bereits aus 021.
- `vereinsregelnRepo.ts:63-81`: IDs nur noch über `newId()`; BKleingG-Seeds tragen `seedKey: 'bkleingg-<idx>'` statt der `bk-<userId>-<idx>`-ID; `checklist.tsx:35-38` ebenfalls `newId()`. Legacy-IDs (`bk-…`, `chk-…`) werden beim Laden einmalig auf UUIDs umgeschrieben (lokal + Outbox-Update), damit alte lokale Blobs überleben.
- Sync: `pushVereinsregeln` (`SyncWorker.ts:321-345`) schreibt Soft-Deletes (`deleted_at`) statt `DELETE`, überschreibt `created_by_user_id`/`erstellt_am` nicht mehr (`rowMappers.ts:172-223`); Pull ohne den `data.length === 0`-Kurzschluss (`SyncWorker.ts:487-502`), Cursor wie bei allen anderen Tabellen; das Flag-Gate aus WP 20.2 bleibt, damit ohne Aktivierung nichts gepusht wird.
- `migrateLocalToAccount.ts:154-176` (Step 6) nutzt denselben Pfad; der sessionlose Fall (E-Mail-Bestätigung aktiv) wird sauber gemeldet statt mit `42501` zu scheitern. Lokaler `displayName` wird übernommen (heute überschreibt Step 4 ihn mit dem E-Mail-Präfix).
- Tests: `vereinsregelnRepo.test.ts` (UUID-Regex, seedKey, Legacy-Remap), `SyncWorker.bugfixes.test.ts` (Soft-Delete, kein Audit-Overwrite), `migrateLocalToAccount.test.ts` angepasst.
- Akzeptanz: mit `FEATURES.vereinsregeln = true` im Dev-Build: Regeln im Konto-Modus speichern → Row auf dem Server, Outbox leer, zweites Gerät sieht dieselben Regeln; Regel löschen → verschwindet auf dem anderen Gerät. Flag bleibt danach `false` bis zur Aktivierungsphase.

---

#### Phase 22 — Ein Editor für Maus und Touch (10 Tage)

**Ziel:** Ein `PlanEditor`, der auf dem Handy mit dem Finger und am Desktop mit der Maus alles kann, was der Web-Editor heute kann, plus Zoom/Pan, Polygon, Maßangaben, Abstands-Ring.

**Abhängigkeit:** WP 21.3.

**WP 22.1 Reine Helfer extrahieren (1 Tag)**
- `packages/shared/src/types/entities.ts`: `ElementProvenance` typisieren (`zOrder?, plantSlug?, parentBedId?, polygonPointsM?: {xM,yM}[], rotateDeg?, source?, sunExposure?, soilNotes?, scientificName?, stageEstimate?, healthNotes?, plantedAt?, note?, accentColor?`) und `PlanElementRow.provenance: ElementProvenance | null`; Validator an der Mapper-Grenze (unbekannte Keys behalten).
- `app/src/lib/editor/provenance.ts` (`getRotateDeg`, `getAccentColor`, `getZOrder`), `elementFactory.ts` (`createElement(kind, centerM, gardenId, userId, plantMeta?)` + `DEFAULT_SIZES` als einzige Quelle, `Rasen` enthalten), `clamp.ts` (`clampCenterToGarden`), `polygonTransform.ts` (rotiert/skaliert `polygonPointsM` mit dem Element; behebt E6), `hitTest.ts` rotationsbewusst (`hitTest.ts:47-56` ersetzen; Handle-Hit nach Bildschirm-Radius), `packages/shared/src/utils/newId.ts` (`expo-crypto` `randomUUID`; alle 7 `randomId`-Kopien ersetzen; Fallback entfällt, Test: matcht UUID-Regex).
- `app/src/lib/i18n.ts`: `t(key, vars?)` mit `{var}`-Syntax; alle 33 Kopien ersetzen; `de.json`-Strings mit `{{x}}` auf `{x}` umstellen (`companion.*`); Test `i18n.test.ts` prüft, dass jeder in `app/` verwendete Key existiert (Regex-Scan über `t('...')`).
- Akzeptanz: Tests grün; `git grep -n "randomId\|reduce<any>" app/src app/app` leer.

**WP 22.2 Interaction-Controller (2,5 Tage)**
- `app/src/lib/editor/interactionController.ts`: Eingabe `PointerSample {id, x, y, type:'mouse'|'touch'|'pen', phase:'down'|'move'|'up'|'cancel', ts, shift, ctrlOrMeta, button}` in Canvas-Pixeln + `viewport {tx,ty,scale}` + `mode:'move'|'select'|'place'|'polygon'` + `placingKind`. Zustände: `idle → pressed → dragMove | dragCreate | marquee | resize | rotate | pan | pinch | polygonTap | placing → idle`. Schwellen 5 px Maus / 8 px Touch; Long-Press 500 ms ≤ 10 px; Doppel-Tipp ≤ 300 ms ≤ 20 px. Zwei aktive Pointer → `pinch` (Skalierung um Mittelpunkt, Clamp 0,5×–4× der Fit-Skala, Pan-Limit ±50 % Viewport). Ausgabe: Store-Actions (`setSelection`, `toggleSelection`, `setSelectedIds`, `moveSelectedBy`, `updateElement`, `addElement`, `polygonAddPoint`, `setGestureActive`, `setEditingElementId`, `setViewport`, `openContextActions`).
- Trefferpriorität: Handles (Trefferradius 22 px Touch / 8 px Maus, Bildschirm-Pixel) → oberstes Element (Z-Order, rotationsbewusst) → Canvas.
- Tests (`node`-Projekt): Verhalten der bestehenden `WebPlanEditor.{clickSelect,dblclick,dragcreate,multiselect,arrowkeys,rotation}.test.tsx` als `PointerSample`-Sequenzen nachbauen (Tap-Select, Tap auf Hintergrund deselektiert, Drag < Schwelle = Klick, Drag-Move mit Clamp, Drag-Create, Marquee, Ctrl-Toggle, Resize rotiert (Mathematik aus `WebResizeHandle.tsx:56-87`), Rotate mit 15°-Snap/Shift-Bypass (aus `WebRotationHandle.tsx`), Long-Press → `setEditingElementId`, Doppel-Tipp → dito, Pinch, Pan-Limits, Polygon-Tap, Placing mit Ghost, `cancel` bricht sauber ab, `gestureActive` wird in jedem Endzustand `false`).
- Akzeptanz: ≥ 40 Controller-Tests grün, kein DOM im Modul (`import`-Check im Test).

**WP 22.3 Renderer + Web-Pointer-Adapter (2 Tage)**
- `PlanEditor.tsx` (react-native-svg): Props `mode: 'readOnly'|'edit'`, `elements`, `dimensions`, `viewport`, `selection`, `showGrid`, `activeLayers`, `onSample?`. Aufbau: `<Svg>` → `<G transform>` Garten (Papier, Gitter, Grenze, Elemente sortiert per `sortByZOrder`, hidden Layers **nicht** gemountet, Polygon-Beete als `<Polygon>`, Baum als Kreis, Zaun als Linie mit Ticks, Labels Caveat, Maßangaben) → Screen-Space-Overlay (Selektion, Handles, Marquee, Ghost, GhostRing, Konflikt-Dreiecke, Polygon-in-Progress). `React.memo` pro Element-Node.
- `PlanEditor.web.tsx`: wrappendes `<div ref>` mit `onPointerDown/Move/Up/Cancel`, `setPointerCapture`, `style={{touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none'}}`, `onWheel` (Ctrl/Trackpad-Pinch = Zoom um Cursor, sonst Pan), `tabIndex=0` + `onKeyDown` (Entf/Backspace, Esc, Pfeile+Shift, Ctrl/Cmd+Z/Y, Ctrl/Cmd+A). **Keine Handler auf SVG-Elementen** (react-native-svg/web entfernt `onClick`; Memory `reference_rnsvg_web_onclick`). `ResizeObserver` → Fit-to-Screen beim Mount und bei Dimensionsänderung.
- Jest: `PointerEvent`-Polyfill + `setPointerCapture`-Stub in `app/src/components/editor/__tests__/setup.ts` (jsdom 20 hat keins); Adapter-Tests: `pointerdown/move/up` auf dem Wrapper erreichen den Controller; Wheel-Zoom; Keydown-Mapping.
- `GardenPlanView.tsx` durch `<PlanEditor mode="readOnly" />` ersetzen (Home/Plan-Tab), Datei löschen.
- Akzeptanz: Im Chrome-Device-Mode (Touch-Emulation) und real auf dem Android-Handy (Chrome): Tap-Select, Drag-Move, Pinch-Zoom, Resize/Rotate per Handle, Long-Press-Modal funktionieren; Desktop-Maus/Tastatur wie heute.

**WP 22.4 Feature-Port und Chrome (2,5 Tage)**
- Drag-to-create, Marquee, Resize, Rotate, Polygon-Werkzeug (Ecken tippen + „Beet abschließen", dashed Vorschau; gilt jetzt auch im Web = Phase 7.5b erledigt), Placing-Ghost + `GhostRing`/`hasOverlap` (EDIT-07 endlich), Snap-to-Grid optional (Toggle, 0,1 m), Maßangaben-Toggle, Duplizieren (Offset 0,5 m), Löschen mit Undo-Snackbar (`editor.deleteConfirm*`-Keys in `editor.deleted`/`editor.undo` umbenennen), Fit/Reset-Button (`editor.viewport.*` existiert).
- `EditorToolbar.tsx` neu (responsiv: Top-Bar + Action-Bar mobil, eine Zeile Desktop), alle Buttons `accessibilityLabel`, ≥ 48 dp (mindestens 44 px); `ElementPalette.tsx` als Bottom-Sheet (mobil) / Seitenleiste (Desktop) mit lucide-Icons + Pflanzen-Suche (`searchPlants`); `DraftsTray.tsx` (Web + native gleich): Liste offener Vorschläge, „Übernehmen" platziert per `nextFreeBedSlot`, „Ablehnen", kein Fake-Drag; `ElementEditorModal.tsx`: Einheiten „cm"/„°", Position (x/y in m) editierbar, Datumsfeld zeigt Wert (`<input type=date>` im Web; native Branch behält `CrossPlatformDatePicker` ohne `@react-native-community/datetimepicker` → `expo`-lose Fallback-Textfeld), Farbwahl als 8 Preset-Swatches (`reanimated-color-picker` entfernen; spart ~500 KB PNGs), `KeyboardAvoidingView`.
- `CompanionToast` über der Action-Bar (gemessene Höhe), Slide-up/Fade (UI-SPEC 09).
- Löschen: `EditorCanvas.tsx`, `ResizeHandle.tsx`, `RotationHandle.tsx`, `PolygonInProgress.tsx`, `GhostRing.tsx` (in Overlay integriert), `web/WebPlanEditor.tsx`, `web/WebEditorToolbar.tsx`, `web/WebPaletteBar.tsx`, `web/WebResizeHandle.tsx`, `web/WebRotationHandle.tsx`, `EditorCanvas.*.test.tsx`, `ResizeHandle.test.tsx`, `RotationHandle.test.tsx`, `Web*.test.tsx` (Behaviors leben in 22.2/22.3), `@shopify/react-native-skia`, `reanimated-color-picker`, `@react-native-community/datetimepicker` aus `package.json`; Skia-Mocks aus `setup.ts`; `metro.config.js` COOP/COEP-Middleware und `assetExts.push('wasm')` entfernen.
- `plan/index.tsx` → `(app)/(tabs)/plan.tsx` (readOnly + „Bearbeiten") und `(app)/plan/edit.tsx` (edit, `Stack.Screen options={{headerShown:false, presentation:'fullScreenModal'}}`); Modal-Mount einmal.
- Akzeptanz: Feature-Matrix aus dem Editor-Audit (Kap. 1 des Audits) komplett ✅ auf Web-Maus und Web-Touch; Bundle < 4,5 MB; Test-Anzahl ≥ Stand vor Phase 22 (in SUMMARY belegen); UAT-Szenarien Kap. 6.3.

**WP 22.5 Performance und Stabilität (1 Tag)**
- 200 Elemente per SQL-Seed (Vorlage in `docs/test-plans/2026-05-13-full-app-manual.md` Abschnitt 2.4.9) → Android-Chrome: Pan/Pinch flüssig (Performance-Trace per Chrome Remote Debugging vom Handy: < 16 ms/Frame im Median); wenn nicht: Element-Nodes memoisieren, Labels ab Zoom-Schwelle, Gitter als ein `<Pattern>`.
- Kein Text-Highlight, kein Callout, kein Page-Zoom im Editor; `100dvh`-Layout ohne Scroll.
- Akzeptanz: Trace-Screenshot in SUMMARY; Lighthouse Performance ≥ 80 mobil.

---

#### Phase 23 — Navigation, Onboarding, Auth (5 Tage)

**Ziel:** Partnerin installiert die App, registriert sich mit Code, sieht in 3 Minuten den gemeinsamen Plan.

**Abhängigkeit:** WP 21.5 (Invite-Code-Bootstrap), WP 22.3 (readOnly-Editor). Parallel zu 22.4/22.5 möglich.

**WP 23.1 Tabs und Header (1 Tag)**
- `(app)/(tabs)/_layout.tsx` mit `Tabs` (expo-router 4): `index` „Heute" `Home`, `plan` „Plan" `Map`, `kalender` „Kalender" `CalendarDays`, `mehr` „Mehr" `Menu`; Tab-Bar `karton`, aktiv `moos`, Höhe 56 + Safe-Area; Labels aus `de.json`. Bestehende Routen umziehen (`kalender/index.tsx` → Tab; `kalender/[slug].tsx` bleibt Stack-Screen unter dem Tab; `import/*`, `settings*`, `profile*`, `join-garden` unter `(app)/mehr/` bzw. bleiben als Stack-Screens mit `headerShown:true` und **echtem** `headerTitle` pro Screen). Doppel-Header beseitigen (`profile/vereinsregeln/_layout.tsx` ist mit D-05 weg; Editor hat eigene Top-Bar). `SyncStatusBadge` bleibt `headerRight` in Stack-Screens, auf „Heute" als Punkt im Kopf.
- Home-eigene Icon-Zeile (`index.tsx:114-124, 169-175`) entfernen.
- Akzeptanz: Jede Route erreichbar in ≤ 2 Taps von einem Tab; kein Screen ohne Titel; Back-Verhalten korrekt (Tab-Wechsel resettet keine Stacks).

**WP 23.2 „Heute" (1 Tag)** — Spezifikation Kap. 3.3. `KalenderWochenCard` wiederverwenden, `useKalenderData` liefert Wochenaktionen; Plan-Vorschau `readOnly` mit Tap; Kontext-Karte; `useFocusEffect` + `useGardenData`; `ActivityIndicator` statt „..."; Desktop `max-w-2xl` zentriert.
- Akzeptanz: Nach Login sieht man ohne weiteren Tap: diese Woche fällige Aktionen, den Plan, den nächsten sinnvollen Schritt.

**WP 23.3 Onboarding und Beitritt (1,5 Tage)**
- `(auth)/register.tsx`: Feld „Einladungscode (optional)"; nach `signUp` → `authStore.pendingInviteCode`; `_layout.tsx` löst ihn nach Login über `inviteCodeRepo.joinByCode` ein, **bevor** `ensureDefaultGardenForUser` läuft (sonst entsteht ein leerer Zweitgarten; prüfen ob RPC `ensure_default_garden_for_user` idempotent bei bestehender Mitgliedschaft ist — laut Migration 003 ja, in SUMMARY belegen). `(auth)/join-by-code.tsx` und Startscreen-Karte löschen; `(app)/join-garden.tsx` → `mehr/garten` Sektion „Code eingeben".
- `(app)/onboarding/{groesse,plz,partner}.tsx` (Kap. 3.3), Redirect-Guard in `_layout.tsx`: `identity && activeGardenId && dimensions === null && !inOnboarding → /(app)/onboarding/groesse`; nach Schritt 1 ist `dimensions` gesetzt → kein Redirect mehr, Schritte 2–3 nur per Weiter/Überspringen. `plan/new.tsx` wird Schritt 1 (Umbenennung, Labels „Länge/Breite").
- Kontext-Karte auf „Heute" übernimmt Erinnerung an PLZ/Partnerin.
- Tests: Guard-Logik als reine Funktion `resolveStartRoute({identity, gardenId, dimensions, segments})` + Tests; Register mit Code → Store; Onboarding-Screens rendern + validieren.
- Akzeptanz: Neue Testperson mit Code: Registrieren → 3 Screens → gemeinsamer Plan sichtbar, gestoppt < 3 min. Ohne Code: Garten anlegen → Editor-Empty-State.

**WP 23.4 Auth-Härtung (1 Tag)**
- „Passwort vergessen?" (`(auth)/reset-request.tsx` → `supabase.auth.resetPasswordForEmail(email)`; `(auth)/reset-verify.tsx` → `verifyOtp({email, token, type:'recovery'})` → `updateUser({password})`). Setzt manuellen Schritt Kap. 5 (E-Mail-Template mit `{{ .Token }}`) voraus; bis dahin Hinweis im Screen.
- Passwort-Auge, Mindestlängen-Hinweis, generische Fehlertexte ohne Enumeration (`auth.register.error_generic` korrigieren), Doppel-Submit-Sperre, `KeyboardAvoidingView` + `SafeAreaView` in allen Auth- und Formular-Screens (`useSafeAreaInsets` für Sticky-Footer in `preview`, `review`, `ElementPalette`, `DraftsTray`).
- `verify-email.tsx` entfernen, wenn Bestätigung deaktiviert (Kap. 5), sonst „Erneut senden".
- Akzeptanz: Reset-Flow auf dem Handy in der installierten App ohne Browser-Wechsel; Tastatur verdeckt nie den Submit-Button.

**WP 23.5 Garten und Konto („Mehr") (½ Tag)**
- Gartenname editierbar (`updateGarden`), „Kopiert"-Feedback (`garden.invite.copied`), Mitgliederliste mit „zuletzt aktiv", Besitz übertragen als `outline` + eine destruktive Bestätigung, Garten löschen ohne `/(auth)`-Flackern (`settings/garden.tsx:210-214`: lokale Rows purgen, `activeGardenId` null, Redirect Onboarding), rohe `e.message` → `errors.*`-Keys + Sentry.
- Akzeptanz: kein roher Exception-Text mehr im UI (`git grep "as Error).message" app/app` leer).

---

#### Phase 24 — Design-System, Copy, Politur (6 Tage)

**Ziel:** Die App sieht aus wie ein warmes Gartenheft, spricht die Sprache der beiden und ist auf 375 px angenehm.

**Abhängigkeit:** Phase 23 (Screens stehen). Kann pro Screen inkrementell laufen.

**WP 24.1 Tokens, Fonts, Text-Primitive (1,5 Tage)**
- `tailwind.config.js` `theme.extend`: Farben (Kap. 3.4), `fontFamily: {sans:['Nunito_400Regular'], semibold:['Nunito_600SemiBold'], bold:['Nunito_700Bold'], hand:['Caveat_700Bold']}`, `borderRadius`. `app/src/theme/tokens.ts` exportiert dieselben Hex-Werte für SVG/Inline. `app/src/theme/fonts.ts` lädt via `useFonts` in `_layout.tsx`; Splash bleibt bis Fonts geladen. Web: `expo-font` injiziert `@font-face`; Fallback `system-ui`.
- `ui/text.tsx` Varianten; Codemod (Skript `scripts/codemod-tokens.mjs` oder manuell) für die 146 Hex-Literale und `stone-*`-Klassen → Tokens; `dark:`-Klassen entfernen (D-11).
- Akzeptanz: `git grep -nE "#[0-9A-Fa-f]{6}" app/app app/src --and --not -e tokens.ts --not -e colors.ts` liefert nur SVG-Illustrationen; `git grep -n "dark:" app` leer; Fonts sichtbar auf dem Handy und Desktop.

**WP 24.2 Icons, Illustrationen, Canvas-Stil (1 Tag)**
- Unicode/Emoji/Text-Icons ersetzen (`SyncStatusBadge`, Toolbar, Chevrons `settings.tsx`, Bullets `[slug].tsx`, Emoji-Präfixe `de.json companion.*`); drei Illustrationen; `colors.ts` → Canvas-Stil aus Kap. 3.4 (Beet-Schraffur, Laube-Giebel, Wellen, Ticks) im `PlanEditor`.
- Akzeptanz: Screenshot-Vergleich Vorher/Nachher in SUMMARY; Empty-States mit Illustration auf Heute, Plan, Kalender, Import.

**WP 24.3 Copy und i18n (1 Tag)** — Umbenennungen in Anhang B.
- Alle hartkodierten Strings in `de.json` (Liste aus dem UX-Audit C-2 abarbeiten: `(auth)/index.tsx:36`, `login.tsx:55,69,103`, `register.tsx:61,75,109`, `settings.tsx:139-277`, `profile/index.tsx`, `plz.tsx:47-54`, `archetype.tsx`, `import/index.tsx:95,124`, `KalenderWochenCard.tsx:75`, `ImportEntityCard.tsx:74`, `DraftReviewCard.tsx:25-27`, `CrossPlatformColorPicker.tsx:133`). Roadmap-Leaks (`de.json:67, 416`), Falschaussagen (`home.emptySubtitle`, `app.index.placeholder_sub`, `editor.webFallback.*`) löschen. Enum-Labels (`plants.sun.sonnig|halb_schattig|schattig`, `plants.water.*`). Test: kein Wert in `de.json` matcht `/\b(ae|oe|ue)\b|Drafts|Stale|Payload|Layer|Phase \d/`.
- Akzeptanz: `i18n.test.ts` (Key-Existenz + Verbotsliste) grün; Sichtprüfung aller Screens.

**WP 24.4 Kalender-Politur (1 Tag)**
- Heute-Marker (2-px-Linie `erde`) in `GanttStreifen`; Abschnitte „In eurem Plan"/„Alle Pflanzen A–Z" mit Sticky-Buchstaben und Suche (`Input`); Klimazonen-Name (`kalender.klimazoneLabel`); Legende oben; Balken mit 1-px-Rand + Textlabel ab 40 px Breite (Farbe nicht alleiniger Träger); Filter-Chip ≥ 48 dp (mindestens 44 px); Zone-4-Fallback nur mit sichtbarem Hinweis; WR-08 (jahresüberspannende Erntefenster) und WR-10 (`parentBedId` in `findBeeteForPlant`) beheben.
- Akzeptanz: UAT-Punkte 6.4.

**WP 24.5 Import-UX, Rechtliches, Speicherstatus (1 Tag)**
- Import: Teilen-Weg aus WP 20.3 als erste Option sichtbar machen („Aus der Claude-App teilen" mit Kurzanleitung), „Aus Zwischenablage einfügen" (`navigator.clipboard.readText()` im Tap-Handler; bei Ablehnung Hinweis), Erklärungstext, „Claude-Projekt einrichten"-Screen unter „Mehr" mit Prompt-/Schema-Kopieren-Buttons (Inhalt aus `prompts/garden-project-system-prompt.md` und `schemas/spatenstich-import.v1.json` zur Build-Zeit importiert) und Schrittanleitung für Dirk (Max) und Partnerin (Free-Account, eigenes Projekt).
- `mehr/datenschutz.tsx`: Datenschutzhinweise (Supabase Frankfurt, Sentry EU, keine KI-Aufrufe, Fotos nie in der App), Impressum-Text als `de.json`-Key (Inhalt liefert Dirk, Platzhalter markiert), Version + Build-Hash (`expo-constants` + `GITHUB_SHA` env).
- `mehr/sync.tsx` → „Speicherstatus": Tokens, verständliche Einträge („Beet ‚Hochbeet Nord' – Änderung"), Fehler in Klartext, Buttons ≥ 48 dp (mindestens 44 px), Konfliktliste.
- Sentry: DSN auf EU-Ingest prüfen (`.env` lokal zeigt `ingest.sentry.io`, `.env.example` `ingest.de.sentry.io`) — Kap. 5.
- Akzeptanz: Import per Teilen aus der Claude-App in < 20 s und per Einfügen in < 30 s; Datenschutz-Screen vorhanden.

**WP 24.6 Barrierefreiheit und Feinschliff (½ Tag)**
- Jeder icon-only-Button hat `accessibilityLabel`; Kontrast-Check der Tokens; `accessibilityLanguage="de"`; Fokus-Ring `teich` im Web; Modale mit Fokus-Falle; Font-Scaling bis 130 % ohne Abschneiden (Toolbar-Höhen nicht fix).
- Akzeptanz: VoiceOver-Durchlauf Heute → Plan → Editor-Toolbar → Kalender ohne „Taste, Taste, Taste".

---

#### Phase 25 — Geräte-Abnahme (3 Tage)

**Ziel:** Beide Android-Handys + Desktop laufen den UAT-Katalog (Kap. 6) durch; alles Gefundene ist gefixt.

- `docs/test-plans/2026-05-13-full-app-manual.md` archivieren; neuer `docs/test-plans/v2-uat.md` = Kap. 6 als Checkliste mit Pass/Fail-Spalten.
- Dirk führt Kap. 6 auf Handy A, Partnerin auf Handy B, gleichzeitig; Ergebnisse in `.planning/phases/25-*/25-UAT.md`.
- Fix-Budget 2 Tage (`/gsd-quick` pro Befund, Regressionstest pro Fix).
- Abschluss: `/gsd-complete-milestone v2.0`, Tag `v2.0.0`, README-Status, Memory-Update.

---

### Milestone v2.1 „Saison 2027" (Phasen 26–29, ~18 Tage, Dezember 2026 – Februar 2027)

#### Phase 26 — Wochenaufgaben (5 Tage)
Aus Kalender + Plan generierte Aufgaben („Tomaten vorziehen", „Erbsen säen", „Erdbeeren ernten") mit `done`/`snooze` pro Person sichtbar für beide, wiederkehrend (Gießen nach `waterNeeds`, Vorbild Gardeneus `task-generator.ts`/`watering.ts`, MIT). Tabelle `tasks` (garden-skopiert, RLS, Soft-Delete, `server_updated_at`), deterministische Generierung (Dedupe über `(plantElementId, taskType, isoWeek)`), „Heute"-Karte zeigt Aufgaben statt roher Kalenderaktionen. Optional: Web Push (VAPID über Supabase Edge Function `push-weekly`; Chrome Android unterstützt es vollständig, `expo-notifications` nicht nötig) — Entscheidung des Users, Default aus.

#### Phase 27 — Garten-Journal (4 Tage)
Schnellnotizen pro Beet/Pflanze/Garten (Text, Datum, Art: Beobachtung/Ernte/Schädling/Wetter), optional 1 Foto (client-seitig auf 1280 px verkleinert, Supabase Storage `journal` privat, RLS Member-Check, 1 GB Free reicht für ~2.000 Fotos). Import-Beobachtungen (`observation_drafts`) werden beim Übernehmen zu Journal-Einträgen (schließt die heutige No-op). Timeline-Screen unter „Mehr → Journal" und Einträge im Element-Modal.

#### Phase 28 — Saisonwechsel und Fruchtfolge-Memory (4 Tage)
`plan_elements.season smallint` (Jahr) für Layer `seasonal`; „Neue Saison starten" archiviert die Pflanzen des Vorjahres (bleiben lesbar, Filter im Plan „2026 | 2027"); Fruchtfolge-Warnung nutzt 3-Jahres-Regel pro Beet (Gardeneus `plant-families.ts`, 18 Familien); Kalender „Was war letztes Jahr auf Beet 3?".

#### Phase 29 — SDK-Angleichung und optionales Android-APK (5 Tage)
`npx expo install expo@<aktuell stabil>` + `expo install --fix`, React/RN/expo-router mitziehen, `expo-doctor` grün, Tests grün, Web-Export grün, Bundle-Vergleich. Erst danach, **nur wenn der User ein natives APK will** (Nutzen gegenüber der PWA: Hintergrund-Sync, Intent-Filter, evtl. flüssigerer Canvas): `app.config.ts` `android.package 'de.spatenstich.app'` + `adaptiveIcon`, `PlanEditor.native.tsx` (RNGH `Gesture.Manual` `onTouches*` → `PointerSample`), `eas.json` Profil `preview` mit `android.buildType 'apk'`, `eas build --platform android --profile preview` (EAS Free: 15 Android-Builds/Monat), Installation über den Build-Link auf beiden Handys („Unbekannte Quellen" erlauben). Sobald Googles Developer Verification 2027 weltweit greift: kostenloses Limited-Distribution-Konto (bis 20 Geräte, kein Ausweis). Google Play (25 $ einmalig) nur, wenn später Fremde die App nutzen sollen. Ohne diese Entscheidung endet Phase 29 nach der Angleichung.

### 4.3 Mapping alter Roadmap-Phasen

| Alt | Neu |
|---|---|
| 7.5b Web Editor Polish | Phase 22 |
| 11 Garten-Journal | Phase 27 |
| 12 Task-Generator | Phase 26 |
| 13 Saatgut-Inventar | Backlog (nach v2.1) |
| 14 Modernes Design | Phase 24 |
| 15 Fruchtfolge-Memory | Phase 28 |
| 16 Vereinsregeln-Aktivierung | Backlog 7 (nach der Reparatur in WP 21.6: Flag an, Regel-Editor polieren, BKleingG-1/3-Check) |
| 17 Stale-Imports + Sharing-UX | Phase 22 (DraftsTray) + 23.5 |

### 4.4 Backlog (nicht eingeplant, sortiert nach Nutzen/Aufwand)

1. Frost-Warnung 3 Tage (Open-Meteo, PLZ-Zentroid, kein Key, kein KI-Aufruf) — Frühjahrs-Killerfeature, ~2 Tage.
2. Plan-Export PNG + Druckansicht (SVG → Canvas) — 1 Tag.
3. Garten-Vollexport JSON („Meine Daten") + Import — 1 Tag; Datenhoheit.
4. iCal-Abo für Aufgaben — 1 Tag.
5. Companion-Score „Bestes Beet für X" — 2 Tage.
6. Saatgut-Inventar — 4 Tage.
7. Vereinsregeln aktivieren: `FEATURES.vereinsregeln = true`, Regel-Editor an die Tokens anpassen, Editor-Warnungen, BKleingG-1/3-Check — 3 Tage (Reparatur in WP 21.6 vorausgesetzt).
8. Dark-Mode auf Token-Basis — 2 Tage.
9. iOS-Unterstützung, falls je ein iPhone dazukommt: die PWA läuft dort ebenfalls (ohne Teilen-Menü, Web Share Target fehlt in WebKit); nativ bräuchte es das Apple Developer Program (99 $/Jahr) und einen Mac oder EAS.
10. Lokal-Modus vollständig (D-04): Garten, Plan, Editor und Kalender ohne Konto über eine lokale Garten-ID, „Lokal starten"-Karte auf dem Startscreen, Migration ins Konto auf Basis von WP 21.6 — 4 Tage.

---

## 5. Manuelle Schritte (nur Dirk, einmalig)

| # | Wann | Schritt |
|---|---|---|
| M1 | vor WP 20.4 | Cloudflare-Konto (kostenlos) → Workers & Pages → „Create project → Direct Upload" Name `spatenstich` → API-Token (Template „Cloudflare Pages — Edit") + Account-ID → GitHub-Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. |
| M2 | vor WP 20.1 | GitHub → Settings → Variables: `EXPO_PUBLIC_SUPABASE_URL=https://vitrqkzxkiqvadqfzrcx.supabase.co`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon>`; Secret `EXPO_PUBLIC_SENTRY_DSN` (EU-DSN `…ingest.de.sentry.io…`, im Sentry-Projekt Region prüfen; ggf. neues Projekt in EU anlegen). |
| M3 | vor WP 20.4 | Supabase Dashboard `vitrqkzxkiqvadqfzrcx` → Authentication → URL Configuration: Site URL `https://spatenstich.pages.dev`, Redirect URLs dito (+ `http://localhost:8095` für Dev). |
| M4 | vor WP 23.4 | Auth → Providers → Email: „Confirm email" **aus** (D-12). Auth → Email Templates → „Reset Password": Body um `Dein Code: {{ .Token }}` ergänzen (Link darf bleiben). |
| M5 | vor WP 21.1 | Backup: `scripts/backup-supabase.ps1` einmal manuell ausführen (braucht DB-Passwort aus Dashboard → Settings → Database) oder Agent bitten (Kap. 7.4). |
| M6 | nach WP 20.4 | Beide Android-Handys: Chrome → URL → Menü ⋮ → „App installieren" (oder das Banner in der App). In der installierten App anmelden. Danach in der Claude-App einmal „Teilen" testen: „Spatenstich" muss im Teilen-Menü auftauchen. |
| M7 | vor WP 24.5 | Impressum-Text (Name, Anschrift) für `de.json` liefern. |
| M8 | jederzeit | Partnerin: kostenloses Claude-Konto, Projekt „Spatenstich Garden" anlegen, Prompt + Schema aus der App („Mehr → Claude-Projekt einrichten") einfügen. |
| M9 | Phase 29 | Entscheidung: natives Android-APK (kostenlos per EAS Free + Sideload) ja/nein. |

---

## 6. Abnahme auf den Handys (UAT v2.0)

Auf Android-Handy A (Dirk), Handy B (Partnerin), beide Chrome, plus Desktop-Browser. Jeder Punkt: Pass/Fail + Notiz.

**6.1 Installation & Start**
1. Chrome bietet „App installieren" an; nach Installation: Icon auf dem Startbildschirm korrekt (auch rund maskiert), Start ohne Browser-Leiste, Statusleiste in Moos, Splash in Papierfarbe.
2. Flugmodus → App startet, zeigt Heute-Tab mit letztem Plan und Wochenkarte; Banner „Offline".
3. Neue Version deployt → beim nächsten Start Toast „Neue Version" → Neu laden funktioniert, keine Edits verloren.

**6.2 Konto & Beitritt**
4. B: Registrieren mit Einladungscode → nach 3 Onboarding-Screens den gemeinsamen Plan sehen (< 3 min).
5. Passwort vergessen → Code-Mail → neues Passwort → Login, alles in der installierten App.
6. Abmelden mit ungesyncter Änderung → Warnung; nach Sync → Abmelden → Login als andere Person zeigt keine fremden Daten.

**6.3 Editor (Touch)**
7. Tippen wählt aus, Ziehen verschiebt, Pinch zoomt, zwei Finger schwenken; Doppel-Tipp/Long-Press öffnet Bearbeiten.
8. „＋ Hinzufügen" → Beet → auf Plan tippen → Beet da; Pflanze suchen → in Beet setzen → Abstands-Ring + Companion-Hinweis.
9. Handles: Größe ändern, drehen (rastet 15°), Beet zeichnen (4 Ecken + Abschließen).
10. Löschen → Snackbar → Rückgängig → Element zurück, auch nach Reload und auf dem anderen Gerät.
11. Edit, sofort App schließen (< 5 s) → Reload → Edit vorhanden (pagehide-Flush).
12. Querformat: Editor nutzt Breite, Toolbar erreichbar.

**6.4 Sync zu zweit**
13. A verschiebt Beet → B sieht es < 5 s ohne Tippen.
14. Beide offline: A ändert Beet-Name um 10:00, B um 10:05, A synct zuerst → beide zeigen B's Namen (Edit-Zeit gewinnt) + Toast bei A.
15. B legt neues Beet offline an, A war zwischenzeitlich online → nach B's Sync erscheint das Beet bei A.
16. Mitglied entfernen → verschwindet auf dem anderen Gerät; Einladungscode-Kopieren zeigt „Kopiert".

**6.5 Kalender & Heute**
17. PLZ setzen → Klimazonen-Name auf beiden Geräten; Gantt verschiebt sich.
18. Heute-Marker sichtbar; Suche findet „Möhre"; „In eurem Plan" listet genau die gesetzten Pflanzen; „Zu Plan hinzufügen" setzt in Beet.
19. Sonnenbedarf/Wasser als Wörter, keine Unterstriche.

**6.6 Import**
20. Claude-App → Teilen → „Spatenstich" → Vorschau öffnet direkt → Übernehmen → Vorschläge sichten → Beet im Plan mit Herkunft. Zweiter Weg: JSON kopieren → Importieren → „Aus Zwischenablage" → Vorschau.
21. Ungültiges JSON → verständliche Fehlermeldung + „Schema kopieren".

**6.7 Design & Zugänglichkeit**
22. Schriften Nunito/Caveat geladen; keine grauen Systemfont-Fallbacks; alle Tasten ≥ 48 dp (mindestens 44 px); Text unter der Tastatur nie verdeckt; Safe-Areas frei.
23. VoiceOver: Toolbar-Buttons werden benannt.

---

## 7. Betrieb (Runbook)

**7.1 Deploy:** Merge nach master → GitHub Action → Cloudflare Pages. Rollback: Cloudflare-Dashboard → Deployments → „Rollback" (oder `wrangler pages deployment list`).

**7.2 Supabase-Limits beobachten:** Dashboard → Usage: DB < 500 MB (Plan + Journal ohne Fotos: < 50 MB realistisch), Egress < 5 GB/Monat. Bei Pause: Dashboard → „Restore project" (bis 1 Jahr). Bei Dauerbedarf: Pro (25 $/Monat), nichts im Code ändert sich.

**7.3 Keep-alive:** GitHub-Cron (WP 20.4) + Windows Task Scheduler auf dem 24/7-PC: täglich `curl` wie im Workflow (`scripts/keepalive.ps1`). Zwei unabhängige Wege, weil GitHub Cron nach 60 Tagen Repo-Inaktivität pausiert.

**7.4 Backup:** `scripts/backup-supabase.ps1`: `pg_dump "postgresql://postgres.<ref>:<pw>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --schema=public --no-owner -Fc -f D:\Backups\spatenstich-$(Get-Date -Format yyyyMMdd).dump` + 30-Tage-Rotation; Task Scheduler nächtlich 03:00. Passwort in Windows Credential Manager, nie im Repo. Restore: `pg_restore --clean --if-exists -d <url> <dump>` (vorher Migrations-Stand vergleichen). Zusätzlich In-App-JSON-Export (Backlog 3).

**7.5 Monitoring:** Sentry (Free, 5k Events/Monat, EU-DSN). `pull`-Fehler offline werden nicht mehr als Exception gemeldet (WP 21.2). Wöchentlicher Blick ins Sentry-Dashboard reicht.

**7.6 Claude-Projekt-Pflege:** Bei Schemaänderung (`spatenstich-import.v2`) Prompt und Knowledge-File in beiden Claude-Projekten aktualisieren; App akzeptiert v1 noch eine Version lang (Deprecation-Hinweis).

---

## Anhang A — Lösch-Inventar (WP 20.2 / 22.4)

**Dateien/Ordner:** `app/src/lib/photos/**`, `app/src/stores/captureStore.ts`, `app/src/stores/settingsStore.ts`, `app/src/stores/__tests__/settingsStore.test.ts`, `app/app/(app)/settings/privacy.tsx` (Neubau WP 24.5), `app/src/hooks/useFlag.ts`, `app/src/hooks/__tests__/useFlag.test.ts`, `app/app/(auth)/join-by-code.tsx`, `app/app/(app)/profile/vereinsregeln/upload.tsx`, `packages/shared/src/types/database.ts` (durch `supabase.ts` ersetzt), `app/src/components/GardenPlanView.tsx` (WP 22.3), gesamter Skia/Web-Editor-Satz (WP 22.4), `app/src/__mocks__/{sentry,supabase-functions}.ts` falls unbenutzt, `.planning/phases/04-*/04-UI-SPEC.md` archivieren, `scripts/e2e-pgmq-smoke.sql`.
**Bleibt ausdrücklich (D-04/D-05):** Lokal-Modus-Code (`migrateLocalToAccount.ts`, `auth.ts`-Local-UUID, KV-Zweige in `profileRepo`/`vereinsregelnRepo`, alle `mode === 'local'`-Verzweigungen), Vereinsregeln-Screens/Store/Repo/Hook/Tests, `VereinsregelRow.tsx`, `TrafficLightBadge.tsx`, `packages/shared/src/constants/flags.ts` (als `FEATURES`-Konstante).
**Dependencies raus:** `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `expo-share-intent`, `@shopify/react-native-skia`, `reanimated-color-picker`, `@react-native-community/datetimepicker`, `jest-expo` (ungenutzt, alle Projekte nutzen ts-jest).
**Dependencies rein:** `workbox-cli` (dev), `sharp` (dev), `expo-font`, `@expo-google-fonts/nunito`, `@expo-google-fonts/caveat`, `expo-crypto`.
**DB (Migration 020):** `photo_queue`, `enqueue_photo_analysis()`, Buckets `photos`/`vereinsregeln` + Policies (nur wenn leer), `feature_flags`, `profiles.plz/klimazone/archetype`, `transfer_ownership` korrigiert.

## Anhang B — Begriffe und i18n-Umbenennungen (WP 24.3)

| Alt | Neu |
|---|---|
| Drafts / Import-Drafts sichten | Vorschläge / Import-Vorschläge sichten |
| Stale / „Stale"-Filter | Älter als 30 Tage |
| Payload / Import-Payload | Importdaten |
| Sync-Status / Synchronisiere … | Speicherstatus / Wird gespeichert … |
| `plan_elements · upsert` | „Beet ‚{label}' – Änderung" (Entity-Map: plan_elements→Plan-Element, garden_dimensions→Gartengröße, imports→Import, bed_drafts→Beet-Vorschlag, plant_drafts→Pflanzen-Vorschlag, observation_drafts→Beobachtung, gardens→Garten, garden_members→Mitglied, profiles→Profil) |
| Infrastruktur-Layer / Jahresplan-Layer / Beide Layer | Anlagen / Pflanzen / Alles |
| Infrastruktur (Palette) | Anlagen |
| Archetyp | Gartentyp (nur noch in „Mehr → Garten", optional) |
| Editieren | Bearbeiten |
| Account | Konto |
| Mein Garten | {Gartenname} (Default „Unser Garten") |
| Plan-Editor / Editor | Plan (Tab) / Plan bearbeiten (Screen) |
| Erkennungssicherheit | Sicherheit der Erkennung: „sicher / wahrscheinlich / unsicher" |
| „Sichere Drafts automatisch annehmen (≥ 80%)" | „Sichere Vorschläge automatisch übernehmen" |
| Klimazone 7 | Klimazone 7 (Name aus `klimazonen.ts`) |
| halb_schattig | halbschattig |

## Anhang C — SQL-Skizzen

**C.1 `20260910000020_cleanup_legacy.sql`** (Skizze; der Agent verifiziert jede Objekt-Existenz mit `\d`/`pg_catalog`-Abfragen vor dem Push)
```sql
begin;
drop function if exists public.enqueue_photo_analysis(uuid, text, text);
drop table if exists public.photo_queue cascade;
drop table if exists public.feature_flags cascade;
do $$ begin
  if (select count(*) from storage.objects where bucket_id in ('photos','vereinsregeln')) = 0 then
    delete from storage.buckets where id in ('photos','vereinsregeln');
  else
    raise notice 'buckets not empty — skipped';
  end if;
end $$;
-- profiles.plz/klimazone/archetype: vorher abhängige Funktionen prüfen (\df+), dann:
alter table public.profiles drop column if exists plz, drop column if exists klimazone, drop column if exists archetype;
-- transfer_ownership neu ohne created_by_user_id-Überschreibung (Body aus Migration 010 übernehmen, Zeile aus 013:316-320 weglassen)
commit;
```

**C.2 `20260910000021_sync_cursor.sql`**
```sql
begin;
create or replace function public.tg_set_server_updated_at() returns trigger language plpgsql as $$
begin new.server_updated_at := now(); return new; end $$;

create or replace function public.tg_set_updated_at() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();                       -- server-seitige Änderung ohne Client-Stempel
  end if;
  if new.updated_at is null or new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now();                       -- fehlend oder Zukunft → jetzt
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['gardens','profiles','garden_members','invite_codes','garden_dimensions',
                           'plan_elements','imports','import_items','bed_drafts','plant_drafts','observation_drafts'] loop
    execute format('alter table public.%I add column if not exists server_updated_at timestamptz not null default now()', t);
    execute format('update public.%I set server_updated_at = coalesce(updated_at, created_at, now()) where server_updated_at = created_at or server_updated_at is null', t);
    execute format('drop trigger if exists zy_set_server_updated_at_%s on public.%I', t, t);
    execute format('create trigger zy_set_server_updated_at_%s before insert or update on public.%I for each row execute function public.tg_set_server_updated_at()', t, t);
  end loop;
end $$;

alter table public.garden_members
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by_user_id uuid,
  add column if not exists deleted_at timestamptz;
-- is_garden_member(): 'and deleted_at is null' ergänzen (Funktion aus Migration 004 übernehmen)

create index if not exists idx_plan_elements_garden_sua on public.plan_elements (garden_id, server_updated_at);
-- analog für garden_dimensions, imports, import_items, bed_drafts, plant_drafts, observation_drafts, garden_members, invite_codes

alter table public.garden_dimensions drop constraint if exists garden_dimensions_garden_id_key;
create unique index if not exists uq_garden_dimensions_active on public.garden_dimensions (garden_id) where deleted_at is null;
commit;
```

**C.3 `20260910000022_realtime_publication.sql`**
```sql
do $$ declare t text; begin
  foreach t in array array['gardens','garden_members','garden_dimensions','plan_elements','imports','import_items','bed_drafts','plant_drafts','observation_drafts'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```
Hinweis: Realtime `postgres_changes` benötigt `replica identity` (Default `default` reicht für INSERT/UPDATE mit PK) und respektiert RLS für `authenticated`-Tokens.

## Anhang D — Aufwandsübersicht

| Phase | Inhalt | Tage | Kumuliert |
|---|---|---|---|
| 20 | Fundament, Aufräumen, PWA, Deploy | 3 | 3 |
| 21 | Sync und Datenintegrität (inkl. Vereinsregeln-Reparatur) | 6 | 9 |
| 22 | Ein Editor (Maus + Touch) | 10 | 19 |
| 23 | Navigation, Onboarding, Auth | 5 | 24 |
| 24 | Design-System, Copy, Politur | 6 | 30 |
| 25 | Geräte-Abnahme | 3 | 33 |
| 26–29 | Saison 2027 | 18 | 51 |

Bei agentengestützter Ausführung mit den bisherigen GSD-Geschwindigkeiten (Phase 10: 9 Pläne in ~2 Wochen Teilzeit) ist v2.0 in **6–8 Kalenderwochen** realistisch, also bis Ende Oktober 2026, v2.1 bis Ende Februar 2027 — rechtzeitig zur Vorkultur.
