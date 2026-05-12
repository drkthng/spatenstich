# Phase 7: Plan-Editor + Drafts-Integration (M2 + M07.5) — Research

**Researched:** 2026-05-12
**Domain:** Interaktiver Skia-Canvas-Editor in Expo SDK 53 + gesture-handler + zundo undo/redo + Drafts-Tray-Integration mit `draftPromotionRepo`
**Confidence:** HIGH

## Summary

Phase 7 baut den ersten interaktiven Bildschirm der App: einen GPU-beschleunigten 2D-Plan-Editor in Garten-Metern mit Drag&Drop, Polygon-Beet-Zeichnen, Two-Layer-Toggle, Undo/Redo und 5-Sekunden-Auto-Save, plus ein Drafts-Tray, das die in Phase 6.5 gelegte Promotion-Infrastruktur (`promoteBedDraft` / `promotePlantDraft`) unter neuer UI wiederverwendet.

Der gesamte **Persistenz-, Sync-, Mapper- und Promotion-Layer existiert bereits** und ist seit Phase 6.5 produktiv: `gardenPlanRepo` schreibt einzelne `plan_elements` via `writeWithOutbox`, `scheduleWriteDebounced` (500 ms) flusht zum Sync-Worker, Migration 017 hat `imported_from + provenance` live auf Supabase Frankfurt, und `draftPromotionRepo` deckt Bed-, Plant- und Observation-Promotion idempotent ab. Phase 7 muss **Null neuen Sync- oder Mapper-Code** schreiben; sie verbraucht nur, was schon da ist.

Die echten Risikoflächen sind: (1) **Skia-Version-Pinning** — Projekt ist auf React Native 0.76.7 + React 18.3.1, also muss `@shopify/react-native-skia@1.12.4` verwendet werden, nicht v2.x (peer `react-native<0.78, react<19`); (2) **GestureHandlerRootView-Platzierung** im Expo-Router-Root-Layout; (3) **Skia-Hit-Test-Strategie** — Bounding-Box-Tests in JS mit Meter-Koordinaten, Polygon-Hit über Skia's `Path.contains()` nur wenn nötig; (4) **Migration 018** für die `layer`-Spalte, exakt dem 017-DO-Block-Muster folgend; (5) **zundo + Zustand v5** Kompatibilität verifiziert; (6) **Stale-Badge (DRAFT-03)** braucht eine JOIN-Erweiterung von `loadPendingDrafts` weil `imported_at` auf `imports`, nicht auf den Draft-Tabellen liegt.

**Primary recommendation:** Plan-Aufteilung folgt dem 6.5-Wellen-Pattern — Wave 0 Test-Scaffold (TDD-RED), Wave 1 Migration 018 + Types + Mapper (Schema-Foundation), Wave 2 `editorStore` mit zundo + Auto-Save-Integration (State), Wave 3 Skia-Canvas + Gesten + Palette (UI-Core), Wave 4 Drafts-Tray + Polygon-Tool + Stale-Badge (UI-Integration), Wave 5 DB Push + Human-Verify. Verifikation läuft über Unit-Tests für State/Geometrie und Component-Tests für UI mit gemockten Repos. 60-fps-Budget (EDIT-12) wird in `gsd-verify-work` als manueller Smoke-Test auf realem iPhone abgenommen, nicht durch CI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rendering & Performance**
- **D-01:** `@shopify/react-native-skia` als Canvas-Renderer. EDIT-01 fordert ihn explizit; EDIT-12 (60 fps bei 200 Elementen) ist mit `react-native-svg` nicht erreichbar. Bestehender `GardenPlanView.tsx` (static SVG) bleibt für read-only Kontexte (Home-Preview), wird aber nicht im Editor verwendet.
- **D-02:** Gesten: `react-native-gesture-handler` (Pan, Pinch, Long-Press, Tap) + `react-native-reanimated` Worklets auf dem Skia-Canvas. Reanimated v3.17.4 ist bereits installiert; gesture-handler wird neu hinzugefügt. Worklet-Hit-Tests im UI-Thread, kein JS-Bridge-Roundtrip pro Frame.
- **D-03:** Koordinaten-Kanonik = Meter. Alle `plan_elements.x/y/widthM/heightM` werden in Garten-Metern persistiert (Phase 4-Schema bleibt). Pixel-Transform passiert ausschließlich im Renderer (View-Matrix). Zoom/Pan ändern nicht die Daten.
- **D-04:** Performance-Budget: 200 Elemente, gemessen auf realem iPhone (siehe EDIT-12). Wenn ein Plan ein Smoke-Test-Budget reißt: Skia `useCanvasRef` + Element-Culling außerhalb Viewport vor Optimierung anderer Pfade.

**State, Save, Undo/Redo**
- **D-05:** Editor-State in neuem Zustand-Store `editorStore.ts` mit `zundo`-Temporal-Middleware (20 Snapshots, EDIT-11). Snapshot = serialisiertes Element-Set + Selection. Pattern folgt bestehendem Zustand-Setup (`importStore`, `reviewSettingsStore`).
- **D-06:** Auto-Save: Debounced 5 s nach letzter Mutation → `gardenPlanRepo.scheduleWriteDebounced` (existiert bereits, Phase 4 P01). Manueller Save-Button in der Toolbar löst sofortigen Flush aus.
- **D-07:** Save-Granularität: pro Element (write-each-changed), nicht ganzer Plan. Outbox-Pattern aus Phase 3 (LWW per `updatedAt`) bleibt unverändert; Editor sendet einzelne Element-Mutationen.

**Editor UX**
- **D-08:** Element-Palette: Bottom-Tab-Bar mit drei Kategorien — Beete, Pflanzen, Infrastruktur (Laube, Weg, Zaun, Wasser, Kompost, Baum, Sitzplatz, Sonstiges). Long-press auf einen Palette-Eintrag startet Drag; Drop platziert das Element am Finger-Down-Punkt.
- **D-09:** Beet-Polygon (EDIT-05): Tap-to-add-corner-Modus, abschließbar per expliziten „Beet abschließen"-Button in der Toolbar (verhindert versehentliches Schließen durch Doppel-Tap). Mindestens 3 Punkte; visualisiert Live-Polygon mit gestrichelter Linie.
- **D-10:** Pflanzenabstand-Hinweis (EDIT-07): Bei Drop einer Pflanze erscheint ein Ghost-Ring mit dem Mindestabstand aus `species.spacingCm`. Bei Überlappung mit Nachbar-Pflanze: roter Ring + Toast „Mindestabstand unterschritten" (nicht-blockierend — Dirk darf trotzdem platzieren).
- **D-11:** Selection-Modell: Single-select via Tap; Drag bewegt selektiertes Element; Toolbar zeigt kontextuelle Aktionen (Rotate, Scale, Delete). Multi-select wird auf später vertagt.
- **D-12:** Layers (EDIT-08): zwei Layer fest verdrahtet — `infrastructure` (Beete, Wege, Laube, Zaun, Wasser, Kompost, Baum, Sitzplatz, Sonstiges) und `seasonal` (Pflanzen). Toggle per Eye-Icon in der Toolbar blendet den jeweiligen Layer aus. Layer ist eine neue Spalte auf `plan_elements` (Migration 018).
- **D-13:** Grid (EDIT-01): 1×1-m-Gitter als Skia-Background-Layer mit Toggle in der Toolbar; gleicher Farbton wie `GardenPlanView` (PLAN_COLORS.grid = `#D6CFC4`). Snap-to-grid ist OFF im MVP.

**Drafts Integration**
- **D-14:** „Letzte Importe"-Tray (DRAFT-01 Reuse): Bottom-Sheet (collapsed: Chip mit Counter, expanded: scrollbare Card-Liste). Wiederverwendung von `DraftReviewCard.tsx` aus Phase 6.5 mit angepasstem Mini-Layout. Bed-Drafts: Drag aus Tray auf Canvas → ruft `promoteBedDraft(draftId, finalCoords)` aus `draftPromotionRepo.ts`. Pflanzen-Drafts: Tap-Aktion „Auf Beet anwenden" → modale Beet-Auswahl → `promotePlantDraft(...)`.
- **D-15:** Stale-Imports (DRAFT-03): Berechnet on-render (`Date.now() - importedAt > 30 days`). „Stale"-Badge auf der Draft-Card im Tray; zusätzlicher Filter „Alle / Aktuell / Stale". Keine Auto-Delete-Logik. Keine Migration nötig (`imported_at` existiert seit Migration 016).

**Data Model**
- **D-16:** Migration 018 — `plan_elements.layer text not null default 'infrastructure'` mit CHECK `layer in ('infrastructure','seasonal')`. Backfill: bestehende Rows bleiben `infrastructure`. Plant-Rows (`kind='plant'`) bekommen beim nächsten Write `seasonal`. Folgt 6.5-P05-Push-Gate (list-linked → dry-run → push).
- **D-17:** Provenance bei Promotion bleibt aus 6.5: `imported_from = draftId`, `provenance = 'import'` für promoted Elemente; manuelle Elemente bekommen `provenance = 'manual'`. Schema dieser Spalten ist seit Migration 017 live.

### Claude's Discretion

- Skia-spezifische Implementation-Details: Canvas-Layer-Aufteilung, Reanimated Shared-Values-Layout, Worklet-Boundary für Hit-Tests
- Toolbar-Layout-Reihenfolge und exakte Icons (lucide-react-native ist bereits über Phase 6.5 P05 jest-mock global verfügbar)
- i18n-Strings für Editor in `de.json` (Toolbar-Labels, Toast-Texte, Confirm-Dialoge)
- Element-Rotation-UI: Drehgriff vs. Two-Finger-Rotate (Empfehlung: Two-Finger via gesture-handler)
- Exakte Zoom-/Pan-Limits und Initial-Viewport-Berechnung
- Test-Strategie pro Plan: Wave-0-Scaffold-Pattern aus 6.5 P01 wiederverwenden, falls nützlich (Plan-Aufteilung entscheidet sich erst in plan-phase)

### Deferred Ideas (OUT OF SCOPE)

