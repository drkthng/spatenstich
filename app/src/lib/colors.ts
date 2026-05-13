// Phase 7 Plan 03: Shared color constants for the plan editor + SVG home preview.
// Extracted from app/src/components/GardenPlanView.tsx so Skia editor (Phase 7) and
// SVG read-only view (Phase 4/6.5) share one source — UI-SPEC §Canvas Palette.

export type PlanColorKey =
  | 'background' | 'border' | 'grid'
  | 'Beet' | 'Rasen' | 'Weg' | 'Laube' | 'Kompost' | 'Wasserstelle'
  | 'Zaun' | 'Baum' | 'Sitzplatz' | 'Sonstiges' | 'plant';

export const PLAN_COLORS: Record<PlanColorKey, string> = {
  background: '#F5F0E8',
  border: '#8B7355',
  grid: '#D6CFC4',
  Beet: '#C4956A',
  Rasen: '#8DB580',
  Weg: '#D4C5A9',
  Laube: '#A0785A',
  Kompost: '#7A6148',
  Wasserstelle: '#7EB5C4',
  Zaun: '#8B7355',
  Baum: '#6B9B5E',
  Sitzplatz: '#C9B99A',
  Sonstiges: '#B8AFA7',
  plant: '#6B9B5E',
};

/** Darken a hex color by `amount` (0..1). Default 0.2 (Phase 4 historical default). */
export function darkenColor(hex: string, amount = 0.2): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Truncate a label to `maxLen` chars with ellipsis (U+2026). Default 10 (Phase 4 convention). */
export function truncateLabel(label: string, maxLen = 10): string {
  return label.length > maxLen ? label.substring(0, maxLen - 1) + '\u2026' : label;
}
