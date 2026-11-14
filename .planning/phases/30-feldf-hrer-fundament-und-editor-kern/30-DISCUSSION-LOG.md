# Phase 30: Feldführer-Fundament und Editor-Kern - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-14
**Phase:** 30-Feldführer-Fundament und Editor-Kern
**Areas discussed:** Finger: move vs. pan, Snapping and step sizes, Editor frame and entry, Plate details and app restyle

All four proposed areas were selected. Each area's questions were asked in one call, with the
"more questions or next area" check included; the user chose to move on each time.

---

## Finger: move vs. pan

### One finger on an unselected element (phone)

| Option | Description | Selected |
|--------|-------------|----------|
| Select first | A tap selects. Only the selected element moves under a dragging finger; any other one-finger drag pans the plan. | ✓ |
| Move at once | As in Sketch 001: pressing on any element selects and moves it; the plan pans only with two fingers. | |
| Hold, then move | A quick drag pans; holding about 0.3 s on an element picks it up. | |

**User's choice:** Select first (recommended option)

### Mouse press and drag on an unselected element (desktop)

| Option | Description | Selected |
|--------|-------------|----------|
| Move at once | As in today's desktop editor: press, drag, done. | ✓ |
| Same as the phone | Click selects; only the selected element drags. | |

**User's choice:** Move at once (recommended option)

### Mouse pan

| Option | Description | Selected |
|--------|-------------|----------|
| Drag empty area | Dragging where no element is pans; middle button and Space+drag pan anywhere; Phase 31 selection frame uses Shift+drag. | ✓ |
| Space or middle button | Only Space+drag or middle button pan; empty-area drag stays free for the selection frame. | |
| You decide | Pick whatever fits best with multi-select in Phase 31. | |

**User's choice:** Drag empty area (recommended option)
**Notes:** None.

---

## Snapping and step sizes

### Rotation handle under a finger

| Option | Description | Selected |
|--------|-------------|----------|
| Hard 15° steps | Always 15° steps on the phone; other angles typed to 1°; Shift turns freely on desktop. | ✓ |
| Soft snap | Follows the finger to 1° and catches within about 4° of a 15° mark. | |
| Free by distance | Snaps near the element, turns freely when the finger is pulled further out. | |

**User's choice:** Hard 15° steps (recommended option)

### Drag step for move and resize until Phase 32

| Option | Description | Selected |
|--------|-------------|----------|
| 5 cm | Positions and sizes land on 0,05 m; typed values exact to 1 cm. | ✓ |
| 10 cm | Matches today's arrow-key step and the Masterplan grid. | |
| 1 cm | Practically free. | |

**User's choice:** 5 cm (recommended option)

### Parcel boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Centre stays inside | Overhang allowed, centre cannot leave the parcel. | ✓ |
| Fully inside | The whole element must stay within the boundary (today’s behaviour). | |
| Free | No limit. | |

**User's choice:** Centre stays inside (recommended option), confirmed in a follow-up question
**Notes:** The option was first presented as today's behaviour, which was wrong: today's desktop editor keeps the whole element box inside the parcel (`WebPlanEditor.tsx` lines 367–382). The error was pointed out and the question asked again with the correct description; the user kept "Centre stays inside".

---

## Editor frame and entry

### Properties field at 375 px

| Option | Description | Selected |
|--------|-------------|----------|
| Strip under the plan | Appears when an element is selected and stays visible, as in Sketch 001; values live. | ✓ |
| Bottom sheet on demand | Plan keeps full height; a button pulls up a sheet with the fields. | |
| Existing dialog | Reuse `ElementEditorModal`, restyled; covers the plan. | |

**User's choice:** Strip under the plan (recommended option)

### How the plan screen opens

| Option | Description | Selected |
|--------|-------------|----------|
| View, then "Bearbeiten" | Opens read-only with zoom and pan; "Bearbeiten" opens the full-screen editor, "Fertig" returns. | ✓ |
| Editable at once | The plan screen is the editor. | |

**User's choice:** View, then "Bearbeiten" (recommended option)

### Interim way to add an element

| Option | Description | Selected |
|--------|-------------|----------|
| "+" with a short list | Plain list of element kinds; tap places one mid-view at default size, selected. | ✓ |
| Keep today's palette bar | Carry over the existing desktop palette bar. | |
| No adding yet | Phase 30 only edits what already exists. | |

**User's choice:** "+" with a short list (recommended option)

### Desktop feature gap until Phase 31

| Option | Description | Selected |
|--------|-------------|----------|
| Accept the gap | One editor from now on; the old editor is not reachable. | ✓ |
| Keep old editor reachable | A link "Alter Editor" opens `WebPlanEditor` until Phase 31 ships. | |
| Hold the release | Merge Phase 30 to master only together with Phase 31. | |

**User's choice:** Accept the gap (recommended option)
**Notes:** Presented with the fact that the backend has been unreachable since October 2026, so the deployed editor is not in daily use.

---

## Plate details and app restyle

### North arrow

| Option | Description | Selected |
|--------|-------------|----------|
| Settable now, minimal | Tapping the arrow turns it (15° steps or typed angle); saved in the garden's existing extra-data field. | ✓ |
| Points up, set later | Always up for now; settable in Phase 32. | |
| You decide | Choose by effort. | |

**User's choice:** Settable now, minimal (recommended option)

### Names that do not fit

| Option | Description | Selected |
|--------|-------------|----------|
| Shorten, full when selected | Along narrow elements, cut with "…", hidden when tiny; selected element shows the full name. | ✓ |
| Always full, may overflow | Every name in full on a halo, may extend past its element. | |
| You decide | Tune against the real plan at 375 px. | |

**User's choice:** Shorten, full when selected (recommended option)

### Restyle depth of existing screens

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens and base parts | Colours, typefaces, square corners, hairline borders via shared components; layouts unchanged; polish in Phase 38. | ✓ |
| Full treatment now | Each screen reworked to the field-guide layout in this phase. | |

**User's choice:** Tokens and base parts (recommended option)

### Icon set

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide, thin stroke | Already installed and used in 15 files; about 1.5 px stroke in ink colour. | ✓ |
| Phosphor Light | More calligraphic line; new dependency. | |
| Own drawn editor icons | Custom ink icons for the editor tools, lucide elsewhere. | |

**User's choice:** Lucide, thin stroke (recommended option)
**Notes:** None.

---

## Closing check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write 30-CONTEXT.md; smaller details left to Claude's judgement. | ✓ |
| More on the last two areas | Further questions on the editor frame or the plate and restyle. | |
| Explore more gray areas | Two to four further areas proposed. | |

**User's choice:** I'm ready for context

## Claude's Discretion

- Minimum element size while resizing.
- What is shown while a handle is being dragged.
- Inline rename details (field placement, on-screen keyboard, Enter/Escape/blur, maximum length).
- Scale bar steps and the placement of scale bar, north arrow and fit button.
- Hatching pattern and the palette mapping for element kinds without a Feldführer token.
- Pan limits, zoom anchor, trackpad two-finger scroll, pen input, selection during a pinch.
- Layout of the properties strip and desktop panel, including with the keyboard open.
- Default sizes for the "+" list.
- How the north angle is typed.

## Deferred Ideas

- Package Sketch 001 as a findings skill (`/gsd-sketch --wrap-up`).
- Full field-guide treatment per screen stays in Phase 38 (already scheduled).
