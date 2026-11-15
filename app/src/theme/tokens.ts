// Feldführer design tokens (Sketch 001, `.planning/sketches/themes/feldfuehrer.css`).
// Single source for colours, typefaces and the plan's drawing style. Tailwind reads the same
// JSON in `tailwind.config.js`, so class names (`bg-bg`, `text-ink`, `border-line`, …) and
// values used in SVG stay in step. Light appearance only (D-18).
//
// Values not present in the sketch are derived and marked here so they are easy to revisit:
//   lineSoft, dangerSoft, warnSoft, okSoft, and the element fills for Zaun, Sitzplatz,
//   Sonstiges and Pflanze (the sketch defined eight element kinds).
//
// Phase 38 (DESIGN3-06, readable outdoors): four values are darker than in the sketch so that
// text reaches contrast AA (4.5:1) on every surface it is used on and border lines reach 3:1:
//   inkMuted #676B60 → #5B5F54, warn #8A6A1C → #785C15, accent/select #B4532A → #A64B25,
//   line 0.32 → 0.55 (lineSoft 0.14 → 0.2), and the plan's outline is 1 px instead of 0.9.
// `readability.guard.test.ts` keeps it that way.
import raw from './tokens.json';

export const tokens = raw;
export const color = raw.color;
export const font = raw.font;
export const plan = raw.plan;

export type ElementKind = keyof typeof raw.plan.element;

/** Fill colour for a plan element kind; unknown kinds fall back to "Sonstiges". */
export function elementFill(kind: string): string {
  const fills = raw.plan.element as Record<string, string>;
  return fills[kind] ?? fills.Sonstiges;
}

/** Calendar strip colours per phase, drawn from the Feldführer palette (derived). */
export const gantt = raw.gantt;
