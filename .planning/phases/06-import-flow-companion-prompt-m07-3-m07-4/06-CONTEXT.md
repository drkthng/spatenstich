# Phase 6: Import-Flow + Companion-Prompt - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Zwei Arbeitsbereiche:
1. **Companion-Prompt (M07.3):** `prompts/garden-project-system-prompt.md` für das Claude.ai "Spatenstich Garden"-Projekt schreiben. Inkl. Setup-Anleitung für Dirk.
2. **Import-Flow (M07.4):** `ImportFromClaudeAiScreen` mit Share-Intent + Paste-Fallback → Preview mit Entity-Toggles + Confidence-Badges → selektive Übernahme als Drafts in Supabase.

Nicht im Scope: Plan-Editor (Phase 7), Drafts-Tray im Editor (Phase 7, DRAFT-01/02/03), Vereinsregeln-Anzeige (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Companion-Prompt (M07.3)
- **D-01:** Prompt auf **Deutsch**, konversationeller Ton, fachlich fundiert. Claude antwortet Dirk auf Deutsch, nutzt gärtnerische Fachbegriffe (Hochbeet, Mischkultur, Fruchtfolge) ohne übermäßig akademisch zu wirken.
- **D-02:** Prompt deckt ab: **BKleingG**, **Sächsische RKO**, **Leipzig-spezifische Regeln**, Pflanzen-ID-Heuristiken für Klimazone 7a (Zentraleuropa). Modell-Empfehlung: Opus 4.7.
- **D-03:** **Output-Disziplin:** Jede Foto-Analyse-Session endet mit einem fenced ` ```json ` Block der `spatenstich-import.v1` entspricht. Bei unklarem Foto: Rückfrage statt Halluzination.
- **D-04:** Setup-Anleitung im Prompt-Dokument: Projektname, Knowledge-Files (BKleingG-Text, RKO-Text, Leipzig Pachtvertrag-Template), "Re-emit last payload"-Instruktion.
- **D-05:** Das Schema `schemas/spatenstich-import.v1.json` wird als Knowledge-File im Claude.ai-Projekt hinterlegt, damit Claude den exakten Kontrakt kennt.

### Import-Screen Navigation (M07.4)
- **D-06:** Neue Route `app/(app)/import/` als eigener Stack. Screens: `index.tsx` (Einstieg: Share-Intent-Empfang oder Paste-Textarea), `preview.tsx` (Entity-Preview + Toggles).
- **D-07:** Zugang zum Import über einen **Button auf dem Home-Screen** (Empty State + Plan-View). Text: "Aus Claude.ai importieren". Kein eigener Tab — Import ist Power-User-Feature, nicht Hauptnavigation.
- **D-08:** **Share-Intent:** App registriert sich als Handler für `application/json` via Expo config plugin. Custom URL Scheme `spatenstich://import` für Deep Links.
- **D-09:** **Paste-Fallback:** Große Textarea auf dem Import-Einstiegsscreen für Desktop-Claude.ai-Chat oder wenn Share nicht verfügbar ist. Inline-Validierung beim Einfügen.

### Preview-UI-Gestaltung
- **D-10:** **Card-basierte Liste** mit Entity-Toggles pro Entity (Bed, Plant, Observation). Jede Card zeigt: Label/Name, Key-Details (Dimensionen bei Beds, Sorte bei Plants), Toggle zum Ein-/Ausschalten.
- **D-11:** **Confidence-Chip** auf jeder Card: grün (≥ 0.8), gelb (0.6–0.79), rot (< 0.6). Rot-Chips zeigen Warning-Text. Entities mit Confidence < 0.6 können nicht per Bulk-Accept übernommen werden — expliziter Einzel-Toggle nötig.
- **D-12:** **Fehler-Handling:** Ungültiger Payload → Inline-Fehlermeldung mit konkretem Hinweis (`schemaVersion fehlt`, `unbekannte bedRef`, etc.) + "Schema kopieren"-Button der das aktuelle Schema in die Zwischenablage kopiert.
- **D-13:** **Sections-Gruppierung:** Preview gruppiert nach Typ: Beete → Pflanzen → Beobachtungen → Compliance (ausgegraut, Phase 10) → Freitext-Notizen.

### Offline-Import-Verhalten
- **D-14:** **Offline-first:** Import-Parsing und Preview funktionieren komplett offline (JSON-Validierung lokal). Drafts werden zuerst in **lokale SQLite-Tabellen** geschrieben (konsistent mit Phase-3-Pattern).
- **D-15:** Supabase-Sync der Drafts bei Reconnect über bestehenden Sync-Worker (Phase 3 Outbox-Pattern). Neue Sync-Entities: `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts`.
- **D-16:** **Draft-Lifecycle:** Drafts bleiben bestehen bis explizit promoted (Phase 7) oder manuell gelöscht. Nach 30 Tagen ohne Promotion: "Stale Import"-Badge, aber kein Auto-Delete.

### Supabase-Tables
- **D-17:** Tables mit RLS auf garden_member-Check (Phase 2.5 Pattern). Alle Imports getaggt mit `source: 'claude-ai-project'`, `importedAt`, optional `chatReference`.
- **D-18:** `imports`-Table als Header mit Referenz auf Payload-Metadaten (timestamp, source, chatReference). `import_items` als Detail mit FK auf `imports` und Typ-Discriminator.
- **D-19:** Draft-Tables (`bed_drafts`, `plant_drafts`, `observation_drafts`) mit FK auf `import_items` und `garden_id`. Status-Feld: `pending` | `promoted` | `dismissed`.

### Claude's Discretion
- Migration-Nummer und exakte Column-Definitionen für Draft-Tables
- Share-Intent Expo Plugin Konfiguration (platform-spezifisch iOS vs Android)
- i18n-Strings für Import-Flow in `de.json`
- Genaue Aufteilung der Preview-Card-Layouts (welche Felder prominent, welche sekundär)
- Companion-Prompt-Feinschliff (exakte Formulierungen, Beispiel-Analysen)
- Ob `complianceFlags` in Preview ausgegraut oder komplett ausgeblendet werden

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pivot-Spezifikation
- `docs/specs/M07-claude-ai-bridge.md` — Definiert den kompletten Pivot: Workflow, Constraints, Datenkontrakt, Acceptance Criteria für M07.3 und M07.4. **Hauptreferenz.**

### Import-Schema (Phase 5 Output)
- `schemas/spatenstich-import.v1.json` — JSON Schema (draft 2020-12). Der Kontrakt den der Companion-Prompt emittieren muss und den die App validiert.
- `schemas/examples/full.json` — Vollständiger Referenz-Payload
- `schemas/examples/minimal.json` — Minimaler Referenz-Payload
- `schemas/examples/edge-cases.json` — Edge-Cases (niedrige Confidence, fehlende optionale Felder)

### Requirements
- `.planning/REQUIREMENTS.md` §Import-Flow (IMPORT-03 bis IMPORT-08) — Acceptance Criteria

### Prior Phase Context
- `.planning/phases/05-ai-removal-import-schema/05-CONTEXT.md` — Schema-Design-Entscheidungen (D-11 complianceFlags, D-12 freeFormNotes, D-13 Versionierung, D-14 Dateistruktur)
- `.planning/phases/03-offline-sync-2-user-shared-state/03-CONTEXT.md` — Sync-Pattern und Outbox-Architektur

### Bestehender Code (Integration Points)
- `app/app/(app)/index.tsx` — Home-Screen, hier Import-Button einfügen
- `app/app/(app)/_layout.tsx` — App-Layout (Stack), Import-Route registrieren
- `app/src/lib/sync/` — Bestehender Sync-Worker für Outbox-Pattern
- `app/src/stores/authStore.ts` — `activeGardenId` für garden-scoped Drafts
- `packages/shared/src/types/entities.ts` — Hier neue Draft-Entity-Types definieren

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/src/components/GardenPlanView.tsx` — SVG-Plan-Rendering, relevant für Draft-Preview falls Beet-Dimensionen visualisiert werden sollen
- `app/src/components/TrafficLightBadge.tsx` — Grün/Gelb/Rot-Badge, direkt nutzbar für Confidence-Chips
- `app/src/components/InlineBanner.tsx` — Banner-Komponente für Fehler/Warnungen
- `app/src/lib/gardenPlanRepo.ts` — Repo-Pattern für Supabase-Queries (Table-spezifische Repos)
- `app/src/hooks/useFlag.ts` — Feature-Flag Hook (falls Import hinter Flag starten soll)

### Established Patterns
- **Supabase-Repos:** Pro Table ein Repo-File in `app/src/lib/` mit CRUD-Funktionen
- **Stores:** Zustand-Stores in `app/src/stores/` für globalen State
- **RLS:** member-check Pattern über `garden_members` (Phase 2.5)
- **Routing:** Expo Router file-based, Groups in `(app)/` und `(auth)/`
- **Sync:** Outbox-Queue mit SyncWorker (Phase 3)
- **Styling:** NativeWind/Tailwind Klassen, Dark-Mode Support (`dark:bg-...`)

### Integration Points
- Home-Screen (`app/app/(app)/index.tsx`) — Import-Button hinzufügen
- App-Layout (`app/app/(app)/_layout.tsx`) — Import-Stack-Route
- Sync-Worker — Neue Draft-Entities in Sync-Entity-Liste registrieren
- Shared Types (`packages/shared`) — Import-/Draft-Types exportieren

</code_context>

<specifics>
## Specific Ideas

- **TrafficLightBadge** bereits vorhanden — direkt als Confidence-Chip wiederverwendbar (grün/gelb/rot Mapping auf Confidence-Schwellwerte).
- **complianceFlags** im Preview ausgegraut mit Hinweis "Wird in zukünftiger Version angezeigt" — nicht verstecken, damit Dirk sieht dass Claude.ai sie emittiert.
- **Companion-Prompt** sollte auch eine "Re-emit last payload"-Instruktion enthalten, falls Dirk den JSON-Block beim Transfer verliert (M07-Spec Risiko-Mitigation).
- **Schema als Knowledge-File:** Der Companion-Prompt verweist auf das Schema-File, das Dirk im Claude.ai-Projekt als Knowledge-File hochladen soll.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-import-flow-companion-prompt-m07-3-m07-4*
*Context gathered: 2026-05-09*
