# Phase 30: Feldführer-Fundament und Editor-Kern - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

> Decision IDs below (`D-01` … `D-14`) are local to this phase. Project-level decisions are
> cited as `PROJECT D-xx` and live in `.planning/PROJECT.md` (Key Decisions).

<domain>
## Phase Boundary

The app gets the Feldführer foundation (tokens, self-hosted Fraunces and Newsreader, restyled
shared base components on every screen), and the plan screen plus the read-only preview
(`GardenPlanView`) are replaced by one `PlanEditor` drawn as a surveyed plate. In that editor
every element can be selected, moved, resized at the corners, stretched from one side (opposite
edge fixed, also when rotated), rotated and renamed, by finger on Android Chrome and by mouse on
desktop, with zoom (0.5× to 4×), pan and a fit button, plus numeric entry of width, depth and
rotation.

Requirements: DESIGN3-01, DESIGN3-02, DESIGN3-03, EDIT3-01 … EDIT3-08.

Not in this phase (fixed by the roadmap): full palette with plants and search, placement
preview, multi-select, duplicate, layer order, delete with undo hint, undo/redo, keyboard
shortcuts, size readout on the selected element, reliable save-on-leave (all Phase 31); plants
following their bed, snapping to grid and neighbours, guide lines, free outlines, parcel
editing, removal of Skia and the old web editor files, 200-element performance (all Phase 32);
app-wide icon replacement and per-screen layout polish (Phase 38). No backend work; saving
uses the existing path.

</domain>

<decisions>
## Implementation Decisions

### Finger and mouse gestures
- **D-01:** Touch uses a select-first rule. A tap on an element selects it. A one-finger drag
  moves an element only if it starts on the already selected element (or on one of its
  handles). Any other one-finger drag, whether it starts on an unselected element or on empty
  plan, pans the plan. A tap on empty plan deselects. Reason: lawn and paths lie under almost
  every finger position, so "move at once" would move things whenever someone swipes to look
  around. This deliberately departs from Sketch 001, which moved on press and had no pan.
- **D-02:** With the mouse, pressing on an unselected element selects it and moves it at once
  in the same drag, as in today's desktop editor. Touch and mouse therefore differ on purpose;
  the controller must branch on pointer type.
- **D-03:** Mouse panning: dragging on empty plan pans; the middle mouse button and Space+drag
  pan from anywhere, including over elements. The wheel zooms (roadmap criterion 4). Shift+drag
  on empty plan is reserved for the selection frame that Phase 31 adds and must not be bound
  to anything else now.

### Snapping and step sizes
- **D-04:** The rotation handle moves in hard 15° steps under a finger. Any other angle is
  typed into the Drehung field, exact to 1°. On desktop, holding Shift while dragging the handle
  turns freely (existing behaviour of `rotationSnap.ts`). No soft or distance-based snap.
- **D-05:** Moving and resizing by drag land on a 5 cm step (0,05 m) for position and size.
  Values typed into the properties field are exact to 1 cm and are not rounded to the 5 cm
  step. This is the basic step only; snapping to grid and neighbouring edges, and the switch
  to turn it off, remain Phase 32.
- **D-06:** An element’s centre must stay inside the parcel; the element may overhang the
  boundary (`clampCenterToGarden`, Masterplan WP 22.1). This is a deliberate change from
  today: `WebPlanEditor.tsx` (lines 367–382) keeps the whole unrotated element box inside the
  parcel. The user confirmed the change after the difference was pointed out. No "fully
  inside" rule, no free placement outside.

### Editor frame and entry
- **D-07:** Properties field on the phone (375 px): a strip under the plan that appears while
  an element is selected and stays visible, with Name, Breite, Tiefe, Drehung, as the inspector
  in Sketch 001. Values update live while dragging, and typing updates the element on the plan
  immediately. On desktop the same fields sit in a panel on the right. No bottom sheet, and
  the existing `ElementEditorModal` is not the properties surface for these four fields.
- **D-08:** The plan screen opens read-only: zoom and pan work, nothing can be selected or
  moved. A "Bearbeiten" action opens the full-screen editor; "Fertig" returns to the read-only
  view. The read-only view and the editor are the same `PlanEditor` in two modes
  (`readOnly` / `edit`), and the read-only mode also replaces `GardenPlanView` wherever it is
  used. Tabs are Phase 37, so no tab restructuring here.
