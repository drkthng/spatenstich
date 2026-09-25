---
phase: 20-fundament-aufr-umen-pwa-deploy
plan: 02
subsystem: infra
tags: [supabase, migration, feature-flags, pg_dump, cleanup, dead-code]

# Dependency graph
requires:
  - phase: 20-fundament-aufr-umen-pwa-deploy (20-01)
    provides: CI/Lint-Grundlage, Branch gsd/phase-20-fundament-aufr-umen-pwa-deploy
provides:
  - "FEATURES-Compile-Time-Konstante (packages/shared) statt Supabase-Query"
  - "Foto-Pipeline vollstaendig entfernt (Client + sieben Dependencies)"
  - "Lokal-Modus crashfrei bei Home-Button-Interaktion"
  - "Migration 020 live auf vitrqkzxkiqvadqfzrcx: photo_queue/enqueue_photo_analysis/feature_flags/profiles-Spalten entfernt, transfer_ownership neu definiert"
  - "Zwei pg_dump-Backups (Schema + Data) unter D:/Backups als Restore-Pfad"
affects: [21-sync-nacharbeit, 22-editor, ci-deploy]

actuals:
  tokens: 20821
  tasks: 7
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Compile-Time-Feature-Flag statt Datenbank-Tabelle fuer clientseitige Schalter ohne Sicherheitswirkung"
    - "3-Gate-Migrationsprotokoll (list -> dry-run -> push -> list) fuer destruktive Live-DB-Aenderungen"
    - "Storage-Bucket-Bereinigung per SQL ist auf verwalteten Supabase-Projekten nicht moeglich (SQLSTATE 42501) — Zaehlpruefung + RAISE NOTICE als informativer Fallback statt DELETE"

key-files:
  created:
    - supabase/migrations/20260910000020_cleanup_legacy.sql
  modified:
    - packages/shared/src/constants/flags.ts
    - packages/shared/src/i18n/de.json
    - app/app/(app)/profile/index.tsx
    - app/app/(app)/profile/vereinsregeln/index.tsx
    - app/src/lib/sync/SyncWorker.ts
    - app/app/(app)/index.tsx
    - app/app/(app)/_layout.tsx
    - app/app.config.ts
    - app/jest.config.ts
    - app/package.json
    - pnpm-lock.yaml
    - supabase/tests/garden_plan_rls.sql
    - supabase/tests/trigger_ordering.sql
    - supabase/tests/rls_member_check.sql

key-decisions:
  - "Task 5: User waehlte Option A — Migration 020 sofort nach Backup pushen, nicht auf Phase 21 verschieben."
  - "Task 6: User bestaetigte das Backup mit 'DB-Passwort liefern -> Dump'. Das urspruengliche DB-Passwort war nie notiert; der User setzte es im Supabase-Dashboard neu (kein Secret in irgendeinem Repo-Pfad betroffen, per Grep vorab bestaetigt)."
  - "Gate-3-Push schlug beim ersten Versuch fehl (SQLSTATE 42501, 'Direct deletion from storage tables is not allowed'). Migration wurde als Rule-1/Rule-3-Fix angepasst (Bucket-Section auf reine Beobachtung ohne DELETE/DROP POLICY reduziert), erneut committet und erfolgreich gepusht — ohne neue Entscheidung von Task 5 einzuholen, da die Aenderung den zerstoererischen Umfang nur verkleinert (keine neuen Objekte betroffen) und exakt die im Plan bereits vorgesehene 'nicht leer'-Fallback-Disposition (T-20-02-04) auf beide Buckets ausweitet."

requirements-completed: [DEPLOY-02]

