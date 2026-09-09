# Requirements: Kleingarten-App (Spatenstich) — v2.0 „Handy-Ready"

**Defined:** 2026-09-09 (aus `MASTERPLAN-v2.md` Kap. 4 abgeleitet; dort stehen Arbeitspakete, Dateien und Akzeptanzkriterien)
**Core Value:** Manueller Plan-Editor + strukturierter Import aus Claude.ai — jetzt auf beiden Android-Handys und am Desktop, gemeinsam und ohne laufende Kosten.
**Vorherige Requirements:** `milestones/v1.1-REQUIREMENTS.md`

## v2.0 Requirements

### Fundament, Aufräumen, PWA-Deploy (Phase 20)

- [ ] **DEPLOY-01**: `pnpm -r run lint` exit 0; CI-Workflow setzt `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` und ist auf PRs grün; Test-Rauschen (`useAuthStore.getState`-Mock, Worker-Leak) beseitigt; `CLAUDE.md`/README auf Ist-Stack korrigiert
- [ ] **DEPLOY-02**: Foto-Pipeline, `captureStore`, GPS-Opt-in, Feature-Flag-Hook, `expo-share-intent` und 5 Dependencies entfernt; Vereinsregeln-UI und -Push hinter `FEATURES.vereinsregeln = false`; Lokal-Modus-Code unangetastet, Home-Buttons darin crashfrei; Migration 020 (photo_queue, enqueue_photo_analysis, feature_flags, profiles.plz/klimazone/archetype, transfer_ownership-Fix, Buckets nur wenn leer) live
- [ ] **DEPLOY-03**: PWA installierbar — `manifest.json` (standalone, Icons any/maskable/monochrome), HTML-Template `lang="de"`, Service Worker (Workbox injectManifest, Update-Toast, kein Auto-Skip bei ungesicherten Änderungen), `_headers`; Lighthouse „installable" grün; Chrome „App installieren" auf beiden Handys
- [ ] **DEPLOY-04**: Web Share Target — Teilen aus der Claude-App (`.json`-Datei oder Text) öffnet direkt die Import-Vorschau; Install-Prompt-Banner; `navigator.storage.persist()` nach Login
- [ ] **DEPLOY-05**: `deploy-web.yml` deployt master nach Cloudflare Pages (`spatenstich.pages.dev`) in < 10 min, inkl. Secret-Scan; `eas-build.yml` nur noch `workflow_dispatch`
- [ ] **DEPLOY-06**: Supabase-Keep-alive per GitHub-Cron (alle 3 Tage) + Task-Scheduler-Skript für den 24/7-PC; Backup-Skript `scripts/backup-supabase.ps1`
- [ ] **DEPLOY-07**: Zweiter Start im Flugmodus zeigt App-Shell mit letztem Plan (Offline-Start)

### Sync und Datenintegrität (Phase 21)

- [ ] **SYNC2-01**: Migration 021: `server_updated_at` + Trigger auf allen Sync-Tabellen, Indizes, `garden_members` mit Soft-Delete; Migration 022: Realtime-Publikation; pgTAP-Tests für Trigger-Semantik
- [ ] **SYNC2-02**: Pull filtert nur nach `server_updated_at` (paginiert, Überlappung 10 s, Cursor = max gelesen); Client-`updated_at` wird serverseitig nicht mehr überschrieben (echtes LWW nach Bearbeitungszeit); lokale Rows mit pendenter Outbox werden nicht überschrieben
- [ ] **SYNC2-03**: P9011 → Outbox-Eintrag verwerfen, Entity re-pullen, Toast „Änderung von {Name} übernommen"; permanente SQLSTATEs sofort failed; `nextAttemptAt`; Snapshot-Zusammenfassung pro Row; keine `LIMIT 50`-Blockade
- [ ] **SYNC2-04**: Editor-Hydration erzeugt 0 Outbox-Einträge und keine Undo-History; Undo/Redo schreiben Tombstones/Restores; `pagehide`/`visibilitychange`/AppState-Flush; `writePlanElement` ohne Outbox bei identischem Snapshot
- [ ] **SYNC2-05**: RealtimeBridge (`postgres_changes` pro Garten) + 60-s-Polling-Fallback; `useGardenData`-Invalidierung in Heute/Plan/Kalender/Sichtung; fremde Änderungen werden in den offenen Editor gemerged
- [ ] **SYNC2-06**: PLZ/Klimazone am Garten persistiert (`updateGarden`), `profileStore` daraus hydriert; Bootstrap-Effekte keyed auf `userId`; Invite-Code vor `ensureDefaultGardenForUser` eingelöst
- [ ] **SYNC2-07**: `storage.clearAll()` bei Logout/Nutzerwechsel; Logout warnt bei pendenter Outbox; lokale Schema-Version 5 setzt Cursor zurück
- [ ] **SYNC2-08**: Soft-Delete-Propagation für `garden_members`/`invite_codes` (Replace-all pro Garten), Garten-Löschung purgt lokale Rows, `garden_dimensions` mit partiellem Unique-Index und ID-Angleichung; Center-Konvention in `draftPromotionRepo` korrigiert
- [ ] **SYNC2-09**: Vereinsregeln repariert (D-05): UUIDs + `seed_key`, Legacy-ID-Remap, Soft-Delete statt DELETE, keine Audit-Überschreibung, `migrateLocalToAccount` Step 6 funktioniert; Flag bleibt aus

