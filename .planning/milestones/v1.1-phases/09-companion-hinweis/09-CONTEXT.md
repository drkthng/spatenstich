# Phase 9: Companion-Hinweis - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** `--auto` — Claude selected recommended defaults; user can override before planning by editing this file.

<domain>
## Phase Boundary

Beim Setzen einer Pflanze auf ein Beet (oder einer existierenden Pflanze in dasselbe Beet) sofort visuell sehen: passt das zusammen? Roter Banner bei Konflikt, grüner Banner bei guter Nachbarschaft — nicht-blockierend (Dirk darf trotzdem platzieren). Persistente rote Dreieck-Markierung an Pflanzen mit aktivem Konflikt.

**Im Scope:**
- Companion-Detection-Logik: Pflanze→Beet-Zugehörigkeit → Nachbarprüfung gegen `plant_companions`
- Roter Banner bei `incompatible`-Beziehung (i18n)
- Grüner Banner bei `companion`-Beziehung (i18n)
- Persistente Konflikt-Markierung (rotes Dreieck-Icon) an Pflanzen mit aktivem Konflikt
- Detection bei Platzierung, Plan-Load, und Element-Move
- Plant↔PlantRow-Mapping (PlanElementRow → Plant-DB-Lookup)

**NICHT im Scope:**
- Mischkultur-Score pro Beet (v2 COMP-02)
- Aussaatkalender-Integration (Phase 10)
- Fruchtfolge-Warnung (Phase 15)
- Companion-Stärke-Nuancen (v2 — aktuell binary: companion/incompatible/neutral)
- UI für Pflanzen-Auswahl beim manuellen Platzieren (könnte eigene Phase sein)

</domain>

<decisions>
## Implementation Decisions

### Detection-Trigger & Timing

- **D-01:** **Detection läuft bei drei Auslösern:** (a) Pflanze wird auf Beet platziert (drop/promote), (b) bestehender Plan wird geladen (retroaktive Prüfung aller Pflanzen), (c) Pflanze wird verschoben (move zu anderem Beet). Bei (a) und (c) wird nur die betroffene Pflanze geprüft; bei (b) werden alle Pflanzen im Plan geprüft.
- **D-02:** **Detection ist rein client-seitig** — keine Edge Function, kein Server-Roundtrip. Die `plant_companions`-Daten sind via `usePlants()` TanStack-Query mit JSON-Bundle-Fallback lokal verfügbar (Phase 8 D-10). Detection kann synchron gegen den lokalen Cache laufen.

### Beet-Zugehörigkeit (Bed Association)

- **D-03:** **Spatial Containment (Point-in-Polygon)** als primärer Mechanismus. Eine Pflanze "gehört" zu einem Beet, wenn ihr Mittelpunkt (`xM`, `yM`) innerhalb des Beet-Polygons liegt. Dies funktioniert universell für manuell platzierte UND importierte Pflanzen. `provenance.parentBedId` (Phase 6.5) dient als Optimierungs-Hint, ist aber nicht alleinige Quelle.
- **D-04:** **Pflanzen außerhalb aller Beete** (freistehend auf dem Canvas) haben keine Nachbarschaftsprüfung — nur Beet-Kontext triggert Detection. Das ist korrekt: Companion-Hinweise sind nur im Beet-Kontext sinnvoll.
- **D-05:** **Point-in-Polygon-Utility** nutzt das bestehende `geometry/bedLayout.ts` Modul (Phase 7). Falls noch kein generischer PiP-Test existiert, wird einer hinzugefügt — Ray-Casting-Algorithmus für beliebige Polygone.

### Banner-Darstellung

- **D-06:** **Toast-Banner am unteren Bildschirmrand**, nicht-blockierend (Roadmap Success Criterion 4). Auto-dismiss nach 4 Sekunden. User kann manuell dismissen (X-Button). Banner überlagert NICHT den Canvas — positioniert über der Toolbar.
- **D-07:** **Zwei Banner-Varianten:**
  - **Rot (Konflikt):** `"⚠ Konflikt: Tomate verträgt sich nicht mit Fenchel"` — `variant: 'error'`
  - **Grün (Companion):** `"✓ Gute Nachbarschaft: Tomate + Basilikum"` — `variant: 'success'`
  - Strings in `de.json` (i18n) mit Interpolation für Pflanzennamen.