coverage:
  - id: D1
    description: "FEATURES ist eine Compile-Time-Konstante; useFlag/feature_flags-Query entfernt; Vereinsregeln-Banner, -Routen und Sync-Push haengen am Flag"
    requirement: "DEPLOY-02"
    verification:
      - kind: unit
        ref: "app/src/hooks/__tests__/ (FEATURES-Konsumenten-Tests, Task 1 RED->GREEN)"
        status: pass
      - kind: unit
        ref: "pnpm --filter @spatenstich/shared exec jest --ci"
        status: pass
    human_judgment: false
  - id: D2
    description: "Foto-Pipeline, Share-Intent und sieben Dependencies vollstaendig entfernt, Bundle dokumentiert"
    requirement: "DEPLOY-02"
    verification:
      - kind: unit
        ref: "pnpm --filter app exec jest --ci (97 Suites/769 Tests gruen ohne photos-Projekt)"
        status: pass
      - kind: other
        ref: "pnpm --filter app run build (expo export --platform web, Exit 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Lokal-Modus crashfrei: Home-Buttons zeigen common.accountRequired statt Exception, Lokal-Modus-Kernlogik unveraendert"
    requirement: "DEPLOY-02"
    verification:
      - kind: unit
        ref: "app/app/(app)/__tests__/ (Task 3 RED->GREEN crashfree-Test)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Migration 020 geschrieben, per Backup abgesichert und nach 3-Gate-Protokoll erfolgreich auf die Live-Datenbank vitrqkzxkiqvadqfzrcx gepusht"
    requirement: "DEPLOY-02"
    verification:
      - kind: other
        ref: "supabase migration list --linked (20260910000020 in Local UND Remote)"
        status: pass
      - kind: other
        ref: "Direktabfrage nach Push: photo_queue/feature_flags/enqueue_photo_analysis/profiles.plz existieren nicht mehr; transfer_ownership existiert"
        status: pass
    human_judgment: true
    rationale: "Destruktiver Live-DB-Push mit realen Nutzerdaten (Dirks Gartenplan) — Ergebnis wurde automatisiert verifiziert, aber die Entscheidung selbst (Task 5/6) war ein blockierender Human-Checkpoint per Design (R9); menschliche Bestaetigung des Gesamtergebnisses bleibt sinnvoll."

duration: ~35min (nur Task 6/7-Fortsetzung dieser Session; Tasks 1-4 liefen in vorheriger Session)
completed: 2026-09-12
status: complete
---

# Phase 20 Plan 02: Legacy-Cleanup und Migration 020 Summary

**FEATURES als Compile-Time-Konstante, Foto-Pipeline plus sieben Dependencies entfernt, Lokal-Modus crashfrei, und Migration 020 nach Backup und 3-Gate-Protokoll live auf vitrqkzxkiqvadqfzrcx gepusht (mit einer Laufzeit-Korrektur an der Bucket-Bereinigung).**

## Performance

- **Duration (diese Fortsetzungs-Session, Task 6-7):** ca. 35 min
- **Completed:** 2026-09-12T20:04:57Z
- **Tasks:** 7/7 (Tasks 1-4 in vorheriger Session, Tasks 5-7 in dieser Session)
- **Commits:** 7 (`ee4a2a1`, `ad609e8`, `12e2e2e`, `e3e7c5b`, `276446c`, `b50f10a`, `6a9df91`)
- **Files changed (gesamter Plan, `c135a3a..6a9df91`):** 41 files, +390/-1380 Zeilen

## Accomplishments

- `FEATURES`-Konstante (`packages/shared/src/constants/flags.ts`) ersetzt die alte `useFlag`/`feature_flags`-Supabase-Abfrage end-to-end (shared -> UI -> SyncWorker -> Tests)
- Foto-Pipeline (`app/src/lib/photos/**`), `captureStore`, `settingsStore`, GPS-Opt-in-Screen, `useFlag`, `expo-share-intent` (+Provider/Plugin) vollstaendig entfernt
- Sieben Dependencies aus `app/package.json` entfernt: `@lodev09/react-native-exify`, `expo-image-manipulator`, `expo-image-picker`, `piexifjs`, `@types/piexifjs`, `expo-share-intent`, `jest-expo`
- Lokal-Modus-Kernlogik unveraendert; Home-Buttons ("Plan oeffnen", "Importieren", "Kalender") zeigen im Lokal-Modus jetzt `common.accountRequired` statt eine Exception auszuloesen
- Migration `20260910000020_cleanup_legacy.sql` geschrieben, per Backup abgesichert und **erfolgreich live gepusht**: `photo_queue`, `enqueue_photo_analysis()`, `feature_flags` und `profiles.plz/klimazone/archetype` entfernt; `transfer_ownership` ohne die Migration-013-Audit-Regression neu definiert
- Zwei pg_dump-Backups (Schema-only + Data-only) unter `D:/Backups/` erzeugt und inhaltlich gegen die zu loeschenden Objekte verifiziert, bevor gepusht wurde

