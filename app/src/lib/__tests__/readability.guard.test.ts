// Phase 38 (DESIGN3-06): readable outdoors on a phone. This guard fails when
//   1. a text colour falls below contrast AA (4.5:1) on a surface it is used on, or a border
//      line or icon colour below 3:1,
//   2. a line gets thinner than 1 px,
//   3. a control gets a touch area below 48 px,
//   4. text gets smaller than the smallest size of the type scale.

import * as fs from 'fs';
import * as path from 'path';
import { tokens } from '../../theme/tokens';
import { TOUCH_HIT } from '../editor/handles';

const APP_DIR = path.resolve(__dirname, '../../..');
const SKIP = [/__tests__/, /__mocks__/, /node_modules/, /\.d\.ts$/];

// ── Contrast (WCAG 2.x relative luminance) ──────────────────────────────────

type Rgba = [number, number, number, number];

function parse(colour: string): Rgba {
  if (colour.startsWith('#')) {
    const h = colour.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(colour);
  if (!m) throw new Error(`not a colour: ${colour}`);
  const parts = m[1]!.split(',').map(Number);
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
}

/** `fg` painted over an opaque `bg`. */
function over(fg: string, bg: string): [number, number, number] {
  const [r, g, b, a] = parse(fg);
  const [R, G, B] = parse(bg);
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(over(fg, bg));
  const b = luminance(over(bg, '#FFFFFF'));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const c = tokens.color;

// Every pair of text colour and surface the app uses (class names `text-*` on `bg-*`).
const TEXT_PAIRS: [name: string, fg: string, bg: string][] = [
  ['ink on bg', c.ink, c.bg],
  ['ink on surface-2', c.ink, c.surface2],
  ['ink on ok-soft', c.ink, c.okSoft],
  ['ink on warn-soft', c.ink, c.warnSoft],
  ['ink on danger-soft', c.ink, c.dangerSoft],
  ['ink-muted on bg', c.inkMuted, c.bg],
  ['ink-muted on surface-2', c.inkMuted, c.surface2],
  ['ink-muted on ok-soft', c.inkMuted, c.okSoft],
  ['ink-muted on warn-soft', c.inkMuted, c.warnSoft],
  ['ink-muted on danger-soft', c.inkMuted, c.dangerSoft],
  ['on-primary on primary', c.onPrimary, c.primary],
  ['on-primary on danger', c.onPrimary, c.danger],
  ['primary on bg', c.primary, c.bg],
  ['primary on surface-2', c.primary, c.surface2],
  ['primary on ok-soft', c.primary, c.okSoft],
  ['danger on bg', c.danger, c.bg],
  ['danger on surface-2', c.danger, c.surface2],
  ['danger on danger-soft', c.danger, c.dangerSoft],
  ['warn on bg', c.warn, c.bg],
  ['warn on surface-2', c.warn, c.surface2],
  ['warn on warn-soft', c.warn, c.warnSoft],
  ['accent on bg', c.accent, c.bg],
  ['accent on surface-2', c.accent, c.surface2],
];

// Lines that mark where a control is, and colours that carry an icon or a selection.
const LINE_PAIRS: [name: string, fg: string, bg: string][] = [
  ['line on bg', c.line, c.bg],
  ['line on surface-2', c.line, c.surface2],
  ['line on ok-soft', c.line, c.okSoft],
  ['line on warn-soft', c.line, c.warnSoft],
  ['select on plan', tokens.plan.select, tokens.plan.bg],
  ['plan outline on plan', tokens.plan.stroke, tokens.plan.bg],
  ['plan border on plan', tokens.plan.border, tokens.plan.bg],
];

describe('contrast (DESIGN3-06)', () => {
  it.each(TEXT_PAIRS)('%s reaches AA for text (4.5:1)', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(LINE_PAIRS)('%s reaches 3:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it('labels in the plan are readable on every element fill', () => {
    for (const [kind, fill] of Object.entries(tokens.plan.element)) {
      // The fill is painted with the plan's fill opacity over the plan's background.
      const [r, g, b] = parse(fill);
      const painted = `rgba(${r},${g},${b},${tokens.plan.fillOpacity})`;
      const [pr, pg, pb] = over(painted, tokens.plan.bg);
      const surface = `rgba(${Math.round(pr)},${Math.round(pg)},${Math.round(pb)},1)`;
      expect({ kind, ratio: contrast(tokens.plan.label, surface) >= 4.5 }).toEqual({ kind, ratio: true });
    }
  });

  it('the calendar colours are told apart by an ink outline, which is opaque', () => {
    expect(parse(c.ink)[3]).toBe(1);
    expect(contrast(c.ink, c.surface2)).toBeGreaterThanOrEqual(7);
  });

  it('the checker itself is right about black on white and equal colours', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

// ── Source scan ─────────────────────────────────────────────────────────────

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...sourceFiles(path.join(APP_DIR, 'app')), ...sourceFiles(path.join(APP_DIR, 'src'))].filter(
  (f) => !SKIP.some((r) => r.test(f)),
);

function findings(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of files) {
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((text, i) => {
        const trimmed = text.trimStart();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        if (pattern.test(text)) hits.push(`${path.relative(APP_DIR, file)}:${i + 1}: ${trimmed.slice(0, 100)}`);
      });
  }
  return hits;
}

describe('lines are at least 1 px (DESIGN3-06)', () => {
  it('the plan draws its outlines with at least 1 px', () => {
    expect(tokens.plan.strokeWidth).toBeGreaterThanOrEqual(1);
    expect(tokens.plan.borderWidth).toBeGreaterThanOrEqual(1);
  });

  it('no hairlines or fractional border widths', () => {
    expect(findings(/hairlineWidth|border(?:Top|Bottom|Left|Right)?Width:\s*0?\.\d|border-\[0?\.\d+px\]/)).toEqual([]);
  });
});

describe('touch areas are at least 48 px (DESIGN3-06)', () => {
  it('handles in the plan have a 48 px touch area', () => {
    expect(TOUCH_HIT.hitPx).toBeGreaterThanOrEqual(48);
  });

  it('no minimum size below 48 px on a control', () => {
    // min-h-[44px], min-w-[40px] and the like.
    expect(findings(/\bmin-[hw]-\[(?:[0-3]?\d|4[0-7])px\]/)).toEqual([]);
  });

  it('no fixed square or bar below 48 px used as a button', () => {
    // h-11 (44 px), h-10, h-9 … as a height class next to a width class of the same kind,
    // and inline sizes of 40 to 47 px (smaller ones are icons and swatches).
    expect(findings(/\bh-(?:9|10|11) w-(?:9|10|11)\b/)).toEqual([]);
    expect(findings(/\b(?:minHeight|height|minWidth):\s*4[0-7]\b/)).toEqual([]);
    expect(findings(/width:\s*4[0-7],\s*height:\s*4[0-7]\b/)).toEqual([]);
  });

  it('the shared button and input are at least 48 px high in every size', () => {
    const button = fs.readFileSync(path.join(APP_DIR, 'src/components/ui/button.tsx'), 'utf8');
    const input = fs.readFileSync(path.join(APP_DIR, 'src/components/ui/input.tsx'), 'utf8');
    for (const source of [button, input]) {
      const sizes = [...source.matchAll(/min-h-\[(\d+)px\]/g)].map((m) => Number(m[1]));
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(48);
    }
  });
});

describe('no tiny text (DESIGN3-06)', () => {
  it('nothing below the smallest size of the scale', () => {
    // text-[11px], fontSize: 10 and the like. 12 px and less is below the scale.
    expect(findings(/\btext-\[(?:\d|1[0-2])px\]|fontSize:\s*(?:\d|1[0-2])\b/)).toEqual([]);
  });

  it('the smallest size of the scale is 13 px and follows the device font size', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../../tailwind.config.js') as {
      theme: { extend: { fontSize: Record<string, [string, { lineHeight: string }]> } };
    };
    const [size] = config.theme.extend.fontSize.xs!;
    expect(size).toMatch(/rem$/);
    expect(parseFloat(size) * 16).toBeGreaterThanOrEqual(13);
  });

  it('text is not faded by opacity', () => {
    expect(findings(/text-ink-muted opacity-|text-ink opacity-/)).toEqual([]);
  });
});
