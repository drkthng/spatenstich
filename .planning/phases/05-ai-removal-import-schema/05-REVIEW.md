---
phase: 05-ai-removal-import-schema
reviewed: 2026-05-09T12:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - README.md
  - app/.env.example
  - app/app/(app)/index.tsx
  - app/app/(app)/profile/vereinsregeln/upload.tsx
  - app/src/lib/gardenPlanRepo.ts
  - app/src/lib/mappers/rowMappers.ts
  - app/src/lib/migrateLocalToAccount.ts
  - app/src/lib/sync/SyncTriggers.ts
  - app/src/lib/sync/SyncWorker.ts
  - app/src/storage/IndexedDbAdapter.ts
  - app/src/storage/SqliteAdapter.ts
  - packages/shared/src/i18n/de.json
  - packages/shared/src/index.ts
  - packages/shared/src/types/database.ts
  - packages/shared/src/types/entities.ts
  - packages/shared/src/types/supabase.ts
  - schemas/examples/edge-cases.json
  - schemas/examples/full.json
  - schemas/examples/minimal.json
  - schemas/spatenstich-import.v1.json
  - supabase/migrations/20260509000015_remove_ai_tables.sql
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-09T12:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Zusammenfassung

Phase 5 bringt zwei klar abgegrenzte Liefergegenstände: (1) Entfernung der bisherigen KI-Tabellen (`ai_jobs`, `ai_results`) aus dem Datenbankschema und (2) Einführung des `spatenstich-import.v1.json`-Schema-Kontrakts für den Claude.ai-Import-Flow. Dazu wurden Home Screen und Sync-Infrastruktur aus Phase 4 in die neue Phase integriert.

Die Migration selbst ist sauber: `IF EXISTS`-Guards, Reihenfolge (RLS-Policies → `ai_results` → `ai_jobs` → pgmq-Queue) und der Post-Migration-Invariant-Block sind korrekt. Das Import-Schema und die Beispiel-Payloads sind konsistent. Die Kern-Sync-Logik (SyncWorker, StorageAdapter) ist stabil.

Ein kritisches Problem wurde identifiziert: SQL-Injection-Risiko durch das direkte Einsetzen unkontrollierter `EntityName`-Strings in SQL-Statements ohne Whitelist-Prüfung im `SqliteAdapter`. Fünf Warnungen betreffen Fehlerbehandlungs-Lücken und Logik-Risiken im Sync-Layer und in der Migration.

---

## Kritische Probleme

### CR-01: SQL-Injection via unkontrolliertes `EntityName` in SqliteAdapter

**File:** `app/src/storage/SqliteAdapter.ts:113`

**Issue:** Der `SqliteAdapter` baut SQL-Statements durch direkte String-Interpolation des `entity`-Parameters auf, z. B.:

```ts
await db.execAsync(`CREATE TABLE IF NOT EXISTS ${entity} (...)`);
await db.getAllAsync<{ data: string }>(`SELECT data FROM ${entity} WHERE ...`);
```

Der `entity`-Typ ist `EntityName` (ein Union-String-Literal-Typ aus `packages/shared`). TypeScript-Typen verschwinden zur Laufzeit. Kommt ein manipulierter `entity`-Wert durch (etwa aus einem deserialisierten Outbox-Eintrag, einem zukünftigen Import-Flow oder Test-Code mit `as any`-Casts), ist SQL-Injection möglich. Im jetzigen MVP-Kontext (2 Nutzer, kein öffentliches API) ist die Angriffsfläche klein — aber das Muster wächst mit der Codebase mit. Die Lücke sollte durch eine explizite Whitelist-Prüfung geschlossen werden, bevor weitere Entitäten oder Import-Flows hinzukommen.

**Fix:**

```ts
const ALLOWED_ENTITIES = new Set<string>([
  'gardens', 'garden_members', 'profiles', 'vereinsregeln',
  'invite_codes', 'garden_dimensions', 'plan_elements',
]);

function assertEntityAllowed(entity: string): void {
  if (!ALLOWED_ENTITIES.has(entity)) {
    throw new Error(`SqliteAdapter: unbekannte Entity "${entity}" — SQL abgebrochen.`);
  }
}
```

Die Prüfung am Anfang jeder Methode aufrufen, die `entity` in einen SQL-String einbettet (`getRow`, `getRowsByGarden`, `getAllRows`, `writeWithOutbox`, `upsertRowFromServer`, `upsertRowsFromServer`, `__createRowTablesV3`, `__createRowTablesV4`).

---

## Warnungen

### WR-01: `vereinsregeln` Delta-Pull holt immer alle Rows (doppelter Supabase-Call)

**File:** `app/src/lib/sync/SyncWorker.ts:394-408`

