# Sketch Manifest

## Design Direction
**Feldführer** — the app reads like a well-made printed field guide. Serif type (Fraunces for
display, Newsreader for text), deep green-black ink on warm white, hairline and double rules
instead of cards and shadows, square corners, small-caps section labels, numbered task lists
with italic numerals, one rust accent for selection and emphasis, bottle green for primary
actions. The garden plan is drawn as a surveyed plate: fine ink outlines, pale washes, hatching
on beds, scale bar and north arrow. Chosen over four alternatives because it is the most
recognisable, gets its elegance from type and line rather than decoration, and stays readable
outdoors in daylight.

Token source: `themes/feldfuehrer.css`. Component treatment: the `[data-dir=b]` rules in
`001-visual-direction/index.html`.

Context: a garden app for two people, used on Android phones outdoors and in a desktop
browser, in German. The plan editor is the centrepiece and must feel exact; the daily task
list, including "I have N minutes", is the everyday entry point.

## Reference Points
None named by the user. The direction was picked from five candidates: Papier & Erde (the
earlier notebook spec, MASTERPLAN-v2 section 3.4, now superseded), Feldführer, Instrument,
Samentüte, Ruhig.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | visual-direction | Which overall look should Spatenstich have? | B: Feldführer | direction, tokens, typography, heute, editor, plan-style |