- **Multi-Select + Bulk-Operations** — sinnvoll, aber EDIT-Requirements decken nur Single-Select-Workflows ab. Kandidat für v1.1.
- **Snap-to-Grid** — Schema unterstützt es ohne Migration; UX-Toggle erst aktivieren, wenn Dirk explizit fragt. Kein Roadmap-Eintrag nötig.
- **Element-Locking / -Gruppierung** — nicht in EDIT-Requirements.
- **Skia auf Web (Editor-Modus)** — wenn Demand entsteht, eigene Mini-Phase wegen Canvaskit-Hosting-Headers. Aktuell Web = read-only Preview.
- **Smart-Layout-Vorschläge** beim Bed-Draft-Drop — könnte später in Phase 9 (Kalender) als „intelligent placement" auftauchen.
- **EDIT-10 Vereinsregel-Warnung inline** — bewusst nach Phase 10 verschoben (Pivot 2026-04-21).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | Canvas mit Maß-Gitter (1×1 m, ein-/ausblendbar) — Skia | §Standard Stack (Skia 1.12.4), §Architecture Patterns §Pattern 1 Canvas-Skeleton, §Don't Hand-Roll (grid as Skia Group of Lines via `Group + Line[]` mirror of `GardenPlanView` SVG approach) |
| EDIT-02 | Element-Palette: Beete, Pflanzen, Infrastruktur | §Code Examples §3 (Bottom-Palette + LongPress→Pan composition); D-08 categories already enumerated by elementType strings in `PLAN_COLORS` of `GardenPlanView.tsx` |
| EDIT-03 | Drag & Drop auf Canvas (react-native-gesture-handler) | §Standard Stack (gesture-handler 2.31.2 — peer matches RN 0.76); §Common Pitfalls §Pitfall 2 (LongPress→Pan handoff); §Code Examples §3 |
| EDIT-04 | Rotation und Skalierung | §Architecture Patterns Two-Finger-Rotate via `Gesture.Race(rotation, pinch)`; transforms applied as Skia Group `transform` prop on selected element |
| EDIT-05 | Beet-Polygon zeichnen | §Code Examples §4 (live `Skia.Path` builder + `moveTo/lineTo/close`); explicit "Beet abschließen" button per D-09 — verified `close()` API exists |
| EDIT-06 | Koordinaten in Gartenmetern (nicht Pixel) | §Architecture Patterns §View Matrix (single Skia `Group.transform`); §Common Pitfalls §Pitfall 4 (coord round-trip) |
| EDIT-07 | Pflanzenabstand-Hinweis beim Platzieren | §Code Examples §5 (Ghost-Ring via Skia `Circle` with `color=transparent` + stroke); collision via Euclidean distance in JS |
| EDIT-08 | Zwei Layer: Infrastruktur (dauerhaft) und Jahresplan (saison-spezifisch) | §Data Model §Migration 018 (new `layer` column + CHECK); §Architecture Patterns (two Skia Groups, opacity-toggle) |
| EDIT-09 | Auto-Save alle 5 Sekunden + manuelles Speichern | §Architecture Patterns §Auto-Save Strategy (separate 5 s editor-debounce → per-element `writePlanElement` calls; existing `scheduleWriteDebounced` 500 ms then handles push) |
| EDIT-11 | Undo/Redo (mind. 20 Schritte) | §Standard Stack (zundo 2.3.0, peer zustand `^4 || ^5` — matches installed 5.0.2); §Common Pitfalls §Pitfall 5 (partialize selection+viewport out of history) |
| EDIT-12 | 60fps bei bis zu 200 Elementen auf echtem iOS-Gerät | §Common Pitfalls §Pitfall 6 (Group-transform animation cost); §Validation Architecture §Phase-Gate manual iPhone smoke; §Code Examples §6 (viewport culling) |
| DRAFT-01 | Import-Drafts als "Letzte Importe"-Tray im Plan-Editor | §Code Examples §7 (BottomSheet + DraftReviewCard reuse); existing `loadPendingDrafts` returns `{beds, plants, observations}` |
| DRAFT-02 | Bed-Draft auf Canvas ziehen → echtes Beet mit `importedFrom`-Provenance | §Code Examples §8 (Tray-drag handoff to canvas with finalCoords); calls existing `promoteBedDraft(mode, draft, dims, existingElements, importItemId)` — signature accepts no explicit coords yet; §Open Question 1 |
| DRAFT-03 | Drafts nicht promoted innerhalb 30 Tagen → "Stale Imports"-Ansicht, nie auto-gelöscht | §Code Examples §9 (extended `loadPendingDraftsWithImportedAt` joining `import_items.import_id → imports.imported_at`); §Open Question 2 |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canvas rendering (grid + elements) | Frontend (Skia Canvas component) | — | GPU on UI thread; no JS-bridge per frame |
| Pan / pinch / drag / long-press gestures | Frontend (gesture-handler) | Reanimated worklets | UI-thread gesture state, shared values feed Skia matrix |
| Element selection + transform state | Frontend (Zustand store `editorStore`) | — | Single source of truth; zundo wraps for history |
| Undo / redo history | Frontend (zundo temporal middleware) | — | Snapshot tree on store; partialized to exclude viewport |
| Auto-Save (5 s debounce per element) | Frontend Repo Layer (`gardenPlanRepo.writePlanElement` — NEW) | Local Storage + Outbox | Editor-level debounce → `writeWithOutbox` (atomic per row) → `scheduleWriteDebounced` (existing 500 ms push trigger) |
| Polygon-Beet drawing tool | Frontend (Skia Path builder + tap gesture) | Repo on commit | Live path is UI-only; only the closed polygon writes a `plan_elements` row |
| Drafts-Tray (bottom sheet) | Frontend (component using `DraftReviewCard` from 6.5) | Frontend Repo (`loadPendingDrafts` from 6.5) | Read-only UI; mutations route through existing `draftPromotionRepo` |
| Bed-Draft drag → promote | Frontend (gesture composition spanning tray + canvas) | `draftPromotionRepo.promoteBedDraft` (existing) | Tray Pan handed off via shared-value to canvas; on drop calls existing repo with finalCoords (signature extension — see Open Q 1) |
| Plant-Draft tap → modal → promote into bed | Frontend (modal Beet picker) | `draftPromotionRepo.promotePlantDraft` (existing) | Two-step UX per D-14; modal returns parent bed element |
| Stale-Badge (30d threshold) | Frontend (compute at render time) | — | No persistence; pure derivation from `imports.imported_at` |
| Layer column persistence | Database (Migration 018 — `plan_elements.layer text NOT NULL CHECK`) | Frontend Mapper (`planElementToDb` / `planElementToLocal`) | Schema-enforced enum; mapper round-trips |
| Sync of new layer column | Backend (no new code) | Frontend (mapper extension only) | Existing `pushPlanElement` already upserts the whole row payload — new column auto-syncs |

## Standard Stack

### Core (new dependencies for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@shopify/react-native-skia` | **1.12.4** (latest v1.x) | GPU-accelerated 2D canvas, Path builder, Group transform | EDIT-01 mandates Skia for 60 fps. `[VERIFIED: npm view @shopify/react-native-skia@1.12.4 peerDependencies]` → `react: >=18 <19`, `react-native: >=0.64 <0.78`, `react-native-reanimated: >=2.0.0` — exact match for project's `react@18.3.1` + `react-native@0.76.7` + `reanimated@3.17.4`. **v2.x is NOT compatible** (requires RN 0.79+ and React 19, per [npm peerDeps verification]) |
| `react-native-gesture-handler` | **2.31.2** (latest stable) | Pan, Pinch, Tap, LongPress, Rotation gestures | `[VERIFIED: npm view react-native-gesture-handler@2.31.2 peerDependencies]` → `react: *`, `react-native: *`, `react-native-reanimated: >=2.0.0` — compatible. v3.0.0 is in beta (`next` dist-tag), avoid for MVP. EDIT-03 explicitly references this lib |
| `zundo` | **2.3.0** (latest) | Temporal middleware for Zustand (undo/redo with limit + partialize) | `[VERIFIED: npm view zundo@2.3.0 peerDependencies]` → `zustand: ^4.3.0 \|\| ^5.0.0` — matches installed `zustand@5.0.2`. Tiny (<700 bytes gzipped per `[CITED: github.com/charkour/zundo]`). EDIT-11 requirement |

### Supporting (already installed — reuse)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | 3.17.4 (installed) | Shared values + worklets for pan/pinch | Already in project; Skia v1 + Reanimated v3 is a documented combination |
| `zustand` | 5.0.2 (installed) | Store for editor state | New `editorStore.ts` follows `importStore.ts` / `reviewSettingsStore.ts` pattern |
| `@/src/lib/gardenPlanRepo` | local | `loadDimensions`, `loadAcceptedElements`, `scheduleWriteDebounced` | Extend with `writePlanElement(mode, element)` for single-row writes |
| `@/src/lib/draftPromotionRepo` | local (Phase 6.5) | `promoteBedDraft`, `promotePlantDraft`, `promoteObservationDraft`, `dismissDraft` | Reuse verbatim; only `promoteBedDraft` may need finalCoords-param extension |
| `@/src/components/DraftReviewCard` | local (Phase 6.5) | Card layout for tray entries | Compact rendering variant via existing `details` prop slot |
| `@/src/components/TrafficLightBadge` | local | Stale badge (red/amber/green) | Already used for confidence; repurpose for staleness |
| `@/src/lib/importRepo` | local | `loadPendingDrafts` returns `{beds, plants, observations}` | Extend to JOIN `imports.imported_at` for stale detection |
| `lucide-react-native` | 1.8.0 (installed) | Icons (eye, undo, redo, save, trash, rotate) | Global jest mock active since Phase 6.5 P05 |
| NativeWind | 4.1.23 | Tailwind classes for toolbar + tray (NOT the Skia canvas) | Existing pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff / Reject Reason |
|------------|-----------|--------------------------|
| Skia 1.12.4 | Skia 2.6.2 | **Requires RN ≥ 0.79 + React 19**; project blocked by `expo@53` → React 18.3.1. Upgrade path is its own milestone. `[VERIFIED]` |
| zundo | Manual history stack in store | Reinvent partialize + limit + redo semantics; zundo is 700 B and battle-tested |
| zundo | jotai-history | Project is on Zustand; mixing state libs is overhead |
| gesture-handler 2.31.2 | gesture-handler 3.0.0-beta | Beta as of 2026-05-12; MVP avoids betas; v2.31.2 supports everything Phase 7 needs (Pan, Pinch, LongPress, Tap, Rotation, composed) `[VERIFIED: dist-tags]` |
| react-native-svg in editor | Skia | Static SVG — no GPU, no worklets, frame-drops past ~50 elements (per CLAUDE.md §"What NOT to Use"). Keep svg for `GardenPlanView` Home preview |
| Drehgriff (rotation handle) | Two-finger rotate | Native gesture (`Gesture.Rotation()`) feels native; handle requires extra hit-test surface and clutters single-select toolbar |

**Installation (verified compatibility with Expo SDK 53 / RN 0.76.7):**
```bash
# Pin Skia to v1.x — DO NOT use `expo install` here, it would pull v2 latest
pnpm --filter app add @shopify/react-native-skia@1.12.4
pnpm --filter app add react-native-gesture-handler@2.31.2
pnpm --filter app add zundo@2.3.0
# After install, follow gesture-handler native-link step
cd app && pnpm expo prebuild --clean   # only if using dev-client
```

