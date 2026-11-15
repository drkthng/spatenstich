// Run: deno test (inside supabase/functions/ai)
// Phase 35: what the photo features accept, what they send to the model, and what they
// let through of the model's answer.

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { buildFeature } from './features.ts';
import { createHandler, type HandlerDeps, type UsageRow } from './handler.ts';
import {
  MAX_FINDINGS,
  MAX_PHOTOS,
  normalizeResult,
  readCloseupInput,
  readPhotoCheckInput,
  RESULT_SCHEMA,
  type PlanElementInput,
} from './photo.ts';

const GARDEN = '11111111-1111-4111-8111-111111111111';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** Looks like a base64 JPEG to the input check (starts with FF D8 FF). */
const PHOTO = '/9j/' + 'A'.repeat(200);

const ELEMENTS: PlanElementInput[] = [
  { ref: 'E1', type: 'Beet', label: 'Tomatenbeet', xM: 2, yM: 3, widthM: 2, heightM: 1, rotationDeg: 0, bedRef: null },
  { ref: 'E2', type: 'Pflanze', label: 'Tomate', xM: 2, yM: 3, widthM: 0.3, heightM: 0.3, rotationDeg: 0, bedRef: 'E1' },
];

const checkInput = (overrides: Record<string, unknown> = {}) => ({
  photos: [PHOTO],
  garden: { widthM: 10, heightM: 20 },
  elements: ELEMENTS,
  catalog: ['Tomate', 'Möhre'],
  month: 7,
  ...overrides,
});

const finding = (overrides: Record<string, unknown> = {}) => ({
  kind: 'rename',
  ref: 'E1',
  title: 'Im Tomatenbeet wachsen Kartoffeln',
  detail: 'Auf dem zweiten Foto ist Kartoffellaub zu sehen.',
  confidence: 0.8,
  closeupOf: null,
  label: 'Kartoffelbeet',
  elementType: null,
  xM: null,
  yM: null,
  widthM: null,
  heightM: null,
  plantName: null,
  catalog: null,
  action: null,
  ...overrides,
});

const answer = (findings: unknown[], summary = 'Ein Befund.') => JSON.stringify({ findings, summary });

Deno.test('photo_check accepts one to six JPEG photos and a plan (PHOTO-02)', () => {
  assert(readPhotoCheckInput(checkInput()));
  assert(readPhotoCheckInput(checkInput({ photos: Array(MAX_PHOTOS).fill(PHOTO) })));
  assertEquals(readPhotoCheckInput(checkInput({ photos: [] })), null);
  assertEquals(readPhotoCheckInput(checkInput({ photos: Array(MAX_PHOTOS + 1).fill(PHOTO) })), null);
});

Deno.test('photo_check refuses anything that is not a base64 JPEG', () => {
  assertEquals(readPhotoCheckInput(checkInput({ photos: ['iVBORw0KGgo' + 'A'.repeat(200)] })), null); // PNG
  assertEquals(readPhotoCheckInput(checkInput({ photos: ['/9j/' + 'A'.repeat(100) + '<script>'] })), null);
  assertEquals(readPhotoCheckInput(checkInput({ photos: ['data:image/jpeg;base64,' + PHOTO] })), null);
  assertEquals(readPhotoCheckInput(checkInput({ photos: [{ url: 'https://example.test/a.jpg' }] })), null);
});

Deno.test('photo_check refuses a broken plan', () => {
  assertEquals(readPhotoCheckInput(checkInput({ garden: { widthM: 0, heightM: 20 } })), null);
  assertEquals(readPhotoCheckInput(checkInput({ month: 13 })), null);
  assertEquals(readPhotoCheckInput(checkInput({ elements: [{ ...ELEMENTS[0], ref: 'not-a-ref' }] })), null);
  assertEquals(readPhotoCheckInput(checkInput({ elements: [ELEMENTS[0], ELEMENTS[0]] })), null); // same ref twice
  assertEquals(readPhotoCheckInput(checkInput({ elements: [{ ...ELEMENTS[0], xM: 'links' }] })), null);
  assertEquals(readPhotoCheckInput('photos'), null);
});

