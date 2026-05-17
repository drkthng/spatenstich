// Phase 8 Plan 01: Global plant reference DB types.
// NOT extending RowBase — plants have no LWW triggers, no updatedByUserId, no deletedAt.
// See 08-CONTEXT.md D-08 + 08-PATTERNS.md §types/plants.ts.

export type PlantCategory = 'Gemüse' | 'Kraut' | 'Beere' | 'Obstbaum' | 'Blume';
export type SunRequirement = 'sonnig' | 'halb_schattig' | 'schattig';
export type WaterNeeds = 'niedrig' | 'mittel' | 'hoch';
export type CompanionRelationship = 'companion' | 'incompatible' | 'neutral';
export type DataSource = 'gardeneus' | 'garden-planner' | 'own-research' | 'merged';

export interface PlantRow {
  id: string;
  slug: string;
  nameDe: string;
  nameAltDe: string[];
  nameBotanical: string | null;
  family: string;
  category: PlantCategory;
  minSpacingCm: number | null;
  rowSpacingCm: number | null;
  depthCm: number | null;
  sunRequirement: SunRequirement;
  waterNeeds: WaterNeeds;
  climateZoneMin: number | null;
  climateZoneMax: number | null;
  sowOutdoorDoyStart: number | null;
  sowOutdoorDoyEnd: number | null;
  sowIndoorDoyStart: number | null;
  sowIndoorDoyEnd: number | null;
  plantDoyStart: number | null;
  plantDoyEnd: number | null;
  harvestDoyStart: number | null;
  harvestDoyEnd: number | null;
  daysToHarvest: number | null;
  nitrogenFixing: boolean;
  perennial: boolean;
  notesDe: string | null;
  iconEmoji: string | null;
  dataSource: DataSource;
  createdAt: string;
  updatedAt: string;
}

export interface PlantCompanionRow {
  id: string;
  plantAId: string;
  plantBId: string;
  relationship: CompanionRelationship;
  source: DataSource;
  notes: string | null;
}

/** Wire-format for the JSON bundle (no UUIDs, slug-based cross-refs). */
export interface PlantDbBundle {
  schemaVersion: 'plant-db.v1';
  plants: Array<Omit<PlantRow, 'id' | 'createdAt' | 'updatedAt'>>;
  companions: Array<{
    plantASlug: string;
    plantBSlug: string;
    relationship: CompanionRelationship;
    source: DataSource;
    notes: string | null;
  }>;
}