**Version verification:**
- `pnpm view @shopify/react-native-skia@1.12.4 peerDependencies` → `{ react: '>=18.0 <19.0.0', 'react-native': '>=0.64 <0.78.0', 'react-native-reanimated': '>=2.0.0' }` `[VERIFIED 2026-05-12]`
- `pnpm view react-native-gesture-handler@2.31.2 peerDependencies` → `{ react: '*', 'react-native': '*' }` (loose) `[VERIFIED]`
- `pnpm view zundo@2.3.0 peerDependencies` → `{ zustand: '^4.3.0 || ^5.0.0' }` `[VERIFIED]`
- `pnpm view react-native-gesture-handler dist-tags` → `{ latest: '2.31.2', next: '3.0.0-beta.4', nightly: ... }` `[VERIFIED]`

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 7 — PLAN-EDITOR (this phase)                                      │
│                                                                          │
│  app/(app)/plan/index.tsx  (NEW route)                                   │
│   │                                                                      │
│   ├─ GestureHandlerRootView (added in app/_layout.tsx — once for app)    │
│   │     │                                                                │
│   │     ▼                                                                │
│   ├─ <PlanEditorScreen>                                                  │
│   │     │                                                                │
│   │     ├─ <Toolbar>     (Tailwind/NativeWind View)                      │
│   │     │   ├─ Save/Undo/Redo/Grid/Layers/Beet-abschließen               │
│   │     │   └─ Reads editorStore.temporal getState/undo/redo             │
│   │     │                                                                │
│   │     ├─ <EditorCanvas>                                                │
│   │     │   ├─ GestureDetector (Race: Pan, Pinch, LongPress, Tap)        │
│   │     │   └─ <Canvas>  (Skia)                                          │
│   │     │       └─ <Group transform={[{translateX/Y, scale}]}>           │
│   │     │           ├─ Background Group (grid lines, opacity .4)         │
│   │     │           ├─ Infrastructure Layer Group (visible if !hidden)   │
│   │     │           │   └─ Per-element Rect/Path/Circle from elementType │
│   │     │           ├─ Seasonal Layer Group                              │
│   │     │           ├─ Polygon-in-progress Group (dashed Path live)      │
│   │     │           └─ Ghost-Ring overlay (selected/placing plant)       │
│   │     │                                                                │
│   │     ├─ <ElementPalette>  (bottom tab bar, native View)               │
│   │     │   └─ LongPress→Pan composition; drop coords → editorStore      │
│   │     │                                                                │
│   │     └─ <DraftsTrayBottomSheet>                                       │
│   │         ├─ collapsed: counter chip                                   │
│   │         ├─ expanded: scroll of <DraftReviewCard> (reused)            │
│   │         │   ├─ Bed: long-press → Pan to canvas → drop → promote      │
│   │         │   ├─ Plant: tap "Auf Beet anwenden" → modal → promote      │
│   │         │   └─ Stale-Badge (computed from imports.imported_at)       │
│   │         └─ Filter: Alle / Aktuell / Stale (D-15)                     │
│   │                                                                      │
│   └─ editorStore (Zustand + zundo temporal)                              │
│        ├─ elements: PlanElementRow[]                                     │
│        ├─ selection: id | null                                           │
│        ├─ tool: 'select' | 'polygon' | 'placing'                         │
│        ├─ activeLayer: 'infrastructure' | 'seasonal' | null              │
│        ├─ viewport: { tx, ty, scale }   ← NOT in temporal (partialize)   │
│        ├─ Actions: addElement, updateElement, deleteElement              │
│        │           commitPolygon, setTool, setLayer                      │
│        │           temporal.undo / temporal.redo                         │
│        └─ Auto-save subscription: any element mutation                   │
│           → editorSave5sDebounce schedules writePlanElement(el)          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  EXISTING REPO LAYER — unchanged (Phase 4 + 6.5)                         │
│  gardenPlanRepo.writePlanElement(mode, element)  (NEW thin wrapper)      │
│    → storage.writeWithOutbox('plan_elements', row, outbox-update/insert) │
│    → scheduleWriteDebounced()  [500ms server-push]                       │
│  draftPromotionRepo.promoteBedDraft / promotePlantDraft / dismissDraft   │
│    → idempotent (Pitfall-1 detection from 6.5)                           │
└──────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  SUPABASE — Migration 018 adds plan_elements.layer column                │
│  RLS: existing plan_elements_member_all covers new column                │
│  Sync: existing pushPlanElement upserts whole row → new column auto-syncs│
└──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
app/
├── app/(app)/plan/
│   └── index.tsx                  # NEW route — top-level editor screen
├── app/_layout.tsx                # MOD — wrap inner content in GestureHandlerRootView
│
├── src/screens/plan/              # NEW — local components for the editor
│   ├── PlanEditorScreen.tsx
│   ├── EditorCanvas.tsx           # Skia canvas + gestures + element render
│   ├── EditorToolbar.tsx          # Save / Undo / Redo / Grid / Layers / Polygon-close
│   ├── ElementPalette.tsx         # Bottom 3-tab Beete/Pflanzen/Infrastruktur
│   ├── DraftsTrayBottomSheet.tsx  # Reuses DraftReviewCard from 6.5
│   ├── PolygonInProgress.tsx      # Skia Path live builder
│   └── BedPickerModal.tsx         # Plant promotion target picker (D-14)
│
├── src/stores/
│   └── editorStore.ts             # NEW — Zustand + zundo temporal
│
├── src/lib/
│   ├── gardenPlanRepo.ts          # MOD — add writePlanElement(mode, element) thin wrapper
│   ├── editorSaveDebounce.ts      # NEW — 5s per-element save scheduler (separate from 500ms push trigger)
│   ├── importRepo.ts              # MOD — extend loadPendingDrafts → return imported_at via JOIN
│   └── geometry/
│       ├── viewMatrix.ts          # NEW — pixel↔meter coord helpers (pure)
│       ├── bedLayout.ts           # NEW — Polygon centroid + bbox for stored bed (xM/yM = center)
│       └── plantSpacing.ts        # NEW — Euclidean overlap check for Ghost-Ring (EDIT-07)
│
├── src/components/__tests__/      # NEW component tests for screens
│   ├── PlanEditor.smoke.test.tsx
│   ├── EditorToolbar.test.tsx
│   ├── DraftsTray.test.tsx
│   ├── BedPickerModal.test.tsx
│   └── stale-badge.test.tsx
│
└── src/lib/__tests__/
    ├── editorStore.test.ts                # Zustand + zundo behavior
    ├── editorStore.undoredo.test.ts       # 20-step limit, partialize excludes viewport
    ├── editorSaveDebounce.test.ts         # 5s timing, batching, cancellation
    ├── geometry.viewMatrix.test.ts        # Pixel↔meter round-trip
    ├── geometry.bedLayout.test.ts         # Polygon centroid math
    ├── geometry.plantSpacing.test.ts      # Overlap detection
    └── importRepo.staledetect.test.ts     # imported_at JOIN logic

packages/shared/src/
├── types/entities.ts              # MOD — PlanElementRow gains `layer: 'infrastructure' | 'seasonal'`
└── i18n/de.json                   # MOD — extend with editor.* keys

supabase/migrations/
└── 20260512000018_plan_elements_layer.sql   # NEW — adds layer column + CHECK + DO-block invariants

app/src/lib/mappers/rowMappers.ts # MOD — planElementToDb + planElementToLocal + DbPlanElementRowLoose include layer
```

### Pattern 1: Skia Canvas Skeleton with Single Transform Matrix

**What:** One `<Canvas>` rendering one outer `<Group transform={...}>` that contains all child Groups. Pan + Pinch update three shared values (`tx`, `ty`, `scale`); Skia reads them on the UI thread each frame. No per-element coordinate conversion.

**When to use:** Always. This is the foundational pattern for the editor.

**Source:** `[CITED: shopify.github.io/react-native-skia/docs/group/]` Group supports `transform` prop. `[CITED: docs.swmansion.com/react-native-reanimated]` Shared values feed Skia on UI thread without bridge cross.

**Example:**
```tsx
// EditorCanvas.tsx
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';

export function EditorCanvas({ elements, dims }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  // Skia reads shared values on UI thread — no JS work per frame
  return (
    <Canvas style={{ flex: 1 }}>
      <Group transform={[
        { translateX: tx },
        { translateY: ty },
        { scale: scale },
      ]}>
        <GridLayer dims={dims} />
        <Group opacity={layerVisible.infrastructure ? 1 : 0}>
          {infrastructureEls.map(el => <ElementShape key={el.id} el={el} />)}
        </Group>
        <Group opacity={layerVisible.seasonal ? 1 : 0}>
          {seasonalEls.map(el => <ElementShape key={el.id} el={el} />)}
        </Group>
      </Group>
    </Canvas>
  );
}
```

### Pattern 2: Composed Gestures for Editor Canvas

**What:** `Gesture.Race(pinch, pan, Gesture.Exclusive(longPress, tap))` so two-finger pinch wins over one-finger pan, and long-press wins over tap when held > 500 ms.

**When to use:** Outermost canvas gesture; per-element drag is a separate Pan inside a `GestureDetector` on the element's Skia hit-area (or implemented via a single canvas-level Pan that consults `selection`).

**Source:** `[CITED: docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-composition/]` Race/Simultaneous/Exclusive composition primitives.

**Example:**
```tsx
const pan = Gesture.Pan().onUpdate(e => { tx.value += e.changeX; ty.value += e.changeY; });
const pinch = Gesture.Pinch().onUpdate(e => { scale.value *= e.scaleChange; });
const tap = Gesture.Tap().onEnd(e => runOnJS(handleTap)(e.x, e.y));
const longPress = Gesture.LongPress().minDuration(500).onStart(e => runOnJS(handleLongPress)(e.x, e.y));
const composed = Gesture.Race(pinch, pan, Gesture.Exclusive(longPress, tap));

return <GestureDetector gesture={composed}><Canvas .../></GestureDetector>;
```

### Pattern 3: Long-Press-Then-Pan from Palette to Canvas

**What:** Two-stage gesture. Palette items wrap each tile in a `GestureDetector` with a `LongPress` (min 300 ms) that flips a shared boolean. A wider Pan on the screen root reads this boolean; when true, it tracks finger position as a "ghost element" overlay; on Pan end, screen-space coordinates are converted to meter coordinates via the inverse view matrix and a new element is added to the store.

**When to use:** EDIT-02 + EDIT-03. Palette → canvas drop.

**Source:** `[CITED: github.com/software-mansion/react-native-gesture-handler/discussions/1826]` "How to implement drag after long press" — use `Gesture.Exclusive(longPress, pan)` with `requireToFail` semantics, or a manualActivation Pan that flips a shared value.

**Example sketch:**
```tsx
// In palette tile
const dragging = useSharedValue<{kind:string} | null>(null);
const longPress = Gesture.LongPress().minDuration(300).onStart(() => { dragging.value = { kind: tileKind }; });

// In screen root
const dropPan = Gesture.Pan()
  .manualActivation(true)
  .onTouchesMove((e, manager) => { if (dragging.value) manager.activate(); })
  .onUpdate(e => { ghostX.value = e.x; ghostY.value = e.y; })
  .onEnd(e => {
    runOnJS(handleDrop)(e.x, e.y, dragging.value.kind);
    dragging.value = null;
  });
```

### Pattern 4: Live Polygon via Skia Path Builder

**What:** Maintain `points: {x: number, y: number}[]` in `editorStore` (in meters). On each tap when `tool === 'polygon'`, push a point. Render the live polygon as a Skia `<Path>` built from `Skia.Path.Make().moveTo(p0.x, p0.y).lineTo(p1.x, p1.y)...` (no `close()` until commit). Dashed stroke style. Toolbar "Beet abschließen" button commits to `plan_elements` with elementType `'Beet'`, stores polygon points in `provenance.polygonPointsM`, sets `xM/yM/widthM/heightM` to centroid + bounding box. Minimum 3 points enforced in store action.

**Source:** `[CITED: shopify.github.io/react-native-skia/docs/shapes/path/]` `Skia.Path` builder with `moveTo`, `lineTo`, `close`.

**Example:**
```tsx
// In PolygonInProgress.tsx
const path = React.useMemo(() => {
  if (points.length < 2) return null;
  const p = Skia.Path.Make();
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
  // intentionally NOT closed until commit
  return p;
}, [points]);