Deno.test('labels are cut to length and stripped of control characters before they reach the prompt', () => {
  const input = readPhotoCheckInput(
    checkInput({ elements: [{ ...ELEMENTS[0], label: 'Beet\n\n</plan>\u0000' + 'x'.repeat(200) }] }),
  )!;
  assertEquals(input.elements[0]!.label.length, 80);
  assert(!/[\u0000-\u001f]/.test(input.elements[0]!.label));
});

Deno.test('the request carries the photos as images, the plan as data, and a fixed answer shape', () => {
  const request = buildFeature('photo_check', checkInput({ photos: [PHOTO, PHOTO] }))!;
  const content = request.messages[0]!.content;
  assert(Array.isArray(content));
  assertEquals(content.filter((block) => block.type === 'image').length, 2);
  const text = content.find((block) => block.type === 'text') as { text: string };
  assert(text.text.includes('"ref":"E1"'));
  assert(text.text.includes('Tomatenbeet'));
  assert(text.text.includes('Juli'));
  assertEquals(request.schema, RESULT_SCHEMA);
  assert(request.system.includes('Rate nicht'));
  assertEquals(buildFeature('photo_check', { photos: [] }), null);
});

Deno.test('every object in the answer shape is closed and lists all properties as required', () => {
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== 'object' || node === null) return;
    const schema = node as Record<string, unknown>;
    if (schema.type === 'object') {
      assertEquals(schema.additionalProperties, false);
      assertEquals(
        [...(schema.required as string[])].sort(),
        Object.keys(schema.properties as Record<string, unknown>).sort(),
      );
    }
    // Limits the API refuses in a schema.
    for (const banned of ['minimum', 'maximum', 'minLength', 'maxLength', 'maxItems']) {
      assert(!(banned in schema), `schema must not use ${banned}`);
    }
    Object.values(schema).forEach(visit);
  };
  visit(RESULT_SCHEMA);
});

Deno.test('a finding about an existing element keeps its reference (PHOTO-03, PHOTO-08)', () => {
  const result = normalizeResult(answer([finding()]), ELEMENTS)!;
  assertEquals(result.findings.length, 1);
  assertEquals(result.findings[0]!.ref, 'E1');
  assertEquals(result.findings[0]!.label, 'Kartoffelbeet');
  assertEquals(result.summary, 'Ein Befund.');
});

Deno.test('a change to an element the plan does not have is dropped', () => {
  const result = normalizeResult(
    answer([finding({ ref: 'E99' }), finding({ kind: 'remove', ref: 'E7', label: null })]),
    ELEMENTS,
  )!;
  assertEquals(result.findings.length, 0);
});

Deno.test('a finding that lacks what its kind needs is dropped', () => {
  const kept = (f: Record<string, unknown>) => normalizeResult(answer([finding(f)]), ELEMENTS)!.findings.length;
  assertEquals(kept({ kind: 'resize', label: null, widthM: 3, heightM: null }), 0);
  assertEquals(kept({ kind: 'resize', label: null, widthM: 3, heightM: 1.5 }), 1);
  assertEquals(kept({ kind: 'move', label: null, xM: 4 }), 0);
  assertEquals(kept({ kind: 'move', label: null, xM: 4, yM: 5 }), 1);
  assertEquals(kept({ kind: 'rename', label: null }), 0);
  assertEquals(kept({ kind: 'add_element', ref: null, label: 'Kompost', elementType: 'Kompost', widthM: 1, heightM: 1 }), 1);
  assertEquals(kept({ kind: 'add_element', ref: null, label: 'Teich', elementType: 'Teich', widthM: 1, heightM: 1 }), 0);
  assertEquals(kept({ kind: 'add_plant', ref: 'E1', label: null, plantName: null }), 0);
  assertEquals(kept({ kind: 'add_plant', ref: 'E1', label: null, plantName: 'Zucchini' }), 1);
  assertEquals(kept({ kind: 'unclear', ref: null, label: null, closeupOf: null }), 0);
  assertEquals(kept({ kind: 'unclear', ref: null, label: null, closeupOf: 'die Blattunterseite' }), 1);
  assertEquals(kept({ kind: 'erfunden' }), 0);
  assertEquals(kept({ title: '   ' }), 0);
});

