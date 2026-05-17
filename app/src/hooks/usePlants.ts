// Phase 8 Plan 04 (D-10): TanStack Query hook for the global plant DB.
// Pattern: useFlag.ts (only existing useQuery hook in app) extended with
//   initialData (JSON-bundle cold-start) + initialDataUpdatedAt: 0 (Pitfall 2).

import { useQuery } from '@tanstack/react-query';
import plantsBundle from '@spatenstich/shared/data/plants';
import { loadAllPlants } from '../lib/plantRepo';
import type { PlantRow } from '@spatenstich/shared';

const QUERY_KEY = ['plants', 'all'] as const;
const EPOCH_ISO = '1970-01-01T00:00:00Z';

// JSON-bundle is the source of "initial truth" — instantly available, even offline,
// even pre-auth (lokaler Modus). Mapping from JSON-shape (no UUID) → row-shape (id-bearing)
// uses a synthetic `bundle:${slug}` id. On first successful Supabase fetch, the cache
// is replaced with real UUID-bearing rows; lookups against bundle-only data use slug.
function initialDataFromBundle(): PlantRow[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (plantsBundle as any).plants.map((p: any): PlantRow => ({
    id: `bundle:${p.slug}`,
    slug: p.slug,
    nameDe: p.nameDe,
    nameAltDe: p.nameAltDe ?? [],
    nameBotanical: p.nameBotanical ?? null,
    family: p.family,
    category: p.category,
    minSpacingCm: p.minSpacingCm ?? null,
    rowSpacingCm: p.rowSpacingCm ?? null,
    depthCm: p.depthCm ?? null,
    sunRequirement: p.sunRequirement,
    waterNeeds: p.waterNeeds,
    climateZoneMin: p.climateZoneMin ?? null,
    climateZoneMax: p.climateZoneMax ?? null,
    sowOutdoorDoyStart: p.sowOutdoorDoyStart ?? null,
    sowOutdoorDoyEnd: p.sowOutdoorDoyEnd ?? null,
    sowIndoorDoyStart: p.sowIndoorDoyStart ?? null,
    sowIndoorDoyEnd: p.sowIndoorDoyEnd ?? null,
    plantDoyStart: p.plantDoyStart ?? null,
    plantDoyEnd: p.plantDoyEnd ?? null,
    harvestDoyStart: p.harvestDoyStart ?? null,
    harvestDoyEnd: p.harvestDoyEnd ?? null,
    daysToHarvest: p.daysToHarvest ?? null,
    nitrogenFixing: p.nitrogenFixing ?? false,
    perennial: p.perennial ?? false,
    notesDe: p.notesDe ?? null,
    iconEmoji: p.iconEmoji ?? null,
    dataSource: p.dataSource,
    createdAt: EPOCH_ISO,
    updatedAt: EPOCH_ISO,
  }));
}

export function usePlants() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadAllPlants,
    initialData: initialDataFromBundle,           // Synchronous instant data
    initialDataUpdatedAt: 0,                       // Pitfall 2: force background refetch
    staleTime: 1000 * 60 * 60 * 24,                // 24h (D-10)
    gcTime:    1000 * 60 * 60 * 24 * 7,            // 7d (D-10)
    refetchOnWindowFocus: false,                   // Static reference data
    refetchOnReconnect: true,                      // Refetch when network comes back
  });
}
