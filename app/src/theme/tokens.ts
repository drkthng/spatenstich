// Feldführer design tokens (Sketch 001, `.planning/sketches/themes/feldfuehrer.css`).
// Single source for colours, typefaces and the plan's drawing style. Tailwind reads the same
// JSON in `tailwind.config.js`, so class names (`bg-bg`, `text-ink`, `border-line`, …) and
// values used in SVG stay in step. Light appearance only (D-18).
//
// Values not present in the sketch are derived and marked here so they are easy to revisit:
//   lineSoft, dangerSoft, warnSoft, okSoft, and the element fills for Zaun, Sitzplatz,
//   Sonstiges and Pflanze (the sketch defined eight element kinds).
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
