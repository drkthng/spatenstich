// Phase 8 Plan 04 (D-10): TanStack Query hook for the global plant DB.
// Pattern: useFlag.ts (only existing useQuery hook in app) extended with
//   initialData (JSON-bundle cold-start) + initialDataUpdatedAt: 0 (Pitfall 2).

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import plantsBundle from '@spatenstich/shared/data/plants';
import { loadAllPlants } from '../lib/plantRepo';
import type { GardenPlantRow, PlantRow } from '@spatenstich/shared';
import { storage } from '../storage';
import { useAuthStore } from '../stores/authStore';
import { useDataVersion } from '../lib/sync/dataVersion';
import { mergeCatalog } from '../lib/photo/gardenPlants';

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

/**
 * The garden's own catalog entries (Phase 35), from local storage: available offline
 * and updated when a sync brings a change from the partner.
 */
export function useGardenPlants(): GardenPlantRow[] {
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const version = useDataVersion('garden_plants');
  const [rows, setRows] = React.useState<GardenPlantRow[]>([]);
  React.useEffect(() => {
    let alive = true;
    if (!gardenId) {
      setRows([]);
      return;
    }
    storage
      .getRowsByGarden<GardenPlantRow>('garden_plants', gardenId)
      .then((found) => {
        if (alive) setRows(found);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [gardenId, version]);
  return rows;
}

/** The shared catalog plus the garden's own entries, for palette and calendar. */
export function usePlants() {
  const shared = useSharedPlants();
  const own = useGardenPlants();
  const data = React.useMemo(() => mergeCatalog(shared.data ?? [], own), [shared.data, own]);
  return { ...shared, data };
}

/** The shared, read-only catalog. */
export function useSharedPlants() {
  return useQuery({
    queryKey: QUERY_KEY,
    // An empty answer (not signed in yet, or a backend without the plant rows) must not
    // wipe out the plants shipped with the app.
    queryFn: async () => {
      const rows = await loadAllPlants();
      return rows.length > 0 ? rows : initialDataFromBundle();
    },
    initialData: initialDataFromBundle,           // Synchronous instant data
    initialDataUpdatedAt: 0,                       // Pitfall 2: force background refetch
    staleTime: 1000 * 60 * 60 * 24,                // 24h (D-10)
    gcTime:    1000 * 60 * 60 * 24 * 7,            // 7d (D-10)
    refetchOnWindowFocus: false,                   // Static reference data
    refetchOnReconnect: true,                      // Refetch when network comes back
  });
}
