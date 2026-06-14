---
status: resolved
slug: cross-device-sync-pull
trigger: "Cross-Device-Sync-Bug: Account-Plan erscheint nach Login auf zweitem Gerät/Browser nicht (Home zeigt 'kein Gartenplan'). Ursache bereits lokalisiert: SyncWorker.ts PULL_ENTITIES + pullEntity-Switch enthalten plan_elements und garden_dimensions NICHT (push-only, nie gepullt) — ebenso die Import-Draft-Tabellen (imports, import_items, bed_drafts, plant_drafts, observation_drafts). Home/gardenPlanRepo lesen nur aus lokalem Storage, daher leer auf Gerät B. Fix-Scope (vom User bestätigt): Plan + Import-Drafts in den Pull aufnehmen. Mapper planElementFromDb + gardenDimensionsFromDb fehlen noch und müssen geschrieben werden (importEntityFromDb existiert bereits). Phase-03 Cross-Device-UAT wurde damals übersprungen, daher nie entdeckt."
created: 2026-06-14
updated: 2026-06-15
verified: 2026-06-15 (User-Cross-Device-Retest: Plan synct, Hauptfeld erscheint, Klick-Selektion + Pfeiltasten OK)
---

# Debug: Cross-Device-Sync — Plan wird nicht gepullt

## Symptoms

- **Expected behavior:** Nach Login mit demselben Account auf einem zweiten Gerät (Handy) oder einem anderen Desktop-Browser erscheint der bestehende Gartenplan (Beete, Pflanzen, Gartenform). Shared Garden Model (2 User) — Daten sollen auf allen Geräten identisch sein.
- **Actual behavior:** Auf dem zweiten Gerät/Browser zeigt der Home-Screen den Empty State ("kein Gartenplan", Aufforderung neuen anzulegen). Der Plan ist nur auf dem ursprünglichen Browser sichtbar.
- **Error messages:** Keine. Stiller Fehler — Empty State statt Plan.
- **Timeline:** Bestand vermutlich seit Phase 03 (Offline-Sync). Cross-Device-UAT (03-HUMAN-UAT.md) wurde damals übersprungen/deferred (alle 4 Tests `skipped`), daher nie entdeckt. Account-Modus erforderlich (nicht Lokal-Modus).
- **Reproduction:**
  1. Account-Modus, Garten mit ≥1 Beet + ≥1 Pflanze auf Gerät A anlegen.
  2. Mit demselben Account auf Gerät B (Handy via Web-URL oder anderer Desktop-Browser) einloggen.
  3. Home-Screen zeigt "kein Gartenplan" statt des bestehenden Plans.

## Current Focus

- hypothesis: SyncWorker pull-Pfad deckt plan_elements + garden_dimensions (und Import-Draft-Tabellen) nicht ab — Daten werden gepusht aber nie gepullt, daher auf Gerät B lokal leer.
- next_action: gather initial evidence — Pull-Pfad in SyncWorker.ts und Lese-Pfad in gardenPlanRepo.ts/Home verifizieren; Rückwärts-Mapper-Bestand prüfen.

## Pre-investigation findings (orchestrator)

Bereits in der Code-Analyse vor Session-Start belegt:

- `app/src/lib/sync/SyncWorker.ts` — `PULL_ENTITIES = ['gardens','garden_members','profiles','vereinsregeln','invite_codes']`. `plan_elements` + `garden_dimensions` fehlen; `pullEntity()`-Switch hat keinen `case` für beide. Push-Handler (`pushPlanElement`, `pushGardenDimensions`) existieren und sind in `dispatchPush` verdrahtet → Upload funktioniert, Download nicht.
- `app/src/lib/gardenPlanRepo.ts` — `loadAcceptedElements()` + `loadDimensions()` lesen ausschließlich aus lokalem Storage (`storage.getRowsByGarden`). Keine direkte Server-Abfrage.
- `app/app/(app)/index.tsx` — Home rendert Plan nur wenn `elements.length > 0 && dimensions`. Sonst Empty State. `activeGardenId` wird via `ensureDefaultGardenForUser()` (in `app/app/_layout.tsx`) gesetzt; `syncAll()` läuft beim Bootstrap, pullt aber die fehlenden Entities nicht.
- `app/src/lib/mappers/rowMappers.ts` — `gardenFromDb`, `profileFromDb`, `gardenMemberFromDb`, `inviteCodeFromDb`, `vereinsregelnFromDbRows`, `importEntityFromDb` existieren. `planElementFromDb` + `gardenDimensionsFromDb` fehlen (müssen geschrieben werden).
- Nebenbefund: Import-Draft-Tabellen (`imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts`) sind ebenfalls push-only — gleiche Pull-Lücke. Vom User in Fix-Scope eingeschlossen.

