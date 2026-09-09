# Phase 3: Offline & Sync (2-User Shared State) — Research

**Researched:** 2026-04-24
**Domain:** Offline-first Sync (custom Outbox + LWW-Trigger + Pull-Loop + Foto-Queue) auf Expo SDK 53 / RN 0.76 / Supabase
**Confidence:** HIGH für Server-Seite (Postgres-Triggers, Storage-RLS), MEDIUM für Client-Adapter-Schicht (expo-sqlite Web Alpha), MEDIUM für Foto-EXIF-Handling (Library-Patchwork)
**Supabase project-ref:** `vitrqkzxkiqvadqfzrcx` (Frankfurt)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-28 aus 03-CONTEXT.md)

**Lokaler Store:**
- **D-01:** StorageAdapter wird von KV-Blob auf **Row-Tables pro Entity** erweitert (SQLite native / IndexedDB web).
- **D-02:** Entity-Scope = nur bestehende Supabase-Tabellen: `gardens`, `garden_members`, `profiles`, `vereinsregeln`, `ai_jobs`, `ai_results`.
- **D-03:** Schema-Sync lokal↔Supabase bleibt **manuell gepflegt** via `app/src/storage/migrations.ts`.
- **D-04:** StorageAdapter-Interface bekommt neue Row-Access-Methoden. KV-Methoden bleiben für Lokal-Modus.

**Outbox:**
- **D-05:** Separate `sync_outbox`-Tabelle mit `id, entity, row_id, op, payload_json, created_at, retry_count, last_error, last_attempted_at`.
- **D-06:** Outbox-Einheit = **Row-Snapshot** (kompletter Nach-Zustand), nicht Field-Diff.
- **D-07:** FIFO pro `(entity, row_id)`, parallel zwischen Rows.

**LWW:**
- **D-08:** Postgres-BEFORE-UPDATE-Trigger auf `garden_id`-Tabellen; `NEW.updated_at < OLD.updated_at` → RAISE mit P9xxx SQLSTATE. Läuft VOR `tg_set_updated_at`.
- **D-09:** Client sendet `updated_at` immer explizit.
- **D-10:** Bei LWW-Reject: Op verwerfen + Delta-Pull triggern.

**Retry:**
- **D-11:** Exponential Backoff, max 5 Retries (`2^n` s, gedeckelt auf ~5 min).
- **D-12 (Discretion):** 4xx vs. 5xx Differenzierung optional.

**Partner-Update-Propagation:**
- **D-13:** Pull bei App-Foreground + nach eigenem Push. KEIN Supabase-Realtime.
- **D-14:** Bulk-Initial-Pull beim ersten Start, danach Delta-Pulls per `WHERE updated_at > last_pulled_at`.
- **D-15:** Lokale `sync_state (entity TEXT PK, last_pulled_at TIMESTAMPTZ)`-Tabelle.
- **D-16:** Sync-Trigger: NetInfo offline→online, AppState active, 500 ms debounced nach Outbox-Insert. Push vor Pull.

**Foto-Queue:**
- **D-17:** `photo_queue (id, local_uri, garden_id, kind, created_at, uploaded_at, storage_path, retry_count, last_error)` + Blob-in-IDB Äquivalent auf Web.
- **D-18:** Upload via `supabase.storage.from('photos').upload(...)` mit Pfad `photos/<garden_id>/<photo_id>.<ext>`.
- **D-19:** KI-Job-Enqueue via Supabase RPC `enqueue_photo_analysis(p_garden_id, p_storage_path, p_kind)` (SECURITY DEFINER).
- **D-20:** `photo_queue` ist separate Tabelle, NICHT Teil von `sync_outbox`.

**Sync-Status-UI:**
- **D-21:** Globaler Header-Badge mit 3 Zuständen + Settings-Untersektion mit Retry/Verwerfen.
- **D-22:** Optimistisches UI. LWW-Reject via Delta-Pull auto-korrigiert.

**Delete-Sync:**
- **D-23:** Soft-Delete via `deleted_at timestamptz`-Spalte. Kein separates Tombstone-Schema.
- **D-24 (Discretion):** Cleanup-Cron nicht MVP-kritisch.

**DSGVO:**
- **D-25:** NFR-04 = Supabase-Default AES-256 + Frankfurt/EU. Kein Client-Side-E2E.
- **D-26:** NFR-05 = Client-side EXIF-Strip vor Upload + Opt-in `photo_queue.geo_lat`/`geo_lng` Spalten.

**Scope:**
- **D-27:** Phase 3 liefert Sync-Infrastruktur für bestehende Entitäten. Keine neuen Feature-Entities.
- **D-28:** Bestehende Repos (`gardenRepo`, `inviteCodeRepo`, `vereinsregelnRepo`, `profileRepo`) werden umgebaut: „immer lokal lesen/schreiben + Outbox flush".

### Claude's Discretion (Researcher beantwortet)

- Konkrete API-Shape für Row-Level-StorageAdapter → siehe §Tech-Deep-Dive 2.
- expo-sqlite-Web Alpha vs. IndexedDB-only → siehe §Tech-Deep-Dive 1.
- Cleanup-Politik für `deleted_at`/failed Outbox → siehe §Empfehlungen.
- Exact Debounce-Zahl (500 ms Default akzeptiert) → siehe §Empfehlungen.
- Batch-Größe Bulk-Initial-Pull → siehe §Empfehlungen.
- Repo-Migration-Reihenfolge (inkrementell) → siehe §Empfehlungen.
- 4xx vs. 5xx Differenzierung → siehe §Tech-Deep-Dive 4.

### Deferred Ideas (OUT OF SCOPE für Phase 3)

