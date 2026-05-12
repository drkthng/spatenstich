# Phase 7: Plan-Editor + Drafts-Integration (M2 + M07.5) - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Mode:** `--auto` — Claude selected recommended defaults for each gray area; user can override before planning by editing this file.

<domain>
## Phase Boundary

Interaktiver 2D-Plan-Editor: Dirk (und Frau) platzieren, bewegen, rotieren, skalieren und löschen Gartenelemente (Beete, Pflanzen, Infrastruktur) auf einem Skia-Canvas in Garten-Metern. Inkl. 1×1-m-Gitter, zwei Layern (Infrastruktur dauerhaft / Jahresplan saisonspezifisch), Undo/Redo (20 Schritte), Auto-Save (5 s) und Manual-Save. Import-Drafts aus Phase 6.5 erscheinen als „Letzte Importe"-Tray; Bed-Drafts werden per Drag auf den Canvas zu echten `plan_elements` promoted (Wiederverwendung der `draftPromotionRepo`-Funktionen aus 6.5).

**Im Scope:** EDIT-01..09, EDIT-11, EDIT-12, DRAFT-03 (Stale-Imports-Badge nach 30 Tagen).
**Nicht im Scope:** EDIT-10 Vereinsregel-Warnung (Phase 10), DRAFT-01/02 (bereits in 6.5 als Sichtungs-Screen geliefert — werden hier nur erweitert mit Editor-Tray), Saatgut-Inventar (Phase 8), Kalender-Integration (Phase 9), Foto-Anhang (Phase 3 Photo-Queue).

</domain>

<decisions>
## Implementation Decisions

### Rendering & Performance
- **D-01:** **`@shopify/react-native-skia` als Canvas-Renderer.** EDIT-01 fordert ihn explizit; EDIT-12 (60 fps bei 200 Elementen) ist mit `react-native-svg` nicht erreichbar. Bestehender `GardenPlanView.tsx` (static SVG) bleibt für read-only Kontexte (Home-Preview), wird aber nicht im Editor verwendet.
- **D-02:** **Gesten: `react-native-gesture-handler` (Pan, Pinch, Long-Press, Tap) + `react-native-reanimated` Worklets** auf dem Skia-Canvas. Reanimated v3.17.4 ist bereits installiert; gesture-handler wird neu hinzugefügt. Worklet-Hit-Tests im UI-Thread, kein JS-Bridge-Roundtrip pro Frame.
- **D-03:** **Koordinaten-Kanonik = Meter.** Alle `plan_elements.x/y/widthM/heightM` werden in Garten-Metern persistiert (Phase 4-Schema bleibt). Pixel-Transform passiert ausschließlich im Renderer (View-Matrix). Zoom/Pan ändern nicht die Daten.
- **D-04:** **Performance-Budget:** 200 Elemente, gemessen auf realem iPhone (siehe EDIT-12). Wenn ein Plan ein Smoke-Test-Budget reißt: Skia `useCanvasRef` + Element-Culling außerhalb Viewport vor Optimierung anderer Pfade.

### State, Save, Undo/Redo
- **D-05:** **Editor-State in neuem Zustand-Store `editorStore.ts` mit `zundo`-Temporal-Middleware** (20 Snapshots, EDIT-11). Snapshot = serialisiertes Element-Set + Selection. Pattern folgt bestehendem Zustand-Setup (`importStore`, `reviewSettingsStore`).
- **D-06:** **Auto-Save:** Debounced 5 s nach letzter Mutation → `gardenPlanRepo.scheduleWriteDebounced` (existiert bereits, Phase 4 P01). Manueller Save-Button in der Toolbar löst sofortigen Flush aus.
- **D-07:** **Save-Granularität:** pro Element (write-each-changed), nicht ganzer Plan. Outbox-Pattern aus Phase 3 (LWW per `updatedAt`) bleibt unverändert; Editor sendet einzelne Element-Mutationen.

