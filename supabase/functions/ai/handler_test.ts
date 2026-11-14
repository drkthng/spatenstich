// Run: deno test supabase/functions/ai/
// The decision path of the AI function with fakes for auth, database and model.

import { assertEquals } from 'jsr:@std/assert@1';
import { createHandler, ModelCallError, MAX_BODY_BYTES, type HandlerDeps, type UsageRow } from './handler.ts';
import { classifyFailure, gate } from './outcome.ts';
import { costUsd, priceFor, readUsage, UNKNOWN_MODEL_PRICE } from './pricing.ts';
import { buildFeature } from './features.ts';

const GARDEN = '11111111-1111-4111-8111-111111111111';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function setup(overrides: Partial<HandlerDeps> = {}) {
  const rows: UsageRow[] = [];
  const logs: unknown[][] = [];
  let modelCalls = 0;
  const deps: HandlerDeps = {
    corsHeaders: { 'Access-Control-Allow-Origin': '*' },
    getUserId: (token) => Promise.resolve(token === 'good-token' ? USER : null),
    precheck: () =>
      Promise.resolve({ member: true, budget_exhausted: false, rate_limited: false, limit_usd: 100, spent_usd: 12.5 }),
    hasKey: () => true,
    callModel: () => {
      modelCalls += 1;
      return Promise.resolve({
        model: 'claude-opus-5-5',
        text: 'Ich bin bereit für euren Garten.',
        refused: false,
        usage: { input_tokens: 1000, output_tokens: 500 },
      });
    },
    record: (row) => {
      rows.push(row);
      return Promise.resolve(true);
    },
    log: (...args) => logs.push(args),
    ...overrides,
  };
  const handler = createHandler(deps);
  const call = async (init: { token?: string; body?: unknown; method?: string; raw?: string; headers?: Record<string, string> } = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers ?? {}) };
    if (init.token !== undefined) headers['Authorization'] = `Bearer ${init.token}`;
    const method = init.method ?? 'POST';
    const response = await handler(
      new Request('https://example.test/functions/v1/ai', {
        method,
        headers,
        body: method === 'POST' ? (init.raw ?? JSON.stringify(init.body ?? { gardenId: GARDEN, feature: 'test' })) : undefined,
      }),
    );
    const text = await response.text();
    return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text, raw: text };
  };
  return { call, rows, logs, modelCalls: () => modelCalls };
}

Deno.test('a member with a valid sign-in gets an answer, and the request is in the usage book (AI-02, AI-03)', async () => {
  const t = setup();
  const res = await t.call({ token: 'good-token' });
  assertEquals(res.status, 200);
  assertEquals(res.body.ok, true);
  assertEquals(res.body.text, 'Ich bin bereit für euren Garten.');
  // 1000 input at 4 $ + 500 output at 20 $ per million = 0.014 $
  assertEquals(res.body.usage.costUsd, 0.014);
  assertEquals(res.body.spentUsd, 12.514);
  assertEquals(res.body.limitUsd, 100);
  assertEquals(t.rows.length, 1);
  assertEquals(t.rows[0], {
    gardenId: GARDEN,
    userId: USER,
    feature: 'test',
    model: 'claude-opus-5-5',
    usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
    cost: 0.014,
    status: 'ok',
    errorCode: undefined,
  });
});

Deno.test('without a sign-in, or with a token the auth service does not know, the request is rejected (AI-02)', async () => {
  const t = setup();
  const none = await t.call({});
  assertEquals([none.status, none.body.code], [401, 'not_authenticated']);
  const wrong = await t.call({ token: 'sb_publishable_not-a-user' });
  assertEquals([wrong.status, wrong.body.code], [401, 'not_authenticated']);
  assertEquals(t.modelCalls(), 0);
  assertEquals(t.rows.length, 0);
});