- Supabase-Realtime-Channels für Live-Awareness
- Rollback-Animation bei LWW-Reject
- Edge Function `bootstrap-garden` für gebundelten Initial-Pull
- Auto-Cleanup-Cron für `deleted_at`/failed Outbox
- Field-Level-Diff-Outbox / Operational-Transform
- Client-Side-E2E-Foto-Verschlüsselung
- Multi-Garten-Switching UI
- `>2 Member pro Garten`
- Separate Tombstone-Tabelle
- Periodische Sync-Timer
- Rate-Limiting für Outbox-Push

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | App startet und zeigt letzten Plan ohne Netz | §Tech-Deep-Dive 1 (Storage-Adapter) + §Tech-Deep-Dive 4 (Repo-Umbau auf „immer lokal lesen") |
| SYNC-02 | Foto-Queue offline + auto-Upload + KI-Job | §Tech-Deep-Dive 6 (Foto-Queue + Storage-Upload) + §Tech-Deep-Dive 7 (EXIF-Strip) |
| SYNC-03 | Sync-Queue verarbeitet automatisch, LWW | §Tech-Deep-Dive 3 (LWW-Trigger) + §Tech-Deep-Dive 4 (Outbox-Worker) + §Tech-Deep-Dive 5 (Delta-Pull) |
| SYNC-04 | User sieht Sync-Status (pending/failed) | §Tech-Deep-Dive 8 (Sync-Trigger + Status-UI) |
| NFR-01 | iPhone + Browser, Daten synchron | §Tech-Deep-Dive 1 (expo-sqlite Web-Alpha → IDB-only Web), §Tech-Deep-Dive 2 (Platform.select Adapter) |
| NFR-04 | Fotos at-rest verschlüsselt | D-25 LOCKED: Supabase-Default AES-256 EU/Frankfurt (Phase 1 Storage-Bucket bereits konform) |
| NFR-05 | Geo-Daten nur mit Opt-in | §Tech-Deep-Dive 7 (EXIF-Strip + opt-in GPS-Extraktion) |

</phase_requirements>

## Zusammenfassung

- **Größtes Risiko: expo-sqlite Web Alpha.** Expo selbst dokumentiert Web-Support als „alpha, may be unstable" [CITED: docs.expo.dev/versions/latest/sdk/sqlite]. GitHub #38481 zeigt aktive `SharedArrayBuffer is not defined`-Fehler auf SDK 53, GitHub #39903 zeigt `sqlite3_open_v2`-Fehler, und der COOP/COEP-Header-Zwang bricht sub-path-Hosting-Setups. **Empfehlung für MVP: Web-Pfad nutzt `IndexedDbAdapter` mit neuen Row-Tables (ObjectStore pro Entity). Kein expo-sqlite-Web.** Die bereits existierende Platform.select-Struktur in `storage/index.ts` erlaubt die saubere Trennung ohne Code-Bruch.

- **supabase-js 2.49.5 läuft stabil, aber 2.104.1 ist Latest.** Der Metro-ESM-ws-Import-Fehler (Issues #1400/#1403/#1434) ist seit 2.49.5 gefixt [VERIFIED: npm registry — latest=2.104.1, 2026-04-23]. **Empfehlung: Phase 3 bleibt auf 2.49.5 gepinnt** (verifiziert funktioniert, Upgrade-Spike verschieben bis SDK 55). v3.0.0-next.x existiert bereits, ist aber pre-release.

- **LWW-Trigger-Reihenfolge ist durch **alphabetische Namensgebung** gesteuert** [CITED: postgresql.org/docs/current/trigger-definition.html]: Postgres führt BEFORE-UPDATE-Trigger strikt alphabetisch aus. Der neue LWW-Guard muss alphabetisch VOR `tg_set_updated_at` landen. Standardkonvention: `a_lww_guard` oder explizit `01_lww_guard` — die App-Migrations verwenden keine Zahlenpräfixe; ein String `lww_guard_<tabelle>` reicht NICHT (alphabetisch > `<tabelle>_updated_at`). **Empfehlung: Triggernamen-Pattern `aa_lww_guard_<tabelle>` + `zz_set_updated_at_<tabelle>`** (explizite alphabetische Dominanz). Bestehender `tg_set_updated_at` muss via DROP/CREATE umbenannt werden.

- **Foto-Upload: ArrayBuffer-Pattern ist der verified Standard.** `supabase.storage.from(...).upload()` nimmt keinen React-Native-Blob direkt; iOS liefert 0-Byte-Files. Offizielles Pattern [CITED: supabase.com/blog/react-native-storage]: `const arraybuffer = await fetch(uri).then(r => r.arrayBuffer())`. Keine Notwendigkeit für `FileSystem.uploadAsync`.

- **EXIF-Strip: keine One-Library-Lösung.** `expo-image-manipulator` strippt EXIF als Seiteneffekt beim Re-Encode (GitHub #28913 bestätigt), ist aber nicht als Contract dokumentiert — riskant für NFR-05-Compliance. **Empfehlung: Zwei-Stufen-Pipeline** — (1) piexifjs-Read vor dem Re-Encode extrahiert GPS-Felder falls Opt-in; (2) `expo-image-manipulator` mit Qualität ≤ 0.85 erzwingt Re-Encode → EXIF garantiert weg. Web-Pfad: piexifjs direkt (`piexif.remove()`). Gemeinsamer Code-Pfad möglich mit Uint8Array/ArrayBuffer als Zwischenformat.

**Primary recommendation:** Phase 3 in 4 Waves strukturieren — (W1) Storage-Row-Tables + Migrations + sync_outbox + sync_state + photo_queue + deleted_at-DB-Migrations + LWW-Trigger-Template; (W2) Outbox-Worker + Sync-Trigger (NetInfo/AppState/Debounce) + Delta-Pull; (W3) Photo-Queue + EXIF-Strip + `enqueue_photo_analysis`-RPC; (W4) Sync-Status-UI + Repo-Refactor (incremental).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Row-Level-Lesepfade (Render, Queries) | Client-Lokal (SQLite/IDB) | — | D-22 optimistisches UI; Lesen darf NIE auf Netz blockieren. |
| Row-Writes (Upsert/Delete) | Client-Lokal (SQLite/IDB) + sync_outbox | API (Server-Push aus Outbox-Worker) | Write → lokal commiten + Outbox-Row schreiben in derselben Transaktion → flush asynchron. |
| Konfliktauflösung LWW | API / DB (BEFORE UPDATE Trigger) | — | Server ist single source of truth für Timestamps; Client-Clock darf nicht vertraut werden. |
| Delta-Pull / Partner-Change-Propagation | API (SELECT WHERE updated_at > checkpoint) | Client-Worker (on foreground / after push) | Pull-not-realtime (D-13). |
| Foto-Binary-Storage | Storage-Bucket (`photos`) | RPC `enqueue_photo_analysis` (Metadata + Queue-Trigger) | Binary getrennt von Metadaten; RPC entkoppelt Upload-Timing von KI-Job-Start. |
| EXIF-Strip | Client (vor Upload) | — | D-26 + NFR-05: Server sieht nur bereits gestrippte Bytes. |
| Sync-Status-UI | Client (Zustand-Store + Header-Badge) | — | Keine Server-Komponente. |
| Soft-Delete-Propagation | API / DB (`deleted_at` Spalte + normales UPDATE) | Client (filtert `WHERE deleted_at IS NULL` in ALLEN Reads) | Delete = Update = LWW = Outbox — kein Sonderpfad. |

## Tech-Deep-Dives

### 1. expo-sqlite Web-Alpha — pragmatische Entscheidung: IDB-only auf Web

**Verifizierter Status (HIGH Confidence):**
- Expo-Dokumentation sagt explizit: „Web support is in alpha and may be unstable. Create an issue on GitHub if you encounter any issues." [CITED: docs.expo.dev/versions/latest/sdk/sqlite]
- Voraussetzung: `SharedArrayBuffer` + COOP/COEP-Header auf dem Host — `Cross-Origin-Embedder-Policy: credentialless` + `Cross-Origin-Opener-Policy: same-origin`.
- Metro-Bundler muss zusätzlich wasm-Support via `npx expo customize metro.config.js` aktivieren.
- Aktive GitHub-Bugs auf SDK 53: [#38481 SharedArrayBuffer is not defined](https://github.com/expo/expo/issues/38481), [#39903 sqlite3_open_v2 error cannot create file](https://github.com/expo/expo/issues/39903), [#36392 Sync operation timeout](https://github.com/expo/expo/issues/36392), [#37169 production suspense+navigation bugs](https://github.com/expo/expo/issues/37169).

**Hosting-Implikation:** COOP/COEP bricht jedes 3rd-Party-iframe, jedes Google-Fonts-Stylesheet ohne `crossorigin`, Sentry-Replay CDN-Loads. EAS Hosting unterstützt Header nativ via `expo-router`-Plugin [CITED: docs.expo.dev/guides/publishing-websites]. Vercel/Netlify/Cloudflare erfordern manuelle Config. Kleingarten-App läuft aktuell in CI als Web-Export via EAS — Header-Config wäre machbar, aber jeder Feature-Crash im Web zieht 10× so viele Support-Tickets wie auf Mobile (Dirk + Frau).

**Empfehlung (LOCKED this research):**
- **`IndexedDbAdapter`** kriegt in Phase 3 die Row-Table-Implementierung (ein ObjectStore pro Entity + `garden_id`-Index). Lokal-Modus-KV-Pfad bleibt unverändert.
- **`SqliteAdapter`** kriegt die Row-Table-Implementierung nur native — keine Web-Binding.
- `storage/index.ts` Platform.select bleibt unverändert. Kein Bruch für Callers.
- Wenn Phase 5 (Plan-Editor) eine performante Web-SQL-Engine braucht: dann expo-sqlite-Web oder absurd-sql reaktivieren — nicht jetzt.

### 2. StorageAdapter Row-Level API-Shape

**Interface-Shape (empfohlen):**

```typescript
// packages/shared/src/types/storage.ts

export type EntityName =
  | 'gardens'
  | 'garden_members'
  | 'profiles'
  | 'vereinsregeln'
  | 'ai_jobs'
  | 'ai_results';

export interface RowBase {
  id: string;                 // UUID oder deterministisch (bk-<uid>-<i>)
  garden_id?: string | null;  // null für profiles (account-scoped)
  updated_at: string;         // ISO-8601 timestamptz (client-set)
  updated_by_user_id?: string | null;
  deleted_at?: string | null; // soft-delete (D-23)
  [key: string]: unknown;     // entity-spezifische Spalten
}

export interface QueryOptions {
  where?: Partial<Pick<RowBase, 'garden_id' | 'id'>>;
  updatedAfter?: string;       // ISO-8601 für Delta-Reads
  includeDeleted?: boolean;    // default false
}

export interface StorageAdapter {
  // ── KV (bleibt unverändert) ─────────────────
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;

  // ── Row-Tables (NEU — Phase 3) ──────────────
  queryRows<T extends RowBase>(entity: EntityName, opts?: QueryOptions): Promise<T[]>;
  getRow<T extends RowBase>(entity: EntityName, id: string): Promise<T | null>;
  upsertRow<T extends RowBase>(entity: EntityName, row: T): Promise<void>;
  deleteRow(entity: EntityName, id: string, at?: string): Promise<void>;  // Soft-Delete (setzt deleted_at)

  // ── Outbox & Pull-State (NEU — Phase 3) ─────
  // Atomic write: Row + Outbox-Insert in einer Transaktion.
  writeWithOutbox<T extends RowBase>(
    entity: EntityName,
    row: T,
    op: 'upsert' | 'delete',
  ): Promise<void>;

  // Outbox-Worker-Zugriff
  pendingOutbox(limit: number): Promise<OutboxEntry[]>;      // gruppiert/sortiert (FIFO per row)
  markOutboxAttempt(id: string, error: string | null): Promise<void>;
  removeOutbox(id: string): Promise<void>;

  // Pull-Checkpoint
  getLastPulledAt(entity: EntityName): Promise<string | null>;
  setLastPulledAt(entity: EntityName, ts: string): Promise<void>;
}

export interface OutboxEntry {
  id: string;
  entity: EntityName;
  row_id: string;
  op: 'upsert' | 'delete';
  payload_json: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  last_attempted_at: string | null;
}
```

**Begründung `queryRows(entity, opts)` vs. typisierte per-Entity-Accessoren:**
- `queryRows` mit generischem `T extends RowBase` ist pragmatisch, spart Boilerplate. Repo-Layer (§4) castet zu konkretem Domain-Typ via `fromRow`.
- Alternative wäre `queryGardens()`, `queryVereinsregeln()` etc. — aber: D-02 hat nur 6 Entities, Phase 4-7 kommen weitere; explizite Methoden explodieren linear. Generischer Adapter + Repo-Typ-Layer skaliert besser.

**Transaktions-Semantik:**
- SqliteAdapter: `db.withExclusiveTransactionAsync(async (txn) => { ... })` [CITED: docs.expo.dev/versions/latest/sdk/sqlite] für atomic `writeWithOutbox`. `withTransactionAsync` ist NICHT exclusive — andere async-Queries können sich einmischen. **MUSS** `withExclusiveTransactionAsync` sein.
- IndexedDbAdapter: `db.transaction([storeName, 'sync_outbox'], 'readwrite')` multi-store-Transaction. idb-Library unterstützt das nativ.

### 3. LWW-Trigger — Template + Reihenfolge

**Kernproblem:** `tg_set_updated_at()` aus Migration 001 überschreibt `NEW.updated_at = now()` bedingungslos. Wenn das VOR dem LWW-Guard läuft, vergleicht der Guard den Server-timestamp mit sich selbst — Guard ist tot.

**Trigger-Ordering-Regel [VERIFIED: postgresql.org/docs/current/trigger-definition.html]:**
> „If more than one trigger is defined for the same event on the same relation, the triggers will be fired in alphabetical order by trigger name."

**Lösung — Triggernamen-Konvention:**

```sql
-- Migration 013 (Phase 3): LWW-Guard + umbenennen von tg_set_updated_at

-- 3a. Neuer LWW-Guard (generisch, für alle garden_id-Tabellen)
CREATE OR REPLACE FUNCTION public.tg_lww_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- NEW.updated_at muss vom Client gesetzt sein (D-09).
  IF NEW.updated_at IS NULL THEN
    RAISE EXCEPTION 'lww_guard_missing_updated_at'
      USING ERRCODE = 'P9010',
            MESSAGE = 'Client muss updated_at explizit setzen (D-09)';
  END IF;

  -- Älter als OLD → reject (D-08/D-10).
  IF NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'lww_reject_older_write'
      USING ERRCODE = 'P9011',
            MESSAGE = format('LWW-Reject: incoming=%s < existing=%s', NEW.updated_at, OLD.updated_at);
  END IF;

  RETURN NEW;
END $$;

-- 3b. Bestehende updated_at-Trigger droppen und umbenennen pro garden_id-Tabelle.
-- Neue Namenskonvention:
--   aa_lww_guard_<tabelle>   — läuft ZUERST alphabetisch
--   zz_set_updated_at_<tabelle> — läuft ZULETZT alphabetisch
--   (dazwischen könnten z.B. updated_by_user_id-Trigger liegen — mm_*)
--
-- WICHTIG: CREATE OR REPLACE FUNCTION auf tg_set_updated_at() ist unverändert;
-- nur die TRIGGER-Registrierungen müssen umbenannt werden.

DROP TRIGGER IF EXISTS vereinsregeln_updated_at ON public.vereinsregeln;
DROP TRIGGER IF EXISTS gardens_updated_at ON public.gardens;
DROP TRIGGER IF EXISTS ai_jobs_updated_at ON public.ai_jobs;
DROP TRIGGER IF EXISTS ai_results_updated_at ON public.ai_results;
-- profiles — hat keine updated_at aktuell; Migration 013 muss sie hinzufügen falls D-02 profiles einschließt
-- garden_members — hat updated_at nicht; Design-Entscheidung: garden_members wird via owner-RPCs mutiert, nicht via Outbox

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['gardens', 'vereinsregeln', 'ai_jobs', 'ai_results']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER aa_lww_guard_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_lww_guard()',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER zz_set_updated_at_%I BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 3c. Zusätzlich: updated_by_user_id-Trigger (falls nicht schon mm_*)
-- Bestehender tg_set_updated_by_user_id (aus Migration 003) muss auch umbenannt werden:
DROP TRIGGER IF EXISTS vereinsregeln_updated_by_user_id ON public.vereinsregeln;
-- ... etc.
CREATE TRIGGER mm_set_updated_by_user_id_vereinsregeln BEFORE UPDATE ON public.vereinsregeln
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_by_user_id();
-- ... für alle garden_id-Tabellen wiederholen
```

**SQLSTATE-Wahl:** P9010 (missing timestamp) + P9011 (LWW reject) passen konsistent zum bestehenden P9xxx-Schema aus Migration 010 (P9001..P9006 belegt; P9010/P9011 frei).

**Client-Mapping (Outbox-Worker):**

```typescript
// app/src/lib/sync/outboxWorker.ts
if (error.code === 'P9011') {
  // LWW-Reject (D-10): Op verwerfen + Delta-Pull
  await storage.removeOutbox(entry.id);
  syncTriggerStore.getState().triggerPull(entry.entity);
  Sentry.addBreadcrumb({ category: 'sync', message: 'lww_reject', data: { entity: entry.entity, row_id: entry.row_id } });
  return;
}
if (error.code === 'P9010') {
  // Programming bug — Outbox-Worker hat updated_at nicht mitgeschickt.
  // Diese Op bleibt permanent in Outbox + loggt als schwerer Fehler.
  await storage.markOutboxAttempt(entry.id, 'missing_updated_at');
  Sentry.captureMessage('lww_guard_missing_updated_at', { extra: entry });
  return;
}
```

**Vermeidbare Falle:** Wenn ein zweiter Trigger vor `zz_set_updated_at_*` läuft und `NEW.updated_at` verändert, muss er zuerst einen Copy machen. Aktuell kein solcher Trigger existent.

### 4. Outbox-Worker-Architektur

**Kernentscheidung: klassische Worker-Klasse mit Zustand-Store als Input-Kanal, kein setInterval.**

```typescript
// app/src/lib/sync/SyncWorker.ts — Skizze

import { useSyncStore } from '../../stores/syncStore';
import { storage } from '../../storage';
import { supabase } from '../supabase';

export class SyncWorker {
  private running = false;
  private queued = false;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Triggers: NetInfo + AppState + Outbox-Insert (via syncStore)
    useSyncStore.subscribe((s) => s.pendingTriggers, () => {
      this.schedule();
    });
  }

  /** Debounced scheduler (D-16, 500 ms) */
  schedule() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.run(), 500);
  }

  async run() {
    if (this.running) { this.queued = true; return; }
    this.running = true;
    try {
      await this.pushCycle();   // D-16: Push BEFORE Pull
      await this.pullCycle();
    } finally {
      this.running = false;
      if (this.queued) { this.queued = false; this.schedule(); }
    }
  }

  /** FIFO per (entity, row_id), parallel across rows (D-07) */
  private async pushCycle() {
    const all = await storage.pendingOutbox(100);
    // Group by (entity, row_id)
    const groups = new Map<string, OutboxEntry[]>();
    for (const e of all) {
      const key = `${e.entity}:${e.row_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    // Each group is a serial chain; chains run in parallel.
    await Promise.all(
      [...groups.values()].map((chain) => this.flushChain(chain.sort((a, b) => a.created_at.localeCompare(b.created_at)))),
    );
  }

  private async flushChain(chain: OutboxEntry[]) {
    for (const entry of chain) {
      // Backoff-Check
      if (entry.retry_count >= 5) continue;         // D-11 max
      if (shouldBackoff(entry)) continue;           // exponential 2^n s

      try {
        if (entry.op === 'upsert') {
          const payload = JSON.parse(entry.payload_json);
          const { error } = await supabase.from(entry.entity).upsert(payload, { onConflict: 'id' });
          if (error) throw error;
        } else {
          // Soft-Delete wird als Upsert mit deleted_at gepusht (D-23) — der `op = 'delete'`-Pfad
          // ist reserviert für echte DELETEs (z.B. hard-delete-RPCs); im MVP-Pfad kommen wir hier nicht hin.
          const { error } = await supabase.from(entry.entity).delete().eq('id', entry.row_id);
          if (error) throw error;
        }
        await storage.removeOutbox(entry.id);
      } catch (err) {
        await this.handleError(entry, err);
        return;   // Chain stoppt bei Fehler — FIFO-Invariant
      }
    }
  }

  private async handleError(entry: OutboxEntry, err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P9011') {
      // LWW-Reject — Op verwerfen + Pull triggern (D-10)
      await storage.removeOutbox(entry.id);
      useSyncStore.getState().triggerPull(entry.entity);
      return;
    }
    // D-12 (Claude's Discretion): 4xx permanent-fail, 5xx retry
    const msg = err instanceof Error ? err.message : String(err);
    const isClientError = code && /^(22|23|42)/.test(code);  // constraint/syntax/permission → permanent
    if (isClientError) {
      await storage.markOutboxAttempt(entry.id, `permanent: ${msg}`);
      // retry_count wird auf 5 gesetzt → Op bleibt sichtbar im UI als "failed"
      return;
    }
    await storage.markOutboxAttempt(entry.id, msg);  // retry_count++
  }

  private async pullCycle() { /* §5 */ }
}

function shouldBackoff(e: OutboxEntry): boolean {
  if (!e.last_attempted_at || e.retry_count === 0) return false;
  const waitMs = Math.min(300_000, Math.pow(2, e.retry_count) * 1000);   // 2^n s, cap 5 min
  return Date.now() - new Date(e.last_attempted_at).getTime() < waitMs;
}
```

**Zustand-syncStore-Shape:**

```typescript
// app/src/stores/syncStore.ts
interface SyncState {
  pendingCount: number;         // derived from outbox length
  failedCount: number;          // retry_count >= 5
  status: 'synced' | 'syncing' | 'error';
  pendingTriggers: number;      // monotonic counter → SyncWorker.subscribe fires on increment
  triggerPush: () => void;
  triggerPull: (entity?: EntityName) => void;
}
```

**Vorteile dieser Architektur:**
- Keine periodischen Timer, keine leaky Subscriptions auf Hot-Reload.
- Debounce coalesct mehrere Writes zu einem Push-Cycle → 500 ms Fenster ist das Optimum [CITED: dev.to/sathish_daggula React Native offline-first SQLite sync, Feb 2026].
- `running`/`queued`-Flag-Pattern ist branchenüblich für „coalesce concurrent syncs" [CITED: blog.logrocket.com/drizzle-react-native-expo-sqlite].

### 5. Delta-Pull-Idiom

**Kern-Pattern pro Entity:**

```typescript
async pullEntity(entity: EntityName) {
  const since = await storage.getLastPulledAt(entity);
  const activeGardenId = useAuthStore.getState().activeGardenId;
  if (!activeGardenId && entity !== 'profiles') return;  // profiles ist account-scoped

  const query = supabase.from(entity).select('*');
  if (activeGardenId && entity !== 'profiles') {
    query.eq('garden_id', activeGardenId);
  }
  if (since) {
    query.gt('updated_at', since);
  }
  // KEIN .is('deleted_at', null) — wir ziehen auch deleted-Rows, damit Client das lokal reflektiert.

  const { data, error } = await query;
  if (error) throw error;

  // Server-time aus dem ersten Row (oder now() aus Postgres via RPC)
  // WICHTIG: Client-Clock ist NICHT sicher. Alternative: RPC pull_checkpoint() returns (rows, server_now).
  const serverNow = await fetchServerNow();

  for (const row of data ?? []) {
    if (row.deleted_at) {
      // Lokal hard-deleten ODER auch nur updated_at/deleted_at fortschreiben.
      // Empfehlung: updated_at fortschreiben, deleted_at setzen → Reads filtern WHERE deleted_at IS NULL.
      await storage.upsertRow(entity, row);
    } else {
      await storage.upsertRow(entity, row);
    }
  }

  await storage.setLastPulledAt(entity, serverNow);
}

async function fetchServerNow(): Promise<string> {
  // Simpelste Variante: Supabase-RPC `public.server_now()` anlegen:
  //   CREATE FUNCTION public.server_now() RETURNS timestamptz
  //     LANGUAGE sql STABLE AS $$ SELECT now(); $$;
  //   GRANT EXECUTE ON FUNCTION public.server_now() TO authenticated;
  const { data, error } = await supabase.rpc('server_now');
  if (error) throw error;
  return data as string;
}
```

**Clock-Skew-Vermeidung:** Der Pull-Checkpoint wird NICHT aus `max(updated_at)` der Rows abgeleitet — sondern aus `server_now()`-RPC. Grund: wenn zwischen SELECT und UPDATE einer Row durch einen Partner genau 1 ms vergeht, kann der Pull die Row verpassen, wenn der lokale Checkpoint > neuer Server-updated_at wäre. `server_now()` VOR dem SELECT zu lesen und DANACH zu speichern wäre noch sicherer — aber führt zu Doppel-Pulls. Kompromiss: `server_now()` NACH dem SELECT, akzeptiert seltene Doppel-Upserts (idempotent).

**Bulk-Initial-Pull (D-14):**
- `since === null` → kein `.gt('updated_at', since)`-Filter → alle Rows für die aktiven `garden_id`.
- MVP-Datenmengen: 1 Garten × ~6 Entities × je 10–50 Rows = ~300 Rows. Einzelquery reicht.
- Batch-Pagination nicht nötig für Phase 3. Wenn Phase 5 (Plan-Editor) mit 200 Plan-Elementen + 50 Inventar-Rows + 365 Kalender-Tasks kommt, könnte's eng werden — dann paginieren per `range(0,500)`.

### 6. Foto-Queue + Storage-Upload-Pattern

**Upload-Pattern (verified):**

```typescript
// app/src/lib/sync/photoUploader.ts

async function uploadPhoto(entry: PhotoQueueRow): Promise<void> {
  // 1. Lokale Datei → ArrayBuffer (verified pattern aus supabase.com/blog/react-native-storage)
  //    On iOS: react-native-blob → Supabase upload gibt 0 Bytes (GitHub Discussion #2336).
  //    Korrekt: fetch(uri).then(r => r.arrayBuffer())
  const arrayBuffer = await fetch(entry.local_uri).then((r) => r.arrayBuffer());

  // 2. Pfad nach Convention (D-18)
  const ext = entry.local_uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storagePath = `${entry.garden_id}/${entry.id}.${ext}`;

  // 3. Upload
  const { error } = await supabase.storage
    .from('photos')
    .upload(storagePath, arrayBuffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });
  if (error) throw error;

  // 4. Manifest-Row updaten
  await storage.upsertRow('photo_queue', {
    ...entry,
    uploaded_at: new Date().toISOString(),
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  });

  // 5. KI-Job via RPC (D-19)
  const { error: rpcErr } = await supabase.rpc('enqueue_photo_analysis', {
    p_garden_id: entry.garden_id,
    p_storage_path: storagePath,
    p_kind: entry.kind,
  });
  if (rpcErr) {
    // Upload ist schon durch — wir haben jetzt eine Waise.
    // Empfehlung: markOutbox für diesen photo_queue-Row mit special op='enqueue_only'
    // → nächster Versuch triggert nur RPC, nicht Re-Upload.
    // Alternativ im MVP: Sentry-Log + manueller User-Retry via Settings.
    throw rpcErr;
  }
}
```

**Web-Pfad:** Blob in IDB-ObjectStore gespeichert (siehe D-17). `photo_queue.local_uri` wird zu einer `object-store:<id>`-URI-Konvention. Der Uploader liest den Blob aus dem ObjectStore:

```typescript
// Web-Pfad
const blob = await db.get('photo_blobs', entry.id);
const arrayBuffer = await blob.arrayBuffer();
// rest identical
```

**Storage-Bucket-RLS (Supabase Migration 014):**

```sql
-- Supabase Storage Bucket `photos` muss bereits existieren (Phase 1 D-01 listed storage.photos)
-- RLS-Policy via storage.foldername() [CITED: supabase.com/docs/guides/storage/schema/helper-functions]

CREATE POLICY "photos_garden_member_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "photos_garden_member_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_garden_member(((storage.foldername(name))[1])::uuid)
  );