### Editor UX
- **D-08:** **Element-Palette:** Bottom-Tab-Bar mit drei Kategorien — **Beete**, **Pflanzen**, **Infrastruktur** (Laube, Weg, Zaun, Wasser, Kompost, Baum, Sitzplatz, Sonstiges). Long-press auf einen Palette-Eintrag startet Drag; Drop platziert das Element am Finger-Down-Punkt.
- **D-09:** **Beet-Polygon (EDIT-05):** Tap-to-add-corner-Modus, abschließbar per expliziten **„Beet abschließen"-Button** in der Toolbar (verhindert versehentliches Schließen durch Doppel-Tap). Mindestens 3 Punkte; visualisiert Live-Polygon mit gestrichelter Linie.
- **D-10:** **Pflanzenabstand-Hinweis (EDIT-07):** Bei Drop einer Pflanze erscheint ein **Ghost-Ring** mit dem Mindestabstand aus `species.spacingCm`. Bei Überlappung mit Nachbar-Pflanze: roter Ring + Toast „Mindestabstand unterschritten" (nicht-blockierend — Dirk darf trotzdem platzieren).
- **D-11:** **Selection-Modell:** Single-select via Tap; Drag bewegt selektiertes Element; Toolbar zeigt kontextuelle Aktionen (Rotate, Scale, Delete). Multi-select wird auf später vertagt.
- **D-12:** **Layers (EDIT-08):** zwei Layer fest verdrahtet — `infrastructure` (Beete, Wege, Laube, Zaun, Wasser, Kompost, Baum, Sitzplatz, Sonstiges) und `seasonal` (Pflanzen). Toggle per Eye-Icon in der Toolbar blendet den jeweiligen Layer aus. Layer ist eine neue **Spalte auf `plan_elements`** (Migration, siehe D-15), defaultet basierend auf `kind`.
- **D-13:** **Grid (EDIT-01):** 1×1-m-Gitter als Skia-Background-Layer mit Toggle in der Toolbar; gleicher Farbton wie `GardenPlanView` (PLAN_COLORS.grid = `#D6CFC4`). Snap-to-grid ist OFF im MVP — kann ohne Schema-Änderung in einer späteren Phase aktiviert werden.

### Drafts Integration
- **D-14:** **„Letzte Importe"-Tray (DRAFT-01 Reuse):** Bottom-Sheet (collapsed: Chip mit Counter, expanded: scrollbare Card-Liste). Wiederverwendung von `DraftReviewCard.tsx` aus Phase 6.5 mit angepasstem Mini-Layout. Bed-Drafts: Drag aus Tray auf Canvas → ruft `promoteBedDraft(draftId, finalCoords)` aus `draftPromotionRepo.ts`. Pflanzen-Drafts: Tap-Aktion „Auf Beet anwenden" → modale Beet-Auswahl → `promotePlantDraft(...)`.
- **D-15:** **Stale-Imports (DRAFT-03):** Berechnet on-render (`Date.now() - importedAt > 30 days`). „Stale"-Badge auf der Draft-Card im Tray; zusätzlicher Filter „Alle / Aktuell / Stale". **Keine** Auto-Delete-Logik. Keine Migration nötig (`imported_at` existiert seit Migration 016).

### Data Model
- **D-16:** **Migration 018** — `plan_elements.layer text not null default 'infrastructure'` mit CHECK `layer in ('infrastructure','seasonal')`. Backfill: bestehende Rows bleiben `infrastructure`. Plant-Rows (`kind='plant'`) bekommen beim nächsten Write `seasonal`. Folgt 6.5-P05-Push-Gate (list-linked → dry-run → push).
- **D-17:** **Provenance bei Promotion bleibt aus 6.5:** `imported_from = draftId`, `provenance = 'import'` für promoted Elemente; manuelle Elemente bekommen `provenance = 'manual'`. Schema dieser Spalten ist seit Migration 017 live.

### Claude's Discretion
- Skia-spezifische Implementation-Details: Canvas-Layer-Aufteilung, Reanimated Shared-Values-Layout, Worklet-Boundary für Hit-Tests
- Toolbar-Layout-Reihenfolge und exakte Icons (lucide-react-native ist bereits über Phase 6.5 P05 jest-mock global verfügbar)
- i18n-Strings für Editor in `de.json` (Toolbar-Labels, Toast-Texte, Confirm-Dialoge)
- Element-Rotation-UI: Drehgriff vs. Two-Finger-Rotate (Empfehlung: Two-Finger via gesture-handler)
- Exakte Zoom-/Pan-Limits und Initial-Viewport-Berechnung
- Test-Strategie pro Plan: Wave-0-Scaffold-Pattern aus 6.5 P01 wiederverwenden, falls nützlich (Plan-Aufteilung entscheidet sich erst in plan-phase)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Spezifikation
- `.planning/ROADMAP.md` §"Phase 7: Plan-Editor + Drafts-Integration" — Goal + 7 Success Criteria
- `.planning/REQUIREMENTS.md` §"Plan-Editor (M2)" — EDIT-01..12 (EDIT-10 deferred zu Phase 10)
- `.planning/REQUIREMENTS.md` §"Drafts-Integration (Phase 7 — Pivot M07)" — DRAFT-01..03 (01/02 bereits durch 6.5 erfüllt; 03 neu hier)