## Task Commits

1. **Task 1: FEATURES-Konstante end-to-end** — `ee4a2a1` (test/RED) -> `ad609e8` (feat/GREEN)
2. **Task 2: Foto-Pipeline, Share-Intent und sieben Dependencies entfernen** — `12e2e2e` (feat)
3. **Task 3: Lokal-Modus crashfrei** — `e3e7c5b` (test/RED) -> `276446c` (feat/GREEN)
4. **Task 4: Migration 020 schreiben und committen** — `b50f10a` (feat)
5. **Task 5: Entscheidung — Option A ("jetzt bereinigen")** — kein Commit (Checkpoint)
6. **Task 6: Backup nach M5 bestaetigt** — kein Commit (Checkpoint; Backup-Dateien liegen ausserhalb des Repos unter `D:/Backups/`)
7. **Task 7: Migration 020 nach 3-Gate-Protokoll gepusht** — `6a9df91` (fix, Rule 1/3-Korrektur der Bucket-Section vor dem erfolgreichen Push)

_Note: TDD-Tasks (1, 3) haben je zwei Commits (test -> feat)._

## Files Created/Modified

- `packages/shared/src/constants/flags.ts` — `FEATURES`-Compile-Time-Konstante mit `vereinsregeln: false`
- `packages/shared/src/i18n/de.json` — Schluessel `common.accountRequired` ergaenzt, `rules.upload.*` entfernt
- `app/app/(app)/profile/index.tsx`, `.../vereinsregeln/index.tsx` — Banner/Route hinter `FEATURES.vereinsregeln`, PDF-Upload-Karte entfernt
- `app/src/lib/sync/SyncWorker.ts` — `vereinsregeln`-Push hinter `FEATURES.vereinsregeln`
- `app/app/(app)/index.tsx` — Home-Buttons zeigen `common.accountRequired` im Lokal-Modus statt Exception
- `app/app/(app)/_layout.tsx`, `app/app.config.ts` — Share-Intent-Provider/Plugin entfernt
- `app/jest.config.ts` — Jest-Projekt `photos` entfernt
- `app/package.json`, `pnpm-lock.yaml` — sieben Dependencies entfernt
- `supabase/migrations/20260910000020_cleanup_legacy.sql` — neu; Section 3 in Task 7 laufzeitkorrigiert (siehe Deviations)
- `supabase/tests/garden_plan_rls.sql`, `trigger_ordering.sql`, `rls_member_check.sql` — an entfernte Objekte angepasst
- Geloescht: `app/src/lib/photos/**`, `app/src/stores/captureStore.ts`, `app/src/stores/settingsStore.ts` (+Test), `app/app/(app)/settings/privacy.tsx`, `app/src/hooks/useFlag.ts` (+Test), `app/app/(app)/profile/vereinsregeln/upload.tsx`, `scripts/e2e-pgmq-smoke.sql`, `app/src/__mocks__/sentry.ts`, `app/src/__mocks__/supabase-functions.ts`, `supabase/tests/migration_003_atomic.sql`, `supabase/tests/rls_foundation.sql`, `supabase/tests/storage_photos_rls.sql`

## Backup-Nachweis (Task 6)

- **Methode:** Direkter `pg_dump` (lokale PostgreSQL-17-Installation) gegen `db.vitrqkzxkiqvadqfzrcx.supabase.co:5432`, da der `supabase db dump`-CLI-Wrapper (Version 2.90.0) an einer Docker-Image-Inspektion scheiterte (kein Docker Desktop auf diesem Rechner) — als gleichwertiger manueller pg_dump-Weg im Plan bereits vorgesehen (Masterplan Kap. 7.4).
- **Schema-Dump:** `D:/Backups/spatenstich-vor-020-20260912-schema.sql` (160.168 Bytes, 4.470 Zeilen) — enthaelt `public`- und `storage`-Schema (Policies inklusive), verifiziert per Grep: `photo_queue` (33 Treffer), `feature_flags` (28 Treffer), `profiles.plz/klimazone/archetype` (Zeilen 1881-1891), `transfer_ownership` (8 Treffer), Storage-Policies `photos_garden_member_*` und `vereinsregeln_storage_own`.
- **Data-Dump:** `D:/Backups/spatenstich-vor-020-20260912-data.sql` (129.124 Bytes, 652 Zeilen) — `--data-only`, schliesst `storage`-Schema-Daten (Bucket-/Objekt-Zeilen) mit ein.
- **DB-Passwort:** Der User hatte das urspruengliche Passwort nie notiert und es im Supabase-Dashboard neu gesetzt (Settings -> Database -> Reset database password). Vorab per repo-weitem Grep bestaetigt: keine Live-Connection-String-Referenz ausserhalb `node_modules`. Das neue Passwort wurde ausschliesslich in-process als Environment-Variable verwendet, nie geloggt/committet, und die Uebergabedatei (`C:\Users\Gordon\.spatenstich-db-pw`) wurde nach Abschluss von Task 7 geloescht.
- **Freigabe:** "DB-Passwort liefern -> Dump" — ja, mit genannter Quelle (obige zwei Dateien).

