---
phase: 09-companion-hinweis
verified: 2026-05-17T14:21:40Z
status: human_needed
score: 6/6
overrides_applied: 0
human_verification:

  - test: "Kartoffel + Tomate im selben Beet platzieren (Web)"
    expected: "Roter Banner mit Konflikt-Text, rote Dreiecke an beiden Pflanzen"
    why_human: "Visuelles Rendering (SVG Polygon, Toast-Overlay) nur im Browser verifizierbar"
  - test: "Basilikum + Tomate im selben Beet platzieren (Web)"
    expected: "Gruener Banner mit Gute-Nachbarschaft-Text"
    why_human: "Toast-Erscheinung und Auto-Dismiss nach 4s nur visuell pruefbar"
  - test: "Toast auto-dismiss, Dreiecke bleiben (Web)"
    expected: "Nach 4 Sekunden verschwindet Toast, rote Dreiecke bleiben sichtbar"
    why_human: "Persistenz der Markierung nach Dismiss nur im laufenden Editor verifizierbar"
  - test: "Pflanze ausserhalb aller Beete platzieren"
    expected: "Kein Toast, keine Dreiecke"
    why_human: "Edge-case-Verhalten nur im laufenden Editor verifizierbar"
  - test: "Skia-Editor auf iPhone/Simulator testen"
    expected: "Skia Path-Dreiecke mit #DC2626 sichtbar an Konflikt-Pflanzen"
    why_human: "Skia-Rendering nur auf nativem Geraet/Simulator pruefbar"
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-09
  status: human_needed
---

# Phase 9: Companion-Hinweis Verification Report