- **D-08:** **Mehrere gleichzeitige Hinweise:** Bei Platzierung neben 3 Pflanzen (2 companion, 1 incompatible) → **Konflikt hat Vorrang**. Nur der wichtigste Banner wird angezeigt (Konflikte vor Companions). Wenn mehrere Konflikte: alle Konfliktnamen in einem Banner (`"⚠ Konflikt: Tomate verträgt sich nicht mit Fenchel, Erbse"`).
- **D-09:** **InlineBanner erweitern** — bestehende `InlineBanner.tsx` hat nur `variant: 'warning'`. Neue Variants `'error'` (rot) und `'success'` (grün) hinzufügen. Gleiche Komponentenstruktur, andere Farben + Icons (CheckCircle für success, AlertTriangle für error).

### Persistente Konflikt-Markierung

- **D-10:** **Rotes Dreieck-Icon** als Skia-Overlay auf dem Canvas-Element der Pflanze. Sichtbar auch nachdem der Toast-Banner dismissed wurde. Wird entfernt wenn der Konflikt aufgelöst wird (z.B. konfliktverursachende Pflanze gelöscht/verschoben).
- **D-11:** **Computed on-demand** (React `useMemo` oder Zustand derived state), NICHT in der DB persistiert. Bei jedem Render/Element-Change wird der Companion-Status aller Pflanzen im sichtbaren Viewport neu berechnet. Performance ist kein Problem: typisch <20 Pflanzen pro Beet, <10 Beete pro Garten, `plant_companions`-Tabelle hat <50 Einträge.
- **D-12:** **Kein Dreieck für `neutral`** — nur `incompatible` bekommt die Markierung. Phase 8 D-07 (Quellen-Konflikt → neutral) bedeutet: bei widersprüchlichen Quellen zeigt die App weder rot noch grün.

### Plant↔PlantRow Mapping

- **D-13:** **`plantSlug` in `provenance` speichern.** Beim Platzieren einer Pflanze (manuell oder via Import) wird `provenance.plantSlug` gesetzt (z.B. `"tomate"`). Dies ermöglicht einen zuverlässigen Lookup in die Plant-DB via `loadPlantBySlug()`. Das `label`-Feld ("Tomate") bleibt der Display-Name, ist aber NICHT die Lookup-Quelle.
- **D-14:** **Manuell platzierte Pflanzen ohne plantSlug:** Wenn ein User eine Pflanze manuell per Texteingabe hinzufügt und keinen DB-Match wählt, bleibt `provenance.plantSlug` null → keine Companion-Prüfung möglich. Das ist akzeptabel: Companion-Hinweise sind ein Bonus, kein Blocker.
- **D-15:** **Bestehende PlanElementRows (pre-Phase 9) migrieren:** Pflanzen die vor Phase 9 erstellt wurden haben kein `plantSlug` in provenance. Bei Plan-Load: Best-Effort-Match via `label` gegen `plants.name_de`. Wenn Match gefunden → `plantSlug` in provenance nachtragen (silent upgrade). Wenn kein Match → keine Companion-Prüfung.

### Claude's Discretion
- Exakte Positionierung des Toast-Banners (Abstand vom unteren Rand, Animation)
- Skia-Zeichenstil des roten Dreiecks (Größe, Transparenz, Position relativ zum Pflanzen-Element)
- Performance-Optimierung: ob companionCache pro Beet oder pro Plan
- Reihenfolge der Detection-Checks (z.B. erst incompatible, dann companion)
- Test-Wave-Aufteilung

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Spezifikation
- `.planning/ROADMAP.md` §"Phase 9: Companion-Hinweis" — 6 Success Criteria (Detection, roter Banner, grüner Banner, nicht-blockierend, persistente Markierung, plant_companions)

### Direkte Abhängigkeiten (Phase 8)
- `.planning/phases/08-plant-db-foundation/08-CONTEXT.md` — D-03 plant_companions Schema, D-07 Konflikt-Resolution (neutral bei Quellen-Widerspruch), D-09 plantRepo API
- `app/src/lib/plantRepo.ts` — `loadCompanionsFor(plantId)` gibt `{ companions, incompatible, neutral }` zurück
- `app/src/hooks/usePlants.ts` — TanStack Query Hook mit JSON-Bundle Cold-Start-Fallback
- `packages/shared/src/types/plants.ts` — PlantRow, PlantCompanionRow Types
- `packages/shared/src/data/plants.json` — 90 Pflanzen + 38 Companion-Pairs (Offline-Bundle)