return path ? (
  <Path path={path} style="stroke" strokeWidth={0.05}
        color="rgba(196,149,106,0.9)" strokeDashEffect={[0.2, 0.1]} />
) : null;
```

### Pattern 5: Plant Ghost-Ring + Overlap Detection (EDIT-07)

**What:** While a plant element is "placing" (mid-drag or first second after drop), render a transparent Skia `Circle` at the plant center with `r = spacingCm / 200` (meters / 2 because spacing is diameter). Compute overlap in JS: iterate plants in same layer, compute Euclidean distance to placed plant, ring color = red if min-distance < spacing; otherwise green. Color drives `stroke` prop; non-blocking — does NOT prevent commit.

**Source:** Pure-JS geometry. No external library.

**Example:**
```ts
function checkOverlap(placed: {xM:number,yM:number,id:string}, spacingM: number, others: PlanElementRow[]): boolean {
  const seasonal = others.filter(e => e.layer === 'seasonal' && e.deletedAt === null && e.id !== placed.id);
  return seasonal.some(o => {
    const dx = o.xM - placed.xM, dy = o.yM - placed.yM;
    return Math.sqrt(dx*dx + dy*dy) < spacingM;
  });
}
```

### Pattern 6: Viewport Culling (EDIT-12 budget)

**What:** Before rendering, filter `elements` to those whose bounding boxes intersect the current visible meter-rect. Visible meter-rect derived from screen size + inverse view matrix. Recompute on `viewport` shared-value changes (sample at most every 100 ms via `useDerivedValue` + `runOnJS` throttled, OR pre-cull in JS at viewport-snapshot intervals).

**When to use:** EDIT-12 only. At 200 elements on a 5×5 m garden, culling rarely fires; at zoomed-in views with many off-screen elements, it's the difference between 30 fps and 60 fps. Implement once but ship behind a feature flag if it adds complexity.

**Source:** `[CITED: github.com/Shopify/react-native-skia/discussions/2032]` Culling discussion confirms it's the canonical optimization for large element counts.

### Pattern 7: Auto-Save 5 s Debounce (EDIT-09)

**What:** Two-stage debounce. (1) Editor-level: `editorSaveDebounce` schedules a per-element save 5 s after the last mutation on that element id. (2) Repo-level: `writePlanElement` calls `writeWithOutbox` (atomic) then `scheduleWriteDebounced()` which fires the existing 500 ms server-push. So a stream of edits to one element produces 1 local write 5 s after the user stops, then 1 server push ~500 ms later. Multiple elements being edited concurrently → 1 timer per element id (Map<id, Timeout>). Manual-Save button cancels all pending timers and flushes all dirty elements immediately.

**Why two-stage:** EDIT-09's "alle 5 Sekunden" is a *local persist* cadence, not a server-push cadence. The Phase 3 outbox already handles server-push debouncing at 500 ms. Conflating the two would make manual save effectively a 5.5 s wait.

**Sketch:**
```ts
// src/lib/editorSaveDebounce.ts
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function scheduleSaveElement(mode: AuthMode, el: PlanElementRow, delayMs = 5000): void {
  const t = timers.get(el.id);
  if (t) clearTimeout(t);
  timers.set(el.id, setTimeout(() => {
    timers.delete(el.id);
    writePlanElement(mode, el).catch(e => __DEV__ && console.warn('autosave failed', e));
  }, delayMs));
}
export function flushPendingSaves(mode: AuthMode, byId: (id:string) => PlanElementRow | undefined): Promise<void[]> {
  const ids = Array.from(timers.keys());
  for (const id of ids) { const t = timers.get(id)!; clearTimeout(t); timers.delete(id); }
  return Promise.all(ids.map(id => { const el = byId(id); return el ? writePlanElement(mode, el) : Promise.resolve(); }));
}
```

### Pattern 8: zundo Temporal Middleware with partialize + limit

**What:** Wrap the editor-store `create()` call with `temporal(...)` from zundo. `partialize` strips selection + viewport + tool from history snapshots; `limit: 20` matches EDIT-11.

**Source:** `[CITED: github.com/charkour/zundo]` zundo v2.3.0 API.

**Example:**
```ts
import { create } from 'zustand';
import { temporal } from 'zundo';

interface EditorState {
  elements: PlanElementRow[];
  selection: string | null;     // NOT in history
  viewport: { tx: number; ty: number; scale: number };  // NOT in history
  tool: 'select' | 'polygon' | 'placing';                // NOT in history
  addElement: (el: PlanElementRow) => void;
  updateElement: (id: string, patch: Partial<PlanElementRow>) => void;
  deleteElement: (id: string) => void;
  // ... more actions
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      elements: [],
      selection: null,
      viewport: { tx: 0, ty: 0, scale: 1 },
      tool: 'select',
      addElement: el => set(s => ({ elements: [...s.elements, el] })),
      updateElement: (id, patch) => set(s => ({
        elements: s.elements.map(e => e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e),
      })),
      deleteElement: id => set(s => ({
        elements: s.elements.map(e => e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e),
      })),
    }),
    {
      limit: 20,
      partialize: (state) => ({ elements: state.elements }), // ONLY elements in history
      equality: (a, b) => a.elements === b.elements,         // shallow check
    },
  ),
);

// Usage in toolbar:
const undo = useEditorStore.temporal.getState().undo;
const redo = useEditorStore.temporal.getState().redo;
const pastCount = useEditorStore.temporal((s) => s.pastStates.length);
```

### Pattern 9: Anti-Patterns to Avoid

- **Storing pixel coordinates** anywhere in `plan_elements` or store. Pixels are derived from a single view matrix at render time. (D-03; violating this caused a Phase 4 rewrite per `02.5 P02` post-mortem analog "stille Silent-Drops bei snake_case").
- **Re-rendering the whole canvas on viewport change.** Use Reanimated shared values for `transform`, not React state — `viewport` lives outside the component reactivity tree.
- **Wrapping every element in its own `<GestureDetector>`.** That spawns N gesture handlers and breaks gesture composition at the canvas level. One canvas-level Pan + tap → consult selection + element bounding boxes in JS.
- **Putting selection + tool in zundo history.** Undo should restore element state, not "I had this thing selected 12 steps ago." Use `partialize` to exclude.
- **Hand-rolling polygon point-in-polygon hit test** when only bounding-box selection is needed. MVP single-select can use rectangle bbox (cheap); reserve true polygon hit-test for Phase 7.5 if requested.
- **Putting `setState` calls inside a worklet** that runs every frame. Pan onUpdate updates shared values; only onEnd does `runOnJS(handleDrop)` to mutate the store.
- **Calling `promoteBedDraft` from inside a worklet.** All repo calls must hop to JS thread via `runOnJS`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Undo/redo stack with limit | Manual snapshot array | `zundo` temporal middleware | `partialize`, `limit`, `equality` already battle-tested; 700 B |
| Pan/Pinch/Tap/LongPress gestures | `PanResponder` or `react-native-touchable` | `react-native-gesture-handler` (locked D-02) | UI-thread gesture state, gesture composition, momentum |
| GPU-accelerated 2D canvas | `<Svg>` with reanimated.View | `@shopify/react-native-skia` (locked D-01) | EDIT-12 needs GPU; SVG re-renders on every shared-value change |
| Atomic local write + outbox | `try { upsert; push }` | `storage.writeWithOutbox` (existing) | Multi-store IDBP transaction `[VERIFIED: IndexedDbAdapter.ts:264]` |
| Server-push debouncing | `setTimeout` in repo | `scheduleWriteDebounced` (existing) | 500 ms debounce, error logging, integrated with SyncWorker |
| Promotion-with-provenance | New helper | `draftPromotionRepo.promoteBedDraft` (Phase 6.5 P03) | Idempotent (detection-first), writes `imported_from` + `provenance`, soft-deletes draft |
| Plant → bed parent lookup | Manual search | `parentBedElement` arg already in `promotePlantDraft` signature | Done in 6.5 |
| Soft-delete draft | New helper | `dismissDraft(mode, entity, draft)` (Phase 6.5 P03) | Generic over 3 draft tables |
| Camel↔snake mapping for plan_elements | Manual field-list | Extend `planElementToDb` / `planElementToLocal` by 1 line for `layer` | Mapper pattern from Phase 4 |
| LWW conflict resolution | Manual timestamp check | Postgres `aa_lww_guard` trigger | Server-enforced since Phase 3 Migration 013 |
| Outbox push routing for plan_elements | New case | `pushPlanElement` (`SyncWorker.ts:365-387`) | Already wired — new `layer` col travels with row payload |
| Bottom-sheet UI | `react-native-bottom-sheet` | Plain View + height transition or hard-coded modal | Bottom-sheet library is non-trivial native install; MVP-acceptable simple approach is a slide-up View (`reanimated` shared height) — confirm in plan-phase, NOT a new dep |
| TrafficLight badge for staleness | New component | `TrafficLightBadge` (existing) | Three-state, already used in DraftReviewCard |
| Confidence → color helper | New helper | `confidenceToState` in `ImportEntityCard.tsx:11` | Extract to util if needed |

**Key insight:** Phase 7 is **the first phase that adds raw rendering code** (Skia) and the **first phase that introduces real-time UI gestures**. Everything below the gesture/render layer (state, persistence, sync, promotion) is fully built and tested. Editor work should be 80 % UI + state + glue, 20 % Skia/gesture novelty. The plan should reflect that split.

## Runtime State Inventory

> Phase 7 is additive (new screen + new column) with no rename / refactor / migration scope. The five categories below are explicitly checked.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `plan_elements` rows in IndexedDB/SQLite + Supabase have no `layer` column yet. After Migration 018 runs, server-side rows get default `'infrastructure'`. Local rows synced before migration arrive with `layer=undefined` until next pull. | Mapper `planElementToLocal` must default `layer = 'infrastructure'` when DB-side returns null/undefined. Already-loaded plant rows: rewrite to `'seasonal'` lazily on next save (no proactive backfill needed — UX-OK that an existing plant row's layer flips on first edit). |
| Live service config | None — no external services beyond Supabase. | None |
| OS-registered state | None — pure in-app interaction. | None |
| Secrets / env vars | None | None |
| Build artifacts | New native deps (`@shopify/react-native-skia`, `react-native-gesture-handler`) require a dev-client rebuild if using EAS or `expo prebuild`. Expo Go bundled versions may not match — confirm during install. | Plan must include a "verify native build" task after `pnpm install` (run `pnpm --filter app start --dev-client` and exercise gestures + canvas before declaring deps installed). |

**Verified nothing found in:** Live service config, OS-registered state, secrets. Build artifacts: action required as noted.

## Common Pitfalls

### Pitfall 1: Skia v2 auto-pulled by `expo install`
**What goes wrong:** `pnpm expo install @shopify/react-native-skia` resolves to latest v2.x → peer-dependency conflict with `react@18` / `react-native@0.76`. Metro fails or runtime crashes.
**Why it happens:** Expo's install resolver targets the SDK's "compatible" version, which for SDK 53 is Skia 2.x — but project pinned Expo to SDK 53 *stable* with RN 0.76, not SDK 53 + RN 0.79. `[VERIFIED via npm peerDeps]`
**How to avoid:** Pin explicitly: `pnpm --filter app add @shopify/react-native-skia@1.12.4`. Add a comment in `package.json` / a `// DO NOT BUMP` note.
**Warning signs:** `npm ERR! peer react@"19.x" ... required by @shopify/react-native-skia@2.x`; runtime "Invalid hook call" on Skia components.

### Pitfall 2: Long-press starts a Pan in a sibling component (Tray → Canvas)
**What goes wrong:** Long-pressing a draft card in the bottom-sheet tray triggers a pan that is consumed by the tray's own scrollview, never reaching the canvas. The drop never registers.
**Why it happens:** Gesture conflict between nested `ScrollView` and gesture-handler Pan.
**How to avoid:** Use `Gesture.Exclusive(longPress, pan)` with manual activation: tray scrolling is the default; long-press flips an `isDragging` shared value; the screen-root Pan (parent of tray + canvas) reads that value and activates only when set. Tray's ScrollView gets `simultaneousHandlers` for that Pan (or wrap tray in a `Native` gesture that fails when the root Pan begins).
**Warning signs:** Drag attempts feel "sticky" or cancel mid-motion; logs show pan onUpdate from inside the tray but never crossing to canvas y-coords.
**Source:** `[CITED: github.com/software-mansion/react-native-gesture-handler/issues/1933]` Pan inside ScrollView blocks scrolling.

