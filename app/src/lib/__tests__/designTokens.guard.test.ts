// Phase 30 (DESIGN3-01): the app uses the Feldführer tokens only. This guard fails when a
// hard-coded colour, a Tailwind palette class or a dark-mode variant comes back into a
// screen or component. Colours belong in `src/theme/tokens.json`.

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../../..');

const SKIP = [/__tests__/, /__mocks__/, /[\\/]theme[\\/]/, /node_modules/, /\.d\.ts$/];

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
      return !(trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'));
    });
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

describe('Feldführer tokens are the only colours (DESIGN3-01)', () => {
  it('scans a realistic number of files', () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it('no hex colour literals outside the theme', () => {
    expect(findings(/["'`(\s:]#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)).toEqual([]);
  });

  it('no Tailwind palette classes', () => {
    expect(
      findings(
        /\b(?:bg|text|border|ring|divide|placeholder)-(?:stone|gray|slate|zinc|neutral|red|rose|green|emerald|lime|teal|amber|yellow|orange|blue|sky|indigo|violet|purple|pink|white|black)(?:-\d{2,3})?\b/,
      ),
    ).toEqual([]);
  });

  it('no dark-mode variants (light appearance only)', () => {
    expect(findings(/\bdark:[a-z]/)).toEqual([]);
  });
});