## Migration 020 — Ergebnis (Task 7)

**Entscheidung Task 5:** Option A — jetzt bereinigen (User-Wahl, dokumentiert in `<user_response>` der Fortsetzungs-Instruktion).

**3-Gate-Protokoll:**
1. `supabase migration list --linked` — Exit 0, `20260910000020` lokal vorhanden, Remote-Spalte leer (vor dem Push).
2. `supabase db push --linked --dry-run --yes` — Exit 0, "Would push these migrations: 20260910000020_cleanup_legacy.sql", kein Konflikt.
3. `supabase db push --linked --yes` — **erster Versuch schlug fehl** (siehe Deviations), **zweiter Versuch nach Fix erfolgreich**, Exit 0. NOTICEs: `bucket photos enthaelt 14 Objekt(e)`, `bucket vereinsregeln enthaelt 0 Objekt(e)` (beide Buckets bleiben stehen, siehe unten), `migration_020 ok: photo_queue/enqueue_photo_analysis/feature_flags/profiles-Spalten entfernt, transfer_ownership neu definiert`.
4. `supabase migration list --linked` — `20260910000020` erscheint jetzt in **beiden** Spalten (Local UND Remote).

**Live-Zustand nach Push (per Direktabfrage verifiziert):**
- `public.photo_queue` — existiert nicht mehr
- `public.feature_flags` — existiert nicht mehr
- `public.enqueue_photo_analysis()` — existiert nicht mehr
- `public.profiles.plz/klimazone/archetype` — existieren nicht mehr
- `public.transfer_ownership()` — existiert, neu definiert (ohne Migration-013-Audit-Regression)
- `storage.buckets` `photos` (14 Objekte) und `vereinsregeln` (0 Objekte) — **beide bleiben bestehen**, mit ihren bisherigen Policies unveraendert (siehe Deviations)

**Bucket-Ausgang:** Weder `photos` (14 Objekte, erwartetermassen nicht leer) noch `vereinsregeln` (0 Objekte, waere nach urspruenglichem Plan geloescht worden) wurden entfernt — beide sind jetzt ein offener manueller Aufraeumpunkt ueber die Storage API/das Dashboard (siehe Deviations fuer den Grund).

## Bundle-Groesse

- **Baseline (laut 20-CONTEXT.md, vor dieser Phase):** ~6,2 MB
- **Nach diesem Plan:** `app/dist/` gesamt 6,3 MB (JS-Bundle `index-*.js` allein 5.941.200 Bytes / ~5,94 MB)
- **Ziel < 5,2 MB nicht erreicht** — laut CONTEXT.md erwartet, da ~500 KB Color-Picker-PNGs (`reanimated-color-picker`) erst in Phase 22 fallen. Die sieben in diesem Plan entfernten Dependencies waren primaer JS-Logik ohne grosse Assets; die Groessenreduktion ist entsprechend klein. Kein Fehlschlag dieses Plans (Success Criteria verlangt nur "Bundle-Groesse dokumentiert", kein Zielwert).

## Tests