**Phase Goal:** Beim Setzen einer Pflanze auf ein Beet (oder einer existierenden Pflanze in dasselbe Beet) sofort visuell sehen: passt das zusammen?
**Verified:** 2026-05-17T14:21:40Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| SC-1 | Detection laeuft gegen alle anderen Pflanzen in demselben Beet-Polygon (Web + iPhone) | VERIFIED | `useCompanionDetection.ts` L126-163: `computeConflicts` groups plants by bed via `findBedForPlant` (parentBedId fast-path + PiP fallback), cross-checks companionMap. Hook called in both `PlanScreen` (native, L147) and `WebEditorShell` (web, L250) in `plan/index.tsx`. 18 unit tests cover detection logic. |
| SC-2 | Roter Banner bei Konflikt mit i18n-Text | VERIFIED | `computeToastForElement` L219-226 returns `{variant:'error', message: "... Konflikt ..."}`. `CompanionToast.tsx` renders `VARIANT_STYLES.error` with `border-red-600`, `AlertTriangle` icon, `#DC2626`. Toast conditionally rendered in plan/index.tsx L226-233 (native) and L270-277 (web). de.json L316: `"conflict_single": "... Konflikt: {{plantA}} vertraegt sich nicht mit {{plantB}}"` with UTF-8 warning sign. |
| SC-3 | Gruener Banner bei Companion mit i18n-Text | VERIFIED | `computeToastForElement` L230-238 returns `{variant:'success', message: "... Gute Nachbarschaft ..."}`. `CompanionToast.tsx` renders `VARIANT_STYLES.success` with `border-green-600`, `CheckCircle` icon, `#16A34A`. de.json L318: `"good_single": "... Gute Nachbarschaft: {{plantA}} + {{plantB}}"` with UTF-8 checkmark. |
| SC-4 | Beide Banner sind nicht-blockierend | VERIFIED | `CompanionToast.tsx` L50: `pointerEvents="box-none"` on outer View. Auto-dismiss via `setTimeout(onDismiss, autoDismissMs)` L41. Toast is rendered as sibling after editor (not blocking layout). Detection hook returns `conflictElementIds` + `toastState` but never prevents placement -- `editorStore.addElement` is not gated. |
| SC-5 | Persistente Markierung: rotes Dreieck-Icon an Pflanzen mit aktivem Konflikt | VERIFIED | `EditorCanvas.tsx` L271-283: Skia `<Path>` with `color="#DC2626"` opacity 0.9, keyed `conflict-${el.id}`, rendered for elements in `conflictElementIds` Set. `WebPlanEditor.tsx` L326-332: SVG `<Polygon>` with `fill="#DC2626"` opacity 0.9, `pointerEvents="none"`. `conflictElementIds` is derived from `useMemo` on `elements` (L304-307 in hook), so triangles update reactively when elements change (appear on conflict, disappear when resolved). |
| SC-6 | Adjacency-Logik via Phase 8 plant_companions-Tabelle | VERIFIED | `useCompanionDetection.ts` L10: `import plantsBundle from '@spatenstich/shared/data/plants'`. L299-301: `buildCompanionMap(plantsBundle)` builds bidirectional slug lookup from bundle companions array (which is generated from Phase 8 plant_companions data). `draftPromotionRepo.ts` L224: `plantSlug: resolveSlugFromLabel(draft.commonNameDe)` writes slug to provenance using same bundle. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/src/lib/geometry/bedLayout.ts` | pointInPolygon ray-casting | VERIFIED | 54 lines, exports `pointInPolygon` with proper ray-casting algorithm, `polygon.length < 3` guard returns false |
| `app/src/components/InlineBanner.tsx` | Multi-variant (warning/error/success) | VERIFIED | 102 lines, `VARIANT_STYLES` map with 3 variants, dynamic `vs.border`/`vs.bg`/`vs.Icon` lookup |
| `packages/shared/src/i18n/de.json` | companion.* i18n keys | VERIFIED | 5 sub-keys: conflict_single, conflict_multi, good_single, good_multi, dismiss. UTF-8 chars present |
| `app/src/hooks/useCompanionDetection.ts` | Companion detection hook | VERIFIED | 331 lines, 7 exported pure functions + hook. Subscribes to editorStore, computes conflicts, produces toast state |
| `app/src/hooks/__tests__/useCompanionDetection.test.ts` | Detection hook tests | VERIFIED | 527 lines, 18 test cases covering all detection scenarios |
| `app/src/components/editor/CompanionToast.tsx` | Floating toast component | VERIFIED | 78 lines, error/success variants, auto-dismiss, pointerEvents box-none, manual dismiss |
| `app/src/components/editor/__tests__/CompanionToast.test.tsx` | Toast tests | VERIFIED | 65 lines, 5 test cases |
| `app/src/components/editor/EditorCanvas.tsx` | Skia conflict triangle overlay | VERIFIED | Contains `conflictElementIds` prop, Skia `<Path>` with `#DC2626` for conflict triangles |
| `app/src/components/editor/web/WebPlanEditor.tsx` | SVG conflict triangle overlay | VERIFIED | Contains `conflictElementIds` prop, SVG `<Polygon>` with `#DC2626` and `pointerEvents="none"` |
| `app/app/(app)/plan/index.tsx` | Hook wired into editor screen | VERIFIED | `useCompanionDetection()` called in both PlanScreen (L147) and WebEditorShell (L250). `conflictElementIds` passed to both editors. `CompanionToast` conditionally rendered in both paths. |
| `app/src/lib/draftPromotionRepo.ts` | plantSlug in provenance | VERIFIED | `resolveSlugFromLabel` helper + `plantSlug: resolveSlugFromLabel(draft.commonNameDe)` in provenance object |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| plan/index.tsx | useCompanionDetection.ts | hook call | WIRED | L147 (native), L250 (web): `const { conflictElementIds, toastState, dismissToast } = useCompanionDetection()` |
| plan/index.tsx | CompanionToast.tsx | conditional render | WIRED | L226-233 (native), L270-277 (web): `{toastState && <CompanionToast .../>}` |
| plan/index.tsx | EditorCanvas.tsx | conflictElementIds prop | WIRED | L212: `<EditorCanvas dimensions={dimensions} conflictElementIds={conflictElementIds} />` |
| plan/index.tsx | WebPlanEditor.tsx | conflictElementIds prop | WIRED | L262: `conflictElementIds={conflictElementIds}` |
| useCompanionDetection.ts | editorStore.ts | subscribe | WIRED | L314: `useEditorStore.subscribe(...)` + L283: `useEditorStore((s) => s.elements)` |
| useCompanionDetection.ts | bedLayout.ts | pointInPolygon import | WIRED | L12: `import { pointInPolygon } from '../lib/geometry/bedLayout'` |
| useCompanionDetection.ts | plants bundle | companion map | WIRED | L10: `import plantsBundle from '@spatenstich/shared/data/plants'`; L300: `buildCompanionMap(plantsBundle)` |
| draftPromotionRepo.ts | plants bundle | slug resolution | WIRED | `resolveSlugFromLabel` iterates bundle.plants for case-insensitive match |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| useCompanionDetection.ts | `conflictElementIds` | editorStore.elements + plantsBundle.companions | Yes -- cross-checks plant slugs in same bed against companion map from 38+ real pairs | FLOWING |
| useCompanionDetection.ts | `toastState` | computeToastForElement from element changes | Yes -- builds message string from plant display names + companion map lookups | FLOWING |
| CompanionToast.tsx | `message` prop | pre-interpolated from hook | Yes -- receives fully formed German string from detection logic | FLOWING |
| EditorCanvas.tsx | `conflictElementIds` prop | from hook via plan/index.tsx | Yes -- Set of real element IDs from computeConflicts | FLOWING |
| WebPlanEditor.tsx | `conflictElementIds` prop | from hook via plan/index.tsx | Yes -- same Set passed through | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running Expo dev server + interactive editor to test detection pipeline end-to-end; no standalone CLI entry point for companion detection)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SC-1 | 09-02, 09-04 | Detection gegen alle Pflanzen im selben Beet-Polygon | SATISFIED | computeConflicts groups by bed, cross-checks all pairs |
| SC-2 | 09-03, 09-04 | Roter Banner bei Konflikt (i18n) | SATISFIED | CompanionToast error variant + toast wiring + de.json keys |
| SC-3 | 09-03, 09-04 | Gruener Banner bei Companion (i18n) | SATISFIED | CompanionToast success variant + toast wiring + de.json keys |
| SC-4 | 09-03, 09-04 | Nicht-blockierend | SATISFIED | pointerEvents box-none, auto-dismiss, placement not gated |
| SC-5 | 09-04 | Persistente rote Dreieck-Markierung | SATISFIED | Skia Path + SVG Polygon, reactive via conflictElementIds useMemo |
| SC-6 | 09-01, 09-02 | plant_companions-Tabelle (via Bundle) | SATISFIED | plantsBundle import, buildCompanionMap, resolveSlugFromLabel |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| -- | -- | No anti-patterns found | -- | -- |

