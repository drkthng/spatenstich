// Phase 8 Plan 04 (D-09): Read-only repo for the global plant reference DB.
// No auth-mode guard — plants are globally readable for authenticated users (D-04 RLS).
// Lokal-mode users get bundle data via usePlants() initialData (not through this repo).
// Pattern: gardenPlanRepo.ts read-only paths but with NO storage layer + NO outbox + NO LWW.
// PLANT-DB-07: deliberately omits the per-account assertion present in other repos.

import { supabase } from './supabase';
import type { PlantRow } from '@spatenstich/shared';

// Local untyped client view — the generated `Database` type does not yet include
// `plants` / `plant_companions` (Migration 019 lives but supabase-gen-types hasn't
// been re-run after push). When the type-gen workflow lands these tables, this
// cast can be removed without touching call sites.
// Pattern: localized `any` cast (Rule 3 blocking fix) — keeps strict typing
// in PlantRow at function boundaries; only the `.from()` chain is loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

export async function loadAllPlants(): Promise<PlantRow[]> {
  const { data, error } = await db
    .from('plants')
    .select('*')
    .order('name_de', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowFromDb);
}

export async function loadPlantBySlug(slug: string): Promise<PlantRow | null> {
  const { data, error } = await db
    .from('plants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowFromDb(data) : null;
}

export async function loadCompanionsFor(plantId: string): Promise<{
  companions: PlantRow[];
  incompatible: PlantRow[];
  neutral: PlantRow[];
}> {
  // UNION query — covers both directions, since storage is canonical (a<b).
  const { data: relations, error } = await db
    .from('plant_companions')
    .select('plant_a_id, plant_b_id, relationship')
    .or(`plant_a_id.eq.${plantId},plant_b_id.eq.${plantId}`);
  if (error) throw error;

  const rels = (relations ?? []) as Array<{
    plant_a_id: string;
    plant_b_id: string;
    relationship: 'companion' | 'incompatible' | 'neutral';
  }>;
  const otherIds = rels.map((r) =>
    r.plant_a_id === plantId ? r.plant_b_id : r.plant_a_id,
  );
  if (otherIds.length === 0) return { companions: [], incompatible: [], neutral: [] };

  const { data: plants, error: plantsErr } = await db
    .from('plants')
    .select('*')
    .in('id', otherIds);
  if (plantsErr) throw plantsErr;
  const byId = new Map<string, PlantRow>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (plants ?? []).map((p: any) => [p.id, rowFromDb(p)]),
  );

  const result: {
    companions: PlantRow[];
    incompatible: PlantRow[];
    neutral: PlantRow[];
  } = {
    companions: [],
    incompatible: [],
    neutral: [],
  };
  for (const rel of rels) {
    const otherId = rel.plant_a_id === plantId ? rel.plant_b_id : rel.plant_a_id;
    const plant = byId.get(otherId);
    if (!plant) continue;
    if (rel.relationship === 'companion') result.companions.push(plant);
    else if (rel.relationship === 'incompatible') result.incompatible.push(plant);
    else result.neutral.push(plant);
  }
  return result;
}

export async function searchPlants(query: string): Promise<PlantRow[]> {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const { data, error } = await db
    .from('plants')
    .select('*')
    .or(`name_de.ilike.%${q}%,name_alt_de.cs.{${q}}`)
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(rowFromDb);
}

function rowFromDb(r: any): PlantRow {
  return {
    id: r.id,
    slug: r.slug,
    nameDe: r.name_de,
    nameAltDe: r.name_alt_de ?? [],
    nameBotanical: r.name_botanical,
    family: r.family,
    category: r.category,
    minSpacingCm: r.min_spacing_cm,
    rowSpacingCm: r.row_spacing_cm,
    depthCm: r.depth_cm,
    sunRequirement: r.sun_requirement,
    waterNeeds: r.water_needs,
    climateZoneMin: r.climate_zone_min,
    climateZoneMax: r.climate_zone_max,
    sowOutdoorDoyStart: r.sow_outdoor_doy_start,
    sowOutdoorDoyEnd: r.sow_outdoor_doy_end,
    sowIndoorDoyStart: r.sow_indoor_doy_start,
    sowIndoorDoyEnd: r.sow_indoor_doy_end,
    plantDoyStart: r.plant_doy_start,
    plantDoyEnd: r.plant_doy_end,
    harvestDoyStart: r.harvest_doy_start,
    harvestDoyEnd: r.harvest_doy_end,
    daysToHarvest: r.days_to_harvest,
    nitrogenFixing: r.nitrogen_fixing,
    perennial: r.perennial,
    notesDe: r.notes_de,
    iconEmoji: r.icon_emoji,
    dataSource: r.data_source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
