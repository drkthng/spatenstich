// Phase 38 (DESIGN3-04): the app has one icon set (lucide). This guard fails when an emoji,
// a Unicode symbol or a text arrow comes back as a control or a marker, in a screen, a
// component or a text in `de.json`.
//
// Allowed on purpose: the multiplication sign in measures ("2 × 3 m"), the middle dot as a
// separator, dashes, quotation marks and the ellipsis. Those are punctuation, not icons.

import * as fs from 'fs';
import * as path from 'path';
import de from '@spatenstich/shared/i18n/de';

const APP_DIR = path.resolve(__dirname, '../../..');

const SKIP = [/__tests__/, /__mocks__/, /node_modules/, /\.d\.ts$/];

// Arrows, technical symbols, geometric shapes, dingbats and emoji, plus single angle quotes
// (used as chevrons) and the bullet.
const GLYPH =
  /[←-⇿⌀-⏿■-◿☀-➿⬀-⯿‹›•]|[\u{1F000}-\u{1FAFF}]/u;
// The same ranges written as escapes in source ("⚠").
const GLYPH_ESCAPE = /\\u(?:21[9A-F]|2[3567]|2B)[0-9A-Fa-f]{2}|\\u203[9A]|\\u2022|\\u\{1F/i;
// A lone "×" or "x" as the whole content of an element is a close button made of text.
const TEXT_CLOSE = />\s*[×xX]\s*<\//;

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

function codeLines(file: string): { n: number; text: string }[] {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((text, i) => ({ n: i + 1, text }))
    .filter(({ text }) => {
      const trimmed = text.trimStart();
      return !(
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('{/*')
      );
    })
    // A trailing comment may explain something with an arrow; only the code counts.
    .map(({ n, text }) => ({ n, text: text.replace(/\s\/\/\s.*$/, '') }));
}

function findings(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of files) {
    for (const { n, text } of codeLines(file)) {
      if (pattern.test(text)) hits.push(`${path.relative(APP_DIR, file)}:${n}: ${text.trim().slice(0, 100)}`);
    }
  }
  return hits;
}

function textValues(node: unknown, prefix = '', out: { key: string; value: string }[] = []): { key: string; value: string }[] {
  if (typeof node === 'string') out.push({ key: prefix, value: node });
  else if (Array.isArray(node)) node.forEach((v, i) => textValues(v, `${prefix}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) textValues(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

describe('one icon set, no glyphs as controls (DESIGN3-04)', () => {
  it('scans a realistic number of files', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it('no emoji, symbol or arrow characters in screens and components', () => {
    expect(findings(GLYPH)).toEqual([]);
  });

  it('no such characters written as escapes', () => {
    expect(findings(GLYPH_ESCAPE)).toEqual([]);
  });

  it('no close button made of the letter x', () => {
    expect(findings(TEXT_CLOSE)).toEqual([]);
  });

  it('no emoji, symbol or arrow characters in the texts', () => {
    const hits = textValues(de)
      .filter(({ value }) => GLYPH.test(value))
      .map(({ key, value }) => `${key}: ${value}`);
    expect(hits).toEqual([]);
  });

  it('plant emoji from the catalog are not shown anywhere', () => {
    const shown = files
      .filter((f) => /^(app|src[\\/]components|src[\\/]hooks)[\\/]/.test(path.relative(APP_DIR, f)) && !/usePlants\.ts$/.test(f))
      .filter((f) => /iconEmoji/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(APP_DIR, f));
    expect(shown).toEqual([]);
  });

  it('icons come from one library', () => {
    expect(findings(/from ['"](?:@expo\/vector-icons|react-native-vector-icons|react-icons)/)).toEqual([]);
  });
});