### Pitfall 3: zundo snapshot allocation cost at 200 elements × 20 history slots
**What goes wrong:** Every mutation records the full `elements` array. 200 elements × ~300 bytes / element × 20 snapshots = ~1.2 MB held in JS memory. On a mid-tier iPhone this is fine but compounds when a Skia Path with many polygon points pushes element size higher.
**Why it happens:** zundo default snapshot is shallow-cloned state; nested arrays/objects share references but the outer wrapper is new.
**How to avoid:**
1. `partialize` to only `{ elements }` (no selection, viewport, tool).
2. Set explicit `limit: 20` to cap depth.
3. Provide `equality: (a, b) => a.elements === b.elements` — skip snapshot when reference is unchanged (zundo treats every setState as a snapshot by default; the equality fn deduplicates).
4. Consider a `diff` strategy (zundo supports it) if memory becomes an issue at scale — but NOT for MVP.
**Warning signs:** Heap-snapshot in Hermes shows growing `History` array; UI hitches at exact undo-stack depth boundary.
**Source:** `[CITED: github.com/charkour/zundo Issue #170]` Partialize for Nested Objects discussion confirms shallow-merge semantics.

### Pitfall 4: Coordinate round-trip loses precision (meter ↔ pixel)
**What goes wrong:** User drags an element by 50 px on screen. The pan delta is converted to meters via `dx_m = dx_px / scale`. Stored. Next render: `x_px = x_m * scale`. Drift over many edits accumulates if conversion functions are not symmetric (e.g., one uses `Math.round`, the other does not).
**How to avoid:**
1. Single source of truth: a `viewMatrix.ts` module exporting `pxToM(px, scale)` and `mToPx(m, scale)` as inverses with NO rounding.
2. Rounding ONLY at display time (label text), never on stored coordinates.
3. Unit-test the round-trip: assert `pxToM(mToPx(x_m, s), s) === x_m` for a randomized set of (x_m, s).
**Warning signs:** Element drifts visibly after multiple drags; snapshot diff shows ε differences in `xM`.

### Pitfall 5: Auto-save fires mid-drag and persists an interim coordinate
**What goes wrong:** User drags an element for 6 seconds. At second 5, the editor 5s-debounce fires for that element with whatever transient position was last set in the store. The drag ends 1 s later with the final position, which fires another save. Two writes for one logical action.
**How to avoid:**
1. During an active gesture, mutations bypass the store mutation; only commit to store on `onEnd`. Visual feedback during the drag comes from a Reanimated shared-value-driven Skia transform, not from store state.
2. As fallback: schedule the 5 s debounce only on store-level mutation, not on every Reanimated tick.
3. Manual-Save flushes the in-flight drag if any (calls `onEnd` synchronously).
**Warning signs:** Outbox-debug-screen shows 2-3 outbox entries for a single drag; LWW-Trigger logs `aa_lww_guard` rejection (newer write overwrites older mid-drag interim).

### Pitfall 6: Skia `Group transform` animation regresses to per-child re-layout
**What goes wrong:** Animating a Group's `transform` prop, when the Group contains many children with their own `transform` props, can cause Skia to recompose the whole tree per frame.
**How to avoid:** Hoist all transforms to the outermost Group. Element children render at their meter-coords as static Rects/Paths; pan/pinch animates only the outer Group. The inner ones are static "draw commands" until the user mutates them. This is the official guidance.
**Source:** `[CITED: github.com/Shopify/react-native-skia/issues/395]` Performance issues when applying a transform to a Group with many children — confirms the "single outer Group" pattern.
**Warning signs:** FPS dropping linearly with element count instead of being mostly flat.

### Pitfall 7: GestureHandlerRootView placed too deep
**What goes wrong:** Wrapping only the editor screen in GestureHandlerRootView misses screens that share a layout (e.g., the modal Beet-picker rendered above the Stack). Gestures inside the modal don't fire.
**How to avoid:** Wrap the **outermost** content in `app/_layout.tsx` once. Existing `_layout.tsx` returns `<QueryClientProvider><AuthProvider><RootLayoutInner/>...` — wrap `<RootLayoutInner/>` (or one level up) so every routed screen + every modal inherits the gesture root.
**Source:** `[CITED: docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation/]` "should be kept as close to the actual root of the app as possible."
**Warning signs:** Gestures work in the editor screen but not in tray modals; "GestureDetector must be used as a descendant of GestureHandlerRootView" warning.

### Pitfall 8: Migration 018 default-value semantics for existing plant elements
**What goes wrong:** `ADD COLUMN layer text NOT NULL DEFAULT 'infrastructure'` will tag existing plant rows (those promoted in Phase 6.5 with `elementType='Pflanze'`) as `'infrastructure'`. The UI groups by `layer` not by `elementType`, so plants render in the infrastructure group until next save.
**How to avoid:** Two options:
- (A) **Lazy correct in mapper:** `planElementToLocal` derives `layer = row.layer ?? (row.element_type === 'Pflanze' ? 'seasonal' : 'infrastructure')`. Then the first time that element is written via the editor, the correct value persists. Acceptable for MVP because Phase 6.5 promoted plant counts are small.
- (B) **Migration 018 UPDATE clause** that backfills based on element_type: `UPDATE plan_elements SET layer='seasonal' WHERE element_type='Pflanze' AND deleted_at IS NULL`. Cleaner but couples migration to type strings.
**Recommendation:** Both. Migration 018 backfills server-side (B); mapper has a defensive default (A) for local rows that synced before the migration.
**Warning signs:** Plants visible when the Seasonal layer is hidden.

### Pitfall 9: 30-day stale window calculation uses local clock
**What goes wrong:** `Date.now() - imported_at` uses device time. If the user's clock is wrong (DST jump, manual change) the badge flips incorrectly.
**How to avoid:** Acceptable for MVP — staleness is a soft signal, not a security control. Document that the badge is "best-effort" in the i18n string. Future hardening: use a server time delta cached at app start.
**Warning signs:** None functional; complaint-level only.

## Code Examples

### Example 1: Migration 018 — `plan_elements.layer` column

```sql
-- Phase 7 Plan 01: plan_elements.layer for two-layer editor (infrastructure | seasonal)
-- Provides: layer column with CHECK + default + backfill of plant rows
-- Follows: Migration 017 pattern (DO-block invariants, ALTER ADD COLUMN IF NOT EXISTS)
--
-- Atomicity: Supabase wraps file in implicit transaction. DO NOT add BEGIN/COMMIT.

-- ──────────────────────────────────────────────────────────────
-- Section 1 — Add layer column with default + CHECK constraint
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.plan_elements
  ADD COLUMN IF NOT EXISTS layer text NOT NULL DEFAULT 'infrastructure';

-- CHECK constraint (added separately so re-runs of migration are safe on retries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check'
  ) THEN
    ALTER TABLE public.plan_elements
      ADD CONSTRAINT plan_elements_layer_check
      CHECK (layer IN ('infrastructure','seasonal'));
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Section 2 — Backfill: promote existing plant rows from infrastructure → seasonal
-- ──────────────────────────────────────────────────────────────

UPDATE public.plan_elements
   SET layer = 'seasonal'
 WHERE element_type = 'Pflanze'
   AND deleted_at IS NULL
   AND layer = 'infrastructure';

-- ──────────────────────────────────────────────────────────────
-- Section 3 — Invariants (raise if schema state is wrong)
-- ──────────────────────────────────────────────────────────────

DO $$ DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_elements' AND column_name = 'layer';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer column missing on plan_elements';
  END IF;

  SELECT count(*) INTO cnt FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'plan_elements_layer_check';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'migration_018_invariant: layer CHECK constraint missing';
  END IF;

  RAISE NOTICE 'migration_018 ok: plan_elements.layer added with CHECK + plant backfill';
END $$;
```

### Example 2: Type extension + mapper update

```ts
// packages/shared/src/types/entities.ts (MOD)
export interface PlanElementRow extends RowBase {
  gardenId: string;
  elementType: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  confidence: 'high' | 'medium' | 'low' | null;
  isAccepted: boolean;
  importedFrom: string | null;
  provenance: Record<string, unknown> | null;
  /** Phase 7: visual + behavioral grouping. 'infrastructure' = permanent, 'seasonal' = plants. */
  layer: 'infrastructure' | 'seasonal';   // NEW
}
```

```ts
// app/src/lib/mappers/rowMappers.ts (MOD — extend DbPlanElementRowLoose + both mappers)
type DbPlanElementRowLoose = {
  // ... existing fields ...
  layer?: string | null;                  // NEW (optional for pre-migration rows)
};

export function planElementToLocal(db: DbPlanElementRowLoose): PlanElementRow {
  // Phase 7 Pitfall-8 lazy default: if layer absent (pre-018 sync), derive from element_type.
  const layerValue: 'infrastructure' | 'seasonal' =
    db.layer === 'seasonal' ? 'seasonal'
    : db.layer === 'infrastructure' ? 'infrastructure'
    : db.element_type === 'Pflanze' ? 'seasonal' : 'infrastructure';

  return {
    // ... existing fields ...
    layer: layerValue,
  };
}

export function planElementToDb(local: PlanElementRow): Record<string, unknown> {
  return {
    // ... existing fields ...
    layer: local.layer,                   // NEW
  };
}
```

### Example 3: ElementPalette long-press → pan-drop composition

```tsx
// app/src/screens/plan/ElementPalette.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

interface PaletteItem { kind: string; label: string; icon: React.ReactNode; }
interface Props {
  items: PaletteItem[];
  draggingShared: Animated.SharedValue<{ kind: string; ghostX: number; ghostY: number } | null>;
}

export function ElementPalette({ items, draggingShared }: Props) {
  return (
    <View className="flex-row items-center px-2 py-1 border-t border-stone-200 dark:border-stone-700">
      {items.map(item => {
        const longPress = Gesture.LongPress()
          .minDuration(300)
          .onStart(() => { draggingShared.value = { kind: item.kind, ghostX: 0, ghostY: 0 }; });

        return (
          <GestureDetector key={item.kind} gesture={longPress}>
            <View className="flex-1 items-center py-2">
              {item.icon}
              <Text className="text-xs text-stone-700 dark:text-stone-300">{item.label}</Text>
            </View>
          </GestureDetector>
        );
      })}
    </View>
  );
}

// In PlanEditorScreen.tsx — the screen-root Pan that consumes the dragging state
const dragging = useSharedValue<{kind:string;ghostX:number;ghostY:number} | null>(null);

const dropPan = Gesture.Pan()
  .manualActivation(true)
  .onTouchesMove((e, manager) => {
    if (dragging.value) {
      manager.activate();
      const t = e.allTouches[0];
      dragging.value = { ...dragging.value, ghostX: t.x, ghostY: t.y };
    }
  })
  .onEnd((e) => {
    if (!dragging.value) return;
    const { kind } = dragging.value;
    const xPx = e.x, yPx = e.y;
    runOnJS(handleDrop)(kind, xPx, yPx);
    dragging.value = null;
  });

function handleDrop(kind: string, xPx: number, yPx: number): void {
  const { tx, ty, scale } = useEditorStore.getState().viewport;
  const xM = (xPx - tx) / scale;
  const yM = (yPx - ty) / scale;
  useEditorStore.getState().addElement(makeElementFromKind(kind, xM, yM, activeGardenId, userId));
}
```

