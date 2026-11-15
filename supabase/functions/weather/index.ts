// supabase/functions/weather/index.ts
// Phase 36 (TASK-07): the forecast for a garden's postcode. What happens to a request is
// decided in handler.ts; this file connects it to the auth service, the database and the
// two public services:
//   - zippopotam.us turns a German postcode into coordinates (asked once per postcode),
//   - open-meteo.com gives the forecast for coordinates.
// Both are free, need no key, and get nothing but a postcode or coordinates from this
// server; they never see a device or an account.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { cleanDays, createWeatherHandler, type CachedWeather } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } });
  if (response.status === 404) return { status: 404, body: null };
  if (!response.ok) throw new Error(`service answered ${response.status}`);
  return { status: response.status, body: await response.json() };
}

Deno.serve(
  createWeatherHandler({
    corsHeaders,
    now: () => Date.now(),
    log: (message, ...details) => console.error(message, ...details),

    async getUserId(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },

    async getGarden(gardenId, userId) {
      const member = await admin
        .from('garden_members')
        .select('user_id')
        .eq('garden_id', gardenId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (member.error) return null;
      if (!member.data) return { member: false, plz: null };
      const garden = await admin.from('gardens').select('plz').eq('id', gardenId).is('deleted_at', null).maybeSingle();
      if (garden.error) return null;
      return { member: true, plz: (garden.data?.plz as string | null) ?? null };
    },

    async readCache(plz) {
      const { data, error } = await admin.from('weather_cache').select('*').eq('plz', plz).maybeSingle();
      if (error || !data) return null;
      return {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        place: (data.place as string | null) ?? null,
        days: cleanDays(data.forecast),
        fetchedAt: String(data.fetched_at),
      } satisfies CachedWeather;
    },

    async writeCache(plz, entry) {
      const { error } = await admin.from('weather_cache').upsert(
        {
          plz,
          latitude: entry.latitude,
          longitude: entry.longitude,
          place: entry.place,
          forecast: entry.days,
          fetched_at: entry.fetchedAt,
        },
        { onConflict: 'plz' },
      );
      if (error) console.error('weather: cache write failed', error.code ?? 'unknown');
    },

    async geocode(plz) {
      const { status, body } = await getJson(`https://api.zippopotam.us/de/${plz}`);
      if (status === 404) return null;
      const place = (body as { places?: Record<string, string>[] })?.places?.[0];
      const latitude = Number(place?.['latitude']);
      const longitude = Number(place?.['longitude']);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude, place: place?.['place name'] ?? null };
    },

    async fetchForecast(latitude, longitude) {
      const url =
        'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}` +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
        '&timezone=Europe%2FBerlin&forecast_days=3';
      const { body } = await getJson(url);
      const daily = (body as { daily?: Record<string, unknown[]> })?.daily;
      const dates = (daily?.['time'] ?? []) as string[];
      return dates.map((date, i) => ({
        date,
        tMin: Number(daily?.['temperature_2m_min']?.[i]),
        tMax: Number(daily?.['temperature_2m_max']?.[i]),
        rainMm: Number(daily?.['precipitation_sum']?.[i] ?? 0),
      }));
    },
  }),
);