- **D-09:** Interim adding: a "+" button opens a plain list of element kinds (Beet, Hochbeet,
  Rasen, Weg, Laube and the other non-plant kinds that exist today). Tapping a kind places one
  element at the centre of the currently visible plan at its default size, selected and ready
  to move. No plants, no search, no placement preview, no drag-to-create. This is throwaway
  scaffolding that Phase 31 replaces with the real palette.
- **D-10:** The desktop feature gap is accepted. From this phase on the plan screen routes only
  to the new editor; undo/redo, multi-select, arrow keys, drag-to-create and layer order are
  unavailable on desktop until Phase 31. The old `WebPlanEditor` is not kept reachable and
  there is no "Alter Editor" link. (Deleting the old files stays Phase 32 per EDIT3-19; this
  phase only stops routing to them.) Context: the backend has been unreachable since October
  2026, so nobody is using the deployed editor day to day.

### Plate details and app restyle
- **D-11:** The north arrow is settable in this phase, in a minimal way. In edit mode, tapping
  the arrow turns it in 15° steps, with a typed angle as the exact alternative. The direction
  is stored with the garden in the existing `extraDims` field of `GardenDimensionsRow`, so no
  database migration. Only the arrow turns; the plan and its elements do not. Read-only mode
  shows the stored direction. A garden with no stored direction shows north pointing up.
  — **Reversibility:** costly — the key name and value convention inside `extraDims` become
  stored, synced garden data on every device; renaming or re-interpreting it later needs a
  data rewrite, so the key and the angle convention (0° = up, clockwise) must be fixed once
  in `packages/shared`.
- **D-12:** Element names keep a constant on-screen size (about 13.5 px, Sketch 001). A name
  on a long narrow element runs along the element. A name that still does not fit is shortened
  with "…"; on very small elements it is hidden. The selected element always shows its full
  name. Names never overflow their element unselected.
- **D-13:** Restyle depth for the existing screens (home, calendar, import, settings, sign-in):
  Feldführer tokens and base parts only. Every screen gets the Feldführer colours, Fraunces and
  Newsreader, square corners and hairline borders through the Tailwind theme and the shared
  components in `app/src/components/ui/`; hard-coded colours are replaced by tokens. Layouts
  and screen structure stay as they are. The full field-guide treatment per screen (rules
  instead of cards, small-caps section labels, italic numerals, the calendar rework) stays in
  Phase 38.
- **D-14:** Icon set: Lucide (`lucide-react-native`, already installed and used in 15 files),
  drawn with a thin stroke of about 1.5 px in ink colour. It is used for the new editor
  toolbar now and becomes the single app-wide set when Phase 38 removes emoji and glyphs
  (DESIGN3-04). No Phosphor, no custom-drawn icons.

### Carried forward (already decided, do not reopen)
- PROJECT D-03: one `PlanEditor`, SVG in the web DOM, pointer events, interaction logic
  testable without a browser.
- PROJECT D-18: design "Feldführer" from Sketch 001; light appearance only.
- PROJECT D-21: handle hit areas at least 44 px, mostly outside the element, reaching inward
  at most a quarter of the element; middle handles dropped on sides under 36 px on screen;
  a small selected element can still be dragged by its body and renamed.
- Sketch 001 findings: handles and labels have a constant on-screen size independent of zoom
  (13 px visual handle in the sketch).
- Roadmap: rotation snap 15°, typed to 1°; zoom range 0.5× to 4× of fit scale; fit button;
  sizes in metres with a decimal comma; double-tap or double-click renames on the plan;
  fonts shipped with the app, available offline, no request to third-party servers.

### Claude's Discretion
The user left these to the builder; decide them in research and planning, guided by the
decisions above and Sketch 001:
- Minimum element size while resizing (today 0,05 m in `WebResizeHandle.tsx`), and whether it
  differs per element kind.
- What is shown while a handle is being dragged (for example a live angle or size readout).
  The permanent size label on the selected element is Phase 31 (EDIT3-16).