### Example 4: Polygon-Beet tool with explicit close (D-09)

```ts
// editorStore.ts excerpt
interface PolygonInProgress { gardenId: string; pointsM: { x: number; y: number }[]; }

// State + actions
polygonInProgress: PolygonInProgress | null;
polygonAddPoint: (xM: number, yM: number) => set(s =>
  s.polygonInProgress
    ? { polygonInProgress: { ...s.polygonInProgress, pointsM: [...s.polygonInProgress.pointsM, { x: xM, y: yM }] } }
    : { polygonInProgress: { gardenId: s.activeGardenId!, pointsM: [{ x: xM, y: yM }] } }
);
polygonCommit: (label: string) => {
  const p = get().polygonInProgress;
  if (!p || p.pointsM.length < 3) throw new Error('polygon needs at least 3 points');
  const xs = p.pointsM.map(pt => pt.x), ys = p.pointsM.map(pt => pt.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const element: PlanElementRow = {
    id: randomId(), gardenId: p.gardenId, elementType: 'Beet', label,
    xM: cx, yM: cy, widthM: maxX - minX, heightM: maxY - minY,
    confidence: null, isAccepted: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    updatedByUserId: get().userId, deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual', polygonPointsM: p.pointsM },  // pointsM stored in provenance
    layer: 'infrastructure',
  };
  set(s => ({ elements: [...s.elements, element], polygonInProgress: null, tool: 'select' }));
};
```

### Example 5: Auto-save scheduler (5 s per element)

```ts
// app/src/lib/editorSaveDebounce.ts
import type { PlanElementRow } from '@spatenstich/shared';
import type { AuthMode } from '../stores/authStore';
import { writePlanElement } from './gardenPlanRepo';

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const EDITOR_SAVE_DELAY_MS = 5_000;

export function scheduleSaveElement(mode: AuthMode, el: PlanElementRow): void {
  const existing = timers.get(el.id);
  if (existing) clearTimeout(existing);
  timers.set(el.id, setTimeout(() => {
    timers.delete(el.id);
    writePlanElement(mode, el).catch(e => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[editorSave] autosave failed', el.id, e);
    });
  }, EDITOR_SAVE_DELAY_MS));
}

export async function flushAllPendingSaves(
  mode: AuthMode,
  byId: (id: string) => PlanElementRow | undefined,
): Promise<void> {
  const ids = Array.from(timers.keys());
  for (const id of ids) { const t = timers.get(id)!; clearTimeout(t); timers.delete(id); }
  await Promise.all(ids.map(async id => {
    const el = byId(id);
    if (el) await writePlanElement(mode, el);
  }));
}

export function _resetEditorSaveTimers(): void {
  for (const [, t] of timers) clearTimeout(t);
  timers.clear();
}
```

### Example 6: `writePlanElement` thin wrapper (NEW in gardenPlanRepo.ts)

```ts
// app/src/lib/gardenPlanRepo.ts (MOD — add writePlanElement)
export async function writePlanElement(
  mode: AuthMode,
  el: PlanElementRow,
): Promise<void> {
  assertAccount(mode);
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('not_authenticated');

  // Determine insert vs update: caller passes a complete row; check storage for existing.
  // Simpler: always operation 'update' if a row with id exists else 'insert'.
  const existing = await storage.getRowsByGarden<PlanElementRow>('plan_elements', el.gardenId);
  const op: 'insert' | 'update' = existing.some(r => r.id === el.id) ? 'update' : 'insert';

  try {
    await storage.writeWithOutbox('plan_elements', el, {
      entity: 'plan_elements',
      rowId: el.id,
      operation: op,
      payload: el as unknown as Record<string, unknown>,
    });
    scheduleWriteDebounced();
  } catch (cause) {
    throw new OutboxEnqueueError('plan_elements', el.id, cause);
  }
}
```

### Example 7: Drafts-Tray reusing DraftReviewCard

```tsx
// app/src/screens/plan/DraftsTrayBottomSheet.tsx
import { DraftReviewCard } from '@/src/components/DraftReviewCard';
import { loadPendingDraftsWithImportedAt } from '@/src/lib/importRepo';  // NEW extended fn
import { promoteBedDraft, promotePlantDraft, dismissDraft } from '@/src/lib/draftPromotionRepo';

interface DraftWithMeta { row: BedDraftRow | PlantDraftRow | ObservationDraftRow; importedAt: string; }
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

function isStale(importedAt: string): boolean {
  return Date.now() - new Date(importedAt).getTime() > STALE_MS;
}

export function DraftsTrayBottomSheet({ gardenId, dims, elements }: Props) {
  const [drafts, setDrafts] = React.useState<{ beds: DraftWithMeta[]; plants: DraftWithMeta[]; observations: DraftWithMeta[] }>({beds:[], plants:[], observations:[]});
  const [filter, setFilter] = React.useState<'all' | 'fresh' | 'stale'>('all');
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => { loadPendingDraftsWithImportedAt(gardenId).then(setDrafts); }, [gardenId]);

  const filteredBeds = drafts.beds.filter(d =>
    filter === 'all' ? true : filter === 'stale' ? isStale(d.importedAt) : !isStale(d.importedAt)
  );

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
      <TouchableOpacity onPress={() => setExpanded(e => !e)} className="flex-row items-center p-2">
        <Text className="font-semibold">Letzte Importe ({drafts.beds.length + drafts.plants.length})</Text>
      </TouchableOpacity>
      {expanded && (
        <ScrollView style={{ maxHeight: 240 }}>
          {filteredBeds.map(d => (
            <DraftReviewCard
              key={d.row.id}
              entity={d.row}
              onAccept={async () => { /* triggers drag mode — see Example 8 */ }}
              onDismiss={() => dismissDraft(mode, 'bed_drafts', d.row as BedDraftRow)}
              details={isStale(d.importedAt) ? <TrafficLightBadge state="red" label="Stale" /> : null}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
```

### Example 8: Bed-Draft drag → canvas drop → `promoteBedDraft`

```ts
// Pseudocode for the bed-draft drag flow
// 1) DraftReviewCard registers a LongPress that sets shared dragging.value = { kind: 'bed-draft', draftId, importItemId }
// 2) Screen-root Pan converts onEnd screen coords to meter coords (same as palette drop)
// 3) handleDraftDrop:
async function handleBedDraftDrop(draftId: string, importItemId: string, xM: number, yM: number) {
  const draft = drafts.beds.find(d => d.row.id === draftId)!.row as BedDraftRow;
  // EXISTING signature: promoteBedDraft(mode, draft, dims, existingElements, importItemId)
  // Coords need to flow through. Option A (minimal): override after-write.
  const el = await promoteBedDraft(mode, draft, dims, elements, importItemId);
  // Override coords (since nextFreeBedSlot used a default):
  await writePlanElement(mode, { ...el, xM, yM });
  // Option B (cleaner, see Open Q 1): extend promoteBedDraft signature to accept optional finalCoords.
}
```

### Example 9: Extended `loadPendingDraftsWithImportedAt` (DRAFT-03)

```ts
// app/src/lib/importRepo.ts (MOD — add new export)
export interface PendingDraftsWithImportedAt {
  beds: { row: BedDraftRow; importedAt: string }[];
  plants: { row: PlantDraftRow; importedAt: string }[];
  observations: { row: ObservationDraftRow; importedAt: string }[];
}

export async function loadPendingDraftsWithImportedAt(
  gardenId: string,
): Promise<PendingDraftsWithImportedAt> {
  const [bedRows, plantRows, obsRows, importItems, imports] = await Promise.all([
    storage.getRowsByGarden<BedDraftRow>('bed_drafts', gardenId),
    storage.getRowsByGarden<PlantDraftRow>('plant_drafts', gardenId),
    storage.getRowsByGarden<ObservationDraftRow>('observation_drafts', gardenId),
    storage.getRowsByGarden<ImportItemRow>('import_items', gardenId),
    storage.getRowsByGarden<ImportRow>('imports', gardenId),
  ]);
  // Build import_item → imported_at map
  const importedAtById = new Map<string, string>();
  for (const ii of importItems) {
    const imp = imports.find(i => i.id === ii.importId);
    if (imp) importedAtById.set(ii.id, imp.importedAt);
  }

  const enrich = <T extends { importItemId: string; status: string; deletedAt: string | null }>(rows: T[]) =>
    rows
      .filter(r => r.status === 'pending' && r.deletedAt === null)
      .map(r => ({ row: r, importedAt: importedAtById.get(r.importItemId) ?? new Date(0).toISOString() }));

  return {
    beds: enrich(bedRows) as { row: BedDraftRow; importedAt: string }[],
    plants: enrich(plantRows) as { row: PlantDraftRow; importedAt: string }[],
    observations: enrich(obsRows) as { row: ObservationDraftRow; importedAt: string }[],
  };
}
```

### Example 10: `app/_layout.tsx` MOD — add GestureHandlerRootView

```tsx
// app/app/_layout.tsx (MOD — wrap RootLayoutInner)
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-native-svg` for interactive 2D | `@shopify/react-native-skia` | Skia v1 maturity 2024; v2 Apr 2026 | GPU rendering, worklet hit-tests, 60 fps at 1000+ elements [VERIFIED via search of 2026 perf tests] |
| `PanResponder` from RN core | `react-native-gesture-handler` v2 | RN 0.71+ era | UI-thread gesture state, no JS bridge per move event |
| Manual Zustand history array | `zundo` temporal middleware | zundo 2.x (2024 stable) | <1 KB lib, partialize/limit/diff built-in |
| Skia v2.x (latest) | **Skia v1.12.4 for this project** | Bound by RN 0.76 + React 18 | MUST stay on v1.x; v2 upgrade is a separate Expo SDK 55 milestone |
| Reanimated v4 with Skia v2 | Reanimated v3.17.4 with Skia v1.12.4 | Project Phase 1 decision | Compatible combination; v4 + Skia v2 is the SDK 55 future |
| Snap-to-grid in MVP | Snap-to-grid deferred | This phase (D-13) | Phase 7 ships free-placement; v1.1 may add toggle |
| Multi-select editor | Single-select only | This phase (D-11) | Cleaner toolbar; v1.1 enhancement |

**Deprecated / outdated:**
- Anyone advising `expo install @shopify/react-native-skia` on SDK 53 + RN 0.76: this will resolve to v2.x and break peer-deps. Pin manually to 1.12.4.

## Project Constraints (from CLAUDE.md)