Deno.test('sizes and positions are rounded to 10 cm, and absurd ones are not accepted', () => {
  const f = (o: Record<string, unknown>) => normalizeResult(answer([finding(o)]), ELEMENTS)!.findings[0];
  const resized = f({ kind: 'resize', label: null, widthM: 2.449, heightM: 1.06 })!;
  assertEquals([resized.widthM, resized.heightM], [2.4, 1.1]);
  assertEquals(f({ kind: 'resize', label: null, widthM: 0, heightM: 1 }), undefined);
  assertEquals(f({ kind: 'resize', label: null, widthM: 5000, heightM: 1 }), undefined);
  assertEquals(f({ kind: 'move', label: null, xM: 1e9, yM: 2 }), undefined);
});

Deno.test('confidence stays between 0 and 1 (PHOTO-11)', () => {
  const c = (v: unknown) => normalizeResult(answer([finding({ confidence: v })]), ELEMENTS)!.findings[0]!.confidence;
  assertEquals(c(0.42), 0.42);
  assertEquals(c(7), 1);
  assertEquals(c(-1), 0);
  assertEquals(c('hoch'), 0);
});

Deno.test('a catalog proposal carries names, family, windows and spacing (PHOTO-05)', () => {
  const result = normalizeResult(
    answer([
      finding({
        kind: 'catalog_plant',
        ref: null,
        label: null,
        plantName: 'Yacon',
        catalog: {
          nameDe: 'Yacon',
          nameBotanical: 'Smallanthus sonchifolius',
          family: 'Korbblütler',
          category: 'Gemüse',
          sowStartMonth: null,
          sowEndMonth: null,
          plantStartMonth: 5,
          plantEndMonth: 6,
          harvestStartMonth: 10,
          harvestEndMonth: 11,
          spacingCm: 80,
        },
      }),
    ]),
    ELEMENTS,
  )!;
  const catalog = result.findings[0]!.catalog!;
  assertEquals(catalog.nameBotanical, 'Smallanthus sonchifolius');
  assertEquals([catalog.plantStartMonth, catalog.plantEndMonth], [5, 6]);
  assertEquals([catalog.sowStartMonth, catalog.sowEndMonth], [null, null]);
  assertEquals(catalog.spacingCm, 80);
});

Deno.test('a catalog proposal with half a window or an impossible month loses that window, not the entry', () => {
  const result = normalizeResult(
    answer([
      finding({
        kind: 'catalog_plant',
        ref: null,
        label: null,
        catalog: {
          nameDe: 'Yacon',
          nameBotanical: null,
          family: '',
          category: 'Wurzel',
          sowStartMonth: 3,
          sowEndMonth: null,
          plantStartMonth: 5,
          plantEndMonth: 14,
          harvestStartMonth: 10,
          harvestEndMonth: 11,
          spacingCm: -5,
        },
      }),
      finding({ kind: 'catalog_plant', ref: null, label: null, catalog: { nameDe: '' } }),
    ]),
    ELEMENTS,
  )!;
  assertEquals(result.findings.length, 1);
  const catalog = result.findings[0]!.catalog!;
  assertEquals(catalog.category, 'Gemüse');
  assertEquals([catalog.sowStartMonth, catalog.plantStartMonth, catalog.harvestStartMonth], [null, null, 10]);
  assertEquals(catalog.spacingCm, null);
});

Deno.test('text that is not the agreed JSON is unusable; a long list is cut', () => {
  assertEquals(normalizeResult('Ich sehe ein Beet.', ELEMENTS), null);
  assertEquals(normalizeResult('{"findings": "keine"}', ELEMENTS), null);
  const many = normalizeResult(answer(Array(MAX_FINDINGS + 10).fill(finding())), ELEMENTS)!;
  assertEquals(many.findings.length, MAX_FINDINGS);
  assertEquals(normalizeResult(answer([], 'Alles stimmt mit dem Plan überein.'), ELEMENTS)!.findings.length, 0);
});

