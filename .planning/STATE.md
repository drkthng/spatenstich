---
gsd_state_version: "1.0"
milestone: v3.0
milestone_name: Garten mit KI
current_phase: 39
current_phase_name: Abnahme und Release
status: executing
stopped_at: Phase 38 ausgeliefert; Phase 39 wartet auf die Geräte-Abnahme (2026-11-15)
last_updated: "2026-11-15T18:00:00.000Z"
last_activity: 2026-11-15
last_activity_desc: Phasen 30–38 umgesetzt und ausgeliefert (ohne GSD-Pläne, direkt auf master)
state_head: aee7d2855f92851d9535fe6d2944840288b44fcd
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 0
  completed_plans: 0
  percent: 90
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-13)
See: .planning/ROADMAP.md (v3.0, Phasen 30–39, erstellt 2026-11-14)
See: .planning/REQUIREMENTS.md (75 Anforderungen, alle auf Phasen abgebildet)
See: .planning/sketches/MANIFEST.md (Design-Richtung „Feldführer“, Sketch 001)
See: .planning/MASTERPLAN-v2.md (Detail-Spezifikation für Sync WP 21.x, Editor-Mechanik WP 22.x, Navigation/Onboarding/Auth WP 23.x; Kap. 3.4 Design und die Entscheidungen gegen In-App-KI sind ersetzt)
See: docs/specs/M07-claude-ai-bridge.md (Import-Bridge, bleibt als zweiter Weg)

**Core value:** Ein Gartenplan, den beide gemeinsam exakt pflegen können, und eine App, die daraus sagt, was heute zu tun ist (In-App-KI über eigenen API-Schlüssel seit Pivot 2026-11-13)
**Current focus:** Phase 39 — Abnahme und Release

## Current Position

Phase: 39 of 39 (Abnahme und Release)
Plan: — (seit 2026-11-14 wird ohne GSD-Pläne direkt umgesetzt; was je Phase gebaut, entschieden und geprüft wurde, steht in den Commit-Nachrichten `feat(30)` bis `feat(38)`)
Status: Phasen 30–38 umgesetzt und auf `https://spatenstich.pages.dev` ausgeliefert. Offen ist, was nur an den Geräten geht: Abnahme nach `docs/test-plans/v3-abnahme.md`, Kostenmessung mit echten KI-Anfragen, danach Tag `v3.0.0`.
Last activity: 2026-11-15 — Phase 38 (Feinschliff) ausgeliefert; Prüfliste, README und Planungsdokumente für Phase 39 aktualisiert

Progress: [█████████░] 90% (9 von 10 Phasen umgesetzt, Geräte-Abnahme offen)

## Phasen v3.0

| Phase | Name | Anforderungen | Pläne (Schätzung) | Status |
|-------|------|---------------|-------------------|--------|
| 30 | Feldführer-Fundament und Editor-Kern | DESIGN3-01..03, EDIT3-01..08 (11) | – | Umgesetzt 2026-11-14, Geräte-Abnahme offen |
| 31 | Editor im Alltag | EDIT3-09, 10, 11, 16, 17, 18 (6) | – | Umgesetzt 2026-11-14, Geräte-Abnahme offen |
| 32 | Präzision und ein Editor | EDIT3-12, 13, 14, 15, 19 (5) | – | Umgesetzt 2026-11-14, Geräte-Abnahme offen |
| 33 | Verlässlicher Sync | SYNC3-01..09 (9) | – | Umgesetzt 2026-11-14, Geräte-Abnahme offen |
| 34 | KI-Zugang mit Verbrauchsgrenze | AI-01..08 (8) | – | Umgesetzt 2026-11-14, Geräte-Abnahme offen |
| 35 | Foto-Abgleich | PHOTO-01..11 (11) | – | Umgesetzt 2026-11-15, Geräte-Abnahme offen |
| 36 | Aufgaben für heute | TASK-01..10 (10) | – | Umgesetzt 2026-11-15, Geräte-Abnahme offen |
| 37 | Navigation, Onboarding, Konto | NAV3-01..07 (7) | – | Umgesetzt 2026-11-15, Geräte-Abnahme offen |
| 38 | Feinschliff | DESIGN3-04..08 (5) | – | Umgesetzt 2026-11-15, Geräte-Abnahme offen |
| 39 | Abnahme und Release | UAT3-01..03 (3) | – | In Arbeit (Prüfliste liegt vor) |