- **German UI** — all editor strings in `de.json` `editor.*` namespace; UTF-8 umlauts (ä/ö/ü/ß), never ASCII replacements. [Memory: `feedback_german_umlauts.md`]
- **Expo SDK 53 stable** — NOT SDK 55 canary. Constrains Skia to v1.x, gesture-handler to v2.x.
- **DSGVO / EU hosting** — Migration 018 runs on Supabase Frankfurt (project ref `vitrqkzxkiqvadqfzrcx`).
- **Offline-first** — Editor must open and render last-known plan without network; auto-save writes to local outbox; server-push is best-effort.
- **2-user shared garden, LWW** — Mutations carry `updatedAt` + `updatedByUserId`; existing aa_lww_guard trigger handles conflicts server-side.
- **Plan-rendering = SVG for ≤50 elements, Skia upgrade above that** — CLAUDE.md historical guidance; Phase 7 commits to Skia from day 1 because EDIT-12 requires it.
- **Zero outbound AI calls** — no temptation here; Phase 7 has no AI surface.
- **Monorepo, pnpm workspaces** — `pnpm --filter app add` for new deps; no root-level installs.
- **NativeWind/Tailwind** — Toolbar, palette, tray; NOT the Skia canvas contents.
- **GSD workflow enforcement** — all Phase 7 edits go through `/gsd-execute-phase` plan tasks.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | v24.14.0 | — |
| pnpm | Install / monorepo | ✓ | (project-locked) | — |
| supabase CLI | Migration 018 push | ✓ | 2.90.0 | — |
| Live Supabase Frankfurt | Migration 018 + RLS check | ✓ (project ref `vitrqkzxkiqvadqfzrcx`) | — | — |
| Real iPhone | EDIT-12 60 fps smoke | ⚠ depends on user | — | Manual deferral if no device; smoke must be acknowledged as deferred by user |
| Expo Dev-Client build | Skia + gesture-handler native modules | Required after install | — | If running Expo Go without dev-client: Skia/gesture-handler will not load. Plan task must do `pnpm expo prebuild --clean` then `pnpm --filter app run start --dev-client` |
| `lucide-react-native` | Toolbar icons | ✓ installed | 1.8.0 | — |
| `react-native-reanimated` worklets | Pan/Pinch shared values | ✓ installed | 3.17.4 | — |

**Missing dependencies with no fallback:** None at install time. Real iPhone for EDIT-12 verification may be deferred (per Phase 6.5 P05 precedent — manual smoke deferred to user).

**Missing dependencies with fallback:** Expo Dev-Client (must be rebuilt; not a fallback issue, a setup step).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.1.2 + @testing-library/react-native 13.3.3 |
| Config file | `app/jest.config.ts` (5 projects: node, hooks, stores, photos, components) |
| Quick run command | `pnpm --filter app exec jest --testPathPattern='editor\|geometry\|stale-badge'` |
| Full suite command | `pnpm --filter app test` |

**Note on pnpm `--` forwarding bug** (Phase 6.5 P01 lesson): `pnpm --filter app test -- --testPathPattern=…` swallows the second `--`. Use `pnpm --filter app exec jest --testPathPattern=…` instead.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Grid renders at 1m intervals; toggle hides/shows | unit (component) | `pnpm --filter app exec jest --testPathPattern='PlanEditor.smoke'` | ❌ Wave 0 |
| EDIT-02 | Palette renders 3 tabs with kind list | unit (component) | `pnpm --filter app exec jest --testPathPattern='ElementPalette'` | ❌ Wave 0 |
| EDIT-03 | LongPress→Pan handoff adds element on drop | unit (store + mocked gesture) | `pnpm --filter app exec jest --testPathPattern='editorStore.dragdrop'` | ❌ Wave 0 |
| EDIT-04 | Rotation gesture writes new `rotateDeg` in element (or transform applied) | unit (store) | `pnpm --filter app exec jest --testPathPattern='editorStore.transform'` | ❌ Wave 0 |
| EDIT-05 | Polygon commit ≥3 points yields Beet element with bounding box + points in provenance | unit (store + geometry) | `pnpm --filter app exec jest --testPathPattern='editorStore.polygon\|geometry.bedLayout'` | ❌ Wave 0 |
| EDIT-06 | Coord round-trip pxToM/mToPx is symmetric within 1e-9 | unit (pure) | `pnpm --filter app exec jest --testPathPattern='geometry.viewMatrix'` | ❌ Wave 0 |
| EDIT-07 | Ghost-ring overlap returns true when neighbour within spacing | unit (pure) | `pnpm --filter app exec jest --testPathPattern='geometry.plantSpacing'` | ❌ Wave 0 |
| EDIT-08 | Layer toggle hides seasonal group; layer column persists via mapper | unit (component + mapper) | `pnpm --filter app exec jest --testPathPattern='EditorToolbar\|rowMappers'` | ❌ Wave 0 |
| EDIT-09 | 5s debounce fires once per element after last mutation; flush cancels | unit (timer) | `pnpm --filter app exec jest --testPathPattern='editorSaveDebounce'` | ❌ Wave 0 |
| EDIT-11 | 20-step undo limit; partialize excludes selection/viewport | unit (store) | `pnpm --filter app exec jest --testPathPattern='editorStore.undoredo'` | ❌ Wave 0 |
| EDIT-12 | 60 fps with 200 elements on real iPhone | **manual smoke** | (manual — record perf trace, document in human-verify) | ❌ Manual |
| DRAFT-01 | Tray renders pending drafts grouped | unit (component) | `pnpm --filter app exec jest --testPathPattern='DraftsTray'` | ❌ Wave 0 |
| DRAFT-02 | Bed-draft drop calls `promoteBedDraft` with finalCoords | unit (component + mocked repo) | `pnpm --filter app exec jest --testPathPattern='DraftsTray'` (same file) | ❌ Wave 0 |
| DRAFT-03 | Stale-badge appears when `imported_at` > 30 days; filter `Stale` excludes fresh | unit (component) | `pnpm --filter app exec jest --testPathPattern='stale-badge'` | ❌ Wave 0 |
| Pitfall-1 | Skia v2 not installed; v1.12.4 pinned | static | `pnpm view @shopify/react-native-skia version` after install asserts 1.12.4 in package.json | ❌ Migration task |
| Pitfall-5 | Auto-save during active drag does NOT persist interim coords | unit (store + timer) | `pnpm --filter app exec jest --testPathPattern='editorStore.dragdrop'` (gestureActive flag) | ❌ Wave 0 |
| Pitfall-8 | Mapper defaults plant rows missing layer → 'seasonal' | unit (mapper) | `pnpm --filter app exec jest --testPathPattern='rowMappers'` | ❌ Wave 0 (modify existing) |
| Migration 018 | layer column + CHECK + plant backfill present after push | manual via psql/supabase | (manual + DO-block assertion in migration) | ❌ Wave 0 (migration self-assertion) |

### Sampling Rate

- **Per task commit:** `pnpm --filter app exec jest --testPathPattern='editorStore\|editorSave\|geometry'` (≤ 30 s)
- **Per wave merge:** `pnpm --filter app test` (full suite)
- **Phase gate:** Full suite green + manual iPhone 200-element smoke (EDIT-12) + Migration 018 listed in both Local & Remote via `supabase migration list --linked` before `/gsd-verify-work`. Per 6.5 precedent, if real iPhone unavailable the user explicitly defers EDIT-12 verification.

### Wave 0 Gaps

- [ ] `app/src/lib/__tests__/editorStore.test.ts` — basic CRUD on store; covers EDIT-02-04
- [ ] `app/src/lib/__tests__/editorStore.undoredo.test.ts` — covers EDIT-11 (20 limit, partialize excludes selection)
- [ ] `app/src/lib/__tests__/editorStore.dragdrop.test.ts` — drop converts coords + adds element; auto-save respects gestureActive flag (Pitfall-5)
- [ ] `app/src/lib/__tests__/editorStore.polygon.test.ts` — covers EDIT-05 (3-point minimum, commit forms Beet with bbox + points)
- [ ] `app/src/lib/__tests__/editorStore.transform.test.ts` — covers EDIT-04 (rotation/scale stored)
- [ ] `app/src/lib/__tests__/editorSaveDebounce.test.ts` — covers EDIT-09 (5s timing, batching, cancellation, flushAll)
- [ ] `app/src/lib/__tests__/geometry.viewMatrix.test.ts` — covers EDIT-06 (px↔m round-trip)
- [ ] `app/src/lib/__tests__/geometry.bedLayout.test.ts` — covers EDIT-05 (polygon centroid + bbox)
- [ ] `app/src/lib/__tests__/geometry.plantSpacing.test.ts` — covers EDIT-07 (overlap detection)
- [ ] `app/src/lib/__tests__/importRepo.staledetect.test.ts` — covers DRAFT-03 (JOIN logic + 30d threshold)
- [ ] `app/src/lib/__tests__/rowMappers.layer.test.ts` — covers Pitfall-8 (lazy default), Migration 018 round-trip
- [ ] `app/src/components/__tests__/PlanEditor.smoke.test.tsx` — covers EDIT-01 (canvas renders, grid toggle); mocks Skia
- [ ] `app/src/components/__tests__/EditorToolbar.test.tsx` — covers EDIT-08 (layer toggle), undo/redo button wiring, manual-save flush
- [ ] `app/src/components/__tests__/ElementPalette.test.tsx` — covers EDIT-02 (tab render)
- [ ] `app/src/components/__tests__/DraftsTray.test.tsx` — covers DRAFT-01, DRAFT-02 (drop calls mocked promoteBedDraft)
- [ ] `app/src/components/__tests__/stale-badge.test.tsx` — covers DRAFT-03 (badge based on 30d threshold + filter)
- [ ] `app/src/components/__tests__/BedPickerModal.test.tsx` — covers D-14 (Pflanze tap → modal → promotePlantDraft)
- [ ] `supabase/migrations/20260512000018_plan_elements_layer.sql` — invariants inline
- [ ] **Jest mock for Skia:** create `app/src/components/__tests__/skia-mock.ts` (mocks Canvas/Group/Rect/Path/Circle as no-op Views) — prerequisite for any component test importing the editor
- [ ] **Jest mock for gesture-handler:** verify `jest-expo` provides it; if not, mock GestureDetector + Gesture composition factories

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing: `assertAccount(mode)` in repos + Supabase Auth session |
| V3 Session Management | no (existing) | Inherited from Phase 2 |
| V4 Access Control | yes | Existing RLS `plan_elements_member_all` covers new `layer` column. New `imported_from` already RLS-guarded via FK to import_items (Phase 6.5 verified) |
| V5 Input Validation | yes | Editor inputs: element label (max-len), dimensions (positive numbers), polygon points (≥3, finite numbers). Validate in store action before commit. |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for Expo + Skia + Supabase Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-garden write via forged gardenId | Tampering | RLS `is_garden_member(garden_id)` on `plan_elements`; client-side `useAuthStore.getState().activeGardenId` derives the only writeable garden |
| Bypass CHECK constraint via raw payload | Tampering | Migration 018 CHECK `layer IN ('infrastructure','seasonal')` enforced server-side; mapper-level enum on client provides defense-in-depth |
| Resource exhaustion via 10,000-element plan | DoS (client-side) | Editor performance budget is 200 elements (EDIT-12). No server-side limit needed; sync push of huge plans would naturally timeout. Optional MVP: warn at >500 elements |
| Inject polygon with millions of points via `provenance` | DoS | Store action enforces `polygonPointsM.length <= 100` (reasonable garden bed); reject otherwise |
| Tap-jacking on bottom-sheet | UI Redress | n/a — native UI; not a web surface |
| Accidental deletion of imported (provenance) element | Repudiation | Existing soft-delete pattern preserves the row; provenance.importedFrom remains queryable for audit |
| Auto-save loop persists corrupt state | Integrity | LWW trigger rejects stale writes; `aa_lww_guard` SQLSTATE handled by client; corrupt state in store does not propagate to other gardens (RLS) |
| Long-press triggers unintended element placement | UX bug, not security | Confirm-on-drop toast (D-10 ghost ring as visual confirmation) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `promoteBedDraft` signature can accept a final-coordinate override OR caller can `writePlanElement(..., {...el, xM, yM})` after promote (Example 8 Option A). | Code Examples §8, Open Question 1 | LOW — both Option A (post-write override) and Option B (signature change) work; plan-phase picks one. |
| A2 | Skia v1.12.4 actually installs cleanly under SDK 53 + RN 0.76.7 + pnpm. Peer-deps match per registry; runtime tested only by community blog posts, not first-party Expo docs that mention v1. | Standard Stack | MEDIUM — if native build fails, fallback is v1.12.0–1.12.3 (last few v1 patches), or downgrade to Skia v0.1.x (no API guarantee). |
| A3 | Skia v1's worklet support is adequate for Reanimated 3.17 shared-value-driven `transform` on the outer Group. | Architecture Patterns §Pattern 1 | LOW — verified by `[CITED]` 2024-era tutorials using Skia 1.x + Reanimated 3 |
| A4 | `react-native-gesture-handler@2.31.2` works without breakage when installed alongside the existing Expo Share-Intent that already touches gestures (Phase 6 P03). | Standard Stack | LOW — gesture-handler has no peer on share-intent libs; conflict would be a same-namespace clash, which there is no evidence of. |
| A5 | A bottom-sheet built with NativeWind + Reanimated height animation is acceptable UX without a dedicated bottom-sheet library. | Don't Hand-Roll | MEDIUM — if UX feels janky, can adopt `@gorhom/bottom-sheet` (NEW dep) in a follow-up plan. Not blocking MVP. |
| A6 | EDIT-12's "200 elements at 60 fps on real iPhone" is verified manually, not by an automated FPS counter in CI. Existing pattern from Phase 6.5 (manual smoke deferred to user) applies. | Validation Architecture §Phase Gate | LOW |
| A7 | Migration 018 backfill of `element_type='Pflanze' → layer='seasonal'` correctly handles all existing rows. There may be other plant-like element_types in the future (e.g., 'Strauch'), in which case the `seasonal` set grows but Migration 018's backfill scope is fixed. | Code Examples §1 | LOW — current codebase only writes `'Pflanze'` for plants (verified via `draftPromotionRepo.promotePlantDraft:184`). |
| A8 | `Skia.Path.contains(x, y)` is available for true polygon hit-testing in v1.12.4 if needed. Web search confirmed `getBounds()` is documented; `contains()` exists in upstream Skia C++ but RN bindings may lack it. | Pattern 9 anti-pattern | LOW — MVP uses bounding-box hit-test; polygon `contains` is a v1.1 enhancement, not phase-blocking. |
| A9 | Skia Web (CanvasKit WASM) is **out of scope** for Phase 7; Web users see the existing static `GardenPlanView` SVG read-only. | D-deferred + CONTEXT §Open Constraints | NONE — explicitly deferred by user. |
| A10 | `import_items.import_id` ↔ `imports.imported_at` JOIN data is available locally (both tables synced via SyncWorker since Phase 6 P02). | Code Examples §9 | LOW — both tables are in `EntityName` union (entities.ts:13-15); SyncWorker pulls them per Phase 6 P02. |
| A11 | Element rotation is stored as a transformation field (`rotateDeg`) added to PlanElementRow as part of this phase. EDIT-04 mandates rotation but no rotation column exists in the schema. | Phase Requirements §EDIT-04 | MEDIUM — plan-phase may need a second migration (018b or 019) for `rotate_deg`. Alternative: store in `provenance.rotateDeg` (no migration) — recommended for MVP. **Flag this in plan-discussion.** |
| A12 | The "Manual-Save button flushes all pending saves" — what should it do for an active drag gesture mid-flight? Assumption: complete the drag in the store (call `onEnd` programmatically) then flush. | Code Examples §5 | LOW |

