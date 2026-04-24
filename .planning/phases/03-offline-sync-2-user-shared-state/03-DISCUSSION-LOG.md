# Phase 3: Offline & Sync (2-User Shared State) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 03-offline-sync-2-user-shared-state
**Areas discussed:** Lokaler Store, Outbox + LWW-Mechanik, Partner-Updates, Foto-Queue + Sync-Status-UI, Delete-Sync, NFR-04, NFR-05

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Lokaler Store: KV-Blob vs. Row-Tables | Architektur-Grundsatzentscheidung für Phase 4–7 | ✓ |
| Outbox + LWW-Mechanik | Wie offline-Writes gespeichert und aufgelöst werden | ✓ |
| Partner-Updates: Realtime vs. Pull | Wie Partner-Änderungen sichtbar werden | ✓ |
| Foto-Queue + Sync-Status-UI | Offline-Fotos + Status-Sichtbarkeit | ✓ |

**User's choice:** alle vier ausgewählt.

---

## Lokaler Store

### Q1: Wie soll der lokale Store strukturiert werden?

| Option | Description | Selected |
|--------|-------------|----------|
| Row-Tables pro Entity (Recommended) | SQLite-Tabelle bzw. IndexedDB-ObjectStore pro Supabase-Tabelle, Row-Level-Dirty-Flag möglich | ✓ |
| Generisches 'rows'-KV | Key='entity:id', Value=JSON-Blob | |
| Blob-KV beibehalten | Alles bleibt JSON-Blob pro Entity | |

**User's choice:** Row-Tables pro Entity

### Q2: Wie werden offline-Writes markiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate 'outbox'-Tabelle (Recommended) | Eigene Tabelle mit id, entity, row_id, op, payload, retry_count, last_error | ✓ |
| 'synced_at'-Flag auf Row | pending_op + synced_at Spalten auf jeder Tabelle | |
| Dual: Outbox + Row-Dirty-Flag | Beides kombiniert | |

**User's choice:** Separate 'outbox'-Tabelle

### Q3: Welche Entities bekommen lokale Row-Tables in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Nur bestehende Entities (Recommended) | gardens, garden_members, profiles, vereinsregeln, ai_jobs/results | ✓ |
| Auch Phase-4–7 Entities antizipieren | plan_elements, inventory_items, calendar_tasks vorweg | |
| Minimum + ein Dummy für Druck-Test | Bestehend + synthetische plan_elements-Tabelle | |

**User's choice:** Nur bestehende Entities

### Q4: Wie synchron halten wir lokales Schema und Supabase-Schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel, manuell gepflegt (Recommended) | Jede Phase erweitert beide Schemas separat | ✓ |
| Generierte lokale Schemas aus packages/shared-Typen | Build-Step generiert CREATE TABLE | |
| Lokaler Store nutzt JSON-Spalten | (id, garden_id, data JSON, updated_at) | |

**User's choice:** Parallel, manuell gepflegt

---

## Outbox + LWW-Mechanik

### Q1: Welche Einheit wird in der Outbox gespeichert?

| Option | Description | Selected |
|--------|-------------|----------|
| Row-Snapshot (Recommended) | Komplette Row + op-Typ, idempotent via Upsert | ✓ |
| Field-Level-Diff | Nur geänderte Felder, feiner aber komplexer | |
| Operation-Event ('moveElement X') | Replay-basiert, Overkill für 2-User-MVP | |

**User's choice:** Row-Snapshot

### Q2: Wie wird LWW technisch durchgesetzt?

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres-Trigger 'reject if incoming updated_at < existing' (Recommended) | BEFORE UPDATE Trigger, SQLSTATE P9xxx bei Reject | ✓ |
| Client pre-read, dann conditional upsert | Extra Roundtrip pro Row | |
| Blind-Upsert, jede Seite gewinnt zuletzt | Kein updated_at-Check | |

**User's choice:** Postgres-Trigger

### Q3: Was passiert bei Outbox-Push-Fehler?

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential Backoff, max 5 Retries (Recommended) | 2^n Sekunden, max 5min, danach 'failed' | ✓ |
| Unbegrenzter Retry mit festem Intervall | 30s-Intervall ohne Max | |
| Fehlerklassen unterschiedlich | 4xx sofort 'failed', 5xx backoff | |

**User's choice:** Exponential Backoff, max 5 Retries

### Q4: Welche Reihenfolge-Garantie?

| Option | Description | Selected |
|--------|-------------|----------|
| FIFO pro (entity, row_id), parallel zwischen Rows (Recommended) | Seriell pro Row, parallel sonst | ✓ |
| Strikt FIFO global | Eine Op nach der anderen | |
| Ungeordnet, nur updated_at entscheidet | Alles parallel | |

**User's choice:** FIFO pro (entity, row_id)

---

## Partner-Updates

### Q1: Wie erfährt Dirk von Änderungen seiner Frau?

| Option | Description | Selected |
|--------|-------------|----------|
| Pull bei App-Foreground + nach Push (Recommended) | Kein Realtime, reicht für 2-User-MVP | ✓ |
| Supabase Realtime auf garden_id-Tabellen | WebSocket, Live-Updates | |
| Hybrid: Pull default, Realtime nur Editor-Session | Phase 5 könnte entscheiden | |

**User's choice:** Pull bei App-Foreground + nach Push

### Q2: Wie baut Client den lokalen Store initial aus Remote auf?

| Option | Description | Selected |
|--------|-------------|----------|
| Bulk-Initial-Pull + Delta-Pull danach (Recommended) | SELECT * pro Entity initial, danach WHERE updated_at > | ✓ |
| Lazy Pull pro Entity | On-demand wenn Screen braucht | |
| Edge Function 'bootstrap-garden' | Gebundelte Response, ein Roundtrip | |

