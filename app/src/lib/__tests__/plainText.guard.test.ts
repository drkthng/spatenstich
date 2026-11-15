// Phase 38 (DESIGN3-05): all texts stand in `de.json`, in plain German. This guard fails when
//   1. a text in `de.json` uses a technical or internal term, or ASCII instead of umlauts,
//   2. a screen or component carries visible text of its own instead of a key,
//   3. a screen asks for a key that `de.json` does not have (it would show the key itself).

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import de from '@spatenstich/shared/i18n/de';

const APP_DIR = path.resolve(__dirname, '../../..');
const SKIP = [/__tests__/, /__mocks__/, /node_modules/, /\.d\.ts$/];

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

function textValues(node: unknown, prefix = '', out: { key: string; value: string }[] = []): { key: string; value: string }[] {
  if (typeof node === 'string') out.push({ key: prefix, value: node });
  else if (Array.isArray(node)) node.forEach((v, i) => textValues(v, `${prefix}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) textValues(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const values = textValues(de);

// ── 1. Words that do not belong in front of a gardener ──────────────────────
// Internal names of the code and the project, English interface words, and words the app has
// a plain German word for (Masterplan Anhang B). Whole words, any case.
const FORBIDDEN: { word: RegExp; instead: string }[] = [
  { word: /\bAccounts?\b/i, instead: 'Konto' },
  { word: /\bArchetyp\w*/i, instead: 'Gartentyp' },
  { word: /\bDrafts?\b/i, instead: 'Vorschlag' },
  { word: /\bStale\b/i, instead: 'älter als 30 Tage' },
  { word: /\bPayloads?\b/i, instead: 'Importdaten' },
  { word: /\bLayers?\b/i, instead: 'Anlagen / Pflanzen' },
  { word: /\bTray\b/i, instead: '(entfällt)' },
  { word: /\b(Plan-)?Editor\b/i, instead: 'Plan / Plan bearbeiten' },
  { word: /\bEditieren\b/i, instead: 'Bearbeiten' },
  { word: /\beinlogg\w*|\beingeloggt\b|\bLogin\b|\bLogout\b/i, instead: 'anmelden / abmelden' },
  { word: /\bSync\w*/i, instead: 'Speicherstatus / abgleichen' },
  { word: /\bGantt\w*/i, instead: 'Jahresverlauf' },
  { word: /\bJSON\b/i, instead: 'Ergebnis aus Claude.ai' },
  { word: /\bSchema\b/i, instead: 'Vorlage' },
  { word: /\bPhase \d/i, instead: '(kein Verweis auf den Projektplan)' },
  { word: /\bInfrastruktur\w*/i, instead: 'Anlagen' },
  { word: /\bCloud\b/i, instead: 'auf allen Geräten' },
  { word: /\bCompliance\b/i, instead: 'Regeln einhalten' },
  { word: /\bUpload\w*|\bhochgeladen\b/i, instead: 'hochladen ist in Ordnung, „Upload“ nicht' },
  { word: /\b(Toggle|Chip|Modal|Toast|Banner|Badge|Placeholder|CTA)\b/, instead: '(Bezeichnung aus dem Code)' },
  { word: /\b(upsert|null|undefined|NaN|UUID|Slug|Outbox|RLS|Edge Function|Realtime)\b/, instead: '(Bezeichnung aus dem Code)' },
  { word: /\bBKleingG\b/, instead: 'Bundeskleingartengesetz' },
  { word: /\b\w+_\w+\b/, instead: '(interner Name mit Unterstrich)' },
];

// ASCII spellings of words that have an umlaut or ß. A plain "ae|oe|ue" rule would catch
// "neue", "Mauer" and "aktuell", so this lists the words that actually turn up.
const ASCII_UMLAUT =
  /\b(fuer|ueber\w*|koenn\w*|moecht\w*|waehl\w*|loesch\w*|aender\w*|\w*fuegen|zurueck\w*|pruef\w*|gaert\w*|geraet\w*|naechst\w*|groess\w*|schliess\w*|oeffn\w*|spaeter|bestaetig\w*|ungueltig\w*|verfuegbar|gueltig|moeglich\w*|Stueck|Kuerbis|Moehre\w*|Kraeuter|Beeren?straeucher|Strasse|gross|weiss|heiss|draussen)\b/i;

describe('texts are plain German (DESIGN3-05)', () => {
  it('reads a realistic number of texts', () => {
    expect(values.length).toBeGreaterThan(600);
  });

  it('no technical or internal terms', () => {
    const hits: string[] = [];
    for (const { key, value } of values) {
      // What stands in braces is a placeholder name, not text.
      const text = value.replace(/\{\w+\}/g, '');
      for (const { word, instead } of FORBIDDEN) {
        const m = word.exec(text);
        if (m) hits.push(`${key}: „${m[0]}“ in „${value}“ (besser: ${instead})`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('umlauts and ß are written as such', () => {
    const hits = values.filter(({ value }) => ASCII_UMLAUT.test(value)).map(({ key, value }) => `${key}: ${value}`);
    expect(hits).toEqual([]);
  });

  it('no text is empty, and none starts or ends with a space by accident', () => {
    const hits = values
      // A few texts are joined to a sentence and carry their space on purpose.
      .filter(({ key }) => key !== 'tasks.weather.place')
      .filter(({ value }) => value.trim() === '' || value !== value.trim())
      .map(({ key, value }) => `${key}: „${value}“`);
    expect(hits).toEqual([]);
  });

  it('placeholders are written with single braces', () => {
    const hits = values.filter(({ value }) => /\{\{|\}\}/.test(value)).map(({ key }) => key);
    expect(hits).toEqual([]);
  });
});

// ── 2. No visible text of their own in screens and components ───────────────

const TEXT_PROPS = new Set(['placeholder', 'accessibilityLabel', 'accessibilityHint', 'title', 'label', 'aria-label', 'alt', 'actionLabel', 'message', 'description']);
const hasWord = (s: string): boolean => /[A-Za-zÄÖÜäöüß]{2,}/.test(s);

// Text that is data or a fixed format, not wording.
const ALLOWED_TEXT = new Set([
  '12043', // example postcode
]);

function hardCodedText(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const report = (node: ts.Node, text: string): void => {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (ALLOWED_TEXT.has(clean)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    out.push(`${path.relative(APP_DIR, file)}:${line + 1}: ${clean.slice(0, 90)}`);
  };
  /** String literals an expression can evaluate to (through ?:, ||, ??, &&, +). */
  const literalsOf = (n: ts.Expression, found: ts.Node[]): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) found.push(n);
    else if (ts.isTemplateExpression(n)) found.push(n);
    else if (ts.isConditionalExpression(n)) {
      literalsOf(n.whenTrue, found);
      literalsOf(n.whenFalse, found);
    } else if (ts.isParenthesizedExpression(n)) literalsOf(n.expression, found);
    else if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) {
        literalsOf(n.left, found);
        literalsOf(n.right, found);
      } else if (op === ts.SyntaxKind.AmpersandAmpersandToken) literalsOf(n.right, found);
    }
  };
  const textOf = (n: ts.Node): string =>
    ts.isTemplateExpression(n)
      ? [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ')
      : (n as ts.StringLiteral).text;

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      if (hasWord(node.text)) report(node, node.text);
    } else if (ts.isJsxExpression(node) && node.expression) {
      const parent = node.parent;
      const isChild = ts.isJsxElement(parent) || ts.isJsxFragment(parent);
      const isTextProp = ts.isJsxAttribute(parent) && TEXT_PROPS.has(parent.name.getText());
      if (isChild || isTextProp) {
        const found: ts.Node[] = [];
        literalsOf(node.expression, found);
        for (const literal of found) if (hasWord(textOf(literal))) report(literal, textOf(literal));
      }
    } else if (
      ts.isJsxAttribute(node) &&
      TEXT_PROPS.has(node.name.getText()) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      hasWord(node.initializer.text)
    ) {
      report(node, `${node.name.getText()}="${node.initializer.text}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe('screens and components carry no text of their own (DESIGN3-05)', () => {
  const tsxFiles = files.filter((f) => f.endsWith('.tsx'));

  it('scans a realistic number of files', () => {
    expect(tsxFiles.length).toBeGreaterThan(50);
  });

  it('no hard-coded visible text', () => {
    expect(tsxFiles.flatMap(hardCodedText)).toEqual([]);
  });
});

// ── 3. Every key a screen asks for exists ───────────────────────────────────

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), de);
}

describe('every text key in use exists (DESIGN3-05)', () => {
  it('static keys', () => {
    const missing: string[] = [];
    // t('a.b'), tx('a.b'), tv('a.b'), tFor('a.b') … with a dotted key as a plain string.
    const call = /\bt[A-Za-z]{0,3}\(\s*['"]([A-Za-z][\w]*(?:\.[\w]+)+)['"]/g;
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const m of source.matchAll(call)) {
        if (typeof lookup(m[1]!) !== 'string') missing.push(`${path.relative(APP_DIR, file)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keys built from a fixed start have that start', () => {
    const missing: string[] = [];
    // t(`a.b.${x}`): the part before the placeholder must be a group of texts.
    const call = /\bt[A-Za-z]{0,3}\(\s*`([A-Za-z][\w]*(?:\.[\w]+)*)\.\$\{/g;
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const m of source.matchAll(call)) {
        const group = lookup(m[1]!);
        if (!group || typeof group !== 'object') missing.push(`${path.relative(APP_DIR, file)}: ${m[1]}.*`);
      }
    }
    expect(missing).toEqual([]);
  });
});
