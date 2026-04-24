# Phase 3: Offline & Sync (2-User Shared State) - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Offline-first Lesen + Schreiben für den gemeinsam genutzten Kleingarten (Dirk + Frau über zwei Accounts/Geräte): App startet ohne Netz und zeigt den letzten Plan, Writes (Vereinsregeln, Garten-Metadaten, später Plan-Elemente/Inventar/Kalender) landen in einer lokalen Outbox, werden bei Reconnect automatisch zu Supabase gepusht, LWW löst parallele Writes auf derselben Row auf, Delta-Pulls holen Partner-Änderungen. Parallel dazu eine Foto-Queue, die offline aufgenommene Bilder puffert und beim Reconnect hochlädt + KI-Job via existierender pgmq/ai_jobs-Pipeline (Phase 1) einreiht. Sync-Status sichtbar als globaler Header-Badge + Detail-Screen.

Phase 3 schafft die Sync-Infrastruktur für die bestehenden Entitäten (gardens, garden_members, profiles, vereinsregeln, ai_jobs/results). Sie ist Voraussetzung für Phase 4 (Foto→Plan) und Phase 5 (Plan-Editor), deren Row-Typen später derselben Outbox-/LWW-Mechanik folgen — aber erst dort ihre eigenen lokalen Tabellen und Repos hinzufügen.

Nicht im Scope: Plan-Editor-UI, Foto→Plan-Capture-Flow, Kalender, Inventar, Multi-Garten-Switching, >2 Member, Merge zwischen zwei Gärten.

</domain>

<decisions>
## Implementation Decisions

### Lokaler Store (StorageAdapter-Erweiterung)

- **D-01:** StorageAdapter wird von reinem KV-Blob-Zugriff (D-08 Phase 1) auf **Row-Tables pro Entity** erweitert: eine lokale SQLite-Tabelle (native) bzw. ein IndexedDB-ObjectStore (web) pro Supabase-Tabelle mit `garden_id`-Scope. Das aus Phase 1 dokumentierte „Transactions/queries deferred to Phase 3" wird hier eingelöst. Bestehende Blob-Keys (`profile`, `vereinsregeln`) aus dem Lokal-Modus bleiben für `migrateLocalToAccount` unverändert funktional — Lokal-Modus kriegt keine Row-Tables (D-13 Phase 2.5 bleibt).
- **D-02:** Entity-Scope für Phase 3 = **nur bestehende Supabase-Tabellen**: `gardens`, `garden_members`, `profiles`, `vereinsregeln` (auch wenn flagged off — das Pattern muss einmal sauber validiert sein), `ai_jobs`, `ai_results`. Phase 4/5/6/7 legt ihre eigenen lokalen Tabellen an. Kein antizipatorisches Schema.
- **D-03:** Schema-Synchronisation lokal↔Supabase bleibt **manuell gepflegt**: jede Phase, die eine neue Supabase-Tabelle anlegt, erweitert zusätzlich `app/src/storage/migrations.ts` um den passenden lokalen Schritt. Kein Auto-Derive aus `packages/shared`-Typen. RLS + Trigger bleiben server-seitig; das lokale Schema braucht nur das Row-Layout + `updated_at` + `updated_by_user_id` + `deleted_at`.
- **D-04:** StorageAdapter-Interface bekommt neue Methoden für Row-Access (z.B. `query(entity, where)`, `upsertRow`, `deleteRow`). Existierende KV-Methoden (`get`/`set`/`delete`/`list`) bleiben für Lokal-Modus-Blobs + AuthStore-Persist + sync_state-Tabelle erhalten. Konkrete API-Shape entscheidet Researcher/Planner — muss Platform.select-kompatibel bleiben.

### Outbox-Design