**User's choice:** Bulk-Initial-Pull + Delta-Pull

### Q3: Wie wird 'last_pulled_at' getrackt?

| Option | Description | Selected |
|--------|-------------|----------|
| Pro Entity in 'sync_state'-Tabelle (Recommended) | (entity TEXT PK, last_pulled_at) | ✓ |
| Pro Row 'last_seen_at'-Spalte | MAX() pro Entity | |
| Global 'last_pulled_at' für gesamten Garten | Ein Timestamp für alles | |

**User's choice:** Pro Entity in sync_state-Tabelle

### Q4: Welche Sync-Trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| Reconnect + Foreground + nach Write (Recommended) | NetInfo + AppState + 500ms debounced | ✓ |
| Zusätzlich periodisch alle 60s wenn online | setInterval plus oben | |
| Nur manuell + Reconnect | Kein Auto-Sync bei Foreground | |

**User's choice:** Reconnect + Foreground + nach Write

---

## Foto-Queue + Sync-Status-UI

### Q1: Wie werden offline aufgenommene Fotos lokal verwahrt?

| Option | Description | Selected |
|--------|-------------|----------|
| expo-file-system URI + Manifest-Row (Recommended) | Cache-Dir + photo_queue Tabelle | ✓ |
| Foto als base64 in SQLite-Spalte | Teure SQLite-Blobs | |
| Expo SecureStore / AsyncStorage | Ungeeignet für Binärdaten | |

**User's choice:** expo-file-system URI + Manifest-Row

### Q2: Wie verknüpft sich Photo-Queue mit pgmq-KI-Jobs?

| Option | Description | Selected |
|--------|-------------|----------|
| Client pushed Photo → ai_jobs enqueue via RPC (Recommended) | enqueue_photo_analysis SECURITY DEFINER | ✓ |
| Edge Function 'upload-and-analyze' orchestriert beides | Client→Function→Storage+ai_jobs | |
| Getrennt halten: Upload Phase 3, Enqueue Phase 4 | Strikte Phasen-Trennung | |

**User's choice:** Client pushed Photo → ai_jobs enqueue via RPC

### Q3: Wo und wie sichtbar ist der Sync-Status?

| Option | Description | Selected |
|--------|-------------|----------|
| Globaler Badge in Header + Detail-Screen (Recommended) | 3 Zustände, Tap→Settings-Detail | ✓ |
| Inline-Indicator pro Row | Mini-Indicator überall | |
| Nur sichtbar bei Fehler | Minimalistisch | |

**User's choice:** Globaler Badge in Header + Detail-Screen

### Q4: Optimistisches UI oder auf Server-Bestätigung warten?

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistisch: UI zeigt lokale Version sofort (Recommended) | Write→Outbox→UI, async Push | ✓ |
| Pessimistisch: UI wartet auf Server | 'saving...' bis Push durch | |
| Optimistisch mit Rollback-Animation bei Konflikt | Toast 'Maria hat geändert' | |

**User's choice:** Optimistisch

---

## Zusatzrunde: Delete-Sync / NFR-04 / NFR-05

### Q1: Wie werden Deletes synchronisiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-Delete 'deleted_at'-Spalte auf allen garden-Tabellen (Recommended) | Update statt Delete, Read-Filter WHERE deleted_at IS NULL | ✓ |
| Hard-Delete + separate 'tombstones'-Tabelle | DELETE + Tombstone-INSERT | |
| Hard-Delete nur, Delta-Pull per Bulk-ID-Liste | Missing-ID-Detection | |

**User's choice:** Soft-Delete 'deleted_at'-Spalte

### Q2: NFR-04 — Foto-Verschlüsselung at-rest?

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Server-Side Encryption (AES-256) reicht (Recommended) | Supabase-Default EU-Frankfurt | ✓ |
| Client-side E2E-Verschlüsselung vor Upload | Bricht Claude Vision | |
| Hybrid: Server-side + 'sensible' flag | Granular aber zusätzlicher Code | |

**User's choice:** Supabase Server-Side Encryption (AES-256)

### Q3: NFR-05 — EXIF-Handling?

| Option | Description | Selected |
|--------|-------------|----------|
| EXIF komplett strippen vor Upload (Recommended) | Opt-in für GPS-Extraktion | ✓ |
| EXIF behalten, Opt-out | Widerspricht NFR-05 | |
| Client-Resize strippt automatisch | Abhängig von Library | |

**User's choice:** EXIF komplett strippen vor Upload

---

## Claude's Discretion

- Konkrete API-Shape für Row-Level-StorageAdapter (typisierte vs. generische Accessoren)
- Web-Platform: Expo-SQLite-Web Alpha vs. reiner IndexedDB-Approach (COOP/COEP-Header-Risiko)
- Cleanup-Politik für `deleted_at` und failed Outbox-Einträge
- Exact Debounce-Zahl für Sync-Trigger nach Write
- Batch-Größe bei Bulk-Initial-Pull
- Inkrementelle vs. parallele Repo-Migration innerhalb Phase 3
- Differenzierung Retry bei 4xx vs. 5xx

## Deferred Ideas

Gesamtliste in CONTEXT.md §deferred.

Kernpunkte: Supabase-Realtime, Rollback-Animation, bootstrap-Edge-Function, Auto-Cleanup-Cron, Field-Level-Diff, Client-Side-Foto-E2E, Multi-Garten-Switching, >2 Member, separate Tombstone-Tabelle, periodischer Sync-Timer, Rate-Limiting.
