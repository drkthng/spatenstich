// supabase/functions/seed-plants/index.ts
// Phase 8 Plan 04 (D-13): Idempotent seed of plants + plant_companions from static-bundled JSON.
// Reads plants.json (bundled via config.toml static_files), then performs:
//   1. Bulk UPSERT plants ON CONFLICT(slug) DO UPDATE
//   2. Resolve slugs → ids
//   3. Build canonical (a<b) companion rows
//   4. DELETE FROM plant_companions + INSERT (rebuild — table is small)
//
// Pattern source: git history `cde46bb` extract-vereinsregeln/index.ts (deleted in M07 cleanup
// `0831320`); same imports header + env-var module-load + Deno.serve + CORS skeleton.
//
// Idempotency: ON CONFLICT(slug) makes plant upserts safe to re-run. Companion DELETE+INSERT
// is also idempotent (final state is identical regardless of how many times we run).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Read the bundled JSON at module init (cold-start one-time cost).
// Path is relative to the function's working directory inside the deno deploy bundle.
// The :./plants.json suffix in config.toml static_files remaps the source path to ./plants.json here.
const PLANTS_BUNDLE_PATH = './plants.json';
let bundle: { schemaVersion: string; plants: any[]; companions: any[] };
try {
  const txt = await Deno.readTextFile(PLANTS_BUNDLE_PATH);
  bundle = JSON.parse(txt);
  if (bundle.schemaVersion !== 'plant-db.v1') {
    throw new Error(`Unexpected schemaVersion: ${bundle.schemaVersion}`);
  }
} catch (e) {
  throw new Error(`Failed to load plants bundle: ${e instanceof Error ? e.message : e}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. UPSERT plants by slug (idempotent re-run safe)
    const plantsPayload = bundle.plants.map((p: any) => ({
      slug:                   p.slug,
      name_de:                p.nameDe,
      name_alt_de:            p.nameAltDe ?? [],
      name_botanical:         p.nameBotanical ?? null,
      family:                 p.family,
      category:               p.category,
      min_spacing_cm:         p.minSpacingCm ?? null,
      row_spacing_cm:         p.rowSpacingCm ?? null,
      depth_cm:               p.depthCm ?? null,
      sun_requirement:        p.sunRequirement,
      water_needs:            p.waterNeeds,
      climate_zone_min:       p.climateZoneMin ?? null,
      climate_zone_max:       p.climateZoneMax ?? null,
      sow_outdoor_doy_start:  p.sowOutdoorDoyStart ?? null,
      sow_outdoor_doy_end:    p.sowOutdoorDoyEnd ?? null,
      sow_indoor_doy_start:   p.sowIndoorDoyStart ?? null,
      sow_indoor_doy_end:     p.sowIndoorDoyEnd ?? null,
      plant_doy_start:        p.plantDoyStart ?? null,
      plant_doy_end:          p.plantDoyEnd ?? null,
      harvest_doy_start:      p.harvestDoyStart ?? null,
      harvest_doy_end:        p.harvestDoyEnd ?? null,
      days_to_harvest:        p.daysToHarvest ?? null,
      nitrogen_fixing:        p.nitrogenFixing ?? false,
      perennial:              p.perennial ?? false,
      notes_de:               p.notesDe ?? null,
      icon_emoji:             p.iconEmoji ?? null,
      data_source:            p.dataSource,
      updated_at:             new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('plants')
      .upsert(plantsPayload, { onConflict: 'slug' });
    if (upsertErr) return json({ error: 'plants_upsert_failed', detail: upsertErr.message }, 500);

    // 2. Resolve slugs → ids for companion FK references
    const { data: plantsAll, error: readErr } = await supabase
      .from('plants').select('id, slug');
    if (readErr || !plantsAll) {
      return json({ error: 'plants_read_failed', detail: readErr?.message }, 500);
    }
    const idBySlug = new Map(plantsAll.map((p: any) => [p.slug, p.id]));

    // 3. Build canonical companion rows from slug pairs
    const companionRows: any[] = [];
    const seen = new Set<string>();
    for (const c of bundle.companions) {
      const aId = idBySlug.get(c.plantASlug);
      const bId = idBySlug.get(c.plantBSlug);
      if (!aId || !bId) continue;  // silently skip — JSON validator catches at build time
      if (aId === bId) continue;
      const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId];
      const key = `${lo}:${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      companionRows.push({
        plant_a_id:   lo,
        plant_b_id:   hi,
        relationship: c.relationship,
        source:       c.source,
        notes:        c.notes ?? null,
      });
    }

    // 4. Rebuild: DELETE + INSERT (small table, idempotent, no diff logic)
    const { error: delErr } = await supabase
      .from('plant_companions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) return json({ error: 'companions_delete_failed', detail: delErr.message }, 500);

    if (companionRows.length > 0) {
      const { error: insErr } = await supabase.from('plant_companions').insert(companionRows);
      if (insErr) return json({ error: 'companions_insert_failed', detail: insErr.message }, 500);
    }

    return json({
      ok: true,
      plantsCount: plantsPayload.length,
      companionsCount: companionRows.length,
      schemaVersion: bundle.schemaVersion,
    }, 200);
  } catch (err) {
    console.error('seed-plants failed', err);
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