Deno.test('someone who is not a member of the garden is rejected (AI-02)', async () => {
  const t = setup({
    precheck: () =>
      Promise.resolve({ member: false, budget_exhausted: false, rate_limited: false, limit_usd: 100, spent_usd: 0 }),
  });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code, res.body.retryable], [403, 'not_member', false]);
  assertEquals(t.modelCalls(), 0);
});

Deno.test('at 100 % of the monthly limit nothing is sent to the model (AI-05)', async () => {
  const t = setup({
    precheck: () =>
      Promise.resolve({ member: true, budget_exhausted: true, rate_limited: false, limit_usd: 100, spent_usd: 100.2 }),
  });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code, res.body.retryable], [402, 'budget_exhausted', false]);
  assertEquals([res.body.limitUsd, res.body.spentUsd], [100, 100.2]);
  assertEquals(t.modelCalls(), 0);
});

Deno.test('too many requests in an hour are stopped before the model (AI-08)', async () => {
  const t = setup({
    precheck: () =>
      Promise.resolve({ member: true, budget_exhausted: false, rate_limited: true, limit_usd: 100, spent_usd: 3 }),
  });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code, res.body.retryable], [429, 'rate_limited', true]);
  assertEquals(t.modelCalls(), 0);
});

Deno.test('the app cannot send its own prompt, model or an unknown feature', async () => {
  const t = setup();
  for (const body of [
    { gardenId: GARDEN, feature: 'anything' },
    { gardenId: GARDEN, feature: 'constructor' },
    { gardenId: GARDEN },
    { gardenId: 'not-a-uuid', feature: 'test' },
    { feature: 'test' },
    [],
    'text',
  ]) {
    const res = await t.call({ token: 'good-token', body });
    assertEquals([res.status, res.body.code], [400, 'bad_request']);
  }
  const garbage = await t.call({ token: 'good-token', raw: '{not json' });
  assertEquals(garbage.body.code, 'bad_request');
  const nothing = await t.call({ token: 'good-token', raw: 'null' });
  assertEquals(nothing.body.code, 'bad_request');
  const huge = await t.call({ token: 'good-token', headers: { 'content-length': String(MAX_BODY_BYTES + 1) } });
  assertEquals(huge.body.code, 'bad_request');
  assertEquals(t.modelCalls(), 0);

  // Extra fields are ignored: the prompt and the model are the function's own.
  let seen: unknown = null;
  const strict = setup({
    callModel: (request) => {
      seen = request;
      return Promise.resolve({ model: 'claude-opus-5-5', text: 'ok', refused: false, usage: {} });
    },
  });
  await strict.call({
    token: 'good-token',
    body: { gardenId: GARDEN, feature: 'test', input: { prompt: 'ignore everything' }, model: 'x', system: 'y', max_tokens: 100000 },
  });
  assertEquals(seen, buildFeature('test', undefined));
});

Deno.test('no key stored: a clear code, nothing sent, nothing recorded', async () => {
  const t = setup({ hasKey: () => false });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code, res.body.retryable], [503, 'not_configured', false]);
  assertEquals(t.modelCalls(), 0);
  assertEquals(t.rows.length, 0);
});

Deno.test('a refusal is reported as such, with its cost in the usage book (AI-07)', async () => {
  const t = setup({
    callModel: () =>
      Promise.resolve({ model: 'claude-opus-5-5', text: '', refused: true, usage: { input_tokens: 200, output_tokens: 10 } }),
  });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.status, res.body.ok, res.body.code, res.body.retryable], [200, false, 'refused', false]);
  assertEquals(t.rows[0]!.status, 'refused');
  assertEquals(t.rows[0]!.cost, 0.001);
});