```

**RPC `enqueue_photo_analysis`:**

```sql
CREATE OR REPLACE FUNCTION public.enqueue_photo_analysis(
  p_garden_id   uuid,
  p_storage_path text,
  p_kind        text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_job_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_garden_member(p_garden_id) THEN
    RAISE EXCEPTION 'not_garden_member' USING ERRCODE = '42501';
  END IF;

  -- Audit-Row in ai_jobs
  INSERT INTO public.ai_jobs (created_by_user_id, garden_id, job_type, payload)
  VALUES (
    v_user, p_garden_id, 'photo_analysis',
    jsonb_build_object('storage_path', p_storage_path, 'kind', p_kind)
  )
  RETURNING id INTO v_job_id;

  -- pgmq-Queue (aus Phase 1 ai_jobs-Queue)
  PERFORM pgmq.send(
    'ai_jobs',
    jsonb_build_object('job_id', v_job_id, 'storage_path', p_storage_path, 'kind', p_kind)
  );

  RETURN v_job_id;
END $$;

GRANT EXECUTE ON FUNCTION public.enqueue_photo_analysis(uuid, text, text) TO authenticated;
```

### 7. EXIF-Stripping — zweistufige Pipeline

**Problem:** Keine einzelne Library stripped sauber auf beiden Plattformen UND liest GPS ab.

**Verified Library-Status:**

| Library | Platform | Read GPS? | Remove GPS/EXIF? | Quelle |
|---------|----------|-----------|------------------|--------|
| `expo-image-manipulator` 13.x | iOS/Android/Web | No | Implizit via Re-Encode (GitHub #28913) — aber NICHT dokumentierter Contract | [CITED: docs.expo.dev/versions/latest/sdk/imagemanipulator] |
| `piexifjs` 1.0.6 | Web + Node | Yes | Yes (`piexif.remove(jpegData)`) | [CITED: github.com/hMatoba/piexifjs] |
| `@lodev09/react-native-exify` 1.0.3 | iOS/Android (Expo-compat) | Yes (readAsync) | Yes (writeAsync mit {} leert EXIF) | [CITED: github.com/lodev09/react-native-exify] |
| `react-native-exif` | iOS/Android | Yes | Kein explizites remove | [CITED: npm] |

**Empfohlene Pipeline:**

```typescript
// app/src/lib/photo/exifStrip.ts

import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface GpsCoords { lat: number; lng: number }

export async function stripExif(
  uri: string,
  options: { readGps: boolean },
): Promise<{ strippedUri: string; gps: GpsCoords | null }> {
  let gps: GpsCoords | null = null;

  if (options.readGps) {
    gps = await readGpsFromExif(uri);
  }

  // Re-Encode mit Qualität 0.85 → EXIF (inkl. GPS) garantiert weg
  // expo-image-manipulator strippt EXIF beim Re-Encode (GitHub #28913) — wir nutzen das als Contract.
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],   // max 1.15 MP (Phase-4-NFR-PHOTO-03 vorweggenommen)
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  return { strippedUri: result.uri, gps };
}