### Tech-Stack-Kontext
- `CLAUDE.md` §"Recommended Stack" — Skia HIGH, gesture-handler HIGH, reanimated v3 HIGH, Zustand HIGH
- `CLAUDE.md` §"What NOT to Use" — react-native-svg für Plan-Editor explizit abgelehnt (begründet im Stack-Doc)

### Pivot- & Schema-Kontext
- `docs/specs/M07-claude-ai-bridge.md` — Pivot-Spec; Editor ist die manuelle Default-Erfahrung post-M07
- `schemas/spatenstich-import.v1.json` — Draft-Source-Format; bestimmt was die Promotion-Repos erwarten

### Prior Phase Contexts
- `.planning/phases/06.5-draft-sichtung-promotion/06.5-PATTERNS.md` — Promotion-Repo-Pattern, DraftReviewCard, Mapper-Konventionen
- `.planning/phases/06.5-draft-sichtung-promotion/06.5-RESEARCH.md` — Promotion-Idempotenz-Strategie und Layout-Helper
- `.planning/phases/06-import-flow-companion-prompt-m07-3-m07-4/06-CONTEXT.md` §"Draft-Lifecycle" — D-14..D-19 (Drafts/Imports-Tables, RLS, Outbox)
- `.planning/phases/03-offline-sync-2-user-shared-state/03-CONTEXT.md` — Outbox-Pattern, LWW-Semantik, SyncWorker-Integration

### Existing Code (Integration Points)
- `app/src/components/GardenPlanView.tsx` — static SVG-Renderer; bleibt für Home-Preview, NICHT im Editor verwendet
- `app/src/lib/gardenPlanRepo.ts` — CRUD für `plan_elements` + `scheduleWriteDebounced` für Auto-Save
- `app/src/lib/draftPromotionRepo.ts` — `promoteBedDraft`, `promotePlantDraft`, `promoteObservationDraft`, `dismissDraft` aus 6.5 P03 (write-once, idempotent)
- `app/src/components/DraftReviewCard.tsx` — wiederverwendbare Card aus 6.5 P04
- `app/src/lib/mappers/rowMappers.ts` §`planElementToDb` (lines 409-426) — wird um `layer` erweitert
- `packages/shared/src/types/entities.ts` §`PlanElementRow` — wird um `layer` erweitert
- `app/src/stores/importStore.ts` — Zustand-Pattern als Vorlage für `editorStore`
- `app/src/stores/reviewSettingsStore.ts` — Persistenz-Pattern (AsyncStorage) als Vorlage für Editor-Preferences (z. B. Grid-Toggle, Active-Layer)
- `supabase/migrations/20260512000017_plan_elements_provenance.sql` — Vorlage für Migration 018 (DO-block invariant pattern)

### New Dependencies (vorgeschlagen)
- `@shopify/react-native-skia` — Canvas-Renderer (HIGH confidence per Stack-Doc)
- `react-native-gesture-handler` — Multi-Touch + Hit-Tests (HIGH)
- `zundo` — Zustand-Temporal-Middleware für Undo/Redo (klein, treeshakeable; Pattern bewährt)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`draftPromotionRepo.ts`** (Phase 6.5 P03) — vollständige Promotion-API für Bed/Plant/Observation-Drafts inkl. Idempotenz-Check und `nextFreeBedSlot`-Layout-Helper. Editor ruft diese Funktionen ohne Modifikation.
- **`DraftReviewCard.tsx`** (Phase 6.5 P04) — kann mit kompakterer Variante in den Editor-Tray gerendert werden (Props sind bereits parametrisiert).
- **`gardenPlanRepo.ts`** (Phase 4 P01) — `loadAcceptedElements`, `writePlanElement`, `scheduleWriteDebounced` decken Auto-Save und Read-Pfade ab.
- **`TrafficLightBadge.tsx`** — kann für Stale-Status (rot/gelb/grün nach Alter des Imports) wiederverwendet werden.
- **`InlineBanner.tsx`** — für Toasts „Mindestabstand unterschritten", „Plan gespeichert", etc.
- **lucide-react-native global jest-mock** in `app/src/components/__tests__/setup.ts` (Phase 6.5 P05) — bleibt aktiv, deckt alle Editor-Icons ab.
- **Storage-Keys** in `reviewSettingsStore.ts` — gleicher AsyncStorage-Pattern für Editor-Preferences.

