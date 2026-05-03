// supabase/functions/ai-job-consumer/__tests__/parseElements.test.ts
// Deno tests for parseElements + buildAnalysisPrompt (Phase 04, Plan 02, Task 1).
// Run: deno test --allow-none supabase/functions/ai-job-consumer/__tests__/parseElements.test.ts
//
// Invariants tested:
// - Valid JSON array returns correctly typed PlanElementCandidate[]
// - Markdown-fenced JSON extracts and parses correctly
// - Empty array input returns empty array
// - Garbage text returns empty array (never throws)
// - Unknown confidence values default to 'medium'
// - Non-finite coordinates cause element to be filtered out
// - buildAnalysisPrompt includes garden dimensions and meter-based instructions
import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseElements, buildAnalysisPrompt, type PlanElementCandidate } from '../parseElements.ts';

Deno.test('Test 1 - parseElements with valid JSON array returns correctly typed PlanElementCandidate[]', () => {
  const input = JSON.stringify([
    {
      element_type: 'Beet',
      label: 'Gemuese-Hochbeet',
      x_m: 3.5,
      y_m: 2.0,
      width_m: 1.2,
      height_m: 4.0,
      confidence: 'high',
    },
    {
      element_type: 'Laube',
      label: 'Gartenlaube',
      x_m: 8.0,
      y_m: 6.0,
      width_m: 4.0,
      height_m: 3.0,
      confidence: 'medium',
    },
  ]);
  const result = parseElements(input);
  assertEquals(result.length, 2);
  assertEquals(result[0].element_type, 'Beet');
  assertEquals(result[0].label, 'Gemuese-Hochbeet');
  assertEquals(result[0].x_m, 3.5);
  assertEquals(result[0].y_m, 2.0);
  assertEquals(result[0].width_m, 1.2);
  assertEquals(result[0].height_m, 4.0);
  assertEquals(result[0].confidence, 'high');
  assertEquals(result[1].element_type, 'Laube');
  assertEquals(result[1].confidence, 'medium');
});

Deno.test('Test 2 - parseElements with markdown-fenced JSON extracts and parses correctly', () => {
  const input = '```json\n[{"element_type":"Kompost","label":"Komposthaufen","x_m":1.0,"y_m":9.0,"width_m":1.5,"height_m":1.5,"confidence":"low"}]\n```';
  const result = parseElements(input);
  assertEquals(result.length, 1);
  assertEquals(result[0].element_type, 'Kompost');
  assertEquals(result[0].label, 'Komposthaufen');
  assertEquals(result[0].x_m, 1.0);
  assertEquals(result[0].y_m, 9.0);
  assertEquals(result[0].confidence, 'low');
});

Deno.test('Test 3 - parseElements with empty array returns empty array', () => {
  const result = parseElements('[]');
  assertEquals(result, []);
});

Deno.test('Test 4 - parseElements with garbage text returns empty array (not null/throw)', () => {
  const result = parseElements('This is just some random text with no JSON at all.');
  assertEquals(result, []);
  // Also test with broken JSON
  const result2 = parseElements('[{element_type: not valid json');
  assertEquals(result2, []);
});

Deno.test('Test 5 - parseElements coerces confidence - unknown values default to medium', () => {
  const input = JSON.stringify([
    { element_type: 'Weg', label: 'Hauptweg', x_m: 5.0, y_m: 0.0, width_m: 1.0, height_m: 10.0, confidence: 'very_high' },
    { element_type: 'Rasen', label: 'Rasenflaeche', x_m: 2.0, y_m: 3.0, width_m: 3.0, height_m: 4.0, confidence: 123 },
    { element_type: 'Baum', label: 'Apfelbaum', x_m: 7.0, y_m: 7.0, width_m: 2.0, height_m: 2.0 },
  ]);
  const result = parseElements(input);
  assertEquals(result.length, 3);
  assertEquals(result[0].confidence, 'medium'); // 'very_high' is invalid -> default
  assertEquals(result[1].confidence, 'medium'); // numeric is invalid -> default
  assertEquals(result[2].confidence, 'medium'); // missing -> default
});

Deno.test('Test 6 - parseElements filters out elements with non-finite x_m/y_m/width_m/height_m', () => {
  const input = JSON.stringify([
    { element_type: 'Beet', label: 'Good', x_m: 1.0, y_m: 2.0, width_m: 3.0, height_m: 4.0, confidence: 'high' },
    { element_type: 'Beet', label: 'NaN x', x_m: 'abc', y_m: 2.0, width_m: 3.0, height_m: 4.0, confidence: 'high' },
    { element_type: 'Beet', label: 'Infinity y', x_m: 1.0, y_m: Infinity, width_m: 3.0, height_m: 4.0, confidence: 'high' },
    { element_type: 'Beet', label: 'Null width', x_m: 1.0, y_m: 2.0, width_m: null, height_m: 4.0, confidence: 'high' },
    { element_type: 'Beet', label: 'Missing height', x_m: 1.0, y_m: 2.0, width_m: 3.0, confidence: 'high' },
  ]);
  const result = parseElements(input);
  assertEquals(result.length, 1);
  assertEquals(result[0].label, 'Good');
});

Deno.test('Test 7 - buildAnalysisPrompt includes garden dimensions and instructs meter-based output', () => {
  const prompt = buildAnalysisPrompt({ width_m: 12.5, height_m: 8.0, shape: 'rectangle' });
  assertStringIncludes(prompt, '12.5');
  assertStringIncludes(prompt, '8');
  // Must mention SW corner or Suedwest as coordinate origin
  const hasSW = prompt.includes('SW') || prompt.includes('Suedwest') || prompt.includes('Südwest');
  assertEquals(hasSW, true);
  // Must instruct meter-based output
  const hasMeter = prompt.includes('Meter') || prompt.includes('meter') || prompt.includes('METER');
  assertEquals(hasMeter, true);
  // Must list valid element types
  assertStringIncludes(prompt, 'Beet');
  assertStringIncludes(prompt, 'Laube');
  assertStringIncludes(prompt, 'Kompost');
  assertStringIncludes(prompt, 'Sonstiges');
});