### Ein Editor für Maus und Touch (Phase 22)

- [ ] **EDIT2-01**: Reine Helfer: typisierte `ElementProvenance`, `elementFactory`, `clamp`, `polygonTransform` (Polygon folgt Rotate/Resize), rotationsbewusster `hitTest`, `newId()` (expo-crypto), ein `t(key, vars)`-Helper
- [ ] **EDIT2-02**: `interactionController.ts` ohne DOM (PointerSample → Store-Actions, Zustandsautomat, Schwellen, Long-Press, Doppel-Tipp, Pinch) mit ≥ 40 Tests
- [ ] **EDIT2-03**: `PlanEditor.tsx` (react-native-svg) mit `readOnly|edit`, Layer-Unmount, Polygon/Baum/Zaun-Formen, Labels (Caveat), Overlay für Handles/Marquee/Ghost/Konflikt
- [ ] **EDIT2-04**: `PlanEditor.web.tsx` mit Pointer Events (`setPointerCapture`, `touch-action: none`), Wheel-Zoom, Tastatur (Entf, Esc, Pfeile, Ctrl+Z/Y, Ctrl+A); `PointerEvent`-Polyfill für Jest; `GardenPlanView` ersetzt
- [ ] **EDIT2-05**: Viewport: Fit-to-Screen, Pinch/Wheel-Zoom 0,5–4×, Pan-Limits, Reset-Button
- [ ] **EDIT2-06**: Feature-Parität auf Touch und Maus: Select, Multi-Select, Move, Resize, Rotate (15°-Snap), Drag-to-create, Polygon-Werkzeug, Place mit Ghost, Delete mit Undo-Snackbar, Duplizieren, Z-Order, Properties-Modal (Position, Einheiten, Datum, 8 Farb-Swatches), Snap-to-Grid, Maßangaben
- [ ] **EDIT2-07**: `GhostRing`/`hasOverlap` verdrahtet (Pflanzenabstand), `CompanionToast` über der Action-Bar mit Animation
- [ ] **EDIT2-08**: Eine responsive `EditorToolbar` (Top-Bar + Action-Bar mobil, eine Zeile Desktop, alle Buttons benannt, ≥ 48 dp), `ElementPalette` als Bottom-Sheet/Seitenleiste mit Pflanzen-Suche, `DraftsTray` mit „Übernehmen" auf Web und nativ
- [ ] **EDIT2-09**: `EditorCanvas.tsx`, `ResizeHandle`, `RotationHandle`, `PolygonInProgress`, `web/*`-Komponenten, Skia-Mocks, `@shopify/react-native-skia`, `reanimated-color-picker`, `@react-native-community/datetimepicker` entfernt; COOP/COEP-Middleware raus; Bundle < 4,5 MB; Test-Anzahl ≥ Stand vor Phase 22
- [ ] **EDIT2-10**: 200 Elemente flüssig auf Android-Chrome (Remote-Debugging-Trace < 16 ms/Frame Median), Lighthouse Performance ≥ 80 mobil; kein Text-Highlight/Callout/Page-Zoom im Editor

### Navigation, Onboarding, Auth (Phase 23)

- [ ] **NAV-01**: Tabs Heute · Plan · Kalender · Mehr (`(app)/(tabs)`), Editor als Vollbild-Route, echte Header-Titel überall, keine Doppel-Header, jede Route ≤ 2 Taps
- [ ] **NAV-02**: „Heute": Wochenkarte (Aktionen), tappbare Plan-Vorschau (`PlanEditor readOnly`), eine Kontext-Karte (Partnerin einladen / PLZ / offene Vorschläge), `useFocusEffect` + Invalidierung, `ActivityIndicator`, Desktop `max-w-2xl`
- [ ] **NAV-03**: Onboarding 3 Schritte (Gartengröße, PLZ, Partnerin einladen/Code) mit Redirect-Guard solange `garden_dimensions` fehlt; `resolveStartRoute` als reine Funktion getestet
- [ ] **NAV-04**: Registrierung mit optionalem Einladungscode (vor Default-Garten eingelöst); `(auth)/join-by-code` und Startscreen-Karte entfernt; Beitritt einer neuen Person < 3 min
- [ ] **NAV-05**: Passwort-Reset per 6-stelligem Code (`resetPasswordForEmail` → `verifyOtp recovery` → `updateUser`), Passwort-Auge, Mindestlängen-Hinweis, generische Fehlertexte ohne Enumeration, Doppel-Submit-Sperre
- [ ] **NAV-06**: `SafeAreaView`/`useSafeAreaInsets` und `KeyboardAvoidingView` in allen Auth-, Formular- und Sticky-Footer-Screens; Tastatur verdeckt nie einen Button
- [ ] **NAV-07**: „Mehr → Garten": Name editierbar, „Kopiert"-Feedback, Mitgliederliste, Besitz-Übertragung als Outline mit einer Bestätigung, Löschen ohne Auth-Flackern; kein `(e as Error).message` im UI