### Editor (Phase 7)
- `app/src/stores/editorStore.ts` — Zustand Store mit elements[], addElement, updateElement Actions
- `app/src/lib/editor/saveDebounce.ts` — Auto-Save Pattern (5s debounce)
- `app/src/lib/geometry/bedLayout.ts` — Geometrie-Utilities (polygonToBbox, Point2D)
- `app/src/lib/draftPromotionRepo.ts` — promotePlantDraft setzt `provenance.parentBedId`

### UI-Komponenten
- `app/src/components/InlineBanner.tsx` — Basis für Banner-Variants (aktuell nur 'warning')

### Shared Types
- `packages/shared/src/types/entities.ts` — PlanElementRow (elementType, label, provenance, layer)
- `app/src/lib/i18n/de.json` — i18n Strings Pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`plantRepo.loadCompanionsFor(plantId)`**: Bereits fertig aus Phase 8. Nimmt Plant-UUID, gibt symmetrische Companion/Incompatible/Neutral-Listen zurück.
- **`usePlants()` Hook**: TanStack Query mit JSON-Bundle-Fallback — Pflanzen-Daten sind immer lokal verfügbar.
- **`InlineBanner`**: Basis-Komponente für kontextuelle Hinweise. Muss um `error`/`success` Variants erweitert werden.
- **`polygonToBbox` + `Point2D`**: Geometrie-Modul in Phase 7 erstellt — PiP-Check kann hier ergänzt werden.
- **`editorStore`**: Alle Plan-Elemente im Zustand — Detection-Hook kann `elements` subscriben.

### Established Patterns
- **Phase 6.5 `provenance`-Pattern**: Freiform Record<string, unknown> auf PlanElementRow — `plantSlug` passt hier rein ohne Schema-Migration.
- **Phase 7 Derived State**: editorStore-Selektoren für UI (z.B. Layer-Filter) — Companion-Status kann als derived State implementiert werden.
- **Phase 7 Skia Canvas Overlays**: GardenPlanView rendert Elemente als Skia-Shapes — rotes Dreieck-Overlay folgt diesem Pattern.
- **i18n mit Interpolation**: `de.json` Strings mit `{{variable}}` Pattern (Phase 1).

### Integration Points
- **`addElement` / `updateElement`**: Hook in editorStore Actions für Detection-Trigger bei Platzierung/Move.
- **GardenPlanView**: Skia Canvas-Komponente wo das rote Dreieck-Overlay gerendert wird.
- **Plan-Load**: Wo auch immer Elemente initial geladen werden, dort retroaktive Detection starten.

</code_context>

<specifics>
## Specific Ideas

- **Toast statt Inline**: Banner soll wie ein Toast am unteren Rand schweben (über der Toolbar), nicht wie der existierende InlineBanner der im Layout-Flow sitzt. Möglicherweise separate CompanionToast-Komponente statt InlineBanner-Erweiterung.
- **Emoji in Banner**: Pflanzennamen mit Icon-Emoji aus Plant-DB anreichern: `"⚠ 🍅 Tomate verträgt sich nicht mit 🌿 Fenchel"`.
- **provenance.parentBedId als Hint**: Importierte Pflanzen haben bereits `parentBedId` in provenance (Phase 6.5). Bei Detection: erst provenance-Lookup, dann PiP als Fallback — spart Geometrie-Berechnung in den meisten Fällen.
- **Roadmap-Wortlaut beachten**: "Dirk darf trotzdem platzieren — er kennt seinen Garten besser" — Banner sind HINWEISE, keine Blocker. Kein Confirmation-Dialog, kein "Trotzdem platzieren?"-Button.

</specifics>

<deferred>
## Deferred Ideas

- **Mischkultur-Score pro Beet** (COMP-02, v2) — aggregierter Score aller Companion/Incompatible-Beziehungen im Beet
- **Companion-Stärke** (v2) — abgestufte Beziehungen statt binary companion/incompatible/neutral
- **Plant-Picker mit Companion-Info** — beim manuellen Hinzufügen einer Pflanze direkt sehen welche gut/schlecht passen (eigene Phase)
- **Companion-Visualisierung als Linien** — farbige Linien zwischen companion/incompatible Pflanzen auf dem Canvas (v2)
- **Notification bei Plan-Load** — wenn bestehender Plan Konflikte hat, Summary-Banner beim Öffnen ("3 Konflikte in deinem Garten")

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-companion-hinweis*
*Context gathered: 2026-05-17*
*Mode: `--auto` (Claude selected recommended defaults)*