- **App-Paket:** 97 Suites / 769 Tests gruen (`pnpm --filter app exec jest --ci`), inklusive der neuen Tests aus Task 1 (FEATURES/SyncWorker) und Task 3 (Home-Button crashfree). Entfernte Testdateien: `useFlag.test.ts`, `exifStrip.test.ts`, `settingsStore.test.ts` (+ Fixtures/Setup).
- **Shared-Paket:** 7 Suites / 86 Tests gruen (`pnpm --filter @spatenstich/shared exec jest --ci`).
- Ein bereits dokumentiertes, aus dem Scope dieses Plans liegendes Worker-Leak-Warning ("A worker process has failed to exit gracefully") trat weiterhin auf — siehe 20-CONTEXT.md WP 20.1, nicht Teil dieses Plans.
- `pnpm -r run typecheck` — 0 Fehler (beide Pakete).
- `pnpm -r run lint` — 0 Fehler, 62 Warnings (alle vorbestehend, aus WP 20.1/anderer Plaene Scope).
- `pnpm --filter app run build` (`expo export --platform web`) — Exit 0, Bundle exportiert.
- `supabase migration list --linked` — siehe oben, Exit 0, `20260910000020` in beiden Spalten.

## Decisions Made

- **Task 5 (User):** Option A — Migration 020 sofort nach Backup pushen.
- **Task 6 (User):** Backup-Freigabe "ja" nach Dashboard-Passwort-Reset + zwei pg_dump-Dateien als Quelle.
- **Fix vor dem zweiten Push-Versuch (Executor, Rule 1/3, kein neuer User-Checkpoint):** Siehe Deviations unten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug + Rule 3 - Blocking] Migration 020 Section 3 (Bucket-Loeschung) scheiterte am ersten Live-Push mit SQLSTATE 42501**
- **Found during:** Task 7, erster Ausfuehrungsversuch von Gate 3 (`supabase db push --linked --yes`)
- **Issue:** `DELETE FROM storage.buckets WHERE id = 'vereinsregeln'` (im urspruenglichen, von Task 4/Task 5 gebilligten Migrationstext) schlug fehl mit: `ERROR: Direct deletion from storage tables is not allowed. Use the Storage API instead. (SQLSTATE 42501)`. Diese Plattform-Absicherung war zum Zeitpunkt der Masterplan-Erstellung (Anhang C.1) nicht bekannt. Supabase klammert Migrationsdateien in eine implizite Transaktion — der Fehlschlag hat die **gesamte** Migration atomar zurueckgerollt. Per Direktabfrage nach dem Fehlschlag bestaetigt: `photo_queue`, `feature_flags`, `profiles.plz` existierten noch, kein Teilzustand war entstanden. Kein Datenverlust, kein inkonsistenter Zwischenzustand.
- **Fix:** Section 3 wurde von "DROP POLICY + DELETE FROM storage.buckets bei leerem Bucket" auf "nur Zaehlpruefung + RAISE NOTICE, keine DDL/DML mehr" reduziert. Grund: Eine Policy-Entfernung ohne begleitenden Bucket-Drop haette exakt die von der eigenen Threat-Model-Zeile T-20-02-02 verbotene Teil-Entfernung erzeugt ("nie Policy ohne Bucket oder umgekehrt"). Da SQL-seitiges Bucket-Loeschen auf verwalteten Supabase-Projekten grundsaetzlich nicht mehr moeglich ist, bleiben beide Buckets samt Policies bestehen — deckungsgleich mit der im Plan bereits vorgesehenen "nicht leer"-Fallback-Disposition (T-20-02-04, "accept"), jetzt konsequent auf beide Faelle angewendet statt nur auf den nicht-leeren.
- **Warum kein neuer Task-5-Checkpoint noetig war:** Die Aenderung verkleinert den destruktiven Umfang der Migration (weniger geloescht als urspruenglich geplant), betrifft keine der vom User in Task 5 explizit gebilligten Objekte (photo_queue, feature_flags, profiles-Spalten, transfer_ownership blieben unveraendert), und reproduziert lediglich eine im selben Migrationsdokument bereits vorhandene und vom User implizit gebilligte Fallback-Disposition (T-20-02-04) fuer den zusaetzlichen Fall.
- **Files modified:** `supabase/migrations/20260910000020_cleanup_legacy.sql`
- **Verification:** Zweiter Push-Versuch mit der korrigierten Datei: Exit 0, alle drei NOTICEs erschienen wie erwartet, `supabase migration list --linked` zeigt `20260910000020` in beiden Spalten, Direktabfrage bestaetigt den erwarteten Endzustand (siehe oben).
- **Committed in:** `6a9df91` (separater Fix-Commit vor dem erfolgreichen zweiten Push)