- Inline rename details: placement of the text field over the element, behaviour with the
  on-screen keyboard open, Enter/Escape/blur, maximum length (the sketch used 24 characters).
- Scale bar: which round lengths it shows and how it steps with zoom; where scale bar, north
  arrow and fit button sit on the plate.
- Hatching: pattern, and which element kinds beyond beds carry a wash only. Mapping of the
  element kinds that have no Feldführer token yet (Zaun, Sitzplatz, Sonstiges, Pflanze) onto
  the palette.
- Pan limits, zoom anchor (pinch midpoint, cursor), behaviour of two-finger scroll on a
  trackpad, pen input (treat as touch or mouse), and whether a selection survives a pinch.
- Exact layout of the properties strip and the desktop panel, and how the strip behaves when
  the keyboard is open.
- Default sizes for the "+" list (one source of truth, per Masterplan WP 22.1).
- How the north angle is typed (in the strip, or a small field at the arrow).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` (Phase 30, with Phases 31 and 32 for the boundary) — goal, five
  success criteria, the note on what is and is not replaced in this phase, plan estimate.
- `.planning/REQUIREMENTS.md` — DESIGN3-01 … DESIGN3-03 and EDIT3-01 … EDIT3-08 (this phase);
  EDIT3-09 … EDIT3-19 and DESIGN3-04 … DESIGN3-08 for what must stay out.
- `.planning/PROJECT.md` — Key Decisions D-03, D-08, D-18, D-21; constraints (SVG in web DOM,
  UI strings only in `de.json`, UTF-8 umlauts, light only).
- `.planning/STATE.md` — repo conventions (TDD RED→GREEN commits, draft PRs, one branch per
  phase) and the backend blocker.

### Design direction "Feldführer"
- `.planning/sketches/MANIFEST.md` — the direction in words; token source and component
  treatment pointers.
- `.planning/sketches/themes/feldfuehrer.css` — the tokens: colours, line widths, radii,
  element fills, label and handle styling, hatching and north-arrow switches.
- `.planning/sketches/001-visual-direction/index.html` — the `[data-dir=b]` rules for component
  treatment; `edSkel` (editor top bar, palette, inspector fields), `elSVG` / `selSVG` (plate
  and selection drawing) and `bindPlan` (resize and rotation math for a rotated element).
  Note: the sketch loads fonts from Google Fonts and moves elements on press; the app must do
  neither (DESIGN3-02, D-01).
- `.planning/sketches/001-visual-direction/README.md` — "Findings from building it": handle
  reach, constant on-screen sizes, solid background for the size label, names along narrow
  elements.

### Editor mechanics
- `.planning/MASTERPLAN-v2.md` §4 "Phase 22 — Ein Editor für Maus und Touch", WP 22.1–22.3 —
  pure helpers, the interaction controller (`PointerSample`, state machine, thresholds: 5 px
  mouse / 8 px touch, double-tap ≤ 300 ms ≤ 20 px, pinch clamp 0.5×–4×), renderer and web
  pointer adapter (no handlers on SVG elements, `touch-action: none`, `ResizeObserver` fit).
  Where it conflicts with this file or the roadmap, this file and the roadmap win: the wheel
  zooms (not Ctrl+wheel only), labels use Fraunces (not Caveat), touch is select-first, the
  Masterplan's long-press-to-edit and `(tabs)` move are not part of this phase.
- `.planning/MASTERPLAN-v2.md` §3.4 is superseded by Feldführer and must not be used.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/src/lib/editor/rotationSnap.ts` — 15° snap with a free-rotation flag; matches D-04.
- `app/src/lib/editor/handleGeometry.ts`, `hitTest.ts` — handle positions and hit testing;
  `hitTest.ts` is not rotation-aware yet (Masterplan WP 22.1 replaces lines 47–56).
- `app/src/components/editor/web/WebResizeHandle.tsx` (lines 56–87) and
  `WebRotationHandle.tsx` — the resize math for rotated elements and the rotation math, to be
  carried into the controller. `MIN_DIM_M = 0.05` lives here.
- `app/src/stores/editorStore.ts` (Zustand) — selection and element actions the controller
  drives.