## Fix scope (user-confirmed)

Plan **+** Import-Drafts in den Pull aufnehmen:
- `garden_dimensions`, `plan_elements`
- `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts`

## Evidence

- timestamp: 2026-06-14 — Orchestrator-Voranalyse siehe oben (SyncWorker.ts, gardenPlanRepo.ts, index.tsx, _layout.tsx, rowMappers.ts gelesen).

## Eliminated

(keine bisher)

## Resolution

- **root_cause:** `PULL_ENTITIES` in SyncWorker.ts listed only 5 entities (gardens, garden_members, profiles, vereinsregeln, invite_codes). `garden_dimensions` and `plan_elements` were push-only — never pulled. The `pullEntity()` switch had no cases for them (default returned 0). Same gap for all 5 import-draft tables (imports, import_items, bed_drafts, plant_drafts, observation_drafts). On device B, `syncAll()` at bootstrap pulled none of the plan data, leaving local storage empty; `gardenPlanRepo.loadAcceptedElements()` + `loadDimensions()` read only from local storage, so Home showed the empty state.
- **fix:** Added `garden_dimensions`, `plan_elements`, `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` to `PULL_ENTITIES`. Added corresponding `case` blocks in `pullEntity()` using existing mappers (`gardenDimensionsToLocal`, `planElementToLocal`, `importEntityFromDb`). Also imported these three mappers into SyncWorker.ts (previously only the `toDb` direction was imported). The `import_items` case does a full garden-scoped pull (no delta filter) because the table has no `updated_at` column (write-once). All other new cases apply `updated_at > lastPullAt` delta filter when available. All rows are garden-scoped via `.eq('garden_id', activeGardenId)` to respect RLS. Fix verified: 717 tests pass, 0 regressions.
- **file:** `app/src/lib/sync/SyncWorker.ts`

---

## Follow-up bugs (discovered during cross-device UAT 2026-06-14)

Der Pull-Fix funktioniert (Plan erscheint auf Gerät B). Beim Testen wurden DREI weitere Bugs aufgedeckt, alle via DevTools-Console + Network-Response-Body auf 100 % Root-Cause gepinnt:

### Bug C — `plan_elements` Push 400 (22P02) — PRIMÄR, Grund für fehlendes Hauptfeld
- **Beleg:** Network-Response-Body einer 400: `{"code":"22P02","message":"invalid input syntax for type uuid: \"el-qz9a01bz\""}`
- **Root Cause:** `plan_elements.id` ist Typ `uuid` (Migration 014). Der Editor erzeugt IDs als `'el-' + Math.random().toString(36)` → KEIN gültiges UUID → jeder Push solcher Elemente wird mit 22P02/400 abgelehnt. Das Hauptfeld wurde im Web-Editor gezeichnet → `el-`-ID → erreichte nie den Server. Pflanzen erscheinen, weil Draft-Promotion/„Zu Plan hinzufügen" `crypto.randomUUID()` nutzen.
- **Betroffene Stellen (nur diese zwei erzeugen `el-`):**
  - `app/src/stores/editorStore.ts:56-57` (`randomId()` → `polygonCommit`, Skia/native)
  - `app/src/components/editor/web/WebPlanEditor.tsx:95-96` (`randomId()` → Zeilen 381 Beet + 448 Pflanze, Web)
  - (Alle anderen Generatoren nutzen bereits `crypto.randomUUID()`: draftPromotionRepo, gardenPlanRepo, importRepo, useKalenderData, migrateLocalToAccount.)
