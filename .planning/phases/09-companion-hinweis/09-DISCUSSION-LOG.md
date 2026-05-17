# Phase 9: Companion-Hinweis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 09-companion-hinweis
**Areas discussed:** Detection-Trigger, Beet-Zugehörigkeit, Banner-UX, Persistente Markierung, Plant↔PlantRow Mapping
**Mode:** `--auto` — all choices auto-selected as recommended defaults

---

## Detection-Trigger & Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Bei Platzierung + Plan-Load + Move | Vollständige Abdeckung aller Auslöser | ✓ |
| Nur bei Platzierung | Einfacher, aber retroaktive Konflikte unsichtbar | |
| Continuous während Drag | Rechenintensiv, fraglicher UX-Mehrwert | |

**User's choice:** [auto] Bei Platzierung + Plan-Load + Move (recommended: vollständige Abdeckung)
**Notes:** Client-seitig, kein Server-Roundtrip nötig (plant_companions lokal via JSON-Bundle)

---

## Beet-Zugehörigkeit (Bed Association)

| Option | Description | Selected |
|--------|-------------|----------|
| Spatial Containment (PiP) | Point-in-Polygon Test; universell für alle Pflanzen | ✓ |
| Explizites parentBedId-Feld | Würde Migration erfordern; nur für neue Pflanzen | |
| Proximity-basiert | Ungenau bei eng beieinander liegenden Beeten | |

**User's choice:** [auto] Spatial Containment (recommended: universell für manuelle + importierte Pflanzen)
**Notes:** provenance.parentBedId als Optimierungs-Hint, PiP als Fallback

---

## Banner-Darstellung

| Option | Description | Selected |
|--------|-------------|----------|
| Toast unten, auto-dismiss 4s | Nicht-blockierend, temporär, über Toolbar | ✓ |
| Inline-Banner im Canvas | Permanent sichtbar, nimmt Layout-Platz | |
| Modal-Dialog | Blockierend — widerspricht Roadmap-Anforderung | |

**User's choice:** [auto] Toast unten, auto-dismiss 4s (recommended: per Roadmap nicht-blockierend)
**Notes:** Rot für Konflikte (⚠), Grün für Companions (✓); Konflikt hat Vorrang bei Mehrfach-Matches

---

## Persistente Konflikt-Markierung

| Option | Description | Selected |
|--------|-------------|----------|
| Computed on-demand (derived state) | Immer aktuell, keine DB-Mutation | ✓ |
| In DB persistieren | Müsste bei jeder Änderung synchronisiert werden | |
| Nur in Zustand-Store cachen | Session-gebunden, nach App-Restart weg | |

**User's choice:** [auto] Computed on-demand (recommended: always current, no sync complexity)
**Notes:** useMemo/derived selector; Performance kein Problem bei typischen Gartengrößen (<200 Elemente)

---

## Plant↔PlantRow Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| plantSlug in provenance | Zuverlässiger Lookup via loadPlantBySlug | ✓ |
| Label-Matching (fuzzy) | Fragil bei Tippfehlern, Synonymen | |
| Neues plantSlug-Feld auf PlanElementRow | Migration nötig, aber expliziter | |

**User's choice:** [auto] plantSlug in provenance (recommended: nutzt existierendes provenance-Pattern)
**Notes:** Kein Schema-Change nötig; pre-Phase-9 Pflanzen bekommen Best-Effort label→slug Migration bei Plan-Load

---

## Claude's Discretion

- Toast-Positionierung und Animation
- Skia rotes Dreieck Zeichenstil
- Performance-Optimierung (Cache-Strategie)
- Test-Wave-Aufteilung

## Deferred Ideas

- Mischkultur-Score pro Beet (v2 COMP-02)
- Companion-Stärke-Nuancen (v2)
- Plant-Picker mit Companion-Info (eigene Phase)
- Companion-Visualisierung als Linien (v2)
