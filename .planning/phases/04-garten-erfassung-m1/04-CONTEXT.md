# Phase 4: Garten-Erfassung (M1) - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Dirk fotografiert seine Parzelle aus 3 Winkeln (geführter Flow), gibt Gartenmaße + Grundform ein, und bekommt einen bestätigten schematischen 2D-Plan mit den von Claude Vision erkannten Elementen. Die Phase liefert den kompletten Erfassungs-Flow: Foto-Aufnahme → Client-Resize → Upload (bestehendes Photo-Queue-System) → Server-seitige Claude Vision Analyse → Element-Bestätigung → Plan-Rendering.

Nicht im Scope: Plan-Editor (Phase 5), Saatgut-Inventar (Phase 6), Kalender (Phase 7), Vereinsregeln-Warnings (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Foto-Capture-Flow

- **D-01:** **3 Einzel-Screens** als geführter Haupt-Flow — pro Winkel (Übersicht, Nordseite, Südseite) ein eigener Screen mit Kamera-Zugriff + Galerie-Auswahl-Option. Fortschrittsanzeige (1/3, 2/3, 3/3). User ist nicht auf die Kamera beschränkt — kann auch existierende Fotos aus der Galerie auswählen.
- **D-02:** **Anleitungstext + Beispielbild** pro Schritt — jeder Foto-Screen zeigt kurzen Text ("Fotografiere deinen Garten von der Nordseite") plus ein Beispiel-Referenzfoto, wie das Ergebnis aussehen sollte.
- **D-03:** **Zusätzliche Fotos erlaubt** — nach den 3 Pflichtfotos erscheint ein Übersichts-Screen mit Thumbnails aller Aufnahmen + Button "Weiteres Foto hinzufügen". Claude Vision bekommt alle Fotos (nicht nur 3). Mehr Perspektiven = bessere Erkennung.

### Maße & Grundriss

- **D-04:** **Form-Auswahl + Maßfelder** als Standard — User tippt auf eine von 4 Form-Silhouetten (Rechteck, L-Form, Trapez, Freihand-Eckpunkte). Pro Form erscheinen die passenden Maßfelder (Rechteck: Länge + Breite; L-Form: 4 Maße; Trapez: 2 Parallelen + Tiefe). Freihand-Eckpunkt-Tool für ungewöhnliche Formen.
- **D-05:** **Maße nach den Fotos** — Flow-Reihenfolge: Foto-Capture → Foto-Übersicht → Grundform + Maße → Analyse starten. User hat die gerade aufgenommenen Fotos als Gedächtnisstütze. Claude bekommt Fotos + Maße zusammen für bestmögliche Analyse.

### Element-Bestätigung

- **D-06:** **Liste mit Toggles** — scrollbarer Screen mit allen erkannten Elementen. Jedes Element hat: Icon + Name + Konfidenz-Indikator + Accept/Reject-Toggle. "Alle bestätigen"-Shortcut-Button oben. UI-Pattern orientiert sich am Vereinsregeln-Confirm-Flow (Phase 02-04): scrollbare Liste mit Toggles pro Eintrag + "Speichern"-Button am Ende.
- **D-07:** **0 Elemente erkannt → leere Plan-Vorlage** mit Gartenmaßen + freundlicher Hinweis: "Keine Elemente erkannt. Du kannst im Editor alles manuell einzeichnen." Kein Blocker — direkt weiter zum Plan.
- **D-08:** 1-Foto-Warnung (PHOTO-07): Warnung anzeigen, dass mehr Fotos bessere Ergebnisse liefern, Analyse aber trotzdem versucht wird.

### Plan-Rendering-Stil

- **D-09:** **Skizzenhaft-warm** als visueller Stil — leicht organische Linien (nicht perfekt gerade), warme Erdfarben, weiche Schatten. Papier-artiger Hintergrund. Farbpalette: warmes Beige (#F5F0E8) Hintergrund, gedämpftes Grün (#8DB580) Rasen, Erde/Braun (#C4956A) Beete, Sand (#D4C5A9) Wege, Holz (#A0785A) Laube. Passt zu "gezeichnet, warm, nicht-klinisch" (PROJECT.md).

### Claude's Discretion

- **Freihand-Eckpunkt-Tool UX:** Researcher/Planner wählt den besten Touch-Ansatz für Polygon-Eingabe auf dem Handy (Raster-Tippen, manuelle Maße zwischen Eckpunkten, oder Hybrid). Hauptsache brauchbar auf iPhone-Screen.
- **Konfidenz-Darstellung:** Researcher/Planner entscheidet basierend auf dem tatsächlichen Claude Vision API-Output — ob Textlabel (sicher/unsicher), Prozent, Farbcode, oder automatische Default-Selektion. Was die API an Konfidenz-Daten hergibt bestimmt die Optionen.
- **Element-Symbole und Detailgrad:** Balance zwischen Einfachheit (schnelle Implementierung, gute Skalierung bei vielen Elementen) und Schönheit (skizzenhaft-warm passend zum Gesamtstil).
- **Plan-Interaktivität in Phase 4:** Entscheidung ob der Plan in Phase 4 rein statisch ist (Interaktivität kommt erst in Phase 5) oder ob Tap-auf-Element für Detailansicht schon hier implementiert wird. Scope-Risiko vs. UX-Mehrwert abwägen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope

- `.planning/ROADMAP.md` §"Phase 4: Garten-Erfassung (M1)" — Goal + 5 Success Criteria (guided capture, element confirmation, schematic plan, edge cases, rate limiting)
- `.planning/REQUIREMENTS.md` — PHOTO-01 bis PHOTO-08 (Foto-Flow, Maße, Resize, Claude Vision, Bestätigung, Plan-Render, Edge Cases), NFR-02 (async KI mit Loading-State), NFR-03 (KI-Budget 50/200 Calls/Tag)
- `.planning/PROJECT.md` §"Constraints" — KI-Budget, Datenschutz, Stil "gezeichnet, warm, nicht-klinisch"

### Prior-Phase-Decisions (Pflichtlektüre)

- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 (ai_jobs + ai_results Schema), Edge Function consumer Pattern, pgmq-Infrastruktur
- `.planning/phases/03-offline-sync-2-user-shared-state/03-CONTEXT.md` — D-17 bis D-20 (photo_queue, PhotoUploader, enqueue_photo_analysis RPC), D-25 (EXIF-Strip, Supabase Storage Encryption), D-26 (NFR-05 EXIF/GPS opt-in)

### Bestehender Code (erweitern, nicht neu bauen)

- `app/src/lib/photos/PhotoUploader.ts` — Upload-Worker für photo_queue (Plan 03-05); erweitern oder als Grundlage für den Capture-Flow nutzen
- `app/src/lib/photos/photoQueueRepo.ts` — enqueuePhoto() + patchPhoto() + EXIF-Strip-Integration (Plan 03-05); Photo-Lifecycle hier verwaltet
- `app/src/lib/photos/exifStrip.ts` (.native.ts / .web.ts) — Platform-spezifisches EXIF-Stripping bereits implementiert
- `supabase/functions/ai-job-consumer/index.ts` — **Mock-Placeholder in Zeile 46–49 muss durch echten Claude Vision Call ersetzt werden**. Pattern: Job aus pgmq lesen → Claude API aufrufen → raw_response + parsed_result in ai_results persistieren
- `supabase/functions/extract-vereinsregeln/index.ts` — Claude API Call-Pattern als Vorlage (Prompt-Konstruktion, Fehlerbehandlung, Response-Parsing)
- `app/src/lib/enqueueAiJob.ts` — Generisches AI-Job-Enqueue (pgmq); photo-spezifischer Pfad geht über `enqueue_photo_analysis` RPC
- `app/src/components/VereinsregelRow.tsx` — Confirm-List-Pattern (Toggle + Edit pro Eintrag) als UX-Vorlage für Element-Bestätigung

### Infrastruktur (bereits vorhanden, nutzen)

- Supabase Storage Bucket `photos` mit garden_id-scoped RLS (Migration 013, Plan 03-01)
- `photo_queue` Row-Table in StorageAdapter (SQLite + IndexedDB) mit Outbox-Integration (Plan 03-05)
- `enqueue_photo_analysis` Postgres-RPC (SECURITY DEFINER, member-check) (Plan 03-01)
- `ai_jobs` + `ai_results` Tabellen mit RLS (Migration 001)
- SyncWorker + SyncTriggers für automatischen Push/Pull bei Reconnect (Plan 03-04)
- Client-seitiger Foto-Resize auf max 1.15 MP muss in Phase 4 implementiert werden (PHOTO-03) — noch nicht im Code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `PhotoUploader.ts` + `photoQueueRepo.ts`: Kompletter Photo-Lifecycle (Queue → EXIF-Strip → Upload → RPC-Enqueue → Status-Patch). Phase 4 ergänzt den Capture-UI-Layer davor und den Analyse-Ergebnis-Layer danach.
- `ai-job-consumer/index.ts`: Edge Function Consumer-Pattern steht. Phase 4 ersetzt den Mock-Block (Zeile 46–49) durch echten Claude Vision API Call mit Zod-Validierung (T-3-03 aus Phase 1 Kommentar).
- `extract-vereinsregeln/index.ts`: Claude API Call-Pattern (Prompt → Response → Parse) direkt als Vorlage für den Photo-Analysis-Prompt nutzbar.
- `VereinsregelRow.tsx` + Confirm-Screen: Toggle-Liste-Pattern (accept/reject pro Eintrag) als UX-Vorlage für Element-Bestätigung.
- `ExtractionLoader.tsx`: Loading-Animation (NativeWind animate-pulse) für KI-Wartezeit wiederverwendbar.
- `InlineBanner.tsx`: Für Warnungen (1-Foto-Warning, Budget-Warnings) direkt nutzbar.

### Established Patterns

- **toRow/fromRow-Mapper** (Phase 2.5): camelCase↔snake_case für alle neuen Entities (plan_elements, garden_dimensions). Pflicht — verhindert Silent-Drops bei Upsert.
- **Typed Domain Errors** (Phase 2.5 P03): SQLSTATE-Mapping für spezifische Error-Klassen (wiederverwendbar für Rate-Limit-Errors).
- **writeWithOutbox** (Phase 3): Atomares Schreiben + Outbox-Eintrag für alle neuen garden-scoped Entities.
- **Account-Only Guard** (Phase 2.5 P03): Garten-Erfassung erfordert Account-Modus (Claude Vision = Server-seitiger API Call).

### Integration Points

- `app/app/(app)/` — Neue Screens für Capture-Flow (Route-Gruppe z.B. `capture/` oder `garden-setup/`)
- `supabase/functions/ai-job-consumer/index.ts` — Claude Vision Call einbauen (Mock → Prod)
- `supabase/migrations/` — Neue Migration für `garden_dimensions` + `plan_elements` Tabellen (garden_id-scoped, LWW-Trigger-Template aus Phase 3 D-08)
- `packages/shared/src/types/entities.ts` — Neue Interfaces: `GardenDimensionsRow`, `PlanElementRow`
- `app/src/storage/migrations.ts` — Lokale Row-Tables für die neuen Entities (Phase 3 D-03 Pattern)

</code_context>

<specifics>
## Specific Ideas

- **Vereinsregeln-Confirm-Pattern wiederverwenden:** Die Toggle-Liste für Element-Bestätigung soll dem Pattern aus Phase 02-04 folgen (VereinsregelRow mit Accept/Reject pro Eintrag). Konsistente UX über die App hinweg.
- **"Gezeichnet, warm, nicht-klinisch"** ist der Leitsatz für den Plan-Rendering-Stil. Farbpalette: warmes Beige, gedämpftes Grün, Erde/Braun. Keine Neon-Farben, keine sterilen Architektur-Linien. Mehr "hübsche Skizze auf Papier" als "technischer Bauplan".
- **Foto-Resize vor Upload (PHOTO-03):** 1.15 MP max — das schützt die Edge Function vor CPU-Limit-Überschreitung bei großen Fotos. Muss client-seitig passieren, bevor das Foto in die photo_queue geht.
- **Claude Vision Prompt muss strukturiertes JSON zurückgeben** mit Element-Typ, Position in Gartenmetern (relativ zur Grundform), geschätzter Größe, und Konfidenz. Das JSON wird in `ai_results.parsed_result` persistiert und vom Client für die Bestätigung und das Plan-Rendering konsumiert.
- **Budget-Tracking (NFR-03):** Soft-Warnung bei 50 Claude-Calls/Tag, Hard-Stop bei 200/Tag. Zählung läuft über `ai_jobs`-Tabelle (`WHERE created_at > today AND garden_id = X`). Edge Function prüft vor dem Claude-Call.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-garten-erfassung-m1*
*Context gathered: 2026-05-02*