### Design-System, Copy, Politur (Phase 24)

- [ ] **DESIGN-01**: Tailwind-Tokens „Papier & Erde" (paper, karton, erde, erde-muted, moos, lehm, mohn, sonne, teich) + `theme/tokens.ts`; Nunito (UI) + Caveat (Display) via `expo-font`; `ui/text.tsx`-Varianten; alle 146 Hex-Literale und `stone-*`/`dark:`-Klassen ersetzt; `userInterfaceStyle: 'light'`
- [ ] **DESIGN-02**: Nur lucide-Icons (Unicode/Emoji/Text-Chevrons entfernt); drei SVG-Illustrationen (leerer Plan, leere Woche, Einladen); Canvas-Stil nach Masterplan Kap. 3.4 in `colors.ts`/`PlanEditor`
- [ ] **DESIGN-03**: Alle hartkodierten UI-Strings in `de.json`; Umbenennungen nach Masterplan Anhang B (Vorschläge, Speicherstatus, Anlagen …); Roadmap-Leaks und Falschaussagen entfernt; Enum-Labels (Sonne/Wasser); `i18n.test.ts` prüft Key-Existenz und Verbotsliste (ae/oe/ue, Drafts, Stale, Payload, Layer, Phase N)
- [ ] **DESIGN-04**: Kalender: Heute-Marker im Gantt, Abschnitte „In eurem Plan"/„Alle Pflanzen A–Z" mit Suche, Klimazonen-Name, Legende oben, Balken mit Rand + Label, Chip ≥ 48 dp, Zone-4-Fallback nur mit Hinweis; WR-08/WR-10 behoben
- [ ] **DESIGN-05**: Import-Screen: Teilen-Weg zuerst, „Aus Zwischenablage einfügen", Erklärungstext; „Mehr → Claude-Projekt einrichten" mit Prompt-/Schema-Kopieren und Anleitung für Max- und Free-Konto
- [ ] **DESIGN-06**: `mehr/datenschutz`: Datenschutzhinweise, Impressum (Text von Dirk), Version + Build-Hash; `mehr/sync` als „Speicherstatus" mit verständlichen Einträgen und Konfliktliste; Sentry-DSN EU geprüft
- [ ] **DESIGN-07**: Jeder icon-only-Button mit `accessibilityLabel`, Kontrast AA, `accessibilityLanguage="de"`, Fokus-Ring `teich`, Fokus-Falle in Modalen, Font-Scaling bis 130 %

### Geräte-Abnahme (Phase 25)

- [ ] **UAT-01**: Alle 23 Prüfpunkte aus Masterplan Kap. 6 auf Android-Handy A, Handy B (beide Chrome) und Desktop bestanden; Ergebnisse in `phases/25-*/25-UAT.md`; Befunde per `/gsd-quick` mit Regressionstest gefixt
- [ ] **UAT-02**: `/gsd-complete-milestone v2.0`, Tag `v2.0.0`, README-Status, Memory aktualisiert

## v2.1 Requirements (Saison 2027 — zu detaillieren bei `/gsd-new-milestone v2.1`)

- **TASK-01..05** (Phase 26): Tabelle `tasks`, deterministische Generierung aus Plan + Kalender, done/snooze pro Person, wiederkehrende Gieß-Aufgaben, „Heute" zeigt Aufgaben, optional Web Push
- **JOURNAL-01..04** (Phase 27): Schnellnotizen pro Beet/Pflanze/Garten, optional 1 Foto in Storage `journal` (EU, RLS), Timeline-Screen, Import-Beobachtungen → Journal
- **SEASON-01..04** (Phase 28): `plan_elements.season`, „Neue Saison starten", Saison-Filter im Plan, 3-Jahres-Fruchtfolge-Regel, „Was war letztes Jahr auf Beet 3?"
- **SDK-01..03** (Phase 29): aktuelles stabiles Expo-SDK, `expo-doctor` grün, Tests + Web-Export grün; optional Android-APK (EAS Free, Sideload) nur auf Wunsch

## Out of Scope

Siehe PROJECT.md „Out of Scope" und Masterplan Kap. 4.4 (Backlog): iOS, Heimserver, In-App-KI, Expo Go, Lokal-Modus-Vollausbau, Vereinsregeln-Aktivierung, Saatgut-Inventar, Frost-Warnung, Plan-Export, iCal, Companion-Score, Dark-Mode.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01..07 | Phase 20 | Pending |
| SYNC2-01..09 | Phase 21 | Pending |
| EDIT2-01..10 | Phase 22 | Pending |
| NAV-01..07 | Phase 23 | Pending |
| DESIGN-01..07 | Phase 24 | Pending |
| UAT-01..02 | Phase 25 | Pending |
| TASK/JOURNAL/SEASON/SDK | Phasen 26–29 (v2.1) | Planned |

**Coverage:** v2.0: 41 Requirements, alle auf Phasen 20–25 gemappt, 0 unmapped.

---
*Requirements defined: 2026-09-09 — abgeleitet aus MASTERPLAN-v2.md*