### Established Patterns
- **Repo + writeWithOutbox + scheduleWriteDebounced** — wird auch im Editor für jedes Element-Write angewandt (atomar pro Mutation).
- **Outbox + LWW (Phase 3)** — `updatedAt`-Vergleich, kein Conflict-Resolution-UI. Editor profitiert ohne Zusatzarbeit.
- **Zustand-Store + AsyncStorage-Persist** — Schema-Version-Feld, `assertAccount`-Pattern, hydration-on-mount.
- **Migration-Trio** `aa_/mm_/zz_` für LWW-Trigger — bei Schema-Erweiterung NICHT auf write-once Tabellen (gilt nicht für `plan_elements`).
- **TDD-First (RED → GREEN → Refactor)** mit Wave-0-Scaffold — bewährtes Pattern aus 6.5; Plan-Aufteilung entscheidet plan-phase.
- **Expo Router File-Based** — neue Route z. B. `app/(app)/plan/index.tsx` (oder Editor in bestehenden Plan-Screen integrieren — Entscheidung in plan-phase).
- **NativeWind/Tailwind** Klassen für alles außerhalb des Canvas; Dark-Mode via `dark:`-Prefix.

### Integration Points
- **Home-Screen** (`app/app/(app)/index.tsx`) — Einstiegspunkt „Plan öffnen" (existiert bereits in 6.5 als Empty State; muss zum Editor verlinken).
- **`app/app/(app)/_layout.tsx`** — Editor-Route registrieren.
- **SyncWorker** (`app/src/lib/sync/`) — keine neue Entity-Registrierung nötig (`plan_elements` ist bereits gesynct seit Phase 4); nur Layer-Spalte ergänzt sich automatisch durch Mapper-Update.
- **`packages/shared/src/types/entities.ts`** — `PlanElementRow` erweitern um `layer: 'infrastructure' | 'seasonal'`.
- **`schemas/`** ist unverändert — keine Schema-Drift-Implikationen.

### Open Constraints
- Skia-Web-Support unter Expo Web ist Beta. Falls Web-Editor-Funktionalität für die Frau auf dem Desktop kritisch ist, muss in plan-phase recherchiert werden (Skia hat Canvaskit-WASM-Backend, COOP/COEP-Header-Anforderung ähnlich expo-sqlite). Im Zweifel: Editor mobile-first, Web zeigt read-only `GardenPlanView`.
- gesture-handler v2 + Expo SDK 53 → SDK 55-Migration-Risiko falls SDK gewechselt wird. Aktuell SDK 53 stable (siehe Phase 01 Decision).

</code_context>

<specifics>
## Specific Ideas

- **Drafts-Tray-Chip in der Toolbar:** Counter zeigt offene Drafts (analog Phase 6.5 Sichtungs-Screen). Klick expandiert Bottom-Sheet — verhindert ständigen Visual Noise.
- **Layer-Toggle als Eye-Icon** (analog gängigen 2D-Design-Tools) — vertraute Metapher für Dirk, intuitiv ohne Tutorial.
- **„Beet abschließen"-Button** statt Doppel-Tap — Phase 6.5-Pattern „explizit > implizit" konsistent fortgesetzt (P04 D-...).
- **Ghost-Ring statt Pop-up** für Pflanzenabstand — non-blocking, ästhetisch, lässt Dirk schnell weiterarbeiten.
- **Stale-Badge auf Draft-Cards** statt separater „Stale Imports"-Ansicht — Sichtbarkeit ohne Navigations-Tax.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-Select + Bulk-Operations** — sinnvoll, aber EDIT-Requirements decken nur Single-Select-Workflows ab. Kandidat für v1.1.
- **Snap-to-Grid** — Schema unterstützt es ohne Migration; UX-Toggle erst aktivieren, wenn Dirk explizit fragt. Kein Roadmap-Eintrag nötig.
- **Element-Locking / -Gruppierung** — nicht in EDIT-Requirements.
- **Skia auf Web (Editor-Modus)** — wenn Demand entsteht, eigene Mini-Phase wegen Canvaskit-Hosting-Headers. Aktuell Web = read-only Preview.
- **Smart-Layout-Vorschläge** beim Bed-Draft-Drop — könnte später in Phase 9 (Kalender) als „intelligent placement" auftauchen.
- **EDIT-10 Vereinsregel-Warnung inline** — bewusst nach Phase 10 verschoben (Pivot 2026-04-21).

### Reviewed Todos (not folded)
None — keine offenen Todos in `.planning/todos/pending/`.

</deferred>

---

*Phase: 07-plan-editor-drafts-integration-m2-m07-5*
*Context gathered: 2026-05-12*
*Mode: `--auto` (Claude selected recommended defaults)*