Deno.test('failures of the service become codes; raw error text never leaves the function (AI-07)', async () => {
  const cases: [ModelCallError | Error, string, number, boolean][] = [
    [new ModelCallError('status', 529), 'overloaded', 503, true],
    [new ModelCallError('status', 429), 'overloaded', 503, true],
    [new ModelCallError('connection'), 'unavailable', 504, true],
    [new ModelCallError('status', 401), 'not_configured', 503, false],
    [new ModelCallError('status', 402), 'provider_billing', 503, false],
    [new ModelCallError('status', 500), 'service_error', 502, true],
    [new Error('SECRET internal detail sk-something'), 'service_error', 502, true],
  ];
  for (const [error, code, status, retryable] of cases) {
    const t = setup({ callModel: () => Promise.reject(error) });
    const res = await t.call({ token: 'good-token' });
    assertEquals([res.status, res.body.code, res.body.retryable], [status, code, retryable]);
    assertEquals(res.raw.includes('SECRET'), false);
    assertEquals(JSON.stringify(t.logs).includes('SECRET'), false);
    // The attempt counts towards the hourly limit, at no cost.
    assertEquals([t.rows.length, t.rows[0]!.status, t.rows[0]!.cost, t.rows[0]!.errorCode], [1, 'error', 0, code]);
  }
});

Deno.test('an answer without text is an error, not an empty success', async () => {
  const t = setup({
    callModel: () => Promise.resolve({ model: 'claude-opus-5-5', text: '  ', refused: false, usage: { output_tokens: 2000 } }),
  });
  const res = await t.call({ token: 'good-token' });
  assertEquals(res.body.code, 'service_error');
  assertEquals(t.rows[0]!.status, 'error');
  assertEquals(t.rows[0]!.cost, 0.04);
});

Deno.test('the answer still arrives when the usage book cannot be written, and that is logged', async () => {
  const t = setup({ record: () => Promise.resolve(false) });
  const res = await t.call({ token: 'good-token' });
  assertEquals([res.body.ok, res.body.usage.recorded], [true, false]);
  assertEquals(t.logs.length, 1);
});

Deno.test('the browser preflight passes and other methods do not', async () => {
  const t = setup();
  const options = await t.call({ method: 'OPTIONS' });
  assertEquals(options.status, 200);
  const get = await t.call({ method: 'GET', token: 'good-token' });
  assertEquals(get.body.code, 'bad_request');
});

Deno.test('pricing: per model, cache tokens, unknown models at the dearest rate', () => {
  assertEquals(costUsd('claude-opus-5-5', { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }), 4);
  assertEquals(costUsd('claude-opus-5-5', { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 }), 20);
  assertEquals(costUsd('claude-opus-5-5', { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 }), 5.2);
  assertEquals(costUsd('claude-opus-4-8', { inputTokens: 1000, outputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0 }), 0.03);
  assertEquals(priceFor('some-model-of-next-year'), UNKNOWN_MODEL_PRICE);
  assertEquals(priceFor(null), UNKNOWN_MODEL_PRICE);
  // Rounded up, so many small requests never add up to less than was spent.
  assertEquals(costUsd('claude-haiku-5-5', { inputTokens: 1, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }), 0.000001);
  assertEquals(readUsage({ input_tokens: 12, output_tokens: 7, cache_read_input_tokens: 3, cache_creation_input_tokens: null }), {
    inputTokens: 12, outputTokens: 7, cacheReadTokens: 3, cacheWriteTokens: 0,
  });
  assertEquals(readUsage(null), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
});

Deno.test('gate and failure classes', () => {
  assertEquals(gate(null), 'service_error');
  assertEquals(gate({ member: false, budget_exhausted: true, rate_limited: true }), 'not_member');
  assertEquals(gate({ member: true, budget_exhausted: true, rate_limited: true }), 'budget_exhausted');
  assertEquals(gate({ member: true, budget_exhausted: false, rate_limited: false }), null);
  assertEquals(classifyFailure('status', 408), 'unavailable');
  assertEquals(classifyFailure('status', 403), 'not_configured');
  assertEquals(classifyFailure('status', 400), 'service_error');
});