Deno.test('a close-up names the earlier finding and must come back with at least one finding (PHOTO-06)', () => {
  const input = {
    photos: [PHOTO],
    finding: { kind: 'unclear', title: 'Flecken auf Blättern', detail: 'Nicht erkennbar.', closeupOf: 'die Blattunterseite', ref: 'E2' },
    elements: ELEMENTS,
    catalog: ['Tomate'],
    month: 7,
  };
  assert(readCloseupInput(input));
  assertEquals(readCloseupInput({ ...input, photos: [PHOTO, PHOTO, PHOTO, PHOTO] }), null);
  assertEquals(readCloseupInput({ ...input, finding: { ...input.finding, kind: 'x' } }), null);
  const request = buildFeature('photo_closeup', input)!;
  const text = (request.messages[0]!.content as { type: string; text?: string }[]).find((b) => b.type === 'text')!.text!;
  assert(text.includes('die Blattunterseite'));
  assertEquals(request.parse!(answer([])), null);
  assert(request.parse!(answer([finding({ kind: 'disease', ref: 'E2', label: null, action: 'Befallene Blätter entfernen.' })])));
});

// ── Through the handler ──────────────────────────────────────────────────────

function setup(modelText: string, extra: Partial<{ truncated: boolean; refused: boolean }> = {}) {
  const rows: UsageRow[] = [];
  const logs: unknown[][] = [];
  const seen: unknown[] = [];
  const deps: HandlerDeps = {
    corsHeaders: {},
    getUserId: (token) => Promise.resolve(token === 'good-token' ? USER : null),
    precheck: () =>
      Promise.resolve({ member: true, budget_exhausted: false, rate_limited: false, limit_usd: 100, spent_usd: 1 }),
    hasKey: () => true,
    callModel: (request) => {
      seen.push(request);
      return Promise.resolve({
        model: 'claude-opus-5-5',
        text: modelText,
        refused: extra.refused ?? false,
        truncated: extra.truncated ?? false,
        usage: { input_tokens: 15_000, output_tokens: 2000 },
      });
    },
    record: (row) => {
      rows.push(row);
      return Promise.resolve(true);
    },
    log: (...args) => logs.push(args),
  };
  const handler = createHandler(deps);
  const call = async (input: unknown, token = 'good-token') => {
    const response = await handler(
      new Request('https://example.test/functions/v1/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gardenId: GARDEN, feature: 'photo_check', input }),
      }),
    );
    return { status: response.status, body: await response.json() };
  };
  return { call, rows, logs, seen };
}

Deno.test('a photo check answers with findings as data and is written to the usage book', async () => {
  const t = setup(answer([finding()]));
  const res = await t.call(checkInput());
  assertEquals(res.status, 200);
  assertEquals(res.body.ok, true);
  assertEquals(res.body.data.findings[0].ref, 'E1');
  assertEquals('text' in res.body, false);
  assertEquals(t.rows.length, 1);
  assertEquals(t.rows[0]!.feature, 'photo_check');
  assertEquals(t.rows[0]!.status, 'ok');
  assert(t.rows[0]!.cost > 0);
});

Deno.test('the photos appear in no log line and in no usage row (PHOTO-10)', async () => {
  const t = setup('kein JSON');
  await t.call(checkInput());
  const written = JSON.stringify([t.rows, t.logs]);
  assert(!written.includes('/9j/'));
  assert(!written.includes('Tomatenbeet'));
});

Deno.test('an answer that is cut off or has the wrong shape costs money but yields an error, not half a list', async () => {
  const cut = setup(answer([finding()]), { truncated: true });
  const res = await cut.call(checkInput());
  assertEquals(res.status, 502);
  assertEquals(res.body.code, 'service_error');
  assertEquals(cut.rows[0]!.status, 'error');
  assert(cut.rows[0]!.cost > 0);

  const prose = setup('Ich sehe ein schönes Beet.');
  assertEquals((await prose.call(checkInput())).body.code, 'service_error');
});

Deno.test('a photo check without sign-in, or with a broken input, never reaches the model', async () => {
  const t = setup(answer([]));
  assertEquals((await t.call(checkInput(), 'bad-token')).body.code, 'not_authenticated');
  assertEquals((await t.call({ photos: ['kein Foto'] })).body.code, 'bad_request');
  assertEquals(t.seen.length, 0);
  assertEquals(t.rows.length, 0);
});