**Issue:** Die `pullEntity`-Implementierung für `vereinsregeln` führt zwei Supabase-Queries durch: erst einen Delta-Check (`updated_at > lastPullAt`), dann — falls irgendeine Row geändert wurde — einen zweiten Full-Fetch aller Rows für den Garden. Hat ein Garten viele Vereinsregeln und der Delta-Check gibt eine Row zurück, werden trotzdem alle Rows neu geladen. Das ist beabsichtigt (Aggregations-Logik), aber wenn `allData` leer zurückkommt (Race Condition: Rows zwischen den beiden Queries gelöscht), wird `vereinsregelnFromDbRows([], gardenId)` aufgerufen und gibt `null` zurück — die vorhandene lokale aggregierte Row wird nicht berührt, der lokale Stand bleibt veraltet.

```ts
// Zeile 400: Delta-Check sagt "etwas hat sich geändert"
if ((data ?? []).length === 0) return 0;
// Zeile 402: Zweiter Full-Fetch
const { data: allData, error: allErr } = await this.supabase
  .from('vereinsregeln')
  .select('*')
  .eq('garden_id', activeGardenId);
// Wenn allData leer ist weil Rows inzwischen gelöscht wurden:
const aggregated = vereinsregelnFromDbRows(allData ?? [], activeGardenId); // → null
if (aggregated) await this.storage.upsertRowFromServer('vereinsregeln', aggregated);
// Lokale Row bleibt unverändert → veralteter Zustand
```

**Fix:** Wenn der Full-Fetch 0 Rows zurückgibt, explizit die lokale aggregierte Row mit einem leeren `rules: { list: [] }`-Eintrag überschreiben oder löschen, um den Server-Stand (keine Regeln mehr) zu spiegeln.

---

### WR-02: Outbox-Delete in `pushVereinsregeln` nutzt String-Interpolation für ID-Liste

**File:** `app/src/lib/sync/SyncWorker.ts:297-302`

**Issue:** Der Delete-Aufruf für veraltete Vereinsregeln-Rows baut eine SQL-ähnliche Liste für `.not('id', 'in', ...)` durch manuelle String-Konkatenation:

```ts
const { error: deleteErr } = await this.supabase
  .from('vereinsregeln')
  .delete()
  .eq('garden_id', row.gardenId)
  .not('id', 'in', `(${currentIds.map((id) => `'${id}'`).join(',')})`);
```

Die `id`-Werte kommen aus dem lokalen Outbox-Payload (UUIDs). Sind sie clientseitig generiert (und in Phase 5 unkontrolliert via Import-Flow möglich), kann ein manipulierter `id`-Wert mit einfachem Anführungszeichen die PostgREST-Syntax brechen oder unerwünschte Deletes auslösen. PostgREST escaped die Werte in `.not('id', 'in', ...)` nicht automatisch, wenn sie als Rohstring übergeben werden.

**Fix:** IDs vor der Interpolation auf UUID-Format validieren:

```ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeIds = currentIds.filter(id => UUID_REGEX.test(id));
if (safeIds.length !== currentIds.length) {
  throw new Error('pushVereinsregeln: ungültige ID-Formate in Outbox-Payload');
}
```

---

### WR-03: `gardenPlanRepo.deleteAllElements` — Fehler bei erstem Element bricht Loop ab, `scheduleWriteDebounced` wird trotzdem aufgerufen

**File:** `app/src/lib/gardenPlanRepo.ts:119-139`

**Issue:** Die `deleteAllElements`-Funktion iteriert sequentiell über alle `plan_elements` und wirft bei einem fehlerhaften `writeWithOutbox`-Aufruf sofort einen `OutboxEnqueueError`. `scheduleWriteDebounced()` in Zeile 139 wird nur nach dem Loop aufgerufen — wenn der Loop mit einem Fehler abbricht, wird der Debounce-Timer jedoch trotzdem nicht ausgelöst. Das ist korrekt. **Aber:** Alle bereits erfolgreich soft-gelöschten Rows vor dem fehlerhaften Element haben einen Outbox-Eintrag erzeugt, ohne dass ein Sync angestoßen wird — sie verbleiben im Outbox-Pending-Zustand bis zum nächsten organischen Sync-Trigger (Reconnect, App-Foreground). Das kann nach Fehler-Recovery zu einem inkonsistenten State führen, wenn der Caller den Fehler auffängt und die Funktion erneut aufruft: Rows, die bereits soft-deleted+outboxed sind, werden nochmals outboxed (Duplikat-Einträge).

**Fix:** `scheduleWriteDebounced()` in einem `finally`-Block aufrufen, damit ausstehende Outbox-Einträge auch nach Teilfehler baldmöglichst synchronisiert werden:

```ts
try {
  for (const row of rows) {
    if (row.deletedAt !== null) continue;
    // ... writeWithOutbox ...
  }
} catch (cause) {
  throw new OutboxEnqueueError('plan_elements', '(batch)', cause);
} finally {
  scheduleWriteDebounced();
}
```

---

### WR-04: `migrateLocalToAccount` — JSON.parse ohne Try/Catch für lokale Daten

**File:** `app/src/lib/migrateLocalToAccount.ts:103-108`

**Issue:** Lokale KV-Blob-Daten werden mit `JSON.parse` deserialisiert, ohne eine Fehlerbehandlung:

```ts
const profile: Partial<LocalProfile> | null = profileJson
  ? (JSON.parse(profileJson) as Partial<LocalProfile>)
  : null;
const vereinsregeln: VereinsRegel[] = vereinsregelnJson
  ? (JSON.parse(vereinsregelnJson) as VereinsRegel[])
  : [];
```

Ist der KV-Store durch einen früheren Schreib-Fehler oder Speicherkorruption mit einem ungültigen JSON-String belegt, wirft `JSON.parse` eine `SyntaxError`-Exception. Diese wird nicht gefangen. Der Fehler propagiert bis zum Aufrufer von `migrateLocalToAccount` und lässt den Nutzer in einem `local`-Modus mit kaputten lokalen Daten hängen — ein Account wurde zu diesem Zeitpunkt bereits auf dem Server erstellt (Step 1 ist abgeschlossen), aber der User bleibt im local-Modus (Step 7 noch nicht erreicht).

**Fix:**

```ts
let profile: Partial<LocalProfile> | null = null;
if (profileJson) {
  try {
    profile = JSON.parse(profileJson) as Partial<LocalProfile>;
  } catch {
    console.warn('[migrate] Lokales Profil-JSON ungültig — wird übersprungen.');
  }
}

let vereinsregeln: VereinsRegel[] = [];
if (vereinsregelnJson) {
  try {
    vereinsregeln = JSON.parse(vereinsregelnJson) as VereinsRegel[];
  } catch {
    console.warn('[migrate] Lokale Vereinsregeln-JSON ungültig — werden übersprungen.');
  }
}
```

---

### WR-05: `IndexedDbAdapter.upsertRowsFromServer` — `Promise.all` enthält `tx.done`, aber Row-Puts laufen außerhalb der `tx.done`-Auflösung

**File:** `app/src/storage/IndexedDbAdapter.ts:238-243`

**Issue:** In `upsertRowsFromServer` wird `Promise.all` mit `...rows.map(put)` und `tx.done` kombiniert:

```ts
await Promise.all([
  ...rows.map((r) => tx.objectStore(entity).put(r)),
  tx.done,
]);
```

Das `idb`-Bibliotheks-Pattern für Transaktionen erfordert, dass `tx.done` als letztes awaitet wird, nachdem alle Operationen _innerhalb_ der Transaktion initiiert wurden. `Promise.all` startet alle Puts gleichzeitig und wartet auf alle gleichzeitig — das ist korrekt, solange alle Operationen auf der gleichen Transaktion laufen. Allerdings: Wirft ein `put`-Aufruf (z. B. bei Typ-Fehler), wird die Transaktion abgebrochen, aber die anderen Puts im `Promise.all` sind möglicherweise schon initiiert. In der Praxis ist das Muster mit `idb` üblich und funktioniert, **aber** in `writeWithOutbox` (Zeile 222-227) wird das gleiche Pattern mit einem Multi-Store-Transaction verwendet — dort ist es kritischer. Das `tx.done` als letztes Element in `Promise.all` kann in seltenen Situationen (z. B. Browser-spezifische IDB-Implementierungen) dazu führen, dass die Transaktion auto-committed wird bevor `tx.done` resolvet. Sicherer ist es, Operationen sequentiell zu awaiten und `tx.done` explizit danach zu awaiten.

**Fix (defensiver Stil für `upsertRowsFromServer`):**

```ts
const db = await this.dbPromise;
const tx = db.transaction(entity, 'readwrite');
for (const row of rows) {
  await tx.objectStore(entity).put(row);
}
await tx.done;
```

---

## Info

### IN-01: `packages/shared/src/types/database.ts` und `supabase.ts` sind Duplikate — zwei Quellen der Wahrheit

**File:** `packages/shared/src/types/database.ts` und `packages/shared/src/types/supabase.ts`