- **Fix (Code):** Beide `randomId()` auf `crypto.randomUUID()` (mit Fallback) umstellen. Unit-Test: generierte ID matcht UUID-Regex.
- **Fix (Daten-Reparatur):** Bestehende lokale `plan_elements` auf Gerät A mit Nicht-UUID-`id` (z. B. Hauptfeld) müssen einmalig re-ge-id-t werden: neue UUID vergeben, Kind-Referenzen (`parentBedId` in provenance) konsistent umschreiben, danach via Outbox als insert neu pushen. Alte `el-`-Rows waren nie auf dem Server → kein Server-Cleanup nötig.

### Bug B — `garden_dimensions` Push 409 (Conflict)
- **Beleg:** wiederholte `POST /garden_dimensions?on_conflict=id 409`.
- **Root Cause:** Tabelle hat `UNIQUE(garden_id)` (Migration 014, eine Zeile pro Garten), aber `pushGardenDimensions` (SyncWorker.ts) macht `upsert(..., { onConflict: 'id' })`. Wenn lokale `id` ≠ Server-`id` für denselben Garten → Upsert versucht INSERT → verletzt `UNIQUE(garden_id)` → 409 dauerhaft.
- **Fix:** `onConflict: 'garden_id'` für garden_dimensions-Push. Test ergänzen.