---

**Total deviations:** 1 auto-fixed (1 Bug/Blocking, kombiniert Rule 1 + Rule 3)
**Impact on plan:** Der Fix reduziert den destruktiven Umfang von Migration 020 gegenueber dem urspruenglich vom User gebilligten Text (Buckets werden gar nicht mehr per SQL geloescht, statt nur bei Nicht-Leere). Keine der in Task 5 explizit besprochenen Kernaenderungen (photo_queue, feature_flags, profiles-Spalten, transfer_ownership) war betroffen. Der Live-Push war am Ende erfolgreich und vollstaendig verifiziert.

## Issues Encountered

- **`supabase db dump`-CLI-Wrapper nicht nutzbar:** Der in den Fortsetzungs-Instruktionen vorgeschlagene Weg (`supabase db dump ...`) scheiterte mit `failed to inspect docker image: ... open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` (kein Docker Desktop installiert). Geloest durch direkten `pg_dump`-Aufruf mit denselben Flags, die `supabase db dump --dry-run` als Referenz-Skript ausgibt (lokale PostgreSQL-17-Installation vorhanden). Kein Blocker fuer das Ergebnis, nur fuer den Weg.
- **`supabase db dump --dry-run` gibt Klartext-Zugangsdaten aus:** Der Dry-Run-Modus druckt ein vollstaendiges `pg_dump`-Bash-Skript inklusive eines von der CLI selbst generierten, kurzlebigen `PGPASSWORD` (Rolle `cli_login_postgres`) zur Inspektion aus. Das ist **nicht** das vom User bereitgestellte Datenbank-Passwort aus der `.spatenstich-db-pw`-Datei, sondern ein von Supabase je Aufruf frisch erzeugtes, kurzlebiges Login-Token der bereits authentifizierten CLI-Sitzung. Trotzdem wurde `--dry-run` nach der ersten Beobachtung nicht erneut verwendet, um unnoetige Sekundär-Credential-Ausgaben zu vermeiden.
- **Migration list zeigte vor dem Fix keine falsche "erfolgreich"-Meldung:** Die implizite Transaktions-Klammerung von Supabase hat wie im Migrationskommentar dokumentiert funktioniert — das war kein Issue, sondern die Bestaetigung, dass das Sicherheitsnetz (Backup + atomare Transaktion) genau fuer diesen Fall entworfen war.

## User Setup Required

None — die im Plan genannte `user_setup`-Anforderung (Backup vor Gate 3) wurde in Task 6 dieser Session erfuellt; kein offener Punkt fuer den User aus dieser Kategorie.

**Offener manueller Punkt (kein User-Setup, sondern dokumentierte Nacharbeit):** Die Buckets `photos` (14 Objekte) und `vereinsregeln` (0 Objekte) konnten nicht per SQL geloescht werden (Plattform-Restriktion). Falls gewuenscht, muss dies spaeter ueber die Supabase Storage API oder das Dashboard erfolgen — ausserhalb des Scopes dieses Plans.

## Next Phase Readiness

- DEPLOY-02 ist vollstaendig erfuellt: Migration 020 ist committet UND live gepusht, verifiziert in beiden Spalten von `supabase migration list --linked`.
- Phase 21 kann auf einem bereinigten Schema starten: keine `feature_flags`-Tabelle, keine `photo_queue`, keine toten `profiles`-Spalten mehr, die Outbox erzeugt keine `22P02`-Eintraege mehr fuer geloeschte Objekte.
- Offener Punkt fuer eine spaetere Phase (kein Blocker): die zwei Storage-Buckets `photos`/`vereinsregeln` bleiben bestehen und muessten bei Bedarf ueber die Storage API manuell entfernt werden.
- Zwei lokale Backup-Dateien unter `D:/Backups/spatenstich-vor-020-20260912-{schema,data}.sql` bleiben als Restore-Pfad verfuegbar, sollten aber ausserhalb dieses Chats/Repos aufbewahrt werden (bereits der Fall — sie liegen ausserhalb des Repos).

---
*Phase: 20-fundament-aufr-umen-pwa-deploy*
*Completed: 2026-09-12*