async function readGpsFromExif(uri: string): Promise<GpsCoords | null> {
  if (Platform.OS === 'web') {
    // piexifjs-Pfad
    const piexif = await import('piexifjs');
    const response = await fetch(uri);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    const exif = piexif.load(dataUrl);
    const gpsTag = exif['GPS'];
    if (!gpsTag || !gpsTag[piexif.GPSIFD.GPSLatitude]) return null;
    return {
      lat: gpsCoordToDecimal(gpsTag[piexif.GPSIFD.GPSLatitude], gpsTag[piexif.GPSIFD.GPSLatitudeRef]),
      lng: gpsCoordToDecimal(gpsTag[piexif.GPSIFD.GPSLongitude], gpsTag[piexif.GPSIFD.GPSLongitudeRef]),
    };
  }
  // Native-Pfad: @lodev09/react-native-exify
  const { readAsync } = await import('@lodev09/react-native-exify');
  const exif = await readAsync(uri);
  if (!exif?.GPSLatitude || !exif?.GPSLongitude) return null;
  return { lat: exif.GPSLatitude, lng: exif.GPSLongitude };
}
```

**Warum Re-Encode statt `piexif.remove()` auf allen Plattformen?**
- piexifjs nimmt JPEG-Binary-String/DataURL. React Native bekommt File-URIs — Konvertierung ist teurer als Re-Encode.
- Re-Encode mit compress=0.85 hat Nebennutzen: Bild wird kleiner (Phase 4 will 1.15 MP — Phase-3-Strip kann schon mal auf sinnvolle Größe runter).
- Defense-in-depth: auch wenn eine zukünftige expo-image-manipulator-Version EXIF behalten würde, wäre piexifjs/exify auf Web+Native bereits aktiv gelaufen für GPS-Extraktion.

**Risiko:** `expo-image-manipulator` garantiert in der Doku NICHT das Stripping. Wenn v14 es reparieren würde (GitHub #28913: „invalid issue: feature request" — maintainer-Perspektive ist unklar), würde GPS in Fotos bleiben. **Mitigation:** Settings-Test „Foto hochladen + aus Supabase re-downloaden + piexifjs.load() → assertThrows('no exif')" muss in Phase 3 Test-Suite sein (siehe §Validation).

### 8. Sync-Trigger-Debouncing + Subscription-Hygiene

**Single-Subscribe-Pattern:**

```typescript
// app/src/lib/sync/SyncTriggers.ts — einmal in _layout.tsx root useEffect mounten