- **D-05:** **Separate `sync_outbox`-Tabelle** im lokalen Store statt `dirty`-Flag auf Rows. Spalten: `id`, `entity`, `row_id`, `op` (`'upsert'` | `'delete'`), `payload_json`, `created_at`, `retry_count`, `last_error`, `last_attempted_at`. Domain-Rows bleiben sauber; Retry-Historie + Fehlertext sichtbar für UI-Debugging.
- **D-06:** Outbox-Einheit = **Row-Snapshot** (kompletter Nach-Zustand der Row), nicht Field-Level-Diff und nicht Operation-Event. Push = `supabase.from(entity).upsert(payload)` bzw. `.delete().eq('id', row_id)`. Idempotent, replay-bar, Schema-Drift-tolerant. Impliziert: bei parallelen Writes auf unterschiedliche Spalten derselben Row gewinnt der spätere Write komplett (Row-Level-LWW — so gewollt, konsistent mit D-18 Phase 2.5).
- **D-07:** Reihenfolge-Garantie: **FIFO pro (entity, row_id), parallel zwischen Rows**. Ops auf derselben Row werden strikt seriell geflusht (gruppiert & sortiert nach `created_at`). Ops auf verschiedenen Rows laufen parallel für besseren Durchsatz (30s-Reconnect-Ziel).

### LWW-Durchsetzung (Server-Seite)

- **D-08:** **Postgres-BEFORE-UPDATE-Trigger** auf allen `garden_id`-Tabellen mit `updated_at`: vergleicht `NEW.updated_at` mit `OLD.updated_at`; wenn incoming älter → Trigger verwirft via `RAISE EXCEPTION` mit **custom SQLSTATE aus dem P9xxx-Bereich** (analog WR-04 Phase 2.5). Trigger-Template muss für alle `garden_id`-Tabellen wiederverwendbar sein. Bestehender `tg_set_updated_at`-Trigger (Migration 001) bleibt — der LWW-Guard ist ein zusätzlicher BEFORE UPDATE Trigger, der vor `tg_set_updated_at` läuft.
- **D-09:** Client sendet `updated_at` immer explizit mit (nicht vom Server auto-set), damit der Trigger fair vergleichen kann. Outbox-Payload enthält deshalb den lokalen `updated_at`-Wert.
- **D-10:** Bei LWW-Reject reagiert der Outbox-Worker mit **Op verwerfen** (nicht Retry) + Trigger eines Delta-Pulls, damit die lokale Row mit dem Server-Zustand überschrieben wird. UI sieht kurz den optimistischen eigenen Wert, dann den Server-Wert nach Pull.

### Retry & Fehlerbehandlung