No TODO/FIXME/PLACEHOLDER markers found in any Phase 9 files. No empty implementations. All `return null` instances are legitimate guard clauses for edge cases (plant outside bed, no slug, no companion entry).

### Human Verification Required

### 1. Konflikt-Banner und Dreiecke (Web)

**Test:** Kartoffel + Tomate im selben Beet platzieren im Web-Editor
**Expected:** Roter Toast "Konflikt: Kartoffel vertraegt sich nicht mit Tomate", rote Dreiecke an beiden Pflanzen
**Why human:** SVG Polygon-Rendering, Toast-Overlay-Positionierung, und visuelle Korrektheit nur im Browser pruefbar

### 2. Companion-Banner (Web)

**Test:** Basilikum + Tomate im selben Beet platzieren
**Expected:** Gruener Toast "Gute Nachbarschaft: Tomate + Basilikum"
**Why human:** Toast-Erscheinung mit korrektem Icon und Farbe nur visuell pruefbar

### 3. Auto-Dismiss + Dreieck-Persistenz

**Test:** Nach Konflikt-Toast 4 Sekunden warten
**Expected:** Toast verschwindet, rote Dreiecke bleiben sichtbar
**Why human:** Timing-Verhalten und visuelle Persistenz nur im laufenden Editor verifizierbar

### 4. Pflanze ausserhalb Beet

**Test:** Pflanze ausserhalb aller Beet-Polygone platzieren
**Expected:** Kein Toast, keine Dreiecke
**Why human:** Erfordert interaktive Platzierung im Editor

### 5. Skia-Editor (iPhone/Simulator)

**Test:** Kartoffel + Tomate im Skia-Editor auf iPhone/Simulator testen
**Expected:** Rote Skia-Path-Dreiecke an Konflikt-Pflanzen sichtbar
**Why human:** Skia-Rendering nur auf nativem Geraet/Simulator pruefbar

### Gaps Summary

Keine Gaps gefunden. Alle 6 Success Criteria sind auf Code-Ebene vollstaendig implementiert und verdrahtet. Die gesamte Detection-Pipeline (Hook -> Toast + Canvas-Overlay) ist in beiden Plattformen (Web/SVG + Native/Skia) integriert. 

Menschliche Verifikation wird benoetigt, um die visuelle Korrektheit im laufenden Editor zu bestaetigen: Toast-Erscheinung, Dreieck-Rendering, Auto-Dismiss-Timing, und plattformspezifisches Rendering (SVG vs Skia).

---

_Verified: 2026-05-17T14:21:40Z_
_Verifier: Claude (gsd-verifier)_
