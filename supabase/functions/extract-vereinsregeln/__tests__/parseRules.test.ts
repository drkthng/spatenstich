// supabase/functions/extract-vereinsregeln/__tests__/parseRules.test.ts
// Deno tests for parseRules + EXTRACTION_PROMPT (Task 2-03-01 / RULES-01).
// Run: deno test --allow-none supabase/functions/extract-vereinsregeln/__tests__/parseRules.test.ts
//
// Invariants tested:
// - Fenced / unfenced / malformed JSON inputs all degrade gracefully
// - istBKleingG is ALWAYS false (server overrides LLM output — T-2-03-02, T-2-03-10)
// - titel/beschreibung length clamped against prompt-injection overflow
// - BKleingG-titel candidates are de-duplicated against the static seed
// - EXTRACTION_PROMPT contains the mandatory German phrasing
import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { EXTRACTION_PROMPT, parseRules } from '../parseRules.ts';

Deno.test('Test 1 — parses fenced JSON array (happy path)', () => {
  const input = '```json\n[{"titel":"Hecke","wert":120,"einheit":"cm"}]\n```';
  const result = parseRules(input);
  assertEquals(result.length, 1);
  assertEquals(result[0].titel, 'Hecke');
  assertEquals(result[0].wert, 120);
  assertEquals(result[0].einheit, 'cm');
  assertEquals(result[0].source, 'pdf_extraction');
  assertEquals(result[0].istBKleingG, false);
});

Deno.test('Test 2 — extracts JSON array surrounded by prose', () => {
  const input =
    'Hier sind die Regeln:\n[{"titel":"Laube","wert":24,"einheit":"m²","beschreibung":"Maximalgrösse"}]\nEnde.';
  const result = parseRules(input);
  assertEquals(result.length, 1);
  assertEquals(result[0].titel, 'Laube');
  assertEquals(result[0].wert, 24);
  assertEquals(result[0].einheit, 'm²');
  assertEquals(result[0].beschreibung, 'Maximalgrösse');
});

Deno.test('Test 3 — empty response returns []', () => {
  const result = parseRules('keine regeln gefunden');
  assertEquals(result, []);
});

Deno.test('Test 4 — malformed JSON returns [] (graceful)', () => {
  const result = parseRules('[{titel: not-json, wert: oops,');
  assertEquals(result, []);
});

Deno.test('Test 5 — NEVER returns istBKleingG=true regardless of LLM output', () => {
  const input = JSON.stringify([
    { titel: 'Schadregel', istBKleingG: true, ist_bkleingg: true, wert: 42 },
    { titel: 'Andere', istBKleingG: 'yes' },
  ]);
  const result = parseRules(input);
  assertEquals(result.length, 2);
  for (const rule of result) {
    assertEquals(rule.istBKleingG, false);
  }
});

Deno.test('Test 6 — clamps titel to 200 chars and beschreibung to 1000 chars', () => {
  const longTitel = 'x'.repeat(300);
  const longBeschreibung = 'y'.repeat(1500);
  const input = JSON.stringify([
    { titel: longTitel, beschreibung: longBeschreibung, wert: 1 },
  ]);
  const result = parseRules(input);
  assertEquals(result.length, 1);
  assertEquals(result[0].titel.length, 200);
  assertEquals(result[0].beschreibung!.length, 1000);
});

Deno.test(
  'Test 7 — drops candidates with no titel or matching BKleingG seed',
  () => {
    const input = JSON.stringify([
      { titel: '', wert: 10 }, // empty titel — drop
      { titel: '   ', wert: 20 }, // whitespace-only — drop
      { titel: 'Mind. 1/3 Nutzgartenanteil' }, // BKleingG seed — drop
      { titel: 'HOCHSTÄMME VERBOTEN' }, // case-insensitive BKleingG match — drop
      { titel: 'Wegbreite', wert: 80, einheit: 'cm' }, // keep
    ]);
    const result = parseRules(input);
    assertEquals(result.length, 1);
    assertEquals(result[0].titel, 'Wegbreite');
  },
);

Deno.test(
  'Test 8 — EXTRACTION_PROMPT contains required German invariant phrases',
  () => {
    assertStringIncludes(
      EXTRACTION_PROMPT,
      'Antworte ausschliesslich mit gueltigem JSON-Array',
    );
    assertStringIncludes(
      EXTRACTION_PROMPT,
      'Bundeskleingartengesetz-Regeln NICHT extrahieren',
    );
  },
);