Summe: 75 Anforderungen, rund 46 Pläne (Schätzung, wird je Phase in `/gsd-plan-phase` festgelegt).

## Performance Metrics

**Velocity (v1.1):** 23 Pläne in ~4 Wochen Teilzeit (2026-05-17 → 2026-06-16), 202 Commits; Quick-Tasks im Schnitt 1 Session.

**By Phase (v2.0, geschlossen):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 20 | 4/4 (20-04 ohne Geräte-Abnahme) | - | - |
| 21–25 | nicht begonnen, in v3.0 aufgegangen | - | - |

**By Phase (v3.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 30 | 0/~5 | - | - |
| 31 | 0/~4 | - | - |
| 32 | 0/~4 | - | - |
| 33 | 0/~6 | - | - |
| 34 | 0/~4 | - | - |
| 35 | 0/~7 | - | - |
| 36 | 0/~6 | - | - |
| 37 | 0/~4 | - | - |
| 38 | 0/~4 | - | - |
| 39 | 0/~2 | - | - |

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 20-fundament-aufr-umen-pwa-deploy P02 | 35 min | 7 tasks | 41 files |
| Phase 20 P03 | 55 min | 4 tasks | 37 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (D-01..D-15 mit Begründung in MASTERPLAN-v2.md Kap. 2, D-16..D-22 in PROJECT.md).
Weiterhin verbindlich (Phasenverweise auf v3.0 umgestellt):

- **[2026-09-09 D-01/D-02]**: PWA auf Cloudflare Pages + Supabase Free; kein nativer Build; Ziel-Browser Chrome auf Android (D-15).
- **[2026-09-09 D-03]**: Ein `PlanEditor` (Pointer Events, SVG); Skia und Web-Sonderkomponenten werden gelöscht (v3.0: Phase 32, früher Phase 22).
- **[2026-09-09 D-04/D-05]**: Lokal-Modus und Vereinsregeln bleiben im Code (User-Entscheidung); die Vereinsregeln-Reparatur (WP 21.6) ist nicht Teil von v3.0, sondern Backlog RULES-F1.
- **[2026-09-09 D-07]**: Client-`updated_at` ist LWW-Wahrheit, `server_updated_at` ist Pull-Cursor; Realtime + Polling (v3.0: Phase 33, früher Phase 21).
- **[2026-09-09 D-12]**: Passwort-Reset per 6-stelligem Code; E-Mail-Bestätigung wird im Dashboard deaktiviert (manueller Schritt M4, v3.0: vor Phase 37).
- Repo-Konventionen bleiben: TDD RED→GREEN-Commits, 3-Gate-Supabase-Push, UTF-8-Umlaute in `de.json`, Draft-PRs, ein Branch pro Phase (`gsd/phase-NN-slug`).
- [Phase 20]: Task 5/6: User waehlte Option A (sofort bereinigen) und bestaetigte das Backup nach Passwort-Reset — R9-Backup-Pflicht erfuellt; Migration 020 danach erfolgreich live gepusht
- [Phase 20]: 20-03: injectManifest bundles keine ES-Module-Importe (Quellcode-verifiziert) - klassischer Worker + importScripts() gegen lokal gehostete workbox-sw-Runtime statt CDN oder Modul-Worker
- [Phase 20]: 20-03: PwaControllers.tsx (ServiceWorkerController/InstallPromptController/StorageController) aus _layout.tsx ausgelagert - testbare Seam fuer die tdd=true-Anforderung von Task 4

Neu für v3.0 (Roadmap 2026-11-14):

- **[2026-11-13 D-16/D-17/D-22]**: In-App-KI nur über eine Edge Function mit Server-Secret und Verbrauchsbuch pro Garten; KI ändert den Plan nie ohne Bestätigung (alles läuft durch die Sichtung).
- **[2026-11-13 D-18/D-21]**: Design „Feldführer“ (Sketch 001); Griff-Trefferflächen liegen außerhalb des Elements und reichen nach innen höchstens ein Viertel des Elements.
- **[2026-11-13 D-19]**: Analysierte Fotos werden nicht gespeichert, nur Befunde.
- **[2026-11-13 D-20]**: v3.0 zählt ab Phase 30; 21–29 bleiben als Masterplan-Namen eindeutig.
- **[2026-11-14 Roadmap]**: Editor zuerst und ohne Backend (Phasen 30–32); Design-Fundament (DESIGN3-01..03) gehört in Phase 30, damit der Editor gleich im endgültigen Look entsteht; Sync (33) vor allem Geteilten; KI-Zugang (34) vor Foto-Abgleich (35) und KI-Sortierung (36); „Heute“ (36) vor den Tabs (37). WP 21.3 (Editor-Persistenz) wird in Phase 31 umgesetzt, nicht in der Sync-Phase.

### Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| debug_sessions | import-uebernehmen-noop | resolved (Datei-Status unknown) | 2026-09-09 | v1.1 |
| quick_tasks | 260610-jtf-forensik-sweep-ci-fixes-repo-hygiene-pla | unknown (erledigt lt. Tabelle) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-jrl-home-header-profil-icon-erg-nzen-navigat | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-jzl-editor-bug-erste-rotation-springt-um-90- | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-kpl-web-editor-text-selektion-beim-rotieren- | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-l5y-persistenz-bug-element-positionen-im-bee | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-ln5-feature-selektiertes-element-per-pfeilta | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-usp-beet-per-klick-ziehen-loslassen-aufziehe | missing (Duplikat von vk4) | 2026-09-09 | v1.1 |
| quick_tasks | 260611-vk4-beet-per-drag-aufziehen-au-erdem-wenn-el | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260612-9jb-automatisches-speichern-bei-beet-ver-nde | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260615-utj-mehrfach-selektion-im-web-plan-editor-me | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260616-iuu-logout-option-implementieren-es-gibt-akt | unknown (erledigt) | 2026-09-09 | v1.1 |
| quick_tasks | 260616-mh4-manuellen-garten-anlegen-weg-ergaenzen-w | unknown (erledigt) | 2026-09-09 | v1.1 |
| uat_gaps | 03/03-HUMAN-UAT.md | partial — Cross-Device-UAT übersprungen → v2.0 Phase 21/25 | 2026-09-09 | v1.1 |
| uat_gaps | 04/04-UAT.md | testing — Phase superseded (M07) | 2026-09-09 | v1.1 |
| uat_gaps | 09/09-UAT.md | testing — nativ nie geprüft → v2.0 Phase 25 | 2026-09-09 | v1.1 |
| uat_gaps | 10/10-UAT.md | passed (Status-Feld nur formal offen) | 2026-09-09 | v1.1 |
| verification_gaps | 03/03-VERIFICATION.md | human_needed → v2.0 Phase 21/25 | 2026-09-09 | v1.1 |
| verification_gaps | 05/05-VERIFICATION.md | gaps_found — Rest-Legacy → WP 20.2 | 2026-09-09 | v1.1 |
| verification_gaps | 06.5/06.5-VERIFICATION.md | gaps_found — Drafts-Tray/Editor → Phase 22 | 2026-09-09 | v1.1 |
| verification_gaps | 07/07-VERIFICATION.md | human_needed — Skia-Editor wird ersetzt (D-03) | 2026-09-09 | v1.1 |
| verification_gaps | 09/09-VERIFICATION.md | human_needed → Phase 25 | 2026-09-09 | v1.1 |
| verification_gaps | 09.1/09.1-VERIFICATION.md | human_needed → Phase 22/25 | 2026-09-09 | v1.1 |
| deferred_items | 07/deferred-items.md: DEFERRED-P7-1 (drei Alt-Testsuiten) | acknowledged — seit quick-260610-jtf grün | 2026-09-09 | v1.1 |

Verweise auf v2.0-Phasen in dieser Tabelle gelten seit 2026-11-14 für v3.0: Phase 21 → Phase 33, Phase 22 → Phasen 30–32, Phase 25 → Phase 39.

### Pending Todos

Keine. (`todos/freier-foto-upload.md` gestrichen — Foto-Upload ist seit M07 out of scope; der Foto-Abgleich in v3.0 Phase 35 ist ein anderes Konzept: Foto wird analysiert und verworfen.)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|

*v1.1-Quick-Tasks archiviert in `milestones/v1.1-quick/`.*

### Blockers/Concerns

Stand 2026-11-15. Erledigt und deshalb hier gestrichen: Backend-Ausfall (seit Phase 33 wieder erreichbar und überwacht, `docs/betrieb/2026-10-backend-ausfall.md`).

- **Vorbereitung der Abnahme (`docs/test-plans/v3-abnahme.md` Abschnitt 0):** Erledigt sind der API-Schlüssel (Secret `ANTHROPIC_API_KEY`, 2026-11-15 am Namen geprüft; ob er gilt, zeigt die erste echte Anfrage) und die Einstellungen des Anmeldedienstes (2026-11-16 aus `supabase/config.toml` übertragen: keine Bestätigungs-E-Mail, Reset-Code mit sechs statt acht Ziffern, Reset-E-Mail mit Code; `docs/betrieb/anmeldung.md`). Das Limit beim Anbieter lässt Dirk bewusst weg (2026-11-16). Offen, nur Dirk: App auf beiden Handys installieren. Offen danach: Registrierung schließen, sobald beide Konten bestehen (das Impressum nennt keine Anschrift, weil die App privat für einen Haushalt läuft; das trägt nur, solange sich niemand Fremdes registrieren kann).
- **Noch nie mit echtem Dienst geprüft:** eine echte KI-Anfrage (Test, Foto-Abgleich, Sortierung), die echte Wettervorhersage mit Anmeldung, Registrierung mit Einladungscode, Passwort-Reset mit echter E-Mail, Abgleich zwischen zwei angemeldeten Geräten, Start ohne Netz auf dem Handy. Alles steht in der Prüfliste.
- **Datenschutztext** (`legal.privacy` in `de.json`) ist ein Entwurf aus dem, was der Code tut; vor der Nutzung zu zweit vom Betreiber lesen.
- **Lizenz:** Das README nennt AGPL-3.0, eine Datei `LICENSE` liegt nicht im Repository.
- **Sentry:** Die Datenschutzseite sagt je nach hinterlegter Adresse „EU“ oder „auch außerhalb der EU“. Die lokale `app/.env` zeigte auf den US-Eingang; für die Auslieferung zählt das GitHub-Secret `EXPO_PUBLIC_SENTRY_DSN`.
- SDK-Mix (Expo 53 / RN 0.76.7 / React 18.3.1) bleibt; SDK-Angleichung ist Backlog (TECH-F1).
- Migrationen weiter nach 3-Gate-Push; ein Backup vorher ist laut Dirk (2026-11-14) vorerst nicht nötig, solange wenig echte Daten im Garten liegen.

## Session Continuity

Last session: 2026-11-15
Stopped at: Phase 38 ausgeliefert; Phase 39 wartet auf die Geräte-Abnahme
Resume file: docs/test-plans/v3-abnahme.md

Next: Vorbereitung V1–V5 der Prüfliste (nur Dirk), dann Abnahme auf beiden Handys und am Desktop; Befunde beheben, jeweils mit Test; Kosten messen und in `docs/betrieb/ki-zugang.md` festhalten; Version auf 3.0.0 setzen und `v3.0.0` taggen.

## Operator Next Steps

1. App auf beiden Handys installieren (V5 der Prüfliste); alles andere aus der Vorbereitung ist erledigt.
2. Prüfliste auf beiden Handys und am Desktop durchgehen; Befunde in die Tabelle am Ende eintragen.
3. Kosten nach Abschnitt 9 der Prüfliste aus dem Verbrauchsbuch ablesen.
4. Danach: Befunde beheben lassen (je mit Test), Version auf 3.0.0 setzen, Tag `v3.0.0`.