**Issue:** Beide Dateien enthalten die generierten Supabase-Typen (`Database`, `Tables`, etc.). `database.ts` ist veraltet (fehlt `deleted_at` auf `gardens`, `profiles`, `vereinsregeln`; fehlt `server_now` RPC). `supabase.ts` ist aktueller. `packages/shared/src/index.ts` exportiert aus `database.ts`. Mappers wie `rowMappers.ts` kompensieren die Diskrepanz mit `any`-Casts und Kommentaren ("bis zur nächsten Typen-Regenerierung"). Dies erzeugt dauerhaften technischen Schulden-Druck.

**Fix:** `database.ts` durch `supabase.ts` ersetzen oder `index.ts` auf `supabase.ts` umlenken und `database.ts` löschen. Nach `pnpm --filter app gen:types` die `any`-Casts in `rowMappers.ts` auflösen.

---

### IN-02: `vereinsregeln/upload.tsx` verwendet ASCII-Ersatz-Umlaute im UI-Text

**File:** `app/app/(app)/profile/vereinsregeln/upload.tsx:13-16`

**Issue:** Der Screen-Text enthält `"zukuenftigen"` und `"koennen"` statt `"zukünftigen"` und `"können"`. Laut Projekt-Konvention (Memory: `feedback_german_umlauts.md`) sind immer UTF-8-Umlaute zu verwenden.

**Fix:**

```tsx
Vereinsregeln-Import wird in einem zukünftigen Update verfügbar.
Alternativ können Regeln manuell eingegeben werden.
```

---

### IN-03: `app/app/(app)/index.tsx` — i18n-Fallback-Strings duplizieren Übersetzungs-Keys

**File:** `app/app/(app)/index.tsx:103-107`

**Issue:** Die Fallback-Strings in der Rendering-Logik werden manuell mit dem Übersetzungs-Key verglichen:

```ts
{t('home.emptyTitle') !== 'home.emptyTitle' ? t('home.emptyTitle') : 'Noch kein Gartenplan'}
```

`de.json` enthält `home.emptyTitle` und `home.emptySubtitle` (Zeilen 177-178 in `de.json`). Der Fallback-Vergleich ist also nie aktiv und erzeugt Dead Code. Zudem würden Tippfehler im Key unbemerkt bleiben — der Key würde als Anzeige-String durchrutschen statt den Fallback zu verwenden.

**Fix:** Den `t()`-Wrapper so implementieren, dass er einen `defaultValue`-Parameter akzeptiert, oder direkt aus `de.json` importieren und den doppelten Vergleich entfernen.

---

### IN-04: `SyncWorker.ts` — `dispatchPush` hat keinen Handler für `garden_dimensions` und `plan_elements`

**File:** `app/src/lib/sync/SyncWorker.ts:219-228`

**Issue:** Die `dispatchPush`-Switch-Anweisung behandelt `gardens`, `profiles`, `vereinsregeln`, `garden_members`, `invite_codes`. Die Entities `garden_dimensions` und `plan_elements` (beide ab Phase 4 im `EntityName`-Union) landen im `default`-Zweig und werfen einen `Unknown entity`-Fehler. Da `gardenPlanRepo.ts` `writeWithOutbox` für beide Entities aufruft, werden Dimensions- und Element-Änderungen niemals erfolgreich gepusht — sie scheitern dauerhaft mit `push_permanent_failure` nach `MAX_ATTEMPTS` Versuchen.

**Fix:** Push-Handler für die neuen Entities ergänzen:

```ts
case 'garden_dimensions': return this.pushGardenDimensions(entry);
case 'plan_elements':     return this.pushPlanElement(entry);
```

Und entsprechende `private async pushGardenDimensions` / `pushPlanElement`-Methoden implementieren (analog `pushGarden`).

---

### IN-05: `schemas/spatenstich-import.v1.json` — `plants[].localId` ist required, aber `bedRef` nicht

**File:** `schemas/spatenstich-import.v1.json:63-76`

**Issue:** Ein Pflanzen-Eintrag erfordert nur `localId`, aber nicht `bedRef`. Das ist von der Spezifikation so beabsichtigt (D-11/D-12 — Claude.ai kann Pflanzen ohne zugeordnetes Beet zurückgeben). Die App muss beim Import jedoch robust mit Pflanzen umgehen können, die kein `bedRef` haben, ohne einen Crash oder inkonsistenten Plan-State zu erzeugen. Eine App-seitige Validierung beim Import (noch nicht implementiert in Phase 5) muss diesen Fall explizit abfangen. Der `edge-cases.json`-Beispiel-Payload deckt diesen Fall korrekt ab (`plant-x2` hat kein `bedRef`).

**Empfehlung:** Beim Implementieren der Import-Bridge in der App explizit prüfen, ob `bedRef` vorhanden ist, und Pflanzen ohne `bedRef` als "unzugeordnet" markieren statt sie still zu ignorieren.

---

_Reviewed: 2026-05-09T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