import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncStore } from '../../stores/syncStore';

let initialized = false;

export function initSyncTriggers() {
  if (initialized) return;   // Hot-Reload-Guard
  initialized = true;

  // NetInfo — unsubscribe wird nie gecallt in Prod (App-Lifetime); in Dev reset bei Hot-Reload via "initialized" flag.
  const unsubNet = NetInfo.addEventListener((state) => {
    const isOnline = !!state.isConnected && state.isInternetReachable !== false;
    if (isOnline) {
      useSyncStore.getState().triggerPush();
    }
  });

  // AppState
  const subAppState = AppState.addEventListener('change', (s: AppStateStatus) => {
    if (s === 'active') {
      useSyncStore.getState().triggerPush();
      useSyncStore.getState().triggerPull();
    }
  });

  // Bei teardown (nur Dev) cleanup
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (typeof module !== 'undefined' && (module as any).hot) {
      (module as any).hot.dispose(() => {
        unsubNet();
        subAppState.remove();
        initialized = false;
      });
    }
  }
}
```

**API-Verifikationen [CITED: docs.expo.dev/versions/latest/sdk/netinfo]:**
- `NetInfo.addEventListener(cb)` returns `unsubscribe` function.
- `AppState.addEventListener('change', cb)` returns subscription object with `.remove()` method (RN 0.65+).
- NetInfo hat Web-Support via Network Information API; fällt auf `navigator.onLine` zurück wenn nicht verfügbar.

**500-ms-Debounce-Implementierung:** innerhalb SyncWorker (§4). Kein separater Debouncer nötig.

**Badge-Zustand (syncStore):**

```typescript
// useSyncStore
export const useSyncStore = create<SyncState>((set, get) => ({
  pendingCount: 0,
  failedCount: 0,
  status: 'synced',
  pendingTriggers: 0,
  triggerPush: () => set((s) => ({ pendingTriggers: s.pendingTriggers + 1 })),
  triggerPull: (entity) => set((s) => ({ pendingTriggers: s.pendingTriggers + 1 })),
  setCounters: (pending, failed) => set({
    pendingCount: pending,
    failedCount: failed,
    status: failed > 0 ? 'error' : pending > 0 ? 'syncing' : 'synced',
  }),
}));
```

`setCounters` wird vom SyncWorker nach jedem Push/Pull-Cycle aufgerufen. UI re-rendert Badge automatisch.

## Validation Architecture

Phase 3 ist Infrastructure-heavy und kontinuierliche State-Synchronisation ist schwer zu manuell-testen. Die folgenden 6 Invarianten sind die minimal-notwendige Abdeckung (Nyquist-adäquat für SC-1 bis SC-5 aus ROADMAP).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.1.2 (existing `app/jest.config.ts` mit 3-projects: node/hooks/stores) |
| SQL-Test-Framework | Supabase CLI `supabase db query` gegen `--linked` Frankfurt-Projekt |
| Config file | `app/jest.config.ts`, `supabase/tests/*.sql` |
| Quick run command | `pnpm --filter app test -- --selectProjects node hooks stores` |
| Full suite command | `pnpm --filter app test && supabase db query --linked -f supabase/tests/lww_guard.sql` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | App startet offline, zeigt letzten Plan | unit | `pnpm --filter app test -- src/storage/__tests__/RowTables.test.ts` | ❌ Wave 0 |
| SYNC-01 | Read-Pfad lebt aus Row-Tables (kein Supabase-Call) | unit | `pnpm --filter app test -- src/lib/__tests__/gardenRepo.local-read.test.ts` | ❌ Wave 0 |
| SYNC-02 | Photo offline → Queue + EXIF-Strip + Upload bei Reconnect | unit | `pnpm --filter app test -- src/lib/__tests__/photoUploader.test.ts` | ❌ Wave 0 |
| SYNC-02 | RPC `enqueue_photo_analysis` member-check | sql | `supabase db query --linked -f supabase/tests/enqueue_photo_analysis.sql` | ❌ Wave 0 |
| SYNC-03 | LWW-Trigger rejected älteren Write mit P9011 | sql | `supabase db query --linked -f supabase/tests/lww_guard.sql` | ❌ Wave 0 |
| SYNC-03 | Trigger-Reihenfolge: aa_lww_guard VOR zz_set_updated_at | sql | `supabase db query --linked -f supabase/tests/trigger_ordering.sql` | ❌ Wave 0 |
| SYNC-03 | Outbox FIFO per (entity, row_id), parallel across rows | unit | `pnpm --filter app test -- src/lib/__tests__/SyncWorker.test.ts` | ❌ Wave 0 |
| SYNC-03 | Exponential Backoff 2^n bis 5 Retries | unit | `pnpm --filter app test -- src/lib/__tests__/SyncWorker.backoff.test.ts` | ❌ Wave 0 |
| SYNC-04 | Badge-Status-Transitions (synced → syncing → error) | unit | `pnpm --filter app test -- src/stores/__tests__/syncStore.test.ts` | ❌ Wave 0 |
| NFR-01 | IndexedDbAdapter Row-Table Roundtrip (fake-indexeddb) | unit | `pnpm --filter app test -- src/storage/__tests__/IndexedDbAdapter.rows.test.ts` | ❌ Wave 0 |
| NFR-04 | Supabase-Bucket `photos` member-RLS (read+insert) | sql | `supabase db query --linked -f supabase/tests/storage_photos_rls.sql` | ❌ Wave 0 |
| NFR-05 | EXIF wird gestrippt (Roundtrip: upload+download+piexifjs.load → no GPS) | integration | manuell dokumentiert in 03-VALIDATION.md Sektion „Foto-EXIF-Roundtrip" | ❌ Wave 0 (manuell) |
| NFR-05 | GPS-Read aus EXIF + Opt-in-Store in photo_queue.geo_* | unit | `pnpm --filter app test -- src/lib/__tests__/exifStrip.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter app test -- --selectProjects node hooks stores` (unit-only, ~20 s)
- **Per wave merge:** `pnpm --filter app test && supabase db query --linked -f supabase/tests/lww_guard.sql` (Jest + SQL-Subset)
- **Phase gate:** Full suite green + manueller 2-Geräte-LWW-Roundtrip (iPhone + Chrome-Desktop mit 2 Accounts) vor `/gsd-verify-work`

### Wave 0 Gaps

Alle Test-Files aus der Map sind neu zu erstellen:

- [ ] `app/src/storage/__tests__/RowTables.test.ts` — IndexedDbAdapter + SqliteAdapter queryRows/upsertRow/deleteRow Contract-Tests (SYNC-01, NFR-01)
- [ ] `app/src/storage/__tests__/IndexedDbAdapter.rows.test.ts` — fake-indexeddb + garden_id-Index range queries (NFR-01)
- [ ] `app/src/lib/__tests__/gardenRepo.local-read.test.ts` — Repo liest aus StorageAdapter auch bei offline-Supabase-Client
- [ ] `app/src/lib/__tests__/SyncWorker.test.ts` — FIFO-Chain-Gruppierung, parallele Chains, P9011-LWW-Reject-Pfad
- [ ] `app/src/lib/__tests__/SyncWorker.backoff.test.ts` — 2^n s Backoff, cap 5 min, 5 retries max
- [ ] `app/src/lib/__tests__/photoUploader.test.ts` — ArrayBuffer-Pattern, enqueue_photo_analysis-Call nach Upload
- [ ] `app/src/lib/__tests__/exifStrip.test.ts` — Web-Path (piexifjs) + Native-Path (exify) mit Opt-in/Opt-out
- [ ] `app/src/stores/__tests__/syncStore.test.ts` — pendingCount/failedCount/status-Reducer
- [ ] `supabase/tests/lww_guard.sql` — P9010 (missing updated_at) + P9011 (older write reject) + happy path
- [ ] `supabase/tests/trigger_ordering.sql` — SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.vereinsregeln'::regclass ORDER BY tgname → aa_lww_guard_* kommt VOR zz_set_updated_at_*
- [ ] `supabase/tests/enqueue_photo_analysis.sql` — Non-member 42501, member → job_id returned, ai_jobs audit-row geschrieben
- [ ] `supabase/tests/storage_photos_rls.sql` — storage.foldername()[1]::uuid-based member-check für SELECT/INSERT/UPDATE/DELETE

### Core Invariants (Nyquist, 6 Stück)

| # | Invariant | Measurement | Failure Mode |
|---|-----------|-------------|--------------|
| I-1 | **Local read survives Supabase outage** | Jest: mock supabase → throw on every call; repo.load() returns rows from storage | Repo triggert direkt Supabase statt storage → SYNC-01 broken |
| I-2 | **Write offline → reconnect → row in Supabase within 30 s** | E2E manuell: Airplane-Mode write, disable airplane, timer; assert SELECT * FROM vereinsregeln zeigt row | Outbox-Worker feuert nicht bei NetInfo-Online-Event → SYNC-03 broken |
| I-3 | **LWW rejects older write with P9011** | SQL: UPDATE vereinsregeln SET titel='x', updated_at=<past_timestamp> WHERE id=... → assert ERRCODE = 'P9011' | Trigger-Ordering falsch (aa_lww_guard läuft nach zz_set_updated_at) → LWW defeated |
| I-4 | **Photo offline → reconnect → uploaded + ai_job enqueued** | Jest: PhotoUploader mit offline supabase-mock; reconnect-sim; assert storage.upload called + rpc('enqueue_photo_analysis') called | Upload gelingt, RPC schlägt fehl, und Code hat keinen Retry → orphan-Foto ohne KI-Job |
| I-5 | **EXIF + GPS wird vor Upload entfernt** | Integration: read-back-from-Supabase Test-Foto → piexif.load() → assertThrows 'No Exif data' | expo-image-manipulator-v14 würde EXIF behalten → NFR-05 silent-broken |
| I-6 | **Soft-Delete propagiert über Delta-Pull auf Partner** | 2-Account-E2E: A löscht row → A push → B pull → B's storage hat row mit deleted_at!=null → B's UI filtert sie | Pull-Query filtert `.is('deleted_at', null)` → B sieht die Row nie gelöscht |

## Landmines & Known Issues

### L-1: expo-sqlite Web kaputt auf nicht-COOP/COEP-Hosts (HIGH)
- **Was:** `SharedArrayBuffer is not defined` crash auf Vercel/Netlify ohne Header-Config.
- **Quelle:** [GitHub #38481](https://github.com/expo/expo/issues/38481), [#39903](https://github.com/expo/expo/issues/39903)
- **Mitigation:** Phase 3 nutzt IndexedDbAdapter auf Web (siehe §1). Keine expo-sqlite-Web-Dependency.

### L-2: supabase-js Metro-ESM ws/stream-Error (MITIGATED)
- **Was:** supabase-js Versionen < 2.49.5 werfen `Unable to resolve module ws/lib/stream` im Metro ESM-Mode (RN 0.79+).
- **Quelle:** [GitHub Supabase-JS #1400/#1403/#1434](https://github.com/supabase/supabase-js/issues/1400)
- **App-Status:** Aktuell 2.49.5 gepinnt [VERIFIED: app/package.json]. Latest stable ist 2.104.1 [VERIFIED: npm registry 2026-04-24]. **Empfehlung: NICHT upgraden in Phase 3** — Risikoerhöhung ohne Nutzen; Upgrade-Spike in Phase 5 planen.

### L-3: Reanimated v3 ist „no longer actively maintained" (LOW für Phase 3)
- **Was:** Reanimated v3 wird nicht mehr gepflegt; v4 kommt mit New Architecture [CITED: docs.swmansion.com/react-native-reanimated/docs/guides/compatibility].
- **App-Status:** 3.17.4 läuft mit NativeWind 4.1.23 + SDK 53 stable [VERIFIED: app/package.json].
- **Mitigation:** Phase 3 nutzt keine neuen Reanimated-Features. Upgrade-Pfad SDK 54/55 in späterer Phase.

### L-4: `expo-image-manipulator` EXIF-Strip ist Seiteneffekt, nicht Contract (MEDIUM)
- **Was:** GitHub #28913 zeigt: manipulator entfernt EXIF, aber maintainer labeln es „invalid feature request" — keine API-Garantie.
- **Mitigation:** Integration-Test I-5 (Roundtrip) muss in Phase 3 green sein. Bei Regression: auf piexifjs+Uint8Array umstellen.

### L-5: ArrayBuffer-Upload 0-Byte-Bug auf iOS (MITIGATED)
- **Was:** Passing Blob/File an `storage.upload()` liefert 0-Byte-Files auf iOS.
- **Quelle:** [GitHub supabase Discussion #2336](https://github.com/supabase/supabase/discussions/2336)
- **Mitigation:** `fetch(uri).arrayBuffer()`-Pattern nutzen (verified, §6).

### L-6: withTransactionAsync vs. withExclusiveTransactionAsync (MEDIUM)
- **Was:** `withTransactionAsync` ist NICHT exclusive — andere async DB-Calls können sich einmischen, führt zu Race-Conditions bei atomic Row+Outbox-Writes.
- **Quelle:** [GitHub #15498](https://github.com/expo/expo/issues/15498) + docs.expo.dev/versions/latest/sdk/sqlite.
- **Mitigation:** IMMER `withExclusiveTransactionAsync` verwenden in `writeWithOutbox()`.

### L-7: Postgres-Trigger-Naming regelt Reihenfolge — kein Deklarativ-Keyword (HIGH)
- **Was:** Es gibt KEIN `CREATE TRIGGER ... BEFORE OTHER` in Postgres. Nur alphabetische Reihenfolge der Namen entscheidet.
- **Quelle:** [postgresql.org/docs/current/trigger-definition.html]
- **Mitigation:** Naming-Konvention `aa_` + `mm_` + `zz_` Prefix enforced in Migration 013.

### L-8: SQLSTATE P0xxx collision mit PL/pgSQL built-ins (bereits gelöst, aber WATCH)
- **Was:** P0002/P0003/P0004/P0005 sind PL/pgSQL built-ins. Custom codes müssen in P9xxx-Range liegen.
- **App-Status:** Migration 010 hat alle existing domain-codes auf P9xxx gezogen. Phase 3 fügt P9010 + P9011 hinzu — frei laut Audit der existierenden P9001..P9006.

### L-9: Supabase `consume_invite_code` DOES row-level DML on garden_members → LWW-Trigger-Wechselwirkung (LOW)
- **Was:** RPCs, die innerhalb einer SECURITY DEFINER-Function UPDATE/INSERT auf LWW-guarded-Tabellen durchführen, müssen `NEW.updated_at` explizit setzen, sonst P9010-Reject.
- **Mitigation:** Aktuelle RPCs (delete_garden, transfer_ownership) nutzen nur DELETE/UPDATE auf `garden_members` (keine updated_at-Spalte) + ein UPDATE `public.gardens SET updated_by_user_id = ...` — letzteres braucht jetzt auch `updated_at = now()` im RPC-Body. Migration 013 muss transfer_ownership patchen.

### L-10: Edge-Case: zwei Offline-Writes dieselbe Row, gleicher Timestamp (ms-Precision) (LOW)
- **Was:** Wenn beide Geräte exakt in derselben ms schreiben, ist `NEW.updated_at < OLD.updated_at` FALSE → beide Writes werden akzeptiert, später Verarbeiteter überschreibt.
- **Mitigation:** Das IST LWW-Semantik per Design. Keine echte Race im 2-User-Szenario.

## Empfehlungen für den Planner

### Lock-in Decisions (Researcher-Position, bitte im Plan akzeptieren oder Diskussionspunkt aufmachen)

1. **Web-Storage-Pfad = IndexedDB-only mit Row-Tables im `IndexedDbAdapter`**. Kein expo-sqlite-Web in Phase 3.
2. **Supabase-JS bleibt auf 2.49.5 gepinnt.** Upgrade auf 2.104.x in separater Spike, nicht in Phase 3.
3. **Trigger-Namenskonvention:** `aa_lww_guard_<tabelle>` + `mm_set_updated_by_user_id_<tabelle>` + `zz_set_updated_at_<tabelle>`. Erfordert DROP/CREATE in Migration 013 für alle bestehenden Trigger auf garden_id-Tabellen.
4. **SQLSTATE-Allokation:** P9010 = `lww_guard_missing_updated_at`, P9011 = `lww_reject_older_write`.
5. **Transaktions-API:** `db.withExclusiveTransactionAsync(...)` ist Pflicht für Row+Outbox atomic writes auf SQLite.
6. **Upload-Pattern:** `fetch(uri).then(r => r.arrayBuffer())` für Foto-Upload — keine Blob-direkt.
7. **EXIF-Pipeline:** piexifjs (Web) + @lodev09/react-native-exify (Native) für Read; `expo-image-manipulator` für Re-Encode-Strip. Beide Platforms garantieren EXIF-weg via Re-Encode.
8. **RPC `server_now()` anlegen** für Clock-skew-frei Delta-Pull-Checkpoints.
9. **Delta-Pull enthält auch `deleted_at IS NOT NULL`-Rows** (Tombstone-Propagation). UI-Reads filtern, nicht der Pull.
10. **Repo-Refactor-Reihenfolge (D-28 incremental):** vereinsregelnRepo → gardenRepo → profileRepo → inviteCodeRepo (nach Komplexität sortiert, atomic commits pro Repo).

### Debounce / Batch / Retention Policies

- **Sync-Trigger-Debounce:** 500 ms post-write (D-16 default bestätigt).
- **Bulk-Initial-Pull-Batch:** kein Paginieren im MVP (Datenvolumen < 500 Rows total).
- **Outbox-Retention bei `retry_count >= 5`:** Row bleibt bis User manuell „verwerfen" klickt (Settings-Untersektion, D-21). Kein Auto-Purge im MVP.
- **`deleted_at`-Retention:** nicht in MVP (D-24 deferred). Zukünftiger Cleanup-Cron darf `DELETE WHERE deleted_at < now() - 90d` laufen lassen.

### File Layout (empfohlen)

```
app/src/
├── storage/
│   ├── SqliteAdapter.ts       (erweitert um queryRows/upsertRow/...)
│   ├── IndexedDbAdapter.ts    (erweitert um Object-Stores + garden_id-Index)
│   ├── StorageAdapter.ts      (re-export bleibt)
│   ├── migrations.ts          (erweitert um 8 Migration-Steps: 3 → 10)
│   └── __tests__/
│       ├── RowTables.test.ts
│       └── IndexedDbAdapter.rows.test.ts
├── lib/
│   ├── sync/
│   │   ├── SyncWorker.ts                 (push/pull cycles)
│   │   ├── SyncTriggers.ts               (NetInfo + AppState init, single-subscribe)
│   │   ├── outboxSerialization.ts        (payload JSON.stringify/parse helpers)
│   │   ├── photoUploader.ts              (arrayBuffer + RPC)
│   │   └── __tests__/...
│   ├── photo/
│   │   ├── exifStrip.ts                  (zweistufige Pipeline)
│   │   └── __tests__/...
│   ├── gardenRepo.ts          (umgebaut: reads from storage, writes via writeWithOutbox)
│   ├── vereinsregelnRepo.ts   (umgebaut)
│   ├── profileRepo.ts         (umgebaut)
│   ├── inviteCodeRepo.ts      (bleibt RPC-only, da invite-consume keine LWW-geschützte Row ist)
│   └── migrateLocalToAccount.ts (+ 9. Step: Bulk-Pull in Row-Tables nach Step 8)
├── stores/
│   ├── authStore.ts           (unverändert)
│   └── syncStore.ts           (NEU)
└── components/
    └── SyncStatusBadge.tsx    (NEU — 3-state: synced/syncing/error)

app/app/
├── _layout.tsx                (+ initSyncTriggers() + Header-Slot für Badge)
└── (app)/
    ├── settings.tsx           (+ Sync-Status-Untersektion mit Outbox-Liste + Retry/Verwerfen)
    └── sync-status.tsx        (optional: eigener Detail-Screen, alternativ inline in settings)

supabase/migrations/
└── 20260424000013_offline_sync_infrastructure.sql
    (LWW-Trigger-Template + deleted_at-Spalten + photo_queue-table + enqueue_photo_analysis-RPC
     + server_now-RPC + storage.objects RLS für photos-Bucket + trigger renames)

supabase/tests/
├── lww_guard.sql
├── trigger_ordering.sql
├── enqueue_photo_analysis.sql
└── storage_photos_rls.sql
```

### Plan-Wave-Struktur (Empfehlung — Planner darf umsortieren)

| Wave | Plan | Umfang |
|------|------|--------|
| W1 | 03-01-PLAN.md | Supabase Migration 013 (LWW-Trigger, deleted_at, photo_queue, RPCs, Storage RLS, trigger renames) + supabase/tests/*.sql (Wave 0 test infra) |
| W2 | 03-02-PLAN.md | StorageAdapter Row-Tables (Sqlite + IndexedDb) + sync_outbox + sync_state tables + migrations.ts Extension + Jest tests |
| W3 | 03-03-PLAN.md | SyncWorker + SyncTriggers + syncStore + Outbox-Push-Cycle + Delta-Pull-Cycle + Jest tests |
| W4 | 03-04-PLAN.md | Foto-Queue + EXIF-Strip + photoUploader + enqueue_photo_analysis-RPC-Wrapper + Jest tests |
| W5 | 03-05-PLAN.md | Repo-Refactor (D-28): vereinsregelnRepo → gardenRepo → profileRepo (incremental) + migrateLocalToAccount 9. Step |
| W6 | 03-06-PLAN.md | Sync-Status-UI: Badge + Settings-Sektion + Retry/Verwerfen-Buttons + German i18n keys |

Alternativ: Plans 02-05 parallel, Plan 06 sequentiell (abhängig). Planner wägt nach Datei-Kollisions-Matrix ab.

### Dependencies to Install

```bash
# Im app/-Workspace
pnpm add @react-native-community/netinfo@~12.0.1     # SDK 53-compat; latest verified
pnpm add expo-camera@~55.0.16                         # für Phase 4 bereits gebraucht; hier schon installieren
pnpm add expo-image-picker@~55.0.19                   # dito
pnpm add expo-image-manipulator@~55.0.15              # EXIF-strip via re-encode
pnpm add @lodev09/react-native-exify@^1.0.3           # native GPS-read
pnpm add piexifjs@^1.0.6                              # web GPS-read + remove
```

Verified via `npm view` 2026-04-24. All auf Expo SDK 53 kompatibel (expo-* Pakete aus SDK 53 Index).

## Quellen

### Primary (HIGH confidence)

- [Expo SDK SQLite docs](https://docs.expo.dev/versions/latest/sdk/sqlite/) — Web alpha status, COOP/COEP, withExclusiveTransactionAsync (Accessed 2026-04-24)
- [Expo SDK ImageManipulator docs](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) — API surface, quality/format options (2026-04-24)
- [Expo SDK NetInfo docs](https://docs.expo.dev/versions/latest/sdk/netinfo/) — addEventListener/unsubscribe, web-support (2026-04-24)
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) — storage.foldername(), path-based RLS (2026-04-24)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — is_garden_member-Pattern (2026-04-24)
- [PostgreSQL Trigger Ordering](https://www.postgresql.org/docs/current/trigger-definition.html) — alphabetische Name-Reihenfolge (2026-04-24)
- [PostgreSQL BEFORE UPDATE Trigger](https://neon.com/postgresql/postgresql-triggers/postgresql-before-update-trigger) — RAISE EXCEPTION-Pattern (2026-04-24)
- [React Native Reanimated Compatibility Table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) — SDK 53 + 3.17.x verified (2026-04-24)
- [npm registry](https://www.npmjs.com/package/@supabase/supabase-js) — latest = 2.104.1 am 2026-04-23 (2026-04-24)

### Secondary (MEDIUM confidence)

- [Supabase RN file upload blog](https://supabase.com/blog/react-native-storage) — ArrayBuffer-pattern; verified via multiple community threads
- [GitHub Supabase Discussion #2336](https://github.com/orgs/supabase/discussions/2336) — 0-byte iOS bug with Blob-upload (2026-04-24)
- [GitHub Expo #38481](https://github.com/expo/expo/issues/38481) — SharedArrayBuffer crash expo-sqlite web SDK 53
- [GitHub Expo #39903](https://github.com/expo/expo/issues/39903) — sqlite3_open_v2 error on web (Accessed via WebSearch)
- [GitHub Expo #28913](https://github.com/expo/expo/issues/28913) — expo-image-manipulator removes EXIF (Accessed via WebFetch)
- [GitHub Expo #15498](https://github.com/expo/expo/issues/15498) — transactions not atomic (WebSearch ref)
- [GitHub Supabase-JS #1400/1403/1434](https://github.com/supabase/supabase-js/issues/1403) — Metro ESM ws-error; fixed 2.49.5+
- [piexifjs README](https://github.com/hMatoba/piexifjs) — remove() API, browser support
- [@lodev09/react-native-exify README](https://github.com/lodev09/react-native-exify) — readAsync/writeAsync API

### Tertiary (LOW confidence — muss bei Ausführung re-verifiziert werden)

- [dev.to React Native offline sync patterns 2026](https://dev.to/sathish_daggula/react-native-offline-sync-with-sqlite-queue-4975) — FIFO + retry patterns (community, nicht offiziell)
- [blog.logrocket.com Drizzle + Expo SQLite](https://blog.logrocket.com/drizzle-react-native-expo-sqlite/) — running/queued flag pattern
- [tanstack.com/blog TanStack DB 0.6](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes) — reference only, not adopted (custom outbox ist LOCKED)

## Project Constraints (from CLAUDE.md)

Die folgenden Kleingarten-App-spezifischen Regeln aus `./CLAUDE.md` sind beim Planning einzuhalten:

- **Tech-Stack:** Expo SDK 53 → 55 Canary, React Native 0.76, TypeScript 5.x, pnpm workspaces.
- **Sync-Layer:** „eigene simple Operation-Log-Queue, Last-Write-Wins (Single-User)" — kein PowerSync/Legend-State/TanStack-DB.
- **Plan-Rendering:** SVG-basiert bis Phase 5 (Phase 3 nicht betroffen).
- **Lokale Persistenz:** expo-sqlite (native) + expo-file-system (Foto-Queue). Implicit: IndexedDB auf Web (via Platform.select, NICHT expo-sqlite-web) — konsistent mit dieser Research.
- **KI-Budget:** Soft 50/Tag, Hard 200/Tag. Phase 3 enqueues photo_analysis-Jobs — Budget-Check läuft in Edge Function (Phase 1), nicht im Client.
- **Datenschutz:** Fotos verschlüsselt at-rest (D-25 Supabase Default), Geo opt-in (D-26 EXIF-Strip + opt-in columns), DSGVO EU-Hosting (Frankfurt project-ref `vitrqkzxkiqvadqfzrcx`).
- **Monorepo:** `app/`, `supabase/` (Migrations + Edge Functions), `packages/shared`.
- **GitHub PRs:** MUSS `--draft`-Flag nutzen (aus globaler ~/.claude/CLAUDE.md).
- **Antwort-Sprache:** Deutsch für User-Strings; Code/SQL/API-Namen unverändert.
- **GSD Workflow:** Edits nur via `/gsd-execute-phase` — direct commits out of scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase-Bucket `photos` existiert bereits aus Phase 1 D-01 | §6 Storage-Upload + RLS | Wenn nicht, Migration 013 muss Bucket via `storage.create_bucket` anlegen — 20 LoC extra. |
| A2 | `pgmq.send(queue, payload)` ist die korrekte Funktion für RPC `enqueue_photo_analysis` (statt Supabase `pgmq_public`-Schema-Cast in enqueueAiJob.ts) | §6 RPC-Body | Wenn SECURITY DEFINER mit pgmq-Direct-call schiefläuft → pgmq_public-Schema-Cast aus enqueueAiJob.ts ins RPC ziehen. |
| A3 | `expo-image-manipulator` wird EXIF weiterhin stripen in SDK 54/55 | §7 EXIF-Pipeline | Integration-Test I-5 fängt Regression ab; Mitigation: piexifjs-Uint8Array-Path als Fallback in Phase 3.5. |
| A4 | 2-User-MVP-Datenmengen bleiben < 500 Rows total → kein Pagination nötig bei Bulk-Initial-Pull | §5 Delta-Pull | Bei Phase 5/6 Einzug Plan-Elemente+Kalender kann das kippen; Pagination-Code wird dann dort nachgezogen. |
| A5 | Clock-Skew zwischen Client und Supabase ist < 2 min (NTP-typisch) | §5 server_now() | Extrem skew würde LWW-Reject-Stürme auslösen; Mitigation: server_now-RPC als Single-Source-of-Truth nutzen. |
| A6 | `AppState.addEventListener('change', cb)` auf Web (react-native-web) feuert bei Tab-Visibility-Change | §8 Sync-Triggers | Falls nicht: auf `document.addEventListener('visibilitychange')` im Web-Branch fallback. Einfacher Integration-Test. |
| A7 | `@lodev09/react-native-exify` 1.0.3 kompatibel mit Expo SDK 53 (autolinking + New-Arch-opt-out) | §7 EXIF native | Wenn nein: `react-native-exif` als Fallback oder piexifjs-via-base64 auf beiden Plattformen. |
| A8 | Die aktuell im Code verwendeten Migration-013-Namenskonventionen (aa_/mm_/zz_) kollidieren nicht mit künftigen Migrations | §3 Trigger-Naming | Zukünftige Phase-Migrations, die eigene Trigger registrieren, müssen dieselbe Konvention respektieren. In CLAUDE.md-Konventionen-Sektion dokumentieren. |

## Open Questions

1. **Migration-013-Placement für `profiles`-Tabelle** — profiles hat im aktuellen Schema kein `updated_at` (nur plz/klimazone/archetype wurden in Migration 003 weggeräumt, Migration 012 kam display_name CHECK dazu). D-02 listet profiles als sync-Entity. Brauchen wir auf profiles `updated_at` + `deleted_at` + LWW-Trigger?
   - **Was wir wissen:** `profiles.display_name` ist aktuell der einzige user-editierbare Content; wird selten geändert.
   - **Was unklar ist:** Ob 2 User (Dirk + Frau) beide ihren Display-Namen gleichzeitig editieren würden. Wahrscheinlich nicht — aber der Code-Pfad wäre inkonsistent, wenn profiles KEIN Row-Table ist.
   - **Empfehlung:** profiles KRIEGT `updated_at` + `deleted_at` + LWW-Trigger in Migration 013 zur Konsistenz. Row-Table auch auf Client. So ist der Mechanismus einmal sauber durchvalidiert (wie in D-02 expliziert).

2. **garden_members-Sync** — garden_members hat keine updated_at-Spalte (nur joined_at). Mutations laufen ausschließlich über RPCs (create_invite/consume_invite/delete_garden/transfer_ownership), die bereits SECURITY DEFINER sind und member-Writes atomar managen. **Empfehlung:** garden_members ist aus der Outbox ausgenommen — wird nur über Delta-Pull synchronisiert (Partner joint oder wird entfernt, Delta-Pull holt die Änderung). D-02 listet sie als Entity → verstanden als „pull-only, no outbox".

3. **Batch-Write-Optimierung im SyncWorker.pushCycle()** — aktuell `upsert(row)` pro Row. Supabase supportet `upsert([row1, row2, ...])` als Bulk-Insert. **Empfehlung:** FIFO-per-(entity,row_id)-Chains so klein wie möglich halten, aber wenn ein Chain N>5 Ops auf dieselbe Row hat, squash intern auf den jüngsten Snapshot (Row-Snapshot-Semantik D-06 erlaubt das — alle älteren Snapshots sind überholt). Planner muss entscheiden, ob Phase 3 diese Optimierung schon einbaut oder in Phase 5 schiebt.

4. **Manueller 2-Geräte-LWW-Test-Harness** — Success-Criterion 5 (ROADMAP) braucht echten 2-Account-Test. Wir haben nur einen Entwicklungs-Rechner. Reale Validierung erfordert: (1) Dirks iPhone + Frau's Laptop, oder (2) 2 Expo-Dev-Clients gleichzeitig gegen Staging. **Empfehlung:** VALIDATION.md dokumentiert manuelle Checkliste; der Jest+SQL-Test-Suite deckt Invarianten I-1..I-6 automatisch ab; 2-Geräte-Test läuft einmalig zur Human-Verify-Phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CI + Jest + tooling | ✓ | via pnpm workspace | — |
| Supabase CLI | DB-Migrations + SQL-Tests | ✓ | v2.90+ (Phase 02.5 verified) | — |
| pnpm | Workspace-Install | ✓ | 9.x | — |
| expo CLI | Dev-Server + EAS | ✓ | Expo SDK 53 | — |
| Supabase project Frankfurt | Staging DB | ✓ | Live (project-ref vitrqkzxkiqvadqfzrcx) | — |
| @react-native-community/netinfo | SyncTriggers | ✗ (nicht in package.json) | — | Muss in Wave 3 installiert werden |
| expo-camera | Phase 4, aber in Phase 3 Foto-Queue benutzt | ✗ | — | Muss installiert werden |
| expo-image-picker | dito | ✗ | — | Muss installiert werden |
| expo-image-manipulator | EXIF-strip | ✗ | — | Muss installiert werden |
| @lodev09/react-native-exify | native GPS-read | ✗ | — | Muss installiert werden; alternativ react-native-exif |
| piexifjs | web GPS-read + strip | ✗ | — | Muss installiert werden |
| fake-indexeddb | Jest IDB-Tests | ✓ | ^6.2.5 (bereits in devDeps) | — |

**Missing dependencies with fallback:** alle oben gelisteten ✗ — alle via `pnpm add` installierbar, in Wave 1 oder Wave 3 des Plans.

## Metadata

**Confidence breakdown:**

- **Standard stack (SQLite/IDB/Supabase/NetInfo):** HIGH — alle via Context7-äquivalente docs + npm verifiziert.
- **Architecture (Outbox + LWW + Pull):** HIGH — alle Patterns in produktiver 2026-Industry-Praxis dokumentiert; keine Erfindung.
- **Trigger-Ordering:** HIGH — Postgres-Spec verifiziert.
- **EXIF pipeline:** MEDIUM — `expo-image-manipulator`-Strip ist verifizierter Seiteneffekt aber nicht documented API; Integration-Test nötig.
- **Web-Storage-Entscheidung (IDB-only):** HIGH — expo-sqlite-Web-Alpha-Status explizit vom Expo-Team bestätigt.
- **Supabase-JS Version:** HIGH — npm-registry + GitHub-Issue-Status verifiziert.

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — Stack ist stabil, einzig Gefahrenpunkt: Expo-SDK-55-Stable-Release vor Ende Mai würde Reanimated-v4-Upgrade erzwingen; separater Spike)

## RESEARCH COMPLETE