- `app/src/lib/editor/saveDebounce.ts` and the leave-flush in `app/app/(app)/plan/index.tsx` —
  the existing save path this phase keeps using.
- `app/src/lib/geometry/viewMatrix.ts` (`screenToGarden`) — screen-to-metre conversion.
- `app/src/components/ui/` (button, card, input, badge, label, separator, switch, text) — the
  shared base parts through which D-13 restyles every screen.
- `lucide-react-native` — installed, used in 15 files (D-14).
- `app/sw-src.js`, `app/workbox-config.js`, `PwaControllers.tsx` — the service worker that must
  precache the font files so they load offline.

### Established Patterns
- NativeWind 4 with Tailwind 3; `app/tailwind.config.js` has an empty `theme.extend` and
  `app/global.css` holds only the three Tailwind directives. There are no design tokens yet.
- 155 hard-coded hex colours across 42 files in `app/src` and `app/app`; `app/src/lib/colors.ts`
  (`PLAN_COLORS`, `darkenColor`, `truncateLabel`) is the current plan palette and uses
  "Papier & Erde"-era values that the Feldführer element tokens replace.
- `react-native-svg` on web strips `onClick`; pointer handling goes on a wrapping `div`
  (Masterplan WP 22.3).
- The `t()` helper is copy-pasted per file (33 copies); strings live in `de.json` in
  `packages/shared`.
- Editor component tests live in `app/src/components/editor/__tests__/` with a jsdom setup
  that has no `PointerEvent`; controller logic is meant to be tested in the `node` project
  without a DOM.

### Integration Points
- `app/app/(app)/plan/index.tsx` (371 lines) — currently mounts the Skia `EditorCanvas` or
  `WebPlanEditor` by platform, with toolbar, palette, drafts tray and editor modal. It becomes
  the read-only view with "Bearbeiten", plus a full-screen edit route (D-08, D-10).
- `app/src/components/GardenPlanView.tsx` (229 lines) — the read-only preview to be replaced
  by `PlanEditor` in read-only mode, including on the home screen `app/app/(app)/index.tsx`.
- `GardenDimensionsRow.extraDims` in `packages/shared/src/types/entities.ts` — where the north
  direction is stored (D-11). Research must confirm that `extraDims` survives the row mappers
  (`app/src/lib/mappers/rowMappers.ts`), local storage and the outbox unchanged, and that
  `gardenPlanRepo.ts` can write garden dimensions from the editor.
- `app/app/_layout.tsx` — font loading and global styles.
- The old editor files (`EditorCanvas.tsx`, `web/WebPlanEditor.tsx` at 1,042 lines, their
  handles, toolbars and tests) stay in the repository, unrouted, until Phase 32.

</code_context>

<specifics>
## Specific Ideas

- The editor top bar follows Sketch 001: "Fertig" on the left, the plan title with parcel size,
  and room on the right for the fit button (undo, redo and the save indicator from the sketch
  arrive with Phase 31).
- The empty-selection hint from the sketch fits the select-first rule and can be reused in
  spirit: tap to select, drag to move, handles to stretch or turn, double-tap to rename.
- The properties strip mirrors the sketch inspector: Name on its own line, then Breite, Tiefe
  and Drehung side by side with "m" and "°" as units, decimal comma, numeric keyboards.
- Double-tap on an unselected element under the select-first rule: the first tap selects, the
  second starts renaming; no separate rule is needed.
- Forward constraint for Phase 31: the selection frame uses Shift+drag on empty plan with the
  mouse (D-03), because plain empty-area drag is taken by panning.

</specifics>

<deferred>
## Deferred Ideas

- Sketch 001 is not packaged as a findings skill. `/gsd-sketch --wrap-up` would make its
  findings available to later agents without reading the sketch files directly.
- Full field-guide layout treatment of each existing screen: already Phase 38 (DESIGN3-04 …
  DESIGN3-08); confirmed there by D-13, nothing new to schedule.

No new capabilities were proposed during the discussion; it stayed within the phase scope.

</deferred>

---

*Phase: 30-Feldführer-Fundament und Editor-Kern*
*Context gathered: 2026-11-14*
