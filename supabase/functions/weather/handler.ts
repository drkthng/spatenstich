// Phase 36 (TASK-07): the forecast for a garden's postcode.
//
// The device asks this function, not a weather service: so no weather service sees a
// device, and no key lives on a device (the services used need none). The function
// looks up the garden's postcode, turns it into coordinates once, and fetches a
// three-day forecast, which it keeps for a few hours per postcode.
//
// The decision path without any outside world in it; index.ts hands in the real things,
// the tests hand in fakes. Uses only web standards.

export type WeatherCode =
  | 'not_authenticated'
  | 'bad_request'
  | 'not_member'
  | 'no_plz' // the garden has no (valid) postcode
  | 'plz_unknown' // the postcode could not be found
  | 'unavailable'; // the weather service did not answer

const HTTP_STATUS: Record<WeatherCode, number> = {
  not_authenticated: 401,
  bad_request: 400,
  not_member: 403,
  no_plz: 409,
  plz_unknown: 404,
  unavailable: 503,
};

export interface ForecastDay {
  /** YYYY-MM-DD */
  date: string;
  tMin: number;
  tMax: number;
  rainMm: number;
}

export interface CachedWeather {
  latitude: number;
  longitude: number;
  place: string | null;
  days: ForecastDay[];
  fetchedAt: string;
}

export interface WeatherDeps {
  getUserId(token: string): Promise<string | null>;
  /** Is this person a member, and what is the garden's postcode? Null when it cannot be asked. */
  getGarden(gardenId: string, userId: string): Promise<{ member: boolean; plz: string | null } | null>;
  readCache(plz: string): Promise<CachedWeather | null>;
  writeCache(plz: string, entry: CachedWeather): Promise<void>;
  /** Coordinates of a German postcode; null when it is not known; throws when the service fails. */
  geocode(plz: string): Promise<{ latitude: number; longitude: number; place: string | null } | null>;
  /** Today and the next two days; throws when the service fails. */
  fetchForecast(latitude: number, longitude: number): Promise<ForecastDay[]>;
  now(): number;
  corsHeaders: Record<string, string>;
  log?(message: string, ...details: unknown[]): void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLZ = /^[0-9]{5}$/;
/** A forecast is asked again after this long. */
export const CACHE_MS = 3 * 60 * 60 * 1000;

/** Keeps only days that are complete and plausible. */
export function cleanDays(days: unknown): ForecastDay[] {
  if (!Array.isArray(days)) return [];
  const ok = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const result: ForecastDay[] = [];
  for (const day of days) {
    if (typeof day !== 'object' || day === null) continue;
    const d = day as Record<string, unknown>;
    if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
    if (!ok(d.tMin, -60, 60) || !ok(d.tMax, -60, 60) || !ok(d.rainMm, 0, 1000)) continue;
    result.push({ date: d.date, tMin: d.tMin, tMax: d.tMax, rainMm: d.rainMm });
  }
  return result.slice(0, 7);
}

export function createWeatherHandler(deps: WeatherDeps): (req: Request) => Promise<Response> {
  const json = (body: Record<string, unknown>, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...deps.corsHeaders, 'Content-Type': 'application/json' },
    });
  const fail = (code: WeatherCode): Response => json({ ok: false, code }, HTTP_STATUS[code]);
  const log = deps.log ?? (() => {});
  const answer = (plz: string, entry: CachedWeather, stale: boolean): Response =>
    json({ ok: true, plz, place: entry.place, fetchedAt: entry.fetchedAt, days: entry.days, stale }, 200);

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: deps.corsHeaders });
    if (req.method !== 'POST') return fail('bad_request');

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return fail('not_authenticated');
    const userId = await deps.getUserId(token);
    if (!userId) return fail('not_authenticated');

    let body: { gardenId?: unknown };
    try {
      body = await req.json();
    } catch {
      return fail('bad_request');
    }
    const gardenId = body && typeof body.gardenId === 'string' && UUID.test(body.gardenId) ? body.gardenId : null;
    if (!gardenId) return fail('bad_request');

    const garden = await deps.getGarden(gardenId, userId);
    if (!garden) return fail('unavailable');
    if (!garden.member) return fail('not_member');
    const plz = (garden.plz ?? '').trim();
    if (!PLZ.test(plz)) return fail('no_plz');

    const cached = await deps.readCache(plz);
    if (cached && cached.days.length > 0 && deps.now() - Date.parse(cached.fetchedAt) < CACHE_MS) {
      return answer(plz, cached, false);
    }

    try {
      // The coordinates of a postcode do not change; ask for them once.
      const spot = cached ?? (await deps.geocode(plz));
      if (!spot) return fail('plz_unknown');
      const days = cleanDays(await deps.fetchForecast(spot.latitude, spot.longitude));
      if (days.length === 0) throw new Error('empty forecast');
      const entry: CachedWeather = {
        latitude: spot.latitude,
        longitude: spot.longitude,
        place: spot.place,
        days,
        fetchedAt: new Date(deps.now()).toISOString(),
      };
      await deps.writeCache(plz, entry);
      return answer(plz, entry, false);
    } catch {
      log('weather: service failed');
      // Yesterday's forecast still says something about today; older ones do not.
      if (cached && cached.days.length > 0 && deps.now() - Date.parse(cached.fetchedAt) < 24 * 60 * 60 * 1000) {
        return answer(plz, cached, true);
      }
      return fail('unavailable');
    }
  };
}