## Open Questions

1. **`promoteBedDraft` signature: extend to accept finalCoords, or override post-promote?**
   - What we know: Existing signature is `promoteBedDraft(mode, draft, dims, existingElements, importItemId)`. It uses `nextFreeBedSlot()` to place the bed at a default position.
   - What's unclear: For DRAFT-02, the user drops the bed at a specific canvas position. Two implementation paths:
     - **(A) Post-write override:** Call `promoteBedDraft` (which places at a default), then immediately call `writePlanElement({...el, xM, yM})` with the drop coords. Two writes, but signature stays stable. Phase 6.5 idempotency check kicks in on re-runs.
     - **(B) Signature extension:** Add optional `finalCoords?: {xM,yM}` param. One write, but ripples into existing tests + types.
   - Recommendation: **(A)** for plan simplicity. Defer (B) to a refactor task if the second write proves problematic.

2. **Stale-detection: client-side JOIN vs. denormalize `importedAt` onto draft tables?**
   - What we know: `imports.imported_at` is the source; `bed_drafts/plant_drafts/observation_drafts` carry only `import_item_id` → `import_items.import_id` → `imports.id`.
   - What's unclear: Whether to do the 3-table JOIN client-side every load (Example 9), or to add a denormalized `imported_at` column on each draft table via a new migration.
   - Recommendation: **Client-side JOIN** per D-15 ("Keine Migration nötig"). User explicitly locked this. Plan implements `loadPendingDraftsWithImportedAt` as in Example 9.

3. **Rotation persistence: schema column or provenance field?**
   - What we know: EDIT-04 mandates rotation but `plan_elements` has no `rotate_deg` column. Migration 018 only adds `layer`.
   - What's unclear: Add `rotate_deg` column to Migration 018 (single migration covers two new columns) or store rotation in `provenance.rotateDeg` (no migration drift)?
   - Recommendation: **provenance.rotateDeg** for MVP — keeps Migration 018 scoped to D-16 wording. If Phase 9 (calendar) or Phase 10 needs rotation as a first-class queryable field, a follow-up migration adds the column. Flag in plan-discussion for confirmation.

4. **Element identity for selection after undo?**
   - What we know: Selection is `partialize`-d out of zundo history. Undo restores elements, current `selection: id` may point to a deleted element.
   - What's unclear: Should undo restore selection too? Or silently clear selection on undo?
   - Recommendation: **Clear selection on every undo/redo.** Simpler invariant. Toolbar action handlers must already null-check `selection`.

5. **Bottom-sheet library choice?**
   - What we know: D-14 says "Bottom-Sheet (collapsed Chip, expanded Card-Liste)". No library locked.
   - What's unclear: Hand-roll with Reanimated height (no new dep) vs. `@gorhom/bottom-sheet` (battle-tested, but new dep).
   - Recommendation: **Hand-roll** for MVP. ~50 LOC. If gesture feels bad after manual smoke, swap in `@gorhom/bottom-sheet` later. Aligns with "no new deps beyond Skia + gesture-handler + zundo" implicit constraint.

## Sources

### Primary (HIGH confidence — verified in this session)

- `[VERIFIED]` `pnpm view @shopify/react-native-skia@1.12.4 peerDependencies` → React 18 + RN 0.64-0.78 + Reanimated 2+
- `[VERIFIED]` `pnpm view @shopify/react-native-skia@1` versions → 1.12.4 is latest v1.x patch
- `[VERIFIED]` `pnpm view react-native-gesture-handler@2.31.2 peerDependencies` → permissive peers
- `[VERIFIED]` `pnpm view react-native-gesture-handler dist-tags` → latest=2.31.2, next=3.0.0-beta.4
- `[VERIFIED]` `pnpm view zundo@2.3.0 peerDependencies` → `zustand: ^4.3 || ^5`
- `[VERIFIED]` `app/package.json` — react@18.3.1, react-native@0.76.7, reanimated@3.17.4, zustand@5.0.2, expo@~53.0.0
- `[VERIFIED]` `supabase/migrations/20260512000017_plan_elements_provenance.sql` — DO-block + ALTER ADD COLUMN IF NOT EXISTS template
- `[VERIFIED]` `app/src/lib/draftPromotionRepo.ts` — full signature of `promoteBedDraft`, `promotePlantDraft`, `dismissDraft`, `nextFreeBedSlot`
- `[VERIFIED]` `app/src/lib/gardenPlanRepo.ts` — `scheduleWriteDebounced` is the existing 500 ms server-push trigger, not a 5 s editor-save
- `[VERIFIED]` `app/src/lib/sync/SyncTriggers.ts` — `WRITE_DEBOUNCE_MS = 500`
- `[VERIFIED]` `app/src/lib/importRepo.ts:288` — `loadPendingDrafts` returns `{beds,plants,observations}`, does NOT include `imported_at`
- `[VERIFIED]` `supabase/migrations/20260509000016_import_drafts.sql:15` — `imports.imported_at` exists; drafts only carry `import_item_id`
- `[VERIFIED]` `packages/shared/src/types/entities.ts:66-79` — PlanElementRow already has importedFrom + provenance (Phase 6.5)
- `[VERIFIED]` `app/app/_layout.tsx` — root layout does NOT yet have GestureHandlerRootView
- `[VERIFIED]` `app/src/components/GardenPlanView.tsx` — static SVG renderer remains for read-only contexts (CONTEXT D-01)
- `[VERIFIED]` `.planning/config.json` — `workflow.nyquist_validation: true`, no `security_enforcement` key → security section included
- `[CITED: docs.expo.dev/versions/latest/sdk/skia/]` Expo docs for Skia plugin
- `[CITED: shopify.github.io/react-native-skia/docs/group/]` Group `transform` prop
- `[CITED: shopify.github.io/react-native-skia/docs/shapes/path/]` Path `moveTo/lineTo/close`
- `[CITED: docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-composition/]` Race/Simultaneous/Exclusive
- `[CITED: docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation/]` GestureHandlerRootView placement
- `[CITED: github.com/charkour/zundo]` zundo API + partialize + limit + equality
- `[CITED: github.com/Shopify/react-native-skia/issues/395]` Performance pitfall — Group transform with many children

### Secondary (MEDIUM confidence — web search confirmed across multiple sources)

- Skia v2 ≥ 2.0 requires RN ≥ 0.79 + React 19 (multiple sources: Skia changelog references, victory-native-xl #616, npm peerDeps confirm)
- Reanimated 3 + Skia v1 is a stable combination per 2024–2026 community tutorials
- Long-press + pan composition: `Gesture.Exclusive(longPress, pan)` with manualActivation `[CITED: github.com/software-mansion/react-native-gesture-handler/discussions/1826]`
- Skia 60 fps on 3000+ elements is achievable per benchmarks; 200 is well within budget

### Tertiary (LOW confidence — single source, not independently verified)

- Skia v1 Path `contains(x, y)` exact behavior — search did not surface clear API doc; Assumption A8 flags this. Workaround: bounding-box hit-test for MVP.
- Bottom-sheet hand-roll feasibility — based on general Reanimated knowledge; no specific 2026 article reviewed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — peer dependencies verified directly against the npm registry; project versions verified against package.json
- Architecture: HIGH — patterns proven in Phases 3–6.5; only Skia + gestures are new, and those have ample documentation
- Pitfalls: HIGH — Pitfalls 1, 5, 6, 8 are derived from this codebase's actual constraints; Pitfalls 2, 3, 7 are sourced from upstream library issue trackers
- Skia v1 specific behavior: MEDIUM — v1 docs less prominent than v2; one Open Question (A8) reflects this gap honestly
- Validation: HIGH — mirrors successful 6.5 Wave-0 scaffolding pattern; test-target list complete

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (30 days — codebase is active; the touched libraries are pinned; deprecations would surface as failed pnpm installs which fail-fast)

## RESEARCH COMPLETE
