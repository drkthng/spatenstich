---
sketch: 001
name: visual-direction
question: "Which overall look should Spatenstich have?"
winner: "B"
tags: [direction, tokens, typography, heute, editor, plan-style]
---

# Sketch 001: Visual Direction

## Design Question
Which overall look should the app have? The answer fixes the colour tokens, the typefaces, the
shape language and the way the garden plan is drawn, for every screen that follows.

## How to View
open .planning/sketches/001-visual-direction/index.html

Tabs at the top switch direction. "Handy" shows the Heute screen and the plan editor side by
side at 375 px; "Desktop" shows one browser window (use its left navigation to switch between
Heute and Plan). Fonts load from Google Fonts, so view it online.

Everything is live: pick a time budget, tick tasks, run the photo check and accept its
findings, drag, stretch and rotate plan elements, double-tap to rename, add from the palette,
undo and redo. Mouse and touch both work.

## Variants
- **A: Papier & Erde** — the garden-notebook spec from MASTERPLAN-v2 section 3.4 (Nunito + Caveat, paper and earth tones). Baseline for comparison.
- **B: Feldführer** — printed field guide: serif type (Fraunces, Newsreader), ink on warm white, hairline rules, numbered tasks, the plan as a surveyed plate with hatching, scale bar and north arrow.
- **C: Instrument** — dark precision tool: green-black, one chartreuse accent, mono numerals (IBM Plex), the plan as a technical drawing.
- **D: Samentüte** — seed-packet poster: flat colour fields, heavy display type (Bricolage Grotesque), thick outlines.
- **E: Ruhig** — calm minimal: white, one green, soft shapes (Manrope). Closest to current mainstream app design.

Five variants instead of the usual maximum of four, at the user's request.

## What to Look For
- Heute: is the time-budget control the obvious first thing, and does the task list read fast?
- Editor: are the handles easy to hit with a finger, and is a selected element unmistakable?
- Plan: are bed names and the size label legible at phone size in this drawing style?
- Daylight: this app is used outdoors. C is dark; judge it with screen brightness in mind.
- Distinctiveness: which one would you recognise as "ours" from across the room?

## Findings from building it
- Handle touch areas must sit mostly outside the element and be capped in how far they reach
  inward. With centred 42 px touch areas, a bed 42 px tall could no longer be dragged or
  double-tapped once selected: the top and bottom handles swallowed its whole body. The sketch
  caps inward reach at a quarter of the element and drops middle handles on sides under 36 px.
- Handles and labels need a constant on-screen size, independent of zoom (13 px visual here).
- The size label needs its own solid background; a text halo is not enough when the next bed
  is 30 cm away.
- Names on long narrow elements (paths) read better along the element.