- **D-11:** **Exponential Backoff, max 5 Retries**: nach Fehler → `retry_count++`, `last_error` speichern, nächster Versuch nach `2^retry_count` Sekunden (gedeckelt auf ~5 min). Nach 5 fehlgeschlagenen Versuchen bleibt die Op in der Outbox mit Status "failed" — UI-Badge zeigt Zahl an, User kann manuell Retry oder Verwerfen triggern (Detail-Screen).
- **D-12 (Claude's Discretion):** Unterscheidung 4xx vs. 5xx. Aktuell nicht zwingend im MVP — einheitlicher Backoff reicht. Researcher/Planner kann bei Bedarf refinen (z.B. 4xx Validation-Error sofort auf "failed" setzen, damit die Queue nicht blockiert).

### Partner-Update-Propagation

- **D-13:** **Pull bei App-Foreground + nach eigenem Push** statt Supabase-Realtime-Channel. Supabase-Realtime ist für MVP (2 User, meist nicht-gleichzeitig aktiv) overkill und zusätzliche Infrastruktur. Wenn Phase 5 (Plan-Editor) später tatsächlich Live-Awareness braucht, kann dort ein scoped Realtime-Channel nachgezogen werden. Für Phase 3 gilt: Pull reicht.
- **D-14:** **Bulk-Initial-Pull beim ersten App-Start nach Login / zweitem Gerät / Reinstall**, danach Delta-Pulls per `WHERE updated_at > last_pulled_at`. `SELECT * FROM <entity> WHERE garden_id = <active>` pro Entity. Skaliert auf MVP-Datenmengen.
- **D-15:** **`sync_state`-Tabelle lokal** mit `(entity TEXT PK, last_pulled_at TIMESTAMPTZ)`. Pull-Worker aktualisiert den Wert nach jedem erfolgreichen Delta-Pull pro Entity. Bootstrap setzt initiale Werte (entweder `null` = voller Bulk-Pull, oder Wert nach erfolgreichem Initial-Pull).
- **D-16:** **Sync-Trigger**: (a) NetInfo-Event offline→online, (b) AppState-Event → `'active'`, (c) 500ms debounced nach jedem Outbox-Insert. Keine periodischen Timer. Push-Cycle (Outbox-Flush) läuft vor Pull-Cycle, damit unsere eigenen Writes zuerst landen und der nachfolgende Pull sie nicht als Server-Delta wieder einspielt.

### Foto-Queue & KI-Job-Anbindung (Phase-4-Vorbereitung)

- **D-17:** **Lokale Ablage = expo-file-system URI + Manifest-Row** in neuer Tabelle `photo_queue (id, local_uri, garden_id, kind, created_at, uploaded_at null, storage_path null, retry_count, last_error)`. Foto wird von expo-camera/expo-image-picker ins cache-Dir geschrieben, Manifest-Row lokal angelegt. Web-Äquivalent: Blob in IndexedDB-ObjectStore mit gleicher Manifest-Struktur. Keine base64-in-SQLite.
- **D-18:** **Upload-Flow**: Outbox-artiger Worker nimmt `photo_queue`-Rows mit `uploaded_at = NULL`, lädt Foto via `supabase.storage.from('photos').upload(...)` hoch (Pfad nach Convention `photos/<garden_id>/<photo_id>.<ext>`), stempelt `uploaded_at` + `storage_path`. Retry-Strategie identisch zu Outbox (exponential backoff, max 5).
- **D-19:** **KI-Job-Enqueue** läuft per **Supabase RPC** `enqueue_photo_analysis(p_garden_id uuid, p_storage_path text, p_kind text) → job_id` (SECURITY DEFINER, member-check, analog zum Pattern aus Phase 1 `enqueueAiJob.ts`). RPC insertet in `pgmq` + `ai_jobs`. Client ruft RPC direkt nach erfolgreichem Storage-Upload auf. Keine monolithische Edge Function — hält Client-Upload (1.15 MP Client-Resize, NFR-PHOTO-03) und Analyse-Trigger getrennt.
- **D-20:** `photo_queue` ist **eine eigene Tabelle, nicht Teil der generischen `sync_outbox`** — Fotos haben einen anderen Lifecycle (Binary-Upload vor DB-Insert), andere Retry-Semantik, und Phase 4 braucht sie als eigenständige Datenstruktur.

### Sync-Status-UI

- **D-21:** **Globaler Badge im App-Header** mit 3 Zuständen: `✓ synced` / `⇄ syncing (N pending)` / `⚠ error`. Tap → Settings-Untersektion **"Sync-Status"** mit Liste der pending/failed Ops + Retry/Verwerfen-Buttons. Matcht bestehendes Settings-Pattern aus Phase 02-04 (kein Modal, inline Confirmation-Expansion, UI-SPEC Zeile 234).
- **D-22:** **Optimistisches UI**: Write → lokale Row + Outbox-Insert → UI re-rendert sofort mit neuem Wert. Server-Push asynchron. Bei LWW-Reject korrigiert der anschließende Delta-Pull die Row. Bei harten Failures bleibt der lokale Wert, aber Badge zeigt Fehler an — keine Rollback-Animation im MVP.

### Delete-Sync (Tombstones)

- **D-23:** **Soft-Delete via `deleted_at timestamptz`-Spalte** auf allen `garden_id`-Tabellen. `deleteRow(entity, id)` setzt lokal + in der Outbox `deleted_at = now()` (als Upsert-Payload). Alle Read-Queries filtern `WHERE deleted_at IS NULL`. Delta-Pull sieht den `deleted_at`-Update wie jeden anderen Write → Partner-Gerät filtert die Row in seinen Lesen automatisch weg. Kein separates Tombstone-Schema, kein Double-Query.
- **D-24 (Claude's Discretion):** Cleanup-Cron (z.B. `DELETE FROM <entity> WHERE deleted_at < now() - interval '90 days'`) ist **nicht MVP-kritisch**. Kann als separate Maintenance-Migration nach Saison 2026 nachgezogen werden, wenn Storage-Druck entsteht.

### DSGVO / Datenschutz (NFR-04 + NFR-05)

- **D-25:** **NFR-04 Foto-Verschlüsselung = Supabase-Default (AES-256, Frankfurt/EU)**. Kein eigener Client-Side-E2E-Krypto-Stack — das würde Phase 4 (Claude Vision liest Foto direkt) brechen und ist für ein Kleingarten-Foto unverhältnismäßig. Auf dem Gerät zählen iOS Data Protection bzw. Android Keystore (Expo-Default für cache-Dir). Anforderung erfüllt.
- **D-26:** **NFR-05 EXIF-Handling**: EXIF-Daten werden **vor Upload vom Client komplett gestrippt**. Opt-in-Toggle in Settings **"Standort-Daten aus Fotos teilen"** (Default: aus). Wenn aktiv → GPS-Felder (lat/lng) werden strukturiert aus EXIF extrahiert und in `photo_queue.geo_lat`/`photo_queue.geo_lng` Spalten gespeichert; das Foto selbst bleibt EXIF-frei. Migrationen in Phase 3 müssen diese Spalten mit anlegen.

### Scope für Phase 3

- **D-27:** Phase 3 liefert: StorageAdapter-Erweiterung (D-01 bis D-04), Outbox-Infrastruktur + Sync-Worker + LWW-Trigger-Template (D-05 bis D-12), Pull-Loop + sync_state (D-13 bis D-16), Foto-Queue + Upload-Worker + RPC (D-17 bis D-20), Sync-Status-UI (D-21, D-22), Soft-Delete-Schema-Migration + Repo-Update für bestehende `garden_id`-Tabellen (D-23), EXIF-Stripping + Opt-in-UI (D-26). Phase 3 liefert **keine** neuen Feature-Entities — nur die Sync-Schicht für existierende.
- **D-28:** Bestehende Repos (`gardenRepo`, `inviteCodeRepo`, `vereinsregelnRepo`, `profileRepo`) werden in Phase 3 **umgebaut**: der „wenn account → supabase, wenn lokal → storage"-Pattern wird ersetzt durch „immer → lokale Row-Table, Outbox flusht zu Supabase". `migrateLocalToAccount` bleibt erhalten, aber kriegt einen 9. Step: nach `gardens.update` zusätzlich die neuen lokalen Row-Tables mit den Rows aus Supabase bootstrappen, damit das Erstgerät sofort offline-ready ist.

### Claude's Discretion

- Konkrete API-Shape für Row-Level-StorageAdapter (`query(entity, where)` vs. typisierte per-Entity-Accessoren) — Researcher-Entscheidung basierend auf TypeScript-Ergonomie.
- Web-Platform Spezifika: Expo-SQLite-Web (SDK 53, Alpha) vs. echter IndexedDB-ObjectStore-Approach für Row-Tables. Researcher muss COOP/COEP-Header-Risiko (existing open question in STATE.md) prüfen, bevor Phase 3 auf Web-Code committet.
- Cleanup-Politik für `deleted_at` (D-24) und für alte Outbox-Einträge im Status "failed" (falls User Op ignoriert).
- Exact Debounce-Zahl für Sync-Trigger nach Write (500 ms als Default, aber Planner/Executor kann via Messung tunen).
- Batch-Größe bei Bulk-Initial-Pull (alle Rows auf einmal vs. paginiert) — MVP-Datenmengen erlauben Einzelquery, aber wenn ein Garten mal 500 Plan-Elemente hat → paginieren.
- Ob die bestehenden Repos (gardenRepo etc.) in Phase 3 alle gleichzeitig migrieren oder inkrementell (Plan-Reihenfolge). Empfohlen: inkrementell, damit jeder Schritt atomar gecommitet wird.
- Differenzierung Retry bei 4xx vs. 5xx (D-12) — bei Bedarf.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope

- `.planning/ROADMAP.md` §"Phase 3: Offline & Sync" — Goal + 5 Success Criteria (Offline-Start, Foto-Queue-Reconnect, 30s-Sync, Cross-Platform Browser/iPhone, 2-User-LWW)
- `.planning/REQUIREMENTS.md` — SYNC-01, SYNC-02, SYNC-03, SYNC-04 (Offline + Queue + LWW + Status-UI), NFR-01 (iPhone + Browser sync), NFR-04 (Fotos at-rest encrypted), NFR-05 (Geo opt-in)
- `.planning/PROJECT.md` §"Constraints" — Offline-Startziel, Sync-Layer "eigene simple Operation-Log-Queue, Last-Write-Wins", StorageAdapter-Pflicht, DSGVO-EU-Hosting

### Prior-Phase-Decisions (pflichtlektüre vor Planning)

- `.planning/phases/01-foundation/01-CONTEXT.md` — StorageAdapter D-08 ("CRUD only in Phase 1, Transactions/queries deferred to Phase 3"), Supabase-Client-Konfiguration, pgmq + ai_jobs-Infrastruktur
- `.planning/phases/02-auth-profile-vereinsregeln/02-CONTEXT.md` — mode-aware Repo-Pattern, migrateLocalToAccount atomic-tail-Invariant
- `.planning/phases/02.5-shared-garden-model/02.5-CONTEXT.md` — D-18 LWW mit `updated_at` + `updated_by_user_id`, D-19 "zuletzt bearbeitet von"-UI-Pattern, D-12/D-13 Mode-Transition + Lokal-Modus-Invariant, SECURITY-DEFINER-Helper-Pattern für Member-RLS

### Schema / Code-Bestand zu erweitern

- `app/src/storage/StorageAdapter.ts` (re-exports from shared) + `packages/shared/src/types/storage.ts` — Interface erweitern um Row-Level-Access-Methoden (D-04)
- `app/src/storage/SqliteAdapter.ts` — Implementierung Row-Level für native (SQLite-Statements + Transactions)
- `app/src/storage/IndexedDbAdapter.ts` — Implementierung Row-Level für web (Object-Stores mit `garden_id`-Index)
- `app/src/storage/migrations.ts` — wird erweitert um die Row-Table-Migrations-Steps + `sync_outbox` + `sync_state` + `photo_queue`
- `app/src/lib/migrateLocalToAccount.ts` — 8-Step-Flow wird um 9. Step erweitert (Bootstrap lokale Row-Tables nach Account-Creation)
- `app/src/lib/gardenRepo.ts` / `vereinsregelnRepo.ts` / `profileRepo.ts` / `inviteCodeRepo.ts` — umbauen von mode-aware direct-supabase/storage auf „immer lokal lesen/schreiben + Outbox flush" (D-28)
- `app/src/lib/enqueueAiJob.ts` — bleibt konzeptuell (pgmq-Insert-Pattern), wird ggf. durch `enqueue_photo_analysis`-RPC-Wrapper ergänzt
- `app/src/stores/authStore.ts` — bleibt unverändert (aktiver Garten-Scope-Anker)
- `supabase/migrations/` — neue Migration für LWW-Guard-Trigger-Template + `deleted_at`-Spalten + `updated_at`/`updated_by_user_id`-Spalten auf allen `garden_id`-Tabellen + `enqueue_photo_analysis`-RPC

### Trigger & DB-Helper (existing, reuse)

- `public.tg_set_updated_at()` (Migration 001) — auch auf neue `garden_id`-Spalten wiederverwenden; **BEFORE UPDATE Trigger-Reihenfolge**: LWW-Guard (neu) muss VOR `tg_set_updated_at` laufen, damit der Client-gesetzte `updated_at` geprüft wird, bevor der Trigger ihn überschreibt
- `public.is_garden_member(uuid)` / `public.is_garden_owner(uuid)` (Migration 004) — SECURITY-DEFINER-Helper für RLS-Policies auf neuen Tabellen (`photo_queue` braucht Member-Check wie `vereinsregeln`)

### Platform-Spezifika (Researcher verify)

- Expo SDK 53 Stable auf SDK 55 Canary Pfad — Reanimated v3 + NativeWind v4 Compat-Status (STATE.md Blocker)
- `expo-sqlite` Web Alpha + SharedArrayBuffer/COOP/COEP-Header-Requirement (CLAUDE.md §"What NOT to Use")
- `@supabase/supabase-js ≥ 2.49.5` Metro-ESM-Compat (CLAUDE.md)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `app/src/storage/SqliteAdapter.ts` + `IndexedDbAdapter.ts`: KV-Layer ist stabil, Row-Table-Layer wird daneben gebaut (dasselbe Adapter-File, zusätzliche Methoden) — keine Platform.select-Struktur wird gebrochen
- `app/src/lib/supabase.ts`: Client mit `persistSession + autoRefreshToken` + `@supabase/supabase-js ≥ 2.49.5` ist für Outbox-Push und Delta-Pull direkt nutzbar
- `app/src/lib/vereinsregelnRepo.ts` + `gardenRepo.ts`: `toRow`/`fromRow`-Pattern (camelCase↔snake_case) wird 1:1 für alle neuen Sync-Pfade übernommen
- `app/src/lib/enqueueAiJob.ts`: Pattern `supabase.schema('pgmq_public').rpc(...)` (mit `any`-cast dokumentiert) ist die Vorlage für `enqueue_photo_analysis`-RPC-Wrapper
- `public.tg_set_updated_at()` + `public.is_garden_member()` + `public.is_garden_owner()`: Trigger + Helpers existieren, werden auf neue Tabellen (photo_queue) und neue LWW-Guard-Trigger direkt angewandt
- `Sentry.init` guarded by `!!process.env.EXPO_PUBLIC_SENTRY_DSN`: für Outbox-failure-Reports nutzen (last_error → Sentry.captureMessage)

### Established Patterns

- **Atomic-Tail-Invariant** (migrateLocalToAccount T-2-04-03): storage.delete strikt NACH allen Supabase-Writes. Muss bei Phase-3-Erweiterung (Bootstrap lokale Row-Tables) erhalten bleiben.
- **toRow/fromRow-Mapper**: camelCase-Domain-Typen ↔ snake_case-DB-Spalten. Pflicht für jede neue Sync-Integration, verhindert stille Silent-Drops bei Upsert (siehe Phase 02-04 post-hoc `ist_bkleingg`-Fix).
- **SECURITY-DEFINER-Helper für RLS** (Phase 2.5 P02): Member-Check-Policies auf `garden_id`-Tabellen rufen `is_garden_member(...)` auf (statt rekursivem Subquery auf `garden_members`), setzen `SET search_path = public, pg_temp`. Gilt auch für `photo_queue`.
- **Typed Domain Errors** (Phase 2.5 P03): Mapping von Supabase-SQLSTATE auf Error-Klassen → UI-Reaktion. **LWW-Guard-Trigger nutzt SQLSTATE im P9xxx-Bereich** (WR-04 Pattern); Client-Outbox-Worker mappt diesen SQLSTATE auf „Reject → Op verwerfen → Pull triggern" (D-10).
- **Settings-Screen-Pattern** (Phase 02-04, UI-SPEC Zeile 234): keine Modals, inline confirmation expansion. Sync-Status-Detail-Screen folgt diesem Pattern.
- **Persist-Middleware mit Version-Migration** (Phase 2.5 P04): v0→v1-Migrator für Zustand-Store mit Rehydration-Defaults. Pattern anwendbar, falls `sync_state` oder `authStore` neue Felder bekommen.

### Integration Points

- `app/app/_layout.tsx`: Root-Layout hat bereits useEffect für `ensureDefaultGardenForUser` (Phase 2.5 P04 D-12). Erweiterung: einmal pro Session + bei Login den Bulk-Initial-Pull triggern, wenn `sync_state` für eine Entity `last_pulled_at IS NULL`.
- `app/app/(app)/settings.tsx`: bestehender Settings-Screen bekommt neue Sektion "Sync-Status" (Badge im Header ist separat im `_layout` oder in einer gemeinsamen App-Header-Komponente — Research prüft, ob Expo-Router-Header das unterstützt).
- `app/app/(app)/index.tsx` (Garten-Plan-Placeholder): Sync-Status-Badge landet im Header dieses Screens + aller anderen Top-Level-Screens. Gemeinsame Header-Komponente wird hier eingeführt.
- `supabase/functions/` — keine neue Edge Function. Alle Server-seitige Sync-Logik bleibt in SQL (Triggers) + RPCs (SECURITY DEFINER, analog Phase 2.5 P02).
- `supabase/migrations/` — neue Migration legt auf allen `garden_id`-Tabellen (`gardens`, `garden_members`, `profiles`, `vereinsregeln`, `ai_jobs`, `ai_results`) `deleted_at timestamptz null` + LWW-Guard-Trigger an. `photo_queue` als neue Tabelle inkl. RLS-Policies + Indizes.

</code_context>

<specifics>
## Specific Ideas

- **"Sync-Layer muss für Phase 4–7 das Boilerplate liefern, das dort nicht nochmal jede Phase neu erfinden muss"** — Entscheidungen D-01 bis D-16 sind deshalb bewusst generisch formuliert. Jede spätere Phase muss nur lokale Row-Table + toRow/fromRow + Repo hinzufügen, nicht die Sync-Infrastruktur selbst.
- **"Frau sieht, wer zuletzt editiert hat, ohne extra Klick"** (Phase 2.5 §specifics): das `updated_by_user_id`-Feld ist schon da, Outbox-Payload muss es beim Push mitsenden (`updated_by_user_id: auth.uid()` beim Write). Sync-Status-Detail-Screen kann optional zeigen: „Letzte Änderung von Maria hat 3 Rows gepusht, deine 2" — nicht MVP-kritisch, aber zeigt dass der Mechanismus trägt.
- **"App darf nicht stehenbleiben, wenn Supabase kurz weg ist"** (sinngemäß aus PROJECT.md Constraints): Offline-Mode heißt nicht nur „keine Netz-Aufrufe", es heißt „jeder Read lebt aus der lokalen Row-Table, jeder Write geht in Outbox, UI re-rendert sofort". Lesepfade dürfen nie auf Supabase blocken.
- **30s-Reconnect-Ziel (SC-3)** ist konkret messbar: nach Reconnect + Flush + Pull muss eine Edit-Row auf beiden Geräten sichtbar identisch sein innerhalb 30 s. Planner sollte dafür eine Jest-/Playwright-ähnliche Messung vorsehen (2 Accounts gegen Staging-Projekt, Edit A → Reconnect → Edit sichtbar bei B).
- **Soft-Delete `deleted_at` passt nahtlos zu LWW-Trigger**: ein delete ist ein update mit `deleted_at = now()` — gleiche Payload-Shape, gleicher Trigger-Pfad, kein Spezial-Code.
- **Der „Aha-Moment" im 2-User-MVP** ist nicht Live-Mitverfolgen — es ist „ich öffne morgens die App, sehe was meine Frau gestern Abend gepflanzt hat, inkl. Zeitstempel". Deshalb reicht Pull-basiert + „zuletzt bearbeitet von"-Label (Phase 2.5 D-19).

</specifics>

<deferred>
## Deferred Ideas

- **Supabase-Realtime-Channels für Live-Awareness** — nicht MVP-nötig (D-13). Falls Phase 5 Plan-Editor Live-Collaboration-Feeling braucht, wird dort ein scoped Realtime-Channel nachgezogen (Scope-Ticket in Phase 5).
- **Rollback-Animation bei LWW-Reject** (Optimism-Option 3 im Q&A) — MVP zeigt nur Badge bei Fehler; ausgefeiltere UX (Toast „Maria hat das gerade auch geändert") ist Post-MVP.
- **Edge Function `bootstrap-garden`** für gebundelten Initial-Pull — nicht nötig bei MVP-Datenmengen; bleibt als Performance-Option wenn echte Nutzung zeigt, dass mehrere parallele SELECTs auf dem zweiten Gerät zu langsam sind.
- **Auto-Cleanup-Cron für `deleted_at`-Rows + failed Outbox-Einträge** — Maintenance-Aufgabe nach Saison 2026 (D-24).
- **Field-Level-Diff-Outbox / Operational-Transform** — explicit ausgeschlossen (D-06), Row-Level-LWW ist der Vertrag.
- **Client-Side-E2E-Foto-Verschlüsselung** — bricht Claude-Vision-Pipeline (Phase 4), Supabase-Default reicht (D-25).
- **Multi-Garten-Switching UI** — aus Phase 2.5 übernommen, weiterhin Out-of-Scope.
- **`>2 Member pro Garten`** — Ok-Path für Lift via Constraint-Update, weiterhin Out-of-Scope.
- **Separater Tombstone-Tabelle** — verworfen zugunsten `deleted_at` (D-23), einfacher Pfad.
- **Unterschiedliches Retry-Verhalten für 4xx vs. 5xx** — Claude's Discretion (D-12), nicht blockierend fürs MVP.
- **Periodische Sync-Timer (setInterval 60s)** — nicht nötig, Reconnect + Foreground + nach Write reichen (D-16).
- **Rate-Limiting für Outbox-Push** — 2-User-MVP-Volumen unkritisch; Supabase-Default-Rate-Limits greifen.

</deferred>

---

*Phase: 03-offline-sync-2-user-shared-state*
*Context gathered: 2026-04-24*
