// Run: deno test (inside supabase/functions/weather)
// The decision path of the weather function with fakes for auth, database and services.

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { CACHE_MS, cleanDays, createWeatherHandler, type CachedWeather, type WeatherDeps } from './handler.ts';

const GARDEN = '11111111-1111-4111-8111-111111111111';
const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = Date.parse('2026-11-15T10:00:00.000Z');
const DAYS = [
  { date: '2026-11-15', tMin: 0.4, tMax: 8.3, rainMm: 0.6 },
  { date: '2026-11-16', tMin: 5.5, tMax: 11.4, rainMm: 2.7 },
  { date: '2026-11-17', tMin: 2.6, tMax: 10.2, rainMm: 7.6 },
];

function setup(overrides: Partial<WeatherDeps> = {}, garden: { member: boolean; plz: string | null } | null = { member: true, plz: '10115' }) {
  const cache = new Map<string, CachedWeather>();
  const calls = { geocode: 0, forecast: 0, logs: [] as unknown[][] };
  const deps: WeatherDeps = {
    corsHeaders: { 'Access-Control-Allow-Origin': '*' },
    now: () => NOW,
    getUserId: (token) => Promise.resolve(token === 'good-token' ? USER : null),
    getGarden: () => Promise.resolve(garden),
    readCache: (plz) => Promise.resolve(cache.get(plz) ?? null),
    writeCache: (plz, entry) => {
      cache.set(plz, entry);
      return Promise.resolve();
    },
    geocode: () => {
      calls.geocode += 1;
      return Promise.resolve({ latitude: 52.532, longitude: 13.3922, place: 'Berlin' });
    },
    fetchForecast: () => {
      calls.forecast += 1;
      return Promise.resolve(DAYS);
    },
    log: (...args) => calls.logs.push(args),
    ...overrides,
  };
  const handler = createWeatherHandler(deps);
  const call = async (init: { token?: string; body?: unknown; method?: string } = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (init.token !== undefined) headers['Authorization'] = `Bearer ${init.token}`;
    const method = init.method ?? 'POST';
    const response = await handler(
      new Request('https://example.test/functions/v1/weather', {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(init.body ?? { gardenId: GARDEN }) : undefined,
      }),
    );
    const text = await response.text();
    return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text };
  };
  return { call, cache, calls };
}

Deno.test('a member gets the forecast for the garden postcode (TASK-07)', async () => {
  const t = setup();
  const res = await t.call({ token: 'good-token' });
  assertEquals(res.status, 200);
  assertEquals(res.body.ok, true);
  assertEquals(res.body.place, 'Berlin');
  assertEquals(res.body.days.length, 3);
  assertEquals(res.body.days[0], DAYS[0]);
  assertEquals(res.body.stale, false);
  assertEquals(res.body.fetchedAt, '2026-11-15T10:00:00.000Z');
});

Deno.test('within three hours the stored forecast is used; the services are not asked again', async () => {
  const t = setup();
  await t.call({ token: 'good-token' });
  await t.call({ token: 'good-token' });
  assertEquals(t.calls.forecast, 1);
  assertEquals(t.calls.geocode, 1);
});

Deno.test('after three hours the forecast is fetched again, the coordinates are not', async () => {
  let now = NOW;
  const t = setup({ now: () => now });
  await t.call({ token: 'good-token' });
  now = NOW + CACHE_MS + 1000;
  const res = await t.call({ token: 'good-token' });
  assertEquals(t.calls.forecast, 2);
  assertEquals(t.calls.geocode, 1);
  assertEquals(res.body.fetchedAt, new Date(now).toISOString());
});

Deno.test('without a sign-in, or as someone who is not a member, there is no forecast', async () => {
  const t = setup();
  assertEquals((await t.call({})).body.code, 'not_authenticated');
  assertEquals((await t.call({ token: 'bad' })).status, 401);
  const stranger = setup({}, { member: false, plz: null });
  const res = await stranger.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code], [403, 'not_member']);
  assertEquals(stranger.calls.forecast + stranger.calls.geocode + t.calls.forecast, 0);
});

Deno.test('a garden without a usable postcode is told so', async () => {
  for (const plz of [null, '', '1011', 'ABCDE', '101155']) {
    const t = setup({}, { member: true, plz });
    const res = await t.call({ token: 'good-token' });
    assertEquals([res.status, res.body.code], [409, 'no_plz']);
    assertEquals(t.calls.geocode, 0);
  }
});

Deno.test('a postcode that does not exist is told apart from a service that is down', async () => {
  const unknown = setup({ geocode: () => Promise.resolve(null) });
  assertEquals((await unknown.call({ token: 'good-token' })).body.code, 'plz_unknown');
  const down = setup({ geocode: () => Promise.reject(new Error('timeout at https://secret.example')) });
  const res = await down.call({ token: 'good-token' });
  assertEquals([res.status, res.body.code], [503, 'unavailable']);
  assert(!JSON.stringify(res.body).includes('secret.example'));
  assert(!JSON.stringify(down.calls.logs).includes('secret.example'));
});

Deno.test('when the weather service is down, a forecast from the last day is still given, marked as old', async () => {
  let now = NOW;
  let fail = false;
  const t = setup({
    now: () => now,
    fetchForecast: () => (fail ? Promise.reject(new Error('down')) : Promise.resolve(DAYS)),
  });
  await t.call({ token: 'good-token' });
  fail = true;
  now = NOW + 5 * 60 * 60 * 1000;
  const old = await t.call({ token: 'good-token' });
  assertEquals([old.status, old.body.stale, old.body.fetchedAt], [200, true, '2026-11-15T10:00:00.000Z']);
  now = NOW + 30 * 60 * 60 * 1000;
  assertEquals((await t.call({ token: 'good-token' })).body.code, 'unavailable');
});

Deno.test('broken requests and a database that cannot be asked', async () => {
  const t = setup();
  assertEquals((await t.call({ token: 'good-token', body: { gardenId: 'nope' } })).body.code, 'bad_request');
  assertEquals((await t.call({ token: 'good-token', method: 'GET' })).body.code, 'bad_request');
  assertEquals((await t.call({ method: 'OPTIONS' })).status, 200);
  const noDb = setup({}, null);
  assertEquals((await noDb.call({ token: 'good-token' })).body.code, 'unavailable');
});

Deno.test('implausible or incomplete days are dropped', () => {
  assertEquals(
    cleanDays([
      DAYS[0],
      { date: '2026-11-16', tMin: NaN, tMax: 10, rainMm: 0 },
      { date: 'morgen', tMin: 1, tMax: 10, rainMm: 0 },
      { date: '2026-11-18', tMin: 1, tMax: 500, rainMm: 0 },
      { date: '2026-11-19', tMin: 1, tMax: 10 },
      null,
    ]),
    [DAYS[0]],
  );
  assertEquals(cleanDays('kein Feld'), []);
});

Deno.test('a forecast with no usable day is treated as a failed service', async () => {
  const t = setup({ fetchForecast: () => Promise.resolve([{ date: 'x', tMin: 0, tMax: 0, rainMm: 0 }]) });
  assertEquals((await t.call({ token: 'good-token' })).body.code, 'unavailable');
  assertEquals(t.cache.size, 0);
});