### Bug A — Web-Editor: Klick-Selektion kaputt (Regression)
- **Symptom:** Element-Klick markiert nicht mehr; nur Drag bewegt. Stacktrace: `onUp @ WebPlanEditor.tsx:286`.
- **Vermutung:** Regression aus jüngstem Quick-Fix (260611-vk4 Deselect-bei-Klick-auf-freie-Fläche oder 260611-kpl preventDefault/userSelect). Klick-vs-Drag-Diskriminierung im Pointer-Handler.
- **Fix:** Klick-zum-Selektieren wiederherstellen + **Unit-Test** (User-Anforderung: „damit das nicht wieder reinkommt").

### Sekundär — Outbox-Härtung
- `handlePushError` lässt bei generischen Fehlern (kein P9010/P9011) Einträge nach MAX_ATTEMPTS in der Outbox; `push()` listet ALLE Einträge unabhängig von attempts → permanent fehlerhafte Einträge (z. B. 22P02) werden bei JEDEM Sync endlos neu versucht (daher die Wiederholungen in der Console). Permanent-failed sauber markieren/überspringen.

## Fix scope (erweitert, user-bestätigt)
1. Bug C Code (UUID-Generatoren) + Daten-Reparatur (Re-ID lokaler `el-`-Elemente).
2. Bug B (`onConflict: 'garden_id'`).
3. Bug A (Klick-Selektion + Unit-Test).
4. Outbox-Härtung gegen Endlos-Retry permanent fehlerhafter Einträge.
Jeweils mit Test. Original-Pull-Fix bleibt (uncommitted im Working Tree).

## Bug A — Korrektur (2026-06-14, nach User-Retest „Selektion/Pfeiltasten gehen immer noch nicht")

Der erste Bug-A-Fix der Session (onClick + stopPropagation am Element-`<G>`) war **wirkungslos**: `react-native-svg/web` entfernt `onClick` in `prepare()` (mappt `onClick←onPress`; ohne `onPress` → `onClick = undefined`) — exakt das Problem aus dem `laube-pflanze-platzierung`-Fix für `<Svg>`. `onMouseDown`/`onDoubleClick` bleiben erhalten, `onClick` nicht.

Echte Mechanik: mousedown selektiert (`handleElementMouseDown`), der folgende Klick blubbert ungehindert zum `<div>`-`handleDivClick` → `setSelection(null)` → sofort deselektiert. Ohne Selektion auch kein Pfeiltasten-Move (gleiche Wurzel).

**Korrigierter Fix:** `justSelectedRef` (Muster wie `justCreatedRef`) — in `handleElementMouseDown` gesetzt (+ `setTimeout(0)`-Reset für den Drag-ohne-Klick-Fall), in `handleDivClick` einmalig konsumiert → Deselect übersprungen. Toter `<G>`-onClick entfernt.

**Warum der alte Test trotzdem grün war:** Der `react-native-svg`-Mock im Test reichte `onClick` an die View weiter — das echte rnsvg verschluckt es. Test war nicht wirklichkeitstreu. Neu geschrieben: Klick auf Element bubblet (RNTL fireEvent läuft Ancestor-Handler hoch) zum `<div>`-Handler; T-bugA-02 prüft, dass `setSelection(null)` NICHT gerufen wird → fängt die Regression echt.

**Dateien:** `app/src/components/editor/web/WebPlanEditor.tsx`, `app/src/components/editor/__tests__/WebPlanEditor.clickSelect.test.tsx`. Volle Suite: 738 grün, 0 Regressionen.

### Bug A — Korrektur 2 (2026-06-15, nach erneutem Retest „Selektion blitzt auf und verschwindet sofort")

Auch `justSelectedRef` + `setTimeout(0)`-Reset war im echten Browser wirkungslos: Der `setTimeout(0)` feuert zwischen `mouseup` und `click` (separate Macrotasks) → Flag beim Klick schon `false` → Deselect lief doch. (Test grün, weil dort kein echtes Browser-Timing.)

**Endgültiger Fix (timing-unabhängig):** `pointerDownOnElementRef` latcht, ob der letzte mousedown auf einem Element (`handleElementMouseDown` → true; `stopPropagation` verhindert, dass der Canvas-Handler ihn zurücksetzt) oder auf dem Hintergrund war (`handleCanvasMouseDown` → false, läuft für jeden Tool-Zustand). `handleDivClick` deselektiert nur bei `false`. Kein Timer → keine Race-Condition. Test T-bugA-03 prüft jetzt den Latch-Reset durch Hintergrund-mousedown.

## Implementation (2026-06-14)

### Bug C — UUID-Generator-Fix
- `app/src/stores/editorStore.ts`: `randomId()` → `crypto.randomUUID()` mit Fallback (mirror gardenPlanRepo.ts-Muster)
- `app/src/components/editor/web/WebPlanEditor.tsx`: `randomId()` → gleiches Muster
- `app/src/lib/gardenPlanRepo.ts`: `repairNonUuidElementIds()` + `isValidUuid()` neu — idempotente Daten-Reparatur, schreibt `el-`-Elemente mit neuer UUID über `writeWithOutbox`, rewritet `provenance.parentBedId`-Referenzen
- Tests: `app/src/lib/__tests__/gardenPlanRepo.uuidRepair.test.ts` (6 Tests)

### Bug B — garden_dimensions onConflict
- `app/src/lib/sync/SyncWorker.ts`: `pushGardenDimensions` → `onConflict: 'garden_id'` (war 'id')
- Tests: `app/src/lib/sync/__tests__/SyncWorker.bugfixes.test.ts` (Bug B Describe, 1 Test)

### Bug A — Klick-Selektion
- `app/src/components/editor/web/WebPlanEditor.tsx`: `onClick` Handler auf Element-`<G>` hinzugefügt, der `e.stopPropagation()` aufruft, damit der click-Event nicht zum Wrapper-div bubbles und `handleDivClick` → `setSelection(null)` auslöst
- Tests: `app/src/components/editor/__tests__/WebPlanEditor.clickSelect.test.tsx` (4 Tests)

### Outbox-Härtung
- `app/src/lib/sync/SyncWorker.ts`: `push()` überspringt Einträge mit `attempts >= MAX_ATTEMPTS`
- Tests: `app/src/lib/sync/__tests__/SyncWorker.bugfixes.test.ts` (Outbox-Describe, 3 Tests)

### Testergebnis: 737 Tests bestanden, 0 Fehler (vorher 717 + 20 neue = 737)
